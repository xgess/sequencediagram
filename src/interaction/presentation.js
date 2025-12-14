// Presentation mode - fullscreen diagram view (BACKLOG-111)

let isPresentationMode = false;
let onExitCallback = null;

/**
 * Initialize presentation mode
 * @param {Function} onExit - Callback when presentation mode exits
 */
export function initPresentation(onExit) {
  onExitCallback = onExit;

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
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? event.metaKey : event.ctrlKey;

  if (modKey && event.key === 'm') {
    event.preventDefault();
    togglePresentationMode();
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
