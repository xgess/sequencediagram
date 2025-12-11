// Selection handling for diagram elements (BACKLOG-069, BACKLOG-076, BACKLOG-088)
// Provides click-to-select, double-click-to-edit, and right-click context menu functionality

// Currently selected element ID
let selectedElementId = null;

// Callbacks
let onSelectionChange = null;
let onDoubleClick = null;
let onContextMenu = null;

/**
 * Initialize selection handling on an SVG element
 * @param {SVGElement} svg - The SVG diagram element
 * @param {Function} selectionCallback - Callback called when selection changes: (nodeId) => void
 * @param {Function} dblClickCallback - Callback called on double-click: (nodeId, element) => void
 * @param {Function} contextMenuCallback - Callback called on right-click: (x, y, nodeId, nodeType) => void
 */
export function initSelection(svg, selectionCallback, dblClickCallback, contextMenuCallback) {
  if (!svg) return;

  onSelectionChange = selectionCallback;
  onDoubleClick = dblClickCallback;
  onContextMenu = contextMenuCallback;

  // Add click handler to SVG for selection
  svg.addEventListener('click', handleSvgClick);
  svg.addEventListener('dblclick', handleSvgDoubleClick);
  svg.addEventListener('contextmenu', handleSvgContextMenu);

  // Add CSS for selection highlight
  addSelectionStyles();
}

/**
 * Remove selection handling from SVG
 * @param {SVGElement} svg - The SVG diagram element
 */
export function removeSelection(svg) {
  if (svg) {
    svg.removeEventListener('click', handleSvgClick);
    svg.removeEventListener('dblclick', handleSvgDoubleClick);
    svg.removeEventListener('contextmenu', handleSvgContextMenu);
  }
  selectedElementId = null;
  onSelectionChange = null;
  onDoubleClick = null;
  onContextMenu = null;
}

/**
 * Handle click on SVG
 * @param {MouseEvent} event
 */
function handleSvgClick(event) {
  // Find the closest selectable group (has data-node-id attribute)
  const target = event.target;
  const selectableGroup = target.closest('[data-node-id]');

  if (selectableGroup) {
    const nodeId = selectableGroup.getAttribute('data-node-id');
    selectElement(nodeId);
    event.stopPropagation();
  } else {
    // Clicked on background - deselect
    deselectAll();
  }
}

/**
 * Handle double-click on SVG
 * @param {MouseEvent} event
 */
function handleSvgDoubleClick(event) {
  // Find the closest selectable group (has data-node-id attribute)
  const target = event.target;
  const selectableGroup = target.closest('[data-node-id]');

  if (selectableGroup && onDoubleClick) {
    const nodeId = selectableGroup.getAttribute('data-node-id');
    event.preventDefault();
    event.stopPropagation();

    // Check if we clicked on an else label specifically
    if (target.classList.contains('fragment-else-label')) {
      // Find which else clause this label belongs to (by index)
      const allElseLabels = selectableGroup.querySelectorAll('.fragment-else-label');
      let elseIndex = 0;
      for (let i = 0; i < allElseLabels.length; i++) {
        if (allElseLabels[i] === target) {
          elseIndex = i;
          break;
        }
      }
      onDoubleClick(nodeId, selectableGroup, { type: 'else', index: elseIndex });
    } else {
      onDoubleClick(nodeId, selectableGroup, null);
    }
  }
}

/**
 * Handle context menu (right-click) on SVG
 * @param {MouseEvent} event
 */
function handleSvgContextMenu(event) {
  event.preventDefault();

  if (!onContextMenu) return;

  // Find the closest selectable group (has data-node-id attribute)
  const target = event.target;
  const selectableGroup = target.closest('[data-node-id]');

  let nodeId = null;
  let nodeType = null;

  if (selectableGroup) {
    nodeId = selectableGroup.getAttribute('data-node-id');
    // Get the node type from the class (participant, message, fragment, etc.)
    nodeType = selectableGroup.classList.contains('participant') ? 'participant' :
               selectableGroup.classList.contains('message') ? 'message' :
               selectableGroup.classList.contains('fragment') ? 'fragment' :
               selectableGroup.classList.contains('error') ? 'error' : null;

    // Select the element
    selectElement(nodeId);
  }

  // Call the callback with position and node info
  onContextMenu(event.clientX, event.clientY, nodeId, nodeType);
}

/**
 * Select an element by ID
 * @param {string} nodeId - Node ID to select
 */
export function selectElement(nodeId) {
  if (selectedElementId === nodeId) {
    return; // Already selected
  }

  // Remove previous selection
  if (selectedElementId) {
    removeHighlight(selectedElementId);
  }

  // Set new selection
  selectedElementId = nodeId;

  // Add highlight
  if (nodeId) {
    addHighlight(nodeId);
  }

  // Notify callback
  if (onSelectionChange) {
    onSelectionChange(nodeId);
  }
}

/**
 * Deselect all elements
 */
export function deselectAll() {
  if (selectedElementId) {
    removeHighlight(selectedElementId);
    selectedElementId = null;

    if (onSelectionChange) {
      onSelectionChange(null);
    }
  }
}

/**
 * Get currently selected element ID
 * @returns {string|null}
 */
export function getSelectedId() {
  return selectedElementId;
}

/**
 * Add visual highlight to element
 * @param {string} nodeId
 */
function addHighlight(nodeId) {
  const element = document.querySelector(`[data-node-id="${nodeId}"]`);
  if (element) {
    element.classList.add('selected');
  }
}

/**
 * Remove visual highlight from element
 * @param {string} nodeId
 */
function removeHighlight(nodeId) {
  const element = document.querySelector(`[data-node-id="${nodeId}"]`);
  if (element) {
    element.classList.remove('selected');
  }
}

/**
 * Add CSS styles for selection highlight
 * Only adds once, checks if already present
 */
function addSelectionStyles() {
  if (document.getElementById('selection-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'selection-styles';
  style.textContent = `
    /* Selection highlight for diagram elements */
    [data-node-id] {
      cursor: pointer;
    }

    [data-node-id].selected > rect,
    [data-node-id].selected > ellipse,
    [data-node-id].selected > circle,
    [data-node-id].selected > path {
      stroke: #4a90d9 !important;
      stroke-width: 3 !important;
    }

    [data-node-id].selected > line {
      stroke: #4a90d9 !important;
      stroke-width: 3 !important;
    }

    /* Glow effect for selected elements */
    [data-node-id].selected {
      filter: drop-shadow(0 0 3px rgba(74, 144, 217, 0.5));
    }

    /* Participant selection */
    .participant.selected > rect {
      stroke: #4a90d9 !important;
      stroke-width: 2 !important;
    }

    /* Message selection - highlight the line */
    .message.selected > line {
      stroke: #4a90d9 !important;
      stroke-width: 3 !important;
    }

    /* Fragment selection - highlight the border */
    .fragment.selected > rect:first-child {
      stroke: #4a90d9 !important;
      stroke-width: 2 !important;
    }

    /* Error selection */
    .error.selected > rect {
      stroke: #4a90d9 !important;
      stroke-width: 2 !important;
    }
  `;

  document.head.appendChild(style);
}
