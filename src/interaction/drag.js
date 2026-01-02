// Drag interaction handling (BACKLOG-073, 074, 075, 078, 081, 082, 083)
// Provides drag-to-reorder and endpoint drag functionality for messages
// Also handles participant reordering and fragment boundary adjustment

// Drag modes
const DRAG_MODE = {
  NONE: 'none',
  REORDER: 'reorder',           // Drag message line to reorder vertically
  ENDPOINT_TARGET: 'target',    // Drag target endpoint
  ENDPOINT_SOURCE: 'source',    // Drag source endpoint
  PARTICIPANT: 'participant',   // Drag participant to reorder horizontally
  FRAGMENT_TOP: 'fragment_top', // Drag fragment top boundary
  FRAGMENT_BOTTOM: 'fragment_bottom', // Drag fragment bottom boundary
  ELSE_DIVIDER: 'else_divider', // Drag else divider line
  DIVIDER: 'divider',           // Drag section divider (==text==)
  NOTE: 'note'                  // Drag note to reorder vertically
};

// Drag state
let isDragging = false;
let dragMode = DRAG_MODE.NONE;
let dragNode = null;
let dragNodeId = null;
let dragStartX = 0;
let dragStartY = 0;
let dragCurrentX = 0;
let dragCurrentY = 0;
let dragGhost = null;
let dragLine = null;  // For endpoint dragging

// Callbacks
let onReorderComplete = null;
let onEndpointChange = null;
let onParticipantReorder = null;
let onFragmentBoundaryChange = null;
let onElseDividerChange = null;

// Fragment drag state
let dragFragmentBoundaryY = 0;
let dragElseClauseIndex = -1;

// SVG and layout reference
let svg = null;
let participantPositions = [];

/**
 * Initialize drag handling on an SVG element
 * @param {SVGElement} svgElement - The SVG diagram element
 * @param {Function} reorderCallback - Callback for reorder: (nodeId, deltaIndex) => void
 * @param {Function} endpointCallback - Callback for endpoint: (nodeId, 'source'|'target', newParticipant) => void
 * @param {Function} participantCallback - Callback for participant reorder: (nodeId, oldIndex, newIndex) => void
 * @param {Function} fragmentCallback - Callback for fragment boundary: (nodeId, boundary, delta) => void
 * @param {Function} elseDividerCallback - Callback for else divider: (nodeId, clauseIndex, delta) => void
 */
export function initDrag(svgElement, reorderCallback, endpointCallback, participantCallback, fragmentCallback, elseDividerCallback) {
  if (!svgElement) return;

  svg = svgElement;
  onReorderComplete = reorderCallback;
  onEndpointChange = endpointCallback;
  onParticipantReorder = participantCallback;
  onFragmentBoundaryChange = fragmentCallback;
  onElseDividerChange = elseDividerCallback;

  // Add drag styles
  addDragStyles();

  // Cache participant positions
  cacheParticipantPositions();

  // Add mousedown handler for drag start
  svg.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

/**
 * Remove drag handling from SVG
 * @param {SVGElement} svgElement - The SVG diagram element
 */
export function removeDrag(svgElement) {
  if (svgElement) {
    svgElement.removeEventListener('mousedown', handleMouseDown);
  }
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);

  svg = null;
  onReorderComplete = null;
  onEndpointChange = null;
  onParticipantReorder = null;
  onFragmentBoundaryChange = null;
  onElseDividerChange = null;
  participantPositions = [];
  cleanupDrag();
}

/**
 * Cache participant X positions for snapping
 */
function cacheParticipantPositions() {
  participantPositions = [];
  const participants = svg.querySelectorAll('.participant');

  participants.forEach(p => {
    const rect = p.querySelector('rect');
    if (rect) {
      const x = parseFloat(rect.getAttribute('x') || 0);
      const width = parseFloat(rect.getAttribute('width') || 0);
      const centerX = x + width / 2;
      const alias = p.getAttribute('data-alias');

      participantPositions.push({
        alias,
        x: centerX,
        element: p
      });
    }
  });
}

/**
 * Handle mousedown to start drag
 * @param {MouseEvent} event
 */
