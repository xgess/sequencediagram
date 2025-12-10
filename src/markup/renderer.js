// Text markup renderer
// See DESIGN.md for markup rendering strategy

import { parseMarkup, hasMarkup } from './parser.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const LINE_HEIGHT = 16;

/**
 * Render text with markup to SVG text element
 * @param {string} text - Text with markup
 * @param {Object} options - Rendering options
 * @param {number} options.x - X position
 * @param {number} options.y - Y position
 * @param {string} [options.textAnchor='start'] - Text anchor (start, middle, end)
 * @param {string} [options.fontFamily] - Font family
 * @param {string} [options.fontSize] - Font size
 * @param {string} [options.fontWeight] - Base font weight
 * @returns {SVGTextElement} SVG text element with tspans
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

  const textEl = document.createElementNS(SVG_NS, 'text');
  textEl.setAttribute('x', x);
  textEl.setAttribute('y', y);
  textEl.setAttribute('text-anchor', textAnchor);
  textEl.setAttribute('font-family', fontFamily);
  textEl.setAttribute('font-size', fontSize);
  if (fontWeight !== 'normal') {
    textEl.setAttribute('font-weight', fontWeight);
  }

  // If no markup, just set text content directly
  if (!hasMarkup(text)) {
    textEl.textContent = text;
    return textEl;
  }

  // Parse and render markup
  const segments = parseMarkup(text);
  let currentLine = 0;

  for (const segment of segments) {
    if (segment.type === 'linebreak') {
      currentLine++;
      continue;
    }

    const tspan = document.createElementNS(SVG_NS, 'tspan');
    tspan.textContent = segment.content || '';

    // Position for new lines
    if (currentLine > 0) {
      tspan.setAttribute('x', x);
      tspan.setAttribute('dy', LINE_HEIGHT);
      currentLine = 0; // Reset after applying dy
    }

    // Apply styling based on segment type
    if (segment.type === 'bold') {
      tspan.setAttribute('font-weight', 'bold');
    } else if (segment.type === 'italic') {
      tspan.setAttribute('font-style', 'italic');
    }

    textEl.appendChild(tspan);
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
