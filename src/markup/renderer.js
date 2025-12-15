// Text markup renderer
// See DESIGN.md for markup rendering strategy
// BACKLOG-139: Advanced text markup support

import { parseMarkup, hasMarkup } from './parser.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const LINE_HEIGHT = 16;

/**
 * Render text with markup to SVG text element
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

  let currentLine = 0;

  for (const segment of segments) {
    if (segment.type === 'linebreak') {
      currentLine++;
      continue;
    }

    // Create appropriate element based on type
    let el;

    if (segment.type === 'link') {
      // Wrap in <a> element for clickable link
      const link = document.createElementNS(SVG_NS, 'a');
      link.setAttributeNS(XLINK_NS, 'xlink:href', segment.value);
      link.setAttribute('href', segment.value);
      link.setAttribute('target', '_blank');
      el = document.createElementNS(SVG_NS, 'tspan');
      el.textContent = segment.content || '';
      el.setAttribute('fill', '#0066cc');
      el.setAttribute('text-decoration', 'underline');
      link.appendChild(el);
      textEl.appendChild(link);

      // Handle line positioning
      if (currentLine > 0) {
        el.setAttribute('x', x);
        el.setAttribute('dy', LINE_HEIGHT);
        currentLine = 0;
      }
      continue;
    }

    el = document.createElementNS(SVG_NS, 'tspan');
    el.textContent = segment.content || '';

    // Position for new lines
    if (currentLine > 0) {
      el.setAttribute('x', x);
      el.setAttribute('dy', LINE_HEIGHT);
      currentLine = 0;
    }

    // Apply styling based on segment type
    switch (segment.type) {
      case 'bold':
        el.setAttribute('font-weight', 'bold');
        break;
      case 'italic':
        el.setAttribute('font-style', 'italic');
        break;
      case 'underline':
        el.setAttribute('text-decoration', 'underline');
        break;
      case 'small':
        el.setAttribute('font-size', Math.round(baseFontSize * 0.8));
        break;
      case 'big':
        el.setAttribute('font-size', Math.round(baseFontSize * 1.3));
        break;
      case 'mono':
        el.setAttribute('font-family', 'monospace');
        break;
      case 'strike':
        el.setAttribute('text-decoration', 'line-through');
        break;
      case 'color':
        el.setAttribute('fill', segment.value);
        break;
      case 'size':
        el.setAttribute('font-size', segment.value);
        break;
      case 'sub':
        el.setAttribute('font-size', Math.round(baseFontSize * 0.7));
        el.setAttribute('baseline-shift', 'sub');
        break;
      case 'sup':
        el.setAttribute('font-size', Math.round(baseFontSize * 0.7));
        el.setAttribute('baseline-shift', 'super');
        break;
      case 'stroke':
        el.setAttribute('stroke', segment.strokeColor);
        el.setAttribute('stroke-width', segment.strokeWidth);
        el.setAttribute('paint-order', 'stroke fill');
        break;
      case 'background':
        // Background is handled separately - mark with data attribute
        el.setAttribute('data-background', segment.value);
        break;
    }

    textEl.appendChild(el);
  }

  if (wrapper) {
    wrapper.appendChild(textEl);
    return wrapper;
  }

  return textEl;
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
