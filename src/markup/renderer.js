// Text markup renderer
// See DESIGN.md for markup rendering strategy
// BACKLOG-139: Advanced text markup support

import { parseMarkup, hasMarkup } from './parser.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const LINE_HEIGHT = 16;

/**
 * Render text with markup to SVG text element
 * Supports nested markup (e.g., ""++big mono++"" preserves both styles)
 * Supports: bold, italic, underline, small, big, mono, strike,
 * color, size, sub, sup, link, stroke, background
 * @param {string} text - Text with markup
 * @param {Object} options - Rendering options
 * @param {number} options.x - X position
 * @param {number} options.y - Y position
 * @param {string} [options.textAnchor='start'] - Text anchor (start, middle, end)
 * @param {string} [options.fontFamily] - Font family
 * @param {string} [options.fontSize] - Font size
 * @param {string} [options.fontWeight] - Base font weight
 * @returns {SVGElement} SVG element (text or g with text/rect elements)
 */
export function renderMarkupText(text, options = {}) {
  const {
    x = 0,
    y = 0,
    textAnchor = 'start',
    fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif',
    fontSize = '12',
    fontWeight = 'normal'
  } = options;

  const baseFontSize = parseInt(fontSize, 10) || 12;

  // If no markup, return simple text element
  if (!hasMarkup(text)) {
    const textEl = document.createElementNS(SVG_NS, 'text');
    textEl.setAttribute('x', x);
    textEl.setAttribute('y', y);
    textEl.setAttribute('text-anchor', textAnchor);
    textEl.setAttribute('font-family', fontFamily);
    textEl.setAttribute('font-size', fontSize);
    if (fontWeight !== 'normal') {
      textEl.setAttribute('font-weight', fontWeight);
    }
    textEl.textContent = text;
    return textEl;
  }

  // Parse markup segments
  const segments = parseMarkup(text);

  // Check if we need background (requires wrapper group)
  const hasBackground = segments.some(s => s.type === 'background');

  // Create wrapper group if needed for background
  const wrapper = hasBackground ? document.createElementNS(SVG_NS, 'g') : null;

  const textEl = document.createElementNS(SVG_NS, 'text');
  textEl.setAttribute('x', x);
  textEl.setAttribute('y', y);
  textEl.setAttribute('text-anchor', textAnchor);
  textEl.setAttribute('font-family', fontFamily);
  textEl.setAttribute('font-size', fontSize);
  if (fontWeight !== 'normal') {
    textEl.setAttribute('font-weight', fontWeight);
  }

  // Track line state across recursive calls
  const lineState = { currentLine: 0 };

  // Render segments recursively with style inheritance
  renderSegments(segments, textEl, {}, baseFontSize, x, lineState);

  if (wrapper) {
    wrapper.appendChild(textEl);
    return wrapper;
  }

  return textEl;
}

/**
 * Render segments recursively, accumulating styles
 * @param {Array} segments - Parsed segments
 * @param {SVGElement} textEl - Parent text element
 * @param {Object} inheritedStyles - Styles inherited from parent segments
 * @param {number} baseFontSize - Base font size for calculations
 * @param {number} x - X position for line breaks
 * @param {Object} lineState - Shared line state { currentLine }
 */
function renderSegments(segments, textEl, inheritedStyles, baseFontSize, x, lineState) {
  for (const segment of segments) {
    if (segment.type === 'linebreak') {
      lineState.currentLine++;
      continue;
    }

    // Calculate styles for this segment (inherit + own)
    const styles = { ...inheritedStyles };
    applySegmentStyle(styles, segment, baseFontSize);

    // If segment has children, recurse with accumulated styles
    if (segment.children && segment.children.length > 0) {
      renderSegments(segment.children, textEl, styles, baseFontSize, x, lineState);
    } else {
      // Leaf node - create tspan with all accumulated styles
      let el;

      if (segment.type === 'link') {
        // Wrap in <a> element for clickable link
        const link = document.createElementNS(SVG_NS, 'a');
        link.setAttributeNS(XLINK_NS, 'xlink:href', segment.value);
        link.setAttribute('href', segment.value);
        link.setAttribute('target', '_blank');
        el = document.createElementNS(SVG_NS, 'tspan');
        el.textContent = segment.content || '';
        // Apply link-specific styles
        if (!styles.fill) styles.fill = '#0066cc';
        if (!styles.textDecoration) styles.textDecoration = 'underline';
        applyStylesToElement(el, styles);
        link.appendChild(el);

        // Handle line positioning
        if (lineState.currentLine > 0) {
          el.setAttribute('x', x);
          el.setAttribute('dy', LINE_HEIGHT);
          lineState.currentLine = 0;
        }

        textEl.appendChild(link);
        continue;
      }

      el = document.createElementNS(SVG_NS, 'tspan');
      el.textContent = segment.content || '';

      // Position for new lines
      if (lineState.currentLine > 0) {
        el.setAttribute('x', x);
        el.setAttribute('dy', LINE_HEIGHT);
        lineState.currentLine = 0;
      }

      // Apply all accumulated styles
      applyStylesToElement(el, styles);

      textEl.appendChild(el);
    }
  }
}