function handleMouseDown(event) {
  // Only left click
  if (event.button !== 0) return;

  const target = event.target;

  // Check for else divider drag
  const fragmentGroup = target.closest('.fragment');
  if (fragmentGroup && target.classList.contains('fragment-divider')) {
    startElseDividerDrag(event, fragmentGroup, target);
    return;
  }

  // Check for fragment boundary drag
  if (fragmentGroup && target.classList.contains('fragment-box')) {
    const svgPoint = getSvgPoint(event);
    if (svgPoint) {
      const boundaryType = detectFragmentBoundary(fragmentGroup, svgPoint);
      if (boundaryType) {
        startFragmentBoundaryDrag(event, fragmentGroup, boundaryType);
        return;
      }
    }
  }

  // Check for section divider drag (==text==)
  const dividerGroup = target.closest('.divider');
  if (dividerGroup) {
    startDividerDrag(event, dividerGroup);
    return;
  }

  // Check for note drag (all note types: note, box, abox, rbox)
  const noteGroup = target.closest('.note');
  if (noteGroup) {
    startNoteDrag(event, noteGroup);
    return;
  }

  // Check for participant drag first
  const participantGroup = target.closest('.participant');
  if (participantGroup) {
    startParticipantDrag(event, participantGroup);
    return;
  }

  // Check for message drag
  const messageGroup = target.closest('.message');
  if (!messageGroup) return;

  // Get mouse position in SVG coordinates
  const svgPoint = getSvgPoint(event);
  if (!svgPoint) return;

  // Determine drag mode based on what was clicked
  if (target.tagName === 'line') {
    const line = target;
    const x1 = parseFloat(line.getAttribute('x1') || 0);
    const x2 = parseFloat(line.getAttribute('x2') || 0);
    const threshold = 20; // pixels for endpoint detection

    // Check if near source endpoint (x1)
    if (Math.abs(svgPoint.x - x1) < threshold) {
      dragMode = DRAG_MODE.ENDPOINT_SOURCE;
    }
    // Check if near target endpoint (x2)
    else if (Math.abs(svgPoint.x - x2) < threshold) {
      dragMode = DRAG_MODE.ENDPOINT_TARGET;
    }
    // Otherwise it's a reorder drag
    else {
      dragMode = DRAG_MODE.REORDER;
    }
  } else if (target.tagName === 'polygon' || target.tagName === 'path') {
    // Arrowhead clicked - target endpoint
    dragMode = DRAG_MODE.ENDPOINT_TARGET;
  } else if (target.tagName === 'text' || target.tagName === 'tspan') {
    // Text label clicked - reorder drag
    dragMode = DRAG_MODE.REORDER;
  } else {
    return; // Not a draggable element
  }

  // Start message drag
  event.preventDefault();
  event.stopPropagation();
  isDragging = true;
  dragNode = messageGroup;
  dragNodeId = messageGroup.getAttribute('data-node-id');
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragCurrentX = event.clientX;
  dragCurrentY = event.clientY;

  // Add dragging class
  messageGroup.classList.add('dragging');

  // Create appropriate visual feedback
  if (dragMode === DRAG_MODE.REORDER) {
    createDragGhost(messageGroup);
  } else {
    createDragLine(messageGroup, dragMode);
  }
}

/**
 * Start participant drag for horizontal reordering
 * @param {MouseEvent} event
 * @param {SVGElement} participantGroup
 */
function startParticipantDrag(event, participantGroup) {
  event.preventDefault();
  event.stopPropagation();

  isDragging = true;
  dragMode = DRAG_MODE.PARTICIPANT;
  dragNode = participantGroup;
  dragNodeId = participantGroup.getAttribute('data-node-id');
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragCurrentX = event.clientX;
  dragCurrentY = event.clientY;

  // Add dragging class
  participantGroup.classList.add('dragging');
  svg.classList.add('dragging-active');

  // Create ghost for participant
  createParticipantGhost(participantGroup);
}

/**
 * Start divider drag for vertical repositioning
 * @param {MouseEvent} event
 * @param {SVGElement} dividerGroup
 */
function startDividerDrag(event, dividerGroup) {
  event.preventDefault();
  event.stopPropagation();

  isDragging = true;
  dragMode = DRAG_MODE.DIVIDER;
  dragNode = dividerGroup;
  dragNodeId = dividerGroup.getAttribute('data-node-id');
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragCurrentX = event.clientX;
  dragCurrentY = event.clientY;

  // Add dragging class
  dividerGroup.classList.add('dragging');
  svg.classList.add('dragging-active');

  // Create ghost for divider
  createDividerGhost(dividerGroup);
}

