// Participant overlay on scroll (BACKLOG-113)
// Shows participant names at viewport top when scrolled down

let diagramPane = null;
let scrollContainer = null; // The actual scrollable element (#diagram-container)
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

  // The scroll happens on the diagram pane
  scrollContainer = pane;

  // Create overlay container as a child of the pane (not the diagram container)
  // This way it can be positioned relative to the pane's viewport
  overlayContainer = document.createElement('div');
  overlayContainer.id = 'participant-overlay';
  overlayContainer.style.display = 'none';
  pane.insertBefore(overlayContainer, pane.querySelector('#diagram-container'));

  // Listen for scroll events on the pane
  scrollContainer.addEventListener('scroll', handleScroll);

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

  // Find all participant groups (excluding bottom-participant duplicates)
  const participants = svg.querySelectorAll('#participants > .participant:not(.bottom-participant)');

  participants.forEach(participant => {
    // Get participant info from data attributes set by renderer
    const alias = participant.getAttribute('data-alias') || '';

    // Find the display name from the last text element (label is always last)
    const textElements = participant.querySelectorAll('text');
    const labelText = textElements.length > 0 ? textElements[textElements.length - 1] : null;
    const displayName = labelText ? labelText.textContent || '' : alias;

    // Get bounding box for positioning - works for all participant types
    // We need x and width from the participant's visual bounds
    let x = 0;
    let width = 80;

    // Try rect first (standard participants)
    const rect = participant.querySelector('rect');
    if (rect) {
      x = parseFloat(rect.getAttribute('x')) || 0;
      width = parseFloat(rect.getAttribute('width')) || 80;
    } else {
      // For actors, databases, icons - use the SVG viewBox and participant position
      // Get all shape elements and find the bounds
      const shapes = participant.querySelectorAll('circle, ellipse, line, path, image');
      if (shapes.length > 0) {
        let minX = Infinity, maxX = -Infinity;
        shapes.forEach(shape => {
          // Get x position based on shape type
          if (shape.tagName === 'circle') {
            const cx = parseFloat(shape.getAttribute('cx')) || 0;
            const r = parseFloat(shape.getAttribute('r')) || 0;
            minX = Math.min(minX, cx - r);
            maxX = Math.max(maxX, cx + r);
          } else if (shape.tagName === 'ellipse') {
            const cx = parseFloat(shape.getAttribute('cx')) || 0;
            const rx = parseFloat(shape.getAttribute('rx')) || 0;
            minX = Math.min(minX, cx - rx);
            maxX = Math.max(maxX, cx + rx);
          } else if (shape.tagName === 'line') {
            const x1 = parseFloat(shape.getAttribute('x1')) || 0;
            const x2 = parseFloat(shape.getAttribute('x2')) || 0;
            minX = Math.min(minX, x1, x2);
            maxX = Math.max(maxX, x1, x2);
          } else if (shape.tagName === 'image') {
            const imgX = parseFloat(shape.getAttribute('x')) || 0;
            const imgW = parseFloat(shape.getAttribute('width')) || 40;
            minX = Math.min(minX, imgX);
            maxX = Math.max(maxX, imgX + imgW);
          }
        });

        if (minX !== Infinity && maxX !== -Infinity) {
          // Add some padding to match participant box width
          const padding = 20;
          x = minX - padding;
          width = maxX - minX + padding * 2;
        }
      }

      // Fallback: use text position if no shapes found
      if (x === 0 && labelText) {
        const textX = parseFloat(labelText.getAttribute('x')) || 0;
        x = textX - 40; // Center around text
        width = 80;
      }
    }

    if (displayName) {
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
  if (!scrollContainer || !isOverlayEnabled) {
    return;
  }

  const svg = scrollContainer.querySelector('#diagram-container svg');
  if (!svg) {
    return;
  }

  // Get the participants group
  const participantsGroup = svg.querySelector('#participants');
  if (!participantsGroup) {
    return;
  }

  // Get first participant to find the top of participants
  const firstParticipant = participantsGroup.querySelector('.participant:not(.bottom-participant)');
  if (!firstParticipant) {
    return;
  }

  // Get participant Y position - try rect first, then other shapes
  let participantY = 50; // default
  const rect = firstParticipant.querySelector('rect');
  if (rect) {
    participantY = parseFloat(rect.getAttribute('y')) || 50;
  } else {
    const circle = firstParticipant.querySelector('circle');
    if (circle) {
      const cy = parseFloat(circle.getAttribute('cy')) || 0;
      const r = parseFloat(circle.getAttribute('r')) || 0;
      participantY = cy - r;
    }
  }

  // Account for SVG transform (zoom)
  const transform = svg.style.transform;
  let scale = 1;
  if (transform) {
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch) {
      scale = parseFloat(scaleMatch[1]) || 1;
    }
  }

  // Calculate if participants are scrolled out of view
  // scrollTop is how far we've scrolled down
  // Show overlay when the top of the participants is scrolled out of view
  const scrollTop = scrollContainer.scrollTop;
  const participantTop = participantY * scale;

  // Show overlay when we've scrolled past the top of the participants
  const shouldShow = scrollTop > participantTop;

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
  if (!overlayContainer || participantData.length === 0) {
    return;
  }

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
  if (!overlayContainer || !scrollContainer) return;

  const boxContainer = overlayContainer.querySelector('.participant-overlay-boxes');
  if (boxContainer) {
    // Offset the boxes by negative scroll amount to keep them aligned with diagram
    boxContainer.style.transform = `translateX(${-scrollContainer.scrollLeft}px)`;
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
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', handleScroll);
  }
  overlayContainer = null;
  scrollContainer = null;
  diagramPane = null;
  participantData = [];
  isOverlayVisible = false;
}