/**
 * Apply segment-specific style to accumulated styles object
 * @param {Object} styles - Styles object to modify
 * @param {Object} segment - Segment with type info
 * @param {number} baseFontSize - Base font size
 */
function applySegmentStyle(styles, segment, baseFontSize) {
  switch (segment.type) {
    case 'bold':
      styles.fontWeight = 'bold';
      break;
    case 'italic':
      styles.fontStyle = 'italic';
      break;
    case 'underline':
      styles.textDecoration = 'underline';
      break;
    case 'small':
      styles.fontSize = Math.round(baseFontSize * 0.8);
      break;
    case 'big':
      styles.fontSize = Math.round(baseFontSize * 1.3);
      break;
    case 'mono':
      styles.fontFamily = 'monospace';
      break;
    case 'strike':
      styles.textDecoration = 'line-through';
      break;
    case 'color':
      styles.fill = segment.value;
      break;
    case 'size':
      styles.fontSize = segment.value;
      break;
    case 'sub':
      styles.fontSize = Math.round(baseFontSize * 0.7);
      styles.baselineShift = 'sub';
      break;
    case 'sup':
      styles.fontSize = Math.round(baseFontSize * 0.7);
      styles.baselineShift = 'super';
      break;
    case 'stroke':
      styles.stroke = segment.strokeColor;
      styles.strokeWidth = segment.strokeWidth;
      styles.paintOrder = 'stroke fill';
      break;
    case 'background':
      styles.dataBackground = segment.value;
      break;
    case 'align':
      // Map align values to SVG text-anchor
      const alignMap = { left: 'start', center: 'middle', right: 'end' };
      styles.textAnchor = alignMap[segment.value] || 'start';
      break;
    case 'position':
      // Position affects where the text block is placed
      styles.dataPosition = segment.value;
      break;
  }
}

/**
 * Apply accumulated styles to a tspan element
 * @param {SVGElement} el - Element to style
 * @param {Object} styles - Accumulated styles
 */
function applyStylesToElement(el, styles) {
  if (styles.fontWeight) el.setAttribute('font-weight', styles.fontWeight);
  if (styles.fontStyle) el.setAttribute('font-style', styles.fontStyle);
  if (styles.textDecoration) el.setAttribute('text-decoration', styles.textDecoration);
  if (styles.fontSize) el.setAttribute('font-size', styles.fontSize);
  if (styles.fontFamily) el.setAttribute('font-family', styles.fontFamily);
  if (styles.fill) el.setAttribute('fill', styles.fill);
  if (styles.baselineShift) el.setAttribute('baseline-shift', styles.baselineShift);
  if (styles.stroke) el.setAttribute('stroke', styles.stroke);
  if (styles.strokeWidth) el.setAttribute('stroke-width', styles.strokeWidth);
  if (styles.paintOrder) el.setAttribute('paint-order', styles.paintOrder);
  if (styles.dataBackground) el.setAttribute('data-background', styles.dataBackground);
  if (styles.textAnchor) el.setAttribute('text-anchor', styles.textAnchor);
  if (styles.dataPosition) el.setAttribute('data-position', styles.dataPosition);
}

/**
 * Check if text needs multiline rendering
 * @param {string} text - Text to check
 * @returns {boolean} True if text contains linebreaks
 */
export function isMultiline(text) {
  return !!(text && text.includes('\\n'));
}

/**
 * Get number of lines in text
 * @param {string} text - Text to check
 * @returns {number} Number of lines
 */
export function getLineCount(text) {
  if (!text) return 1;
  const matches = text.match(/\\n/g);
  return matches ? matches.length + 1 : 1;
}
