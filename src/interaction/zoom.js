// Zoom controls for diagram (BACKLOG-110)

let currentZoom = 1;
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
let zoomLevelEl;
let diagramEl;

/**
 * Initialize zoom controls
 * @param {HTMLElement} diagram - The diagram element to scale
 * @param {HTMLElement} zoomLevel - The element to display zoom level
 */
export function initZoom(diagram, zoomLevel) {
  diagramEl = diagram;
  zoomLevelEl = zoomLevel;

  // Button handlers
  document.getElementById('zoom-in').addEventListener('click', () => zoomIn());
  document.getElementById('zoom-out').addEventListener('click', () => zoomOut());
  document.getElementById('zoom-reset').addEventListener('click', () => resetZoom());

  // Keyboard shortcuts
  document.addEventListener('keydown', handleZoomKeydown);

  updateZoom();
}

/**
 * Handle keyboard shortcuts for zoom
 * @param {KeyboardEvent} event
 */
function handleZoomKeydown(event) {
  // Don't handle when typing in editor or input fields
  const target = event.target;
  if (target && target.closest && target.closest('.CodeMirror')) {
    return;
  }
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    return;
  }

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? event.metaKey : event.ctrlKey;

  if (!modKey) return;

  // Ctrl/Cmd + Plus (= or +)
  if (event.key === '=' || event.key === '+') {
    event.preventDefault();
    zoomIn();
  }

  // Ctrl/Cmd + Minus
  if (event.key === '-') {
    event.preventDefault();
    zoomOut();
  }

  // Ctrl/Cmd + 0 to reset
  if (event.key === '0') {
    event.preventDefault();
    resetZoom();
  }
}

/**
 * Zoom in by one step
 */
export function zoomIn() {
  currentZoom = Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP);
  updateZoom();
}

/**
 * Zoom out by one step
 */
export function zoomOut() {
  currentZoom = Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP);
  updateZoom();
}

/**
 * Reset zoom to 100%
 */
export function resetZoom() {
  currentZoom = 1;
  updateZoom();
}

/**
 * Update the zoom display and transform
 */
function updateZoom() {
  if (diagramEl) {
    diagramEl.style.transform = `scale(${currentZoom})`;
    diagramEl.style.transformOrigin = 'top left';
  }
  if (zoomLevelEl) {
    zoomLevelEl.textContent = `${Math.round(currentZoom * 100)}%`;
  }
}

/**
 * Get the current zoom level
 * @returns {number} Current zoom level (1 = 100%)
 */
export function getZoomLevel() {
  return currentZoom;
}

/**
 * Set the zoom level
 * @param {number} level - Zoom level (1 = 100%)
 */
export function setZoomLevel(level) {
  currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
  updateZoom();
}
