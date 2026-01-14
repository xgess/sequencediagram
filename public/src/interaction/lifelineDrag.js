// Lifeline drag handling for creating messages
// Click and drag from one lifeline to another to create a new message

// Drag state
let isDragging = false;
let dragStartParticipant = null;
let dragStartY = 0;
let dragLine = null;
let svg = null;

// Callback
let onMessageCreate = null;

// Participant positions cache
let participantPositions = [];

/**
 * Initialize lifeline drag handling
 * @param {SVGElement} svgElement - The SVG diagram element
 * @param {Function} createCallback - Callback: (from, to, arrowType, insertY) => void
 */
export function initLifelineDrag(svgElement, createCallback) {
  if (!svgElement) return;

  svg = svgElement;
  onMessageCreate = createCallback;

  // Cache participant positions
  cacheParticipantPositions();

  // Add event listeners
  svg.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);

  // Add styles
  addLifelineDragStyles();
}

/**
 * Remove lifeline drag handling
 * @param {SVGElement} svgElement
 */
export function removeLifelineDrag(svgElement) {
  if (svgElement) {
    svgElement.removeEventListener('mousedown', handleMouseDown);
  }
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);

  svg = null;
  onMessageCreate = null;
  participantPositions = [];
  cleanupDrag();
}

/**
 * Cache participant X positions
 */
function cacheParticipantPositions() {
  participantPositions = [];

  // Get from lifelines
  const lifelines = svg.querySelectorAll('.lifeline');
  lifelines.forEach(line => {
    const alias = line.getAttribute('data-participant');
    const x = parseFloat(line.getAttribute('x1') || 0);
    const y1 = parseFloat(line.getAttribute('y1') || 0);
    const y2 = parseFloat(line.getAttribute('y2') || 0);

    participantPositions.push({
      alias,
      x,
      y1,
      y2,
      element: line
    });
  });
}

/**
 * Handle mousedown - start drag if on lifeline
 * @param {MouseEvent} event
 */
function handleMouseDown(event) {
  if (event.button !== 0) return;

  const target = event.target;

  // Check if clicked on a lifeline
  if (!target.classList.contains('lifeline')) return;

  const alias = target.getAttribute('data-participant');
  if (!alias) return;

  // Get SVG coordinates
  const svgPoint = getSvgPoint(event);
  if (!svgPoint) return;

  // Start drag
  event.preventDefault();
  event.stopPropagation();

  isDragging = true;
  dragStartParticipant = alias;
  dragStartY = svgPoint.y;

  // Find the starting X from participant positions
  const startPos = participantPositions.find(p => p.alias === alias);
  const startX = startPos ? startPos.x : svgPoint.x;

  // Create drag line
  createDragLine(startX, svgPoint.y);

  // Add dragging class
  svg.classList.add('lifeline-dragging');
}

/**
 * Handle mousemove during drag
 * @param {MouseEvent} event
 */
function handleMouseMove(event) {
  if (!isDragging || !dragLine) return;

  event.preventDefault();

  const svgPoint = getSvgPoint(event);
  if (!svgPoint) return;

  // Find nearest participant for snapping
  const nearest = findNearestParticipant(svgPoint.x);
  const snapX = nearest ? nearest.x : svgPoint.x;

  // Update drag line end point
  dragLine.setAttribute('x2', snapX);
  dragLine.setAttribute('y2', dragStartY); // Keep Y constant

  // Highlight nearest participant lifeline
  highlightLifeline(nearest);
}

/**
 * Handle mouseup - complete drag
 * @param {MouseEvent} event
 */
function handleMouseUp(event) {
  if (!isDragging) return;

  const svgPoint = getSvgPoint(event);

  if (svgPoint && dragStartParticipant) {
    // Find target participant
    const nearest = findNearestParticipant(svgPoint.x);

    if (nearest && nearest.alias !== dragStartParticipant) {
      // Determine arrow type based on modifier keys
      let arrowType = '->';
      if (event.shiftKey && event.ctrlKey) {
        arrowType = '-->>';
      } else if (event.shiftKey) {
        arrowType = '-->';
      } else if (event.ctrlKey || event.metaKey) {
        arrowType = '->>';
      }

      // Notify callback
      if (onMessageCreate) {
        onMessageCreate(dragStartParticipant, nearest.alias, arrowType, dragStartY);
      }
    }
  }

  cleanupDrag();
}

/**
 * Create drag line element
 * @param {number} x - Start X
 * @param {number} y - Start Y
 */
function createDragLine(x, y) {
  dragLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  dragLine.setAttribute('class', 'lifeline-drag-line');
  dragLine.setAttribute('x1', x);
  dragLine.setAttribute('y1', y);
  dragLine.setAttribute('x2', x);
  dragLine.setAttribute('y2', y);
  dragLine.setAttribute('stroke', '#4a90d9');
  dragLine.setAttribute('stroke-width', '2');
  dragLine.setAttribute('stroke-dasharray', '5,5');
  dragLine.setAttribute('pointer-events', 'none');

  svg.appendChild(dragLine);
}

/**
 * Get SVG coordinates from mouse event
 * @param {MouseEvent} event
 * @returns {Object|null}
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
 * Find nearest participant to X coordinate
 * @param {number} x
 * @returns {Object|null}
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

// Track highlighted lifeline
let highlightedLifeline = null;

/**
 * Highlight a lifeline during drag
 * @param {Object|null} participant
 */
function highlightLifeline(participant) {
  // Remove previous highlight
  if (highlightedLifeline && highlightedLifeline !== participant) {
    if (highlightedLifeline.element) {
      highlightedLifeline.element.classList.remove('lifeline-drag-target');
    }
  }

  // Add new highlight
  if (participant && participant.element && participant.alias !== dragStartParticipant) {
    participant.element.classList.add('lifeline-drag-target');
    highlightedLifeline = participant;
  } else {
    highlightedLifeline = null;
  }
}

/**
 * Clean up drag state
 */
function cleanupDrag() {
  if (dragLine && dragLine.parentNode) {
    dragLine.parentNode.removeChild(dragLine);
  }

  if (highlightedLifeline && highlightedLifeline.element) {
    highlightedLifeline.element.classList.remove('lifeline-drag-target');
  }

  if (svg) {
    svg.classList.remove('lifeline-dragging');
  }

  isDragging = false;
  dragStartParticipant = null;
  dragStartY = 0;
  dragLine = null;
  highlightedLifeline = null;
}

/**
 * Add CSS styles for lifeline drag
 */
function addLifelineDragStyles() {
  if (document.getElementById('lifeline-drag-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'lifeline-drag-styles';
  style.textContent = `
    /* Make lifelines clickable */
    .lifeline {
      cursor: crosshair;
      stroke-width: 1;
      pointer-events: stroke;
    }

    /* Wider hit area for lifelines */
    .lifeline:hover {
      stroke-width: 8;
      stroke: rgba(74, 144, 217, 0.3);
    }

    /* Highlight target lifeline during drag */
    .lifeline.lifeline-drag-target {
      stroke: #4a90d9 !important;
      stroke-width: 4 !important;
      stroke-dasharray: none !important;
    }

    /* Prevent text selection during drag */
    svg.lifeline-dragging {
      user-select: none;
    }

    svg.lifeline-dragging * {
      user-select: none;
    }
  `;

  document.head.appendChild(style);
}
