// Participant overlay on scroll (BACKLOG-113)
// Shows participant names at viewport top when scrolled down

let diagramPane = null;
let overlayContainer = null;
let isOverlayVisible = false;
let isOverlayEnabled = true;
let participantData = []; // Array of {alias, displayName, x, width}

/**
 * Initialize participant overlay
 * @param {HTMLElement} pane - The diagram pane element
 */
export function initParticipantOverlay(pane) {
  diagramPane = pane;

  // Create overlay container
  overlayContainer = document.createElement('div');
  overlayContainer.id = 'participant-overlay';
  overlayContainer.style.display = 'none';
  diagramPane.appendChild(overlayContainer);

  // Listen for scroll events on diagram pane
  diagramPane.addEventListener('scroll', handleScroll);

  // Initial check
  handleScroll();
}

/**
 * Update participant data from rendered SVG
 * @param {SVGElement} svg - The rendered diagram SVG
 */
export function updateParticipantData(svg) {
  participantData = [];

  if (!svg) return;

  // Find all participant groups
  const participants = svg.querySelectorAll('#participants > .participant');

  participants.forEach(participant => {
    const rect = participant.querySelector('rect');
    const text = participant.querySelector('text');

    if (rect && text) {
      const x = parseFloat(rect.getAttribute('x')) || 0;
      const width = parseFloat(rect.getAttribute('width')) || 80;
      const displayName = text.textContent || '';
      const alias = participant.getAttribute('data-participant') || displayName;

      participantData.push({
        alias,
        displayName,
        x,
        width
      });
    }
  });

  // Re-render overlay if visible
  if (isOverlayVisible) {
    renderOverlay();
  }

  // Check scroll position again
  handleScroll();
}

/**
 * Handle scroll event
 */
function handleScroll() {
  if (!diagramPane || !isOverlayEnabled) return;

  const svg = diagramPane.querySelector('svg');
  if (!svg) return;

  // Get the participants group
  const participantsGroup = svg.querySelector('#participants');
  if (!participantsGroup) return;

  // Get first participant rect to find the top of participants
  const firstParticipant = participantsGroup.querySelector('.participant rect');
  if (!firstParticipant) return;

  // Get position of participants relative to diagram pane
  const svgRect = svg.getBoundingClientRect();
  const paneRect = diagramPane.getBoundingClientRect();

  // Get the participant Y position from the rect
  const participantY = parseFloat(firstParticipant.getAttribute('y')) || 0;

  // Account for SVG transform (zoom)
  const transform = svg.style.transform;
  let scale = 1;
  if (transform) {
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch) {
      scale = parseFloat(scaleMatch[1]) || 1;
    }
  }

  // Calculate actual screen position of participants
  const participantScreenY = svgRect.top + (participantY * scale);
  const headerHeight = getHeaderHeight();

  // Show overlay when participants are scrolled above the visible area (with header offset)
  const shouldShow = participantScreenY < paneRect.top + headerHeight;

  if (shouldShow && !isOverlayVisible) {
    showOverlay();
  } else if (!shouldShow && isOverlayVisible) {
    hideOverlay();
  }

  // Update horizontal scroll sync if visible
  if (isOverlayVisible) {
    syncHorizontalScroll();
  }
}

/**
 * Get the header height to offset overlay position
 * @returns {number} Header height in pixels
 */
function getHeaderHeight() {
  const header = document.getElementById('diagram-header');
  return header ? header.offsetHeight + 12 : 50; // 12px margin
}

/**
 * Show the overlay
 */
function showOverlay() {
  if (!overlayContainer || participantData.length === 0) return;

  isOverlayVisible = true;
  renderOverlay();
  overlayContainer.style.display = 'block';
}

/**
 * Hide the overlay
 */
function hideOverlay() {
  if (!overlayContainer) return;

  isOverlayVisible = false;
  overlayContainer.style.display = 'none';
}

/**
 * Render participant boxes in overlay
 */
function renderOverlay() {
  if (!overlayContainer) return;

  // Clear existing content
  overlayContainer.innerHTML = '';

  // Get SVG scale for proper positioning
  const svg = diagramPane.querySelector('svg');
  let scale = 1;
  if (svg && svg.style.transform) {
    const scaleMatch = svg.style.transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch) {
      scale = parseFloat(scaleMatch[1]) || 1;
    }
  }

  // Create a container for the participant boxes
  const boxContainer = document.createElement('div');
  boxContainer.className = 'participant-overlay-boxes';

  // Render each participant
  participantData.forEach(p => {
    const box = document.createElement('div');
    box.className = 'participant-overlay-box';
    box.setAttribute('data-participant', p.alias);
    box.style.left = `${p.x * scale}px`;
    box.style.width = `${p.width * scale}px`;
    box.textContent = p.displayName;

    boxContainer.appendChild(box);
  });

  overlayContainer.appendChild(boxContainer);
  syncHorizontalScroll();
}

/**
 * Sync horizontal scroll between diagram and overlay
 */
function syncHorizontalScroll() {
  if (!overlayContainer || !diagramPane) return;

  const boxContainer = overlayContainer.querySelector('.participant-overlay-boxes');
  if (boxContainer) {
    // Offset the boxes by negative scroll amount to keep them aligned with diagram
    boxContainer.style.transform = `translateX(${-diagramPane.scrollLeft}px)`;
  }
}

/**
 * Enable/disable the overlay
 * @param {boolean} enabled
 */
export function setOverlayEnabled(enabled) {
  isOverlayEnabled = enabled;

  if (!enabled && isOverlayVisible) {
    hideOverlay();
  } else if (enabled) {
    handleScroll();
  }
}

/**
 * Check if overlay is enabled
 * @returns {boolean}
 */
export function getOverlayEnabled() {
  return isOverlayEnabled;
}

/**
 * Toggle overlay enabled state
 * @returns {boolean} New state
 */
export function toggleOverlay() {
  setOverlayEnabled(!isOverlayEnabled);
  return isOverlayEnabled;
}

/**
 * Clean up overlay
 */
export function removeParticipantOverlay() {
  if (overlayContainer && overlayContainer.parentNode) {
    overlayContainer.parentNode.removeChild(overlayContainer);
  }
  if (diagramPane) {
    diagramPane.removeEventListener('scroll', handleScroll);
  }
  overlayContainer = null;
  diagramPane = null;
  participantData = [];
  isOverlayVisible = false;
}
