// Drag interaction handling (BACKLOG-073)
// Provides drag-to-reorder functionality for messages

// Drag state
let isDragging = false;
let dragNode = null;
let dragNodeId = null;
let dragStartY = 0;
let dragCurrentY = 0;
let dragGhost = null;
let onDragComplete = null;

// SVG reference
let svg = null;

/**
 * Initialize drag handling on an SVG element
 * @param {SVGElement} svgElement - The SVG diagram element
 * @param {Function} callback - Callback called when drag completes: (nodeId, deltaIndex) => void
 */
export function initDrag(svgElement, callback) {
  if (!svgElement) return;

  svg = svgElement;
  onDragComplete = callback;

  // Add drag styles
  addDragStyles();

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
  onDragComplete = null;
  cleanupDrag();
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

  // Only drag on message lines
  if (!messageGroup || target.tagName !== 'line') return;

  // Start drag
  event.preventDefault();
  isDragging = true;
  dragNode = messageGroup;
  dragNodeId = messageGroup.getAttribute('data-node-id');
  dragStartY = event.clientY;
  dragCurrentY = event.clientY;

  // Add dragging class
  messageGroup.classList.add('dragging');

  // Create ghost element
  createDragGhost(messageGroup);
}

/**
 * Handle mousemove during drag
 * @param {MouseEvent} event
 */
function handleMouseMove(event) {
  if (!isDragging || !dragNode) return;

  event.preventDefault();
  dragCurrentY = event.clientY;

  // Update ghost position
  if (dragGhost) {
    const deltaY = dragCurrentY - dragStartY;
    dragGhost.setAttribute('transform', `translate(0, ${deltaY})`);
  }
}

/**
 * Handle mouseup to end drag
 * @param {MouseEvent} event
 */
function handleMouseUp(event) {
  if (!isDragging) return;

  // Calculate drop position (how many message heights moved)
  const deltaY = dragCurrentY - dragStartY;
  const messageHeight = 30; // Approximate height between messages
  const deltaIndex = Math.round(deltaY / messageHeight);

  // Notify callback if moved
  if (deltaIndex !== 0 && onDragComplete) {
    onDragComplete(dragNodeId, deltaIndex);
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

  isDragging = false;
  dragNode = null;
  dragNodeId = null;
  dragStartY = 0;
  dragCurrentY = 0;
  dragGhost = null;
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
  `;

  document.head.appendChild(style);
}
