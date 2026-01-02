// Zoom controls for diagram (BACKLOG-110)

let currentZoom = 1;
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
let zoomLevelEl;
let diagramSelector;

/**
 * Get the current diagram element (queries fresh to handle re-renders)
 * @returns {HTMLElement|null}
 */
function getDiagramEl() {
  return document.querySelector(diagramSelector);
}

/**
 * Initialize zoom controls
 * @param {HTMLElement} diagram - The diagram element to scale (used for selector)
 * @param {HTMLElement} zoomLevel - The element to display zoom level
 */
export function initZoom(diagram, zoomLevel) {
  // Store selector to query fresh each time (SVG gets replaced on re-render)
  diagramSelector = diagram ? `#${diagram.id}` : '#diagram';
  zoomLevelEl = zoomLevel;

  // Button handlers
  document.getElementById('zoom-in').addEventListener('click', () => zoomIn());
  document.getElementById('zoom-out').addEventListener('click', () => zoomOut());
  document.getElementById('zoom-reset').addEventListener('click', () => resetZoom());

  const fitBtn = document.getElementById('zoom-fit');
  if (fitBtn) {
    fitBtn.addEventListener('click', () => shrinkToFit());
  }

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
export function updateZoom() {
  const diagramEl = getDiagramEl();
  if (diagramEl) {
    diagramEl.style.transform = `scale(${currentZoom})`;

    // Update container size so scrollbars work correctly
    // CSS transform doesn't affect layout, so we need to set explicit dimensions
    const viewBox = diagramEl.getAttribute('viewBox');
    if (viewBox) {
      const [, , svgWidth, svgHeight] = viewBox.split(' ').map(Number);
      if (svgWidth && svgHeight) {
        const container = diagramEl.parentElement;
        if (container && container.id === 'diagram-container') {
          // Set min dimensions to scaled SVG size so scrolling works
          container.style.minWidth = `${svgWidth * currentZoom}px`;
          container.style.minHeight = `${svgHeight * currentZoom}px`;
        }
      }
    }
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

/**
 * Shrink to fit - scale diagram to fit available viewport (BACKLOG-114)
 * Calculates the optimal zoom level to fit the entire diagram in the viewport
 */
export function shrinkToFit() {
  const diagramEl = getDiagramEl();
  if (!diagramEl) return;

  // Get the SVG's actual content dimensions from its viewBox or bbox
  const viewBox = diagramEl.getAttribute('viewBox');
  if (!viewBox) {
    console.warn('No viewBox on SVG, cannot calculate shrink-to-fit');
    return;
  }

  const [, , svgWidth, svgHeight] = viewBox.split(' ').map(Number);
  if (!svgWidth || !svgHeight) {
    console.warn('Invalid viewBox dimensions');
    return;
  }

  // Get the container dimensions (diagram-container inside diagram-pane)
  const container = diagramEl.parentElement;
  if (!container) return;

  // Get the diagram pane (parent of container) for available space calculation
  const diagramPane = container.parentElement;
  if (!diagramPane) return;

  // Account for padding and header
  const paneRect = diagramPane.getBoundingClientRect();
  const headerEl = diagramPane.querySelector('#diagram-header');
  const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0;

  // Available space (with margin for padding and borders)
  const availableWidth = paneRect.width - 48; // padding + border
  const availableHeight = paneRect.height - headerHeight - 48;

  // Calculate scale factors for both dimensions
  const scaleX = availableWidth / svgWidth;
  const scaleY = availableHeight / svgHeight;

  // Use the smaller scale to ensure the whole diagram fits
  const fitScale = Math.min(scaleX, scaleY);

  // Clamp to min/max zoom levels
  const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fitScale));

  // Apply the zoom
  currentZoom = clampedScale;
  updateZoom();

  console.log(`Shrink to fit: ${Math.round(clampedScale * 100)}% (SVG: ${svgWidth}x${svgHeight}, container: ${Math.round(availableWidth)}x${Math.round(availableHeight)})`);
}

/**
 * Check if current zoom is "fit" mode (approximately matches shrink-to-fit)
 * @returns {boolean}
 */
export function isShrunkToFit() {
  // This is a simple check - could be more sophisticated
  return false; // Not tracking fit state for now
}