/**
 * Create ghost element for divider drag
 * @param {SVGElement} dividerGroup
 */
function createDividerGhost(dividerGroup) {
  dragGhost = dividerGroup.cloneNode(true);
  dragGhost.classList.add('drag-ghost', 'divider-ghost');
  dragGhost.removeAttribute('data-node-id');

  // Insert after original
  dividerGroup.parentNode.appendChild(dragGhost);
}

/**
 * Start note drag for vertical repositioning
 * @param {MouseEvent} event
 * @param {SVGElement} noteGroup
 */
function startNoteDrag(event, noteGroup) {
  event.preventDefault();
  event.stopPropagation();

  isDragging = true;
  dragMode = DRAG_MODE.NOTE;
  dragNode = noteGroup;
  dragNodeId = noteGroup.getAttribute('data-node-id');
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragCurrentX = event.clientX;
  dragCurrentY = event.clientY;

  // Add dragging class
  noteGroup.classList.add('dragging');
  svg.classList.add('dragging-active');

  // Create ghost for note
  createNoteGhost(noteGroup);
}

/**
 * Create ghost element for note drag
 * @param {SVGElement} noteGroup
 */
function createNoteGhost(noteGroup) {
  dragGhost = noteGroup.cloneNode(true);
  dragGhost.classList.add('drag-ghost', 'note-ghost');
  dragGhost.removeAttribute('data-node-id');

  // Insert after original
  noteGroup.parentNode.appendChild(dragGhost);
}

/**
 * Detect if click is near a fragment boundary
 * @param {SVGElement} fragmentGroup
 * @param {Object} svgPoint - {x, y}
 * @returns {string|null} 'top', 'bottom', or null
 */
function detectFragmentBoundary(fragmentGroup, svgPoint) {
  const rect = fragmentGroup.querySelector('.fragment-box');
  if (!rect) return null;

  const y = parseFloat(rect.getAttribute('y') || 0);
  const height = parseFloat(rect.getAttribute('height') || 0);
  const threshold = 15; // pixels

  // Check top boundary (but not in the label area - below y + 22)
  if (Math.abs(svgPoint.y - y) < threshold && svgPoint.y > y + 22) {
    return 'top';
  }

  // Check bottom boundary
  if (Math.abs(svgPoint.y - (y + height)) < threshold) {
    return 'bottom';
  }

  return null;
}

/**
 * Start fragment boundary drag
 * @param {MouseEvent} event
 * @param {SVGElement} fragmentGroup
 * @param {string} boundaryType - 'top' or 'bottom'
 */
function startFragmentBoundaryDrag(event, fragmentGroup, boundaryType) {
  event.preventDefault();
  event.stopPropagation();

  isDragging = true;
  dragMode = boundaryType === 'top' ? DRAG_MODE.FRAGMENT_TOP : DRAG_MODE.FRAGMENT_BOTTOM;
  dragNode = fragmentGroup;
  dragNodeId = fragmentGroup.getAttribute('data-node-id');
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragCurrentX = event.clientX;
  dragCurrentY = event.clientY;

  // Store the boundary Y position
  const rect = fragmentGroup.querySelector('.fragment-box');
  if (rect) {
    const y = parseFloat(rect.getAttribute('y') || 0);
    const height = parseFloat(rect.getAttribute('height') || 0);
    dragFragmentBoundaryY = boundaryType === 'top' ? y : y + height;
  }

  // Add dragging class
  fragmentGroup.classList.add('dragging');
  svg.classList.add('dragging-active');

  // Create visual feedback line
  createFragmentBoundaryLine(boundaryType);
}

/**
 * Start else divider drag
 * @param {MouseEvent} event
 * @param {SVGElement} fragmentGroup
 * @param {SVGElement} dividerLine - The divider line element
 */
