// App initialization and main entry point
// Wires together parser, renderer, and UI

import { parse } from './ast/parser.js';
import { serialize } from './ast/serializer.js';
import { render } from './rendering/renderer.js';

// App state
let currentAst = [];

/**
 * Initialize the application
 */
export function init() {
  // TODO(Phase1): Wire up UI elements
  console.log('Sequence Diagram Tool initialized');
}

/**
 * Parse text and update diagram
 * @param {string} text - Source text
 */
export function updateFromText(text) {
  currentAst = parse(text);
  const svg = render(currentAst);
  // TODO(Phase1): Insert SVG into DOM
  return svg;
}

/**
 * Get current AST
 * @returns {Array} Current AST
 */
export function getAst() {
  return currentAst;
}

/**
 * Get serialized text from current AST
 * @returns {string} Serialized text
 */
export function getText() {
  return serialize(currentAst);
}

// Auto-init when DOM ready (for browser)
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
