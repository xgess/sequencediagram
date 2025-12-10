// Drag interaction handling (BACKLOG-073, 074, 075)
// Provides drag-to-reorder and endpoint drag functionality for messages

// Drag modes
const DRAG_MODE = {
  NONE: 'none',
  REORDER: 'reorder',       // Drag message line to reorder
  ENDPOINT_TARGET: 'target', // Drag target endpoint
  ENDPOINT_SOURCE: 'source'  // Drag source endpoint
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

// SVG and layout reference
let svg = null;
let participantPositions = [];

/**
 * Initialize drag handling on an SVG element
 * @param {SVGElement} svgElement - The SVG diagram element
 * @param {Function} reorderCallback - Callback for reorder: (nodeId, deltaIndex) => void
 * @param {Function} endpointCallback - Callback for endpoint: (nodeId, 'source'|'target', newParticipant) => void
 */
export function initDrag(svgElement, reorderCallback, endpointCallback) {
  if (!svgElement) return;

  svg = svgElement;
  onReorderComplete = reorderCallback;
  onEndpointChange = endpointCallback;

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

  // Find draggable element (message line)
  const target = event.target;
  const messageGroup = target.closest('.message');

  // Only drag on message elements
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
  } else {
    return; // Not a draggable element
  }

  // Start drag
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
  `;

  document.head.appendChild(style);
}