function startElseDividerDrag(event, fragmentGroup, dividerLine) {
  event.preventDefault();
  event.stopPropagation();

  isDragging = true;
  dragMode = DRAG_MODE.ELSE_DIVIDER;
  dragNode = fragmentGroup;
  dragNodeId = fragmentGroup.getAttribute('data-node-id');
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragCurrentX = event.clientX;
  dragCurrentY = event.clientY;

  // Determine which else clause this divider belongs to
  // For now, assume it's the first (index 0) - fragments typically have one else
  // Could be enhanced to support multiple else clauses by tracking divider index
  dragElseClauseIndex = 0;

  // Store the divider Y position
  dragFragmentBoundaryY = parseFloat(dividerLine.getAttribute('y1') || 0);

  // Add dragging class
  fragmentGroup.classList.add('dragging');
  svg.classList.add('dragging-active');

  // Create visual feedback line
  createElseDividerLine(dividerLine);
}

/**
 * Create visual line for else divider drag
 * @param {SVGElement} dividerLine - The original divider line
 */
function createElseDividerLine(dividerLine) {
  const x1 = parseFloat(dividerLine.getAttribute('x1') || 0);
  const x2 = parseFloat(dividerLine.getAttribute('x2') || 0);

  dragLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  dragLine.setAttribute('class', 'else-divider-drag-line');
  dragLine.setAttribute('x1', x1);
  dragLine.setAttribute('y1', dragFragmentBoundaryY);
  dragLine.setAttribute('x2', x2);
  dragLine.setAttribute('y2', dragFragmentBoundaryY);
  dragLine.setAttribute('stroke', '#4a90d9');
  dragLine.setAttribute('stroke-width', '3');
  dragLine.setAttribute('stroke-dasharray', '5,5');
  dragLine.setAttribute('pointer-events', 'none');

  svg.appendChild(dragLine);
}

/**
 * Create visual line for fragment boundary drag
 * @param {string} boundaryType - 'top' or 'bottom'
 */
function createFragmentBoundaryLine(boundaryType) {
  const rect = dragNode.querySelector('.fragment-box');
  if (!rect) return;

  const x = parseFloat(rect.getAttribute('x') || 0);
  const width = parseFloat(rect.getAttribute('width') || 0);

  dragLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  dragLine.setAttribute('class', 'fragment-boundary-line');
  dragLine.setAttribute('x1', x);
  dragLine.setAttribute('y1', dragFragmentBoundaryY);
  dragLine.setAttribute('x2', x + width);
  dragLine.setAttribute('y2', dragFragmentBoundaryY);
  dragLine.setAttribute('stroke', '#4a90d9');
  dragLine.setAttribute('stroke-width', '3');
  dragLine.setAttribute('stroke-dasharray', '5,5');
  dragLine.setAttribute('pointer-events', 'none');

  svg.appendChild(dragLine);
}

/**
 * Update fragment boundary line position during drag
 */
function updateFragmentBoundaryLine() {
  if (!dragLine) return;

  const svgPoint = getSvgPointFromClient(dragCurrentX, dragCurrentY);
  if (!svgPoint) return;

  dragLine.setAttribute('y1', svgPoint.y);
  dragLine.setAttribute('y2', svgPoint.y);
}

/**
 * Handle mousemove during drag
 * @param {MouseEvent} event
 */
function handleMouseMove(event) {
  if (!isDragging || !dragNode) return;

  event.preventDefault();
  dragCurrentX = event.clientX;
  dragCurrentY = event.clientY;

  if (dragMode === DRAG_MODE.REORDER) {
    // Update ghost position for reorder drag
    if (dragGhost) {
      const deltaY = dragCurrentY - dragStartY;
      dragGhost.setAttribute('transform', `translate(0, ${deltaY})`);
    }
  } else if (dragMode === DRAG_MODE.ENDPOINT_SOURCE || dragMode === DRAG_MODE.ENDPOINT_TARGET) {
    // Update drag line for endpoint drag
    updateDragLine(event);
  } else if (dragMode === DRAG_MODE.PARTICIPANT) {
    // Update ghost position for participant drag
    if (dragGhost) {
      const deltaX = dragCurrentX - dragStartX;
      dragGhost.setAttribute('transform', `translate(${deltaX}, 0)`);
    }
    // Highlight drop target
    highlightParticipantDropTarget();
  } else if (dragMode === DRAG_MODE.FRAGMENT_TOP || dragMode === DRAG_MODE.FRAGMENT_BOTTOM) {
    // Update drag line for fragment boundary
    updateFragmentBoundaryLine();
  } else if (dragMode === DRAG_MODE.ELSE_DIVIDER) {
    // Update drag line for else divider
    updateFragmentBoundaryLine(); // Reuse the same function
  } else if (dragMode === DRAG_MODE.DIVIDER) {
    // Update ghost position for divider drag (vertical reorder)
    if (dragGhost) {
      const deltaY = dragCurrentY - dragStartY;
      dragGhost.setAttribute('transform', `translate(0, ${deltaY})`);
    }
  } else if (dragMode === DRAG_MODE.NOTE) {
    // Update ghost position for note drag (vertical reorder)
    if (dragGhost) {
      const deltaY = dragCurrentY - dragStartY;
      dragGhost.setAttribute('transform', `translate(0, ${deltaY})`);
    }
  }
}

