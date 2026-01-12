// Context-sensitive cursor behavior (BACKLOG-072)
// Changes cursor based on what element is being hovered

/**
 * Initialize cursor handling on an SVG element
 * @param {SVGElement} svg - The SVG diagram element
 */
export function initCursors(svg) {
  if (!svg) return;

  // Add CSS for cursor styles
  addCursorStyles();

  // Add mouseover handler for cursor changes
  svg.addEventListener('mouseover', handleMouseOver);
  svg.addEventListener('mouseout', handleMouseOut);
}

/**
 * Remove cursor handling from SVG
 * @param {SVGElement} svg - The SVG diagram element
 */
export function removeCursors(svg) {
  if (svg) {
    svg.removeEventListener('mouseover', handleMouseOver);
    svg.removeEventListener('mouseout', handleMouseOut);
  }
}

/**
 * Handle mouseover for cursor changes
 * @param {MouseEvent} event
 */
function handleMouseOver(event) {
  const target = event.target;

  // Find the closest group with class indicating type
  const messageGroup = target.closest('.message');
  const participantGroup = target.closest('.participant');
  const fragmentGroup = target.closest('.fragment');
  const errorGroup = target.closest('.error');

  // Check for specific interactive regions
  if (messageGroup) {
    // Check if hovering over line (draggable) or endpoint (resizable)
    if (target.tagName === 'line') {
      // Hovering over message line - can drag to reposition
      messageGroup.classList.add('cursor-move');
    } else if (isNearEndpoint(target, event)) {
      // Near endpoint - can drag to change target/source
      messageGroup.classList.add('cursor-ew-resize');
    } else {
      messageGroup.classList.add('cursor-pointer');
    }
  } else if (participantGroup) {
    // Participants are clickable and draggable
    participantGroup.classList.add('cursor-grab');
  } else if (fragmentGroup) {
    // Check if hovering over boundary
    if (isNearFragmentBoundary(target, event, fragmentGroup)) {
      fragmentGroup.classList.add('cursor-ns-resize');
    } else {
      fragmentGroup.classList.add('cursor-pointer');
    }
  } else if (errorGroup) {
    errorGroup.classList.add('cursor-pointer');
  }
}

/**
 * Handle mouseout to reset cursor
 * @param {MouseEvent} event
 */
function handleMouseOut(event) {
  const target = event.target;

  // Find parent groups and remove cursor classes
  const group = target.closest('.message, .participant, .fragment, .error');
  if (group) {
    group.classList.remove(
      'cursor-pointer',
      'cursor-move',
      'cursor-grab',
      'cursor-grabbing',
      'cursor-ew-resize',
      'cursor-ns-resize'
    );
  }
}

/**
 * Check if mouse is near a message endpoint
 * @param {Element} target
 * @param {MouseEvent} event
 * @returns {boolean}
 */
function isNearEndpoint(target, event) {
  // For now, check if target is a polygon (arrowhead) or near line ends
  if (target.tagName === 'polygon' || target.tagName === 'path') {
    return true;
  }

  // Check if near the start or end of a line
  if (target.tagName === 'line') {
    const line = target;
    const x1 = parseFloat(line.getAttribute('x1') || 0);
    const y1 = parseFloat(line.getAttribute('y1') || 0);
    const x2 = parseFloat(line.getAttribute('x2') || 0);
    const y2 = parseFloat(line.getAttribute('y2') || 0);

    // Get mouse position relative to SVG
    const svg = target.ownerSVGElement;
    if (!svg) return false;

    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;

    try {
      const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
      const threshold = 15; // pixels

      // Check distance to endpoints
      const distToStart = Math.sqrt(Math.pow(svgPt.x - x1, 2) + Math.pow(svgPt.y - y1, 2));
      const distToEnd = Math.sqrt(Math.pow(svgPt.x - x2, 2) + Math.pow(svgPt.y - y2, 2));

      return distToStart < threshold || distToEnd < threshold;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Check if mouse is near a fragment boundary (top or bottom edge)
 * @param {Element} target
 * @param {MouseEvent} event
 * @param {Element} fragmentGroup
 * @returns {boolean}
 */
function isNearFragmentBoundary(target, event, fragmentGroup) {
  // Get the main rect of the fragment
  const rect = fragmentGroup.querySelector('rect');
  if (!rect) return false;

  const svg = target.ownerSVGElement;
  if (!svg) return false;

  try {
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

    const y = parseFloat(rect.getAttribute('y') || 0);
    const height = parseFloat(rect.getAttribute('height') || 0);
    const threshold = 10;

    // Check if near top or bottom edge
    const distToTop = Math.abs(svgPt.y - y);
    const distToBottom = Math.abs(svgPt.y - (y + height));

    return distToTop < threshold || distToBottom < threshold;
  } catch {
    return false;
  }
}

/**
 * Add CSS styles for cursor classes
 */
function addCursorStyles() {
  if (document.getElementById('cursor-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'cursor-styles';
  style.textContent = `
    /* Context-sensitive cursors for diagram elements */
    .cursor-pointer {
      cursor: pointer !important;
    }

    .cursor-pointer * {
      cursor: pointer !important;
    }

    .cursor-move {
      cursor: move !important;
    }

    .cursor-move * {
      cursor: move !important;
    }

    .cursor-grab {
      cursor: grab !important;
    }

    .cursor-grab * {
      cursor: grab !important;
    }

    .cursor-grabbing {
      cursor: grabbing !important;
    }

    .cursor-grabbing * {
      cursor: grabbing !important;
    }

    .cursor-ew-resize {
      cursor: ew-resize !important;
    }

    .cursor-ew-resize * {
      cursor: ew-resize !important;
    }

    .cursor-ns-resize {
      cursor: ns-resize !important;
    }

    .cursor-ns-resize * {
      cursor: ns-resize !important;
    }

    /* Default cursor for SVG background */
    #diagram {
      cursor: default;
    }
  `;

  document.head.appendChild(style);
}
