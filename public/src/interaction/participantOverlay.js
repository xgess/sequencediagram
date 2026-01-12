// Participant overlay on scroll (BACKLOG-113, OVERLAY-001 to OVERLAY-007)
// Shows exact participant visuals at viewport top when scrolled down

let diagramPane = null;
let scrollContainer = null;
let overlayContainer = null;
let isOverlayVisible = false;
let isOverlayEnabled = true;

/**
 * Initialize participant overlay
 * @param {HTMLElement} pane - The diagram pane element
 */
export function initParticipantOverlay(pane) {
  diagramPane = pane;
  scrollContainer = pane;

  // Create overlay container
  overlayContainer = document.createElement('div');
  overlayContainer.id = 'participant-overlay';
  pane.insertBefore(overlayContainer, pane.querySelector('#diagram-container'));

  // Listen for scroll events
  scrollContainer.addEventListener('scroll', handleScroll);
}

/**
 * Update participant data from rendered SVG
 * @param {SVGElement} svg - The rendered diagram SVG
 */
export function updateParticipantData(svg) {
  // Just trigger a scroll check - we'll clone fresh each time
  handleScroll();
}

/**
 * Handle scroll event
 */
function handleScroll() {
  if (!scrollContainer || !overlayContainer || !isOverlayEnabled) {
    return;
  }

  const svg = scrollContainer.querySelector('#diagram-container svg');
  if (!svg) {
    if (isOverlayVisible) hideOverlay();
    return;
  }

  const participantsGroup = svg.querySelector('#participants');
  if (!participantsGroup) {
    if (isOverlayVisible) hideOverlay();
    return;
  }

  const firstParticipant = participantsGroup.querySelector('.participant:not(.bottom-participant)');
  if (!firstParticipant) {
    if (isOverlayVisible) hideOverlay();
    return;
  }

  // Get participant bottom Y position (when participant scrolls off, show overlay)
  let participantBottom = 90; // default
  const rect = firstParticipant.querySelector('rect');
  if (rect) {
    const y = parseFloat(rect.getAttribute('y')) || 50;
    const height = parseFloat(rect.getAttribute('height')) || 40;
    participantBottom = y + height;
  } else {
    // For actors, databases, icons - estimate bottom
    const text = firstParticipant.querySelector('text:last-of-type');
    if (text) {
      participantBottom = parseFloat(text.getAttribute('y')) || 90;
    }
  }

  // Account for zoom
  let scale = 1;
  const transform = svg.style.transform;
  if (transform) {
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch) {
      scale = parseFloat(scaleMatch[1]) || 1;
    }
  }

  const scrollTop = scrollContainer.scrollTop;
  const threshold = participantBottom * scale;

  // Show overlay when participants are scrolled off screen
  const shouldShow = scrollTop > threshold;

  if (shouldShow && !isOverlayVisible) {
    showOverlay();
  } else if (!shouldShow && isOverlayVisible) {
    hideOverlay();
  }

}

/**
 * Show the overlay
 */
function showOverlay() {
  if (!overlayContainer) return;

  isOverlayVisible = true;
  renderOverlay();
  overlayContainer.classList.add('visible');
}

/**
 * Hide the overlay
 */
function hideOverlay() {
  if (!overlayContainer) return;

  isOverlayVisible = false;
  overlayContainer.classList.remove('visible');
}

/**
 * Render cloned participants in overlay SVG
 */
function renderOverlay() {
  if (!overlayContainer || !diagramPane) return;

  overlayContainer.innerHTML = '';

  const sourceSvg = diagramPane.querySelector('#diagram-container svg');
  if (!sourceSvg) return;

  const participantsGroup = sourceSvg.querySelector('#participants');
  if (!participantsGroup) return;

  const participants = participantsGroup.querySelectorAll('.participant:not(.bottom-participant)');
  if (participants.length === 0) return;

  // Get SVG dimensions
  const viewBox = sourceSvg.getAttribute('viewBox');
  if (!viewBox) return;

  const [vbX, vbY, vbWidth, vbHeight] = viewBox.split(' ').map(Number);

  // Get zoom scale
  let scale = 1;
  if (sourceSvg.style.transform) {
    const scaleMatch = sourceSvg.style.transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch) {
      scale = parseFloat(scaleMatch[1]) || 1;
    }
  }

  // Find the Y range of participants to determine overlay height
  let minY = Infinity, maxY = 0;
  participants.forEach(p => {
    const rect = p.querySelector('rect');
    if (rect) {
      const y = parseFloat(rect.getAttribute('y')) || 0;
      const h = parseFloat(rect.getAttribute('height')) || 40;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + h);
    } else {
      // For actors/icons, estimate from shapes
      const shapes = p.querySelectorAll('circle, ellipse, line, text');
      shapes.forEach(s => {
        if (s.tagName === 'circle') {
          const cy = parseFloat(s.getAttribute('cy')) || 0;
          const r = parseFloat(s.getAttribute('r')) || 0;
          minY = Math.min(minY, cy - r);
          maxY = Math.max(maxY, cy + r);
        } else if (s.tagName === 'text') {
          const y = parseFloat(s.getAttribute('y')) || 0;
          maxY = Math.max(maxY, y + 5);
        }
      });
    }
  });

  if (minY === Infinity) minY = 0;
  const participantHeight = maxY - minY + 20; // Add padding

  // Create overlay SVG matching source viewBox width
  const overlaySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlaySvg.setAttribute('class', 'participant-overlay-svg');
  overlaySvg.setAttribute('viewBox', `${vbX} ${minY - 10} ${vbWidth} ${participantHeight}`);
  overlaySvg.style.width = `${vbWidth * scale}px`;
  overlaySvg.style.height = `${participantHeight * scale}px`;

  // Note: Don't clone defs - they contain marker IDs that would conflict
  // with the main diagram's markers. Participants don't need markers.

  // Clone and add each participant (fresh clone each time)
  participants.forEach(participant => {
    const clone = participant.cloneNode(true);
    // Remove any interaction-related classes/attributes
    clone.removeAttribute('data-node-id');
    overlaySvg.appendChild(clone);
  });

  // Create container for horizontal scroll sync
  const svgContainer = document.createElement('div');
  svgContainer.className = 'participant-overlay-svg-container';
  svgContainer.appendChild(overlaySvg);

  overlayContainer.appendChild(svgContainer);
}

/**
 * Called when zoom changes - re-render overlay
 */
export function onZoomChange() {
  if (isOverlayVisible) {
    renderOverlay();
  }
}

/**
 * Enable/disable the overlay
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
 */
export function getOverlayEnabled() {
  return isOverlayEnabled;
}

/**
 * Toggle overlay enabled state
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
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', handleScroll);
  }
  overlayContainer = null;
  scrollContainer = null;
  diagramPane = null;
  isOverlayVisible = false;
}