/**
 * Handle mouseup to end drag
 * @param {MouseEvent} event
 */
function handleMouseUp(event) {
  if (!isDragging) return;

  if (dragMode === DRAG_MODE.REORDER) {
    // Calculate drop position (how many message heights moved)
    const deltaY = dragCurrentY - dragStartY;
    const messageHeight = 30; // Approximate height between messages
    const deltaIndex = Math.round(deltaY / messageHeight);

    // Notify callback if moved
    if (deltaIndex !== 0 && onReorderComplete) {
      onReorderComplete(dragNodeId, deltaIndex);
    }
  } else if (dragMode === DRAG_MODE.ENDPOINT_SOURCE || dragMode === DRAG_MODE.ENDPOINT_TARGET) {
    // Find nearest participant for endpoint drag
    const svgPoint = getSvgPoint(event);
    if (svgPoint) {
      const nearestParticipant = findNearestParticipant(svgPoint.x);
      if (nearestParticipant && onEndpointChange) {
        const endpointType = dragMode === DRAG_MODE.ENDPOINT_SOURCE ? 'source' : 'target';
        onEndpointChange(dragNodeId, endpointType, nearestParticipant.alias);
      }
    }
  } else if (dragMode === DRAG_MODE.PARTICIPANT) {
    // Calculate new position for participant
    const result = calculateParticipantDropPosition();
    if (result && result.newIndex !== result.oldIndex && onParticipantReorder) {
      onParticipantReorder(dragNodeId, result.oldIndex, result.newIndex);
    }
  } else if (dragMode === DRAG_MODE.FRAGMENT_TOP || dragMode === DRAG_MODE.FRAGMENT_BOTTOM) {
    // Calculate boundary change
    const deltaY = dragCurrentY - dragStartY;
    const entryHeight = 30; // Approximate height of one entry
    const delta = Math.round(deltaY / entryHeight);

    // For top boundary: negative deltaY = expand (delta positive), positive deltaY = contract
    // For bottom boundary: positive deltaY = expand (delta positive), negative deltaY = contract
    const adjustedDelta = dragMode === DRAG_MODE.FRAGMENT_TOP ? -delta : delta;

    if (adjustedDelta !== 0 && onFragmentBoundaryChange) {
      const boundary = dragMode === DRAG_MODE.FRAGMENT_TOP ? 'top' : 'bottom';
      onFragmentBoundaryChange(dragNodeId, boundary, adjustedDelta);
    }
  } else if (dragMode === DRAG_MODE.ELSE_DIVIDER) {
    // Calculate else divider change
    const deltaY = dragCurrentY - dragStartY;
    const entryHeight = 30; // Approximate height of one entry
    const delta = Math.round(deltaY / entryHeight);

    // Positive deltaY = move divider down = move entries from else to main (negative delta for command)
    // Negative deltaY = move divider up = move entries from main to else (positive delta for command)
    const adjustedDelta = -delta;

    if (adjustedDelta !== 0 && onElseDividerChange) {
      onElseDividerChange(dragNodeId, dragElseClauseIndex, adjustedDelta);
    }
  } else if (dragMode === DRAG_MODE.DIVIDER) {
    // Calculate drop position (same as message reorder)
    const deltaY = dragCurrentY - dragStartY;
    const entryHeight = 30; // Approximate height between entries
    const deltaIndex = Math.round(deltaY / entryHeight);

    // Notify callback if moved - reuse the same reorder callback as messages
    if (deltaIndex !== 0 && onReorderComplete) {
      onReorderComplete(dragNodeId, deltaIndex);
    }
  } else if (dragMode === DRAG_MODE.NOTE) {
    // Calculate drop position (same as message/divider reorder)
    const deltaY = dragCurrentY - dragStartY;
    const entryHeight = 30; // Approximate height between entries
    const deltaIndex = Math.round(deltaY / entryHeight);

    // Notify callback if moved - reuse the same reorder callback
    if (deltaIndex !== 0 && onReorderComplete) {
      onReorderComplete(dragNodeId, deltaIndex);
    }
  }

  // Cleanup
  cleanupDrag();
}

