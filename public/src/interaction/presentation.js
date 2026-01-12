// Presentation mode - fullscreen diagram view (BACKLOG-111)
// Read-only presentation mode with pan/zoom (BACKLOG-112)

let isPresentationMode = false;
let isReadOnlyMode = false;
let onExitCallback = null;

// Pan state for read-only mode
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let scrollStartX = 0;
let scrollStartY = 0;
let diagramPane = null;

/**
 * Initialize presentation mode
 * @param {Function} onExit - Callback when presentation mode exits
 */
export function initPresentation(onExit) {
  onExitCallback = onExit;
  diagramPane = document.getElementById('diagram-pane');

  // Listen for Escape key to exit presentation mode
  document.addEventListener('keydown', handlePresentationKeydown);
}

/**
 * Handle keydown events for presentation mode
 * @param {KeyboardEvent} event
 */
function handlePresentationKeydown(event) {
  // Escape exits presentation mode
  if (event.key === 'Escape' && isPresentationMode) {
    exitPresentationMode();
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  // Ctrl/Cmd + M toggles presentation mode
  // Ctrl/Cmd + Shift + M toggles read-only mode
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? event.metaKey : event.ctrlKey;

  if (modKey && event.key === 'm') {
    event.preventDefault();
    if (event.shiftKey) {
      toggleReadOnlyMode();
    } else {
      togglePresentationMode();
    }
  }
}

/**
 * Enter presentation mode
 */
export function enterPresentationMode() {
  if (isPresentationMode) return;

  isPresentationMode = true;
  document.body.classList.add('presentation-mode');

  // Hide context menus and dialogs
  const contextMenu = document.getElementById('context-menu');
  if (contextMenu) contextMenu.style.display = 'none';

  console.log('Entered presentation mode (press Esc to exit)');
}

/**
 * Exit presentation mode
 */
export function exitPresentationMode() {
  if (!isPresentationMode) return;

  // Also exit read-only mode if active
  if (isReadOnlyMode) {
    exitReadOnlyMode();
  }

  isPresentationMode = false;
  document.body.classList.remove('presentation-mode');

  if (onExitCallback) {
    onExitCallback();
  }

  console.log('Exited presentation mode');
}

/**
 * Toggle presentation mode
 */
export function togglePresentationMode() {
  if (isPresentationMode) {
    exitPresentationMode();
  } else {
    enterPresentationMode();
  }
}

/**
 * Check if currently in presentation mode
 * @returns {boolean}
 */
export function isInPresentationMode() {
  return isPresentationMode;
}

/**
 * Check if currently in read-only presentation mode
 * @returns {boolean}
 */
export function isInReadOnlyMode() {
  return isReadOnlyMode;
}

/**
 * Enter read-only presentation mode
 * Disables editing, enables pan and zoom
 */
export function enterReadOnlyMode() {
  if (isReadOnlyMode) return;

  // First enter presentation mode
  if (!isPresentationMode) {
    enterPresentationMode();
  }

  isReadOnlyMode = true;
  document.body.classList.add('read-only-mode');

  // Add pan handlers to diagram pane
  if (diagramPane) {
    diagramPane.addEventListener('mousedown', handlePanStart);
    diagramPane.addEventListener('mousemove', handlePanMove);
    diagramPane.addEventListener('mouseup', handlePanEnd);
    diagramPane.addEventListener('mouseleave', handlePanEnd);
    diagramPane.style.cursor = 'grab';
  }

  console.log('Entered read-only presentation mode (drag to pan, scroll to zoom)');
}

/**
 * Exit read-only presentation mode
 */
export function exitReadOnlyMode() {
  if (!isReadOnlyMode) return;

  isReadOnlyMode = false;
  document.body.classList.remove('read-only-mode');

  // Remove pan handlers
  if (diagramPane) {
    diagramPane.removeEventListener('mousedown', handlePanStart);
    diagramPane.removeEventListener('mousemove', handlePanMove);
    diagramPane.removeEventListener('mouseup', handlePanEnd);
    diagramPane.removeEventListener('mouseleave', handlePanEnd);
    diagramPane.style.cursor = '';
  }

  isPanning = false;

  console.log('Exited read-only mode');
}

/**
 * Toggle read-only presentation mode
 */
export function toggleReadOnlyMode() {
  if (isReadOnlyMode) {
    exitReadOnlyMode();
    exitPresentationMode();
  } else {
    enterReadOnlyMode();
  }
}

/**
 * Handle pan start (mousedown)
 * @param {MouseEvent} event
 */
function handlePanStart(event) {
  // Only pan on left click and not on controls
  if (event.button !== 0) return;
  if (event.target.closest('#diagram-toolbar')) return;
  if (event.target.closest('button')) return;

  isPanning = true;
  panStartX = event.clientX;
  panStartY = event.clientY;
  scrollStartX = diagramPane.scrollLeft;
  scrollStartY = diagramPane.scrollTop;

  diagramPane.style.cursor = 'grabbing';
  event.preventDefault();
}

/**
 * Handle pan move (mousemove)
 * @param {MouseEvent} event
 */
function handlePanMove(event) {
  if (!isPanning) return;

  const deltaX = event.clientX - panStartX;
  const deltaY = event.clientY - panStartY;

  diagramPane.scrollLeft = scrollStartX - deltaX;
  diagramPane.scrollTop = scrollStartY - deltaY;
}

/**
 * Handle pan end (mouseup/mouseleave)
 * @param {MouseEvent} event
 */
function handlePanEnd(event) {
  if (!isPanning) return;

  isPanning = false;
  diagramPane.style.cursor = 'grab';
}