/**
 * Create a ghost element for drag visualization
 * @param {Element} element
 */
function createDragGhost(element) {
  // Clone the message group
  dragGhost = element.cloneNode(true);
  dragGhost.classList.add('drag-ghost');
  dragGhost.removeAttribute('data-node-id');

  // Insert after original
  element.parentNode.appendChild(dragGhost);
}

/**
 * Clean up drag state
 */
function cleanupDrag() {
  if (dragNode) {
    dragNode.classList.remove('dragging');
  }

  if (dragGhost && dragGhost.parentNode) {
    dragGhost.parentNode.removeChild(dragGhost);
  }

  if (dragLine && dragLine.parentNode) {
    dragLine.parentNode.removeChild(dragLine);
  }

  // Remove participant highlight
  if (highlightedParticipant && highlightedParticipant.element) {
    highlightedParticipant.element.classList.remove('drag-target');
    highlightedParticipant = null;
  }

  // Remove participant drop target highlight
  if (highlightedDropTarget) {
    highlightedDropTarget.classList.remove('participant-drop-target');
    highlightedDropTarget = null;
  }

  // Remove dragging-active class from SVG
  if (svg) {
    svg.classList.remove('dragging-active');
  }

  isDragging = false;
  dragMode = DRAG_MODE.NONE;
  dragNode = null;
  dragNodeId = null;
  dragStartX = 0;
  dragStartY = 0;
  dragCurrentX = 0;
  dragCurrentY = 0;
  dragGhost = null;
  dragLine = null;
}

/**
 * Get SVG coordinates from mouse event
 * @param {MouseEvent} event
 * @returns {Object|null} {x, y} in SVG coordinates
 */
function getSvgPoint(event) {
  if (!svg) return null;

  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;

  const ctm = svg.getScreenCTM();
  if (!ctm) return null;

  const svgPoint = pt.matrixTransform(ctm.inverse());
  return { x: svgPoint.x, y: svgPoint.y };
}

/**
 * Create drag line for endpoint visualization
 * @param {Element} messageGroup - The message group element
 * @param {string} mode - DRAG_MODE.ENDPOINT_SOURCE or DRAG_MODE.ENDPOINT_TARGET
 */
function createDragLine(messageGroup, mode) {
  const line = messageGroup.querySelector('line');
  if (!line) return;

  // Get original line coordinates
  const x1 = parseFloat(line.getAttribute('x1') || 0);
  const y1 = parseFloat(line.getAttribute('y1') || 0);
  const x2 = parseFloat(line.getAttribute('x2') || 0);
  const y2 = parseFloat(line.getAttribute('y2') || 0);

  // Create a visual drag line
  dragLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  dragLine.setAttribute('class', 'drag-endpoint-line');
  dragLine.setAttribute('x1', x1);
  dragLine.setAttribute('y1', y1);
  dragLine.setAttribute('x2', x2);
  dragLine.setAttribute('y2', y2);
  dragLine.setAttribute('stroke', '#4a90d9');
  dragLine.setAttribute('stroke-width', '3');
  dragLine.setAttribute('stroke-dasharray', '5,5');
  dragLine.setAttribute('pointer-events', 'none');

  // Store which endpoint is fixed
  dragLine.dataset.fixedEndpoint = mode === DRAG_MODE.ENDPOINT_SOURCE ? 'target' : 'source';
  dragLine.dataset.fixedX = mode === DRAG_MODE.ENDPOINT_SOURCE ? x2 : x1;
  dragLine.dataset.fixedY = mode === DRAG_MODE.ENDPOINT_SOURCE ? y2 : y1;

  svg.appendChild(dragLine);

  // Add dragging-active class to SVG
  svg.classList.add('dragging-active');
}

/**
 * Update drag line position during endpoint drag
 * @param {MouseEvent} event
 */
function updateDragLine(event) {
  if (!dragLine) return;

  const svgPoint = getSvgPoint(event);
  if (!svgPoint) return;

  const fixedEndpoint = dragLine.dataset.fixedEndpoint;
  const fixedX = parseFloat(dragLine.dataset.fixedX);
  const fixedY = parseFloat(dragLine.dataset.fixedY);

  // Find nearest participant for snapping
  const nearest = findNearestParticipant(svgPoint.x);
  const snapX = nearest ? nearest.x : svgPoint.x;

  if (fixedEndpoint === 'target') {
    // Moving source endpoint
    dragLine.setAttribute('x1', snapX);
    dragLine.setAttribute('y1', fixedY); // Keep Y constant (message stays on same row)
    dragLine.setAttribute('x2', fixedX);
    dragLine.setAttribute('y2', fixedY);
  } else {
    // Moving target endpoint
    dragLine.setAttribute('x1', fixedX);
    dragLine.setAttribute('y1', fixedY);
    dragLine.setAttribute('x2', snapX);
    dragLine.setAttribute('y2', fixedY); // Keep Y constant
  }

  // Highlight nearest participant
  highlightNearestParticipant(nearest);
}

/**
 * Find nearest participant to X coordinate
 * @param {number} x - X coordinate in SVG space
 * @returns {Object|null} {alias, x, element} of nearest participant
 */
function findNearestParticipant(x) {
  if (participantPositions.length === 0) return null;

  let nearest = null;
  let minDist = Infinity;

  for (const p of participantPositions) {
    const dist = Math.abs(p.x - x);
    if (dist < minDist) {
      minDist = dist;
      nearest = p;
    }
  }

  return nearest;
}

// Track currently highlighted participant
let highlightedParticipant = null;

/**
 * Highlight participant during endpoint drag
 * @param {Object|null} participant - Participant info
 */
function highlightNearestParticipant(participant) {
  // Remove previous highlight
  if (highlightedParticipant && highlightedParticipant !== participant) {
    if (highlightedParticipant.element) {
      highlightedParticipant.element.classList.remove('drag-target');
    }
  }

  // Add new highlight
  if (participant && participant.element) {
    participant.element.classList.add('drag-target');
    highlightedParticipant = participant;
  } else {
    highlightedParticipant = null;
  }
}

/**
 * Create ghost element for participant drag
 * @param {SVGElement} participantGroup
 */
function createParticipantGhost(participantGroup) {
  dragGhost = participantGroup.cloneNode(true);
  dragGhost.classList.add('drag-ghost', 'participant-ghost');
  dragGhost.removeAttribute('data-node-id');

  // Insert after original
  participantGroup.parentNode.appendChild(dragGhost);
}

// Track highlighted drop target for participant drag
let highlightedDropTarget = null;

/**
 * Highlight potential drop position during participant drag
 */
function highlightParticipantDropTarget() {
  const svgPoint = getSvgPointFromClient(dragCurrentX, dragCurrentY);
  if (!svgPoint) return;

  // Find which participant position we're closest to
  let closestIndex = -1;
  let closestDist = Infinity;

  for (let i = 0; i < participantPositions.length; i++) {
    const dist = Math.abs(participantPositions[i].x - svgPoint.x);
    if (dist < closestDist) {
      closestDist = dist;
      closestIndex = i;
    }
  }

  // Clear previous highlight
  if (highlightedDropTarget) {
    highlightedDropTarget.classList.remove('participant-drop-target');
    highlightedDropTarget = null;
  }

  // Don't highlight self
  const draggedAlias = dragNode.getAttribute('data-alias');
  if (closestIndex >= 0 && participantPositions[closestIndex].alias !== draggedAlias) {
    const target = participantPositions[closestIndex].element;
    if (target) {
      target.classList.add('participant-drop-target');
      highlightedDropTarget = target;
    }
  }
}

/**
 * Calculate where participant should be dropped
 * @returns {Object|null} {oldIndex, newIndex}
 */
function calculateParticipantDropPosition() {
  const svgPoint = getSvgPointFromClient(dragCurrentX, dragCurrentY);
  if (!svgPoint) return null;

  // Find current participant's position in the sorted list
  const draggedAlias = dragNode.getAttribute('data-alias');
  const sortedPositions = [...participantPositions].sort((a, b) => a.x - b.x);

  let oldIndex = -1;
  for (let i = 0; i < sortedPositions.length; i++) {
    if (sortedPositions[i].alias === draggedAlias) {
      oldIndex = i;
      break;
    }
  }

  if (oldIndex === -1) return null;

  // Find new position based on current X
  let newIndex = 0;
  for (let i = 0; i < sortedPositions.length; i++) {
    if (sortedPositions[i].alias === draggedAlias) continue;
    if (svgPoint.x > sortedPositions[i].x) {
      newIndex = i + 1;
    }
  }

  // Adjust for the removal of the dragged item
  if (newIndex > oldIndex) {
    newIndex--;
  }

  return { oldIndex, newIndex };
}

/**
 * Get SVG point from client coordinates
 * @param {number} clientX
 * @param {number} clientY
 * @returns {Object|null}
 */
function getSvgPointFromClient(clientX, clientY) {
  if (!svg) return null;

  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;

  const ctm = svg.getScreenCTM();
  if (!ctm) return null;

  const svgPoint = pt.matrixTransform(ctm.inverse());
  return { x: svgPoint.x, y: svgPoint.y };
}

/**
 * Check if currently dragging
 * @returns {boolean}
 */
export function isDragInProgress() {
  return isDragging;
}

/**
 * Add CSS styles for dragging
 */
function addDragStyles() {
  if (document.getElementById('drag-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'drag-styles';
  style.textContent = `
    /* Dragging styles */
    .dragging {
      opacity: 0.5;
    }

    .drag-ghost {
      opacity: 0.7;
      pointer-events: none;
    }

    .drag-ghost line {
      stroke: #4a90d9 !important;
      stroke-width: 3 !important;
      stroke-dasharray: 5, 5;
    }

    /* Prevent text selection during drag */
    svg.dragging-active {
      user-select: none;
    }

    svg.dragging-active * {
      user-select: none;
    }

    /* Highlight participant during endpoint drag */
    .participant.drag-target rect {
      stroke: #4a90d9 !important;
      stroke-width: 3 !important;
    }

    .participant.drag-target ellipse {
      stroke: #4a90d9 !important;
      stroke-width: 3 !important;
    }

    /* Participant drag ghost */
    .participant-ghost rect {
      stroke: #4a90d9 !important;
      stroke-width: 2 !important;
      stroke-dasharray: 5, 5;
    }

    .participant-ghost ellipse {
      stroke: #4a90d9 !important;
      stroke-width: 2 !important;
      stroke-dasharray: 5, 5;
    }

    /* Drop target highlight for participant reorder */
    .participant.participant-drop-target rect {
      stroke: #2ecc71 !important;
      stroke-width: 3 !important;
    }

    .participant.participant-drop-target ellipse {
      stroke: #2ecc71 !important;
      stroke-width: 3 !important;
    }

    /* Participant drag cursor */
    .participant {
      cursor: grab;
    }

    .participant.dragging {
      cursor: grabbing;
    }

    /* Divider drag styles */
    .divider {
      cursor: grab;
    }

    .divider.dragging {
      cursor: grabbing;
    }

    .divider-ghost line {
      stroke: #4a90d9 !important;
      stroke-width: 2 !important;
      stroke-dasharray: 5, 5;
    }

    .divider-ghost rect {
      stroke: #4a90d9 !important;
      stroke-width: 2 !important;
      stroke-dasharray: 5, 5;
    }

    /* Note drag styles */
    .note {
      cursor: grab;
    }

    .note.dragging {
      cursor: grabbing;
    }

    .note-ghost path,
    .note-ghost rect {
      stroke: #4a90d9 !important;
      stroke-width: 2 !important;
      stroke-dasharray: 5, 5;
    }

    /* Message drag styles */
    .message {
      cursor: grab;
    }

    .message.dragging {
      cursor: grabbing;
    }
  `;

  document.head.appendChild(style);
}
