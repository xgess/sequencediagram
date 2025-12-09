// App initialization and main entry point
// Wires together parser, renderer, and UI

import { parse } from './ast/parser.js';
import { serialize } from './ast/serializer.js';
import { render } from './rendering/renderer.js';

// App state
let currentAst = [];

// DOM element references
let sourceTextarea;
let diagramContainer;
let errorsDiv;
let renderButton;

/**
 * Initialize the application
 */
export function init() {
  // Get DOM elements
  sourceTextarea = document.getElementById('source');
  diagramContainer = document.getElementById('diagram-pane');
  errorsDiv = document.getElementById('errors');
  renderButton = document.getElementById('render-btn');

  if (!sourceTextarea || !diagramContainer || !renderButton) {
    console.error('Required DOM elements not found');
    return;
  }

  // Wire up render button
  renderButton.addEventListener('click', handleRender);

  // Add sample text
  sourceTextarea.value = 'participant Alice\nparticipant Bob\ndatabase DB\n\nAlice->Bob:Hello\nBob-->Alice:Hi there!\nAlice->>DB:Save data\nDB-->>Alice:OK';

  console.log('Sequence Diagram Tool initialized');
}

/**
 * Handle render button click
 */
function handleRender() {
  const text = sourceTextarea.value;
  updateFromText(text);
}

/**
 * Parse text and update diagram
 * @param {string} text - Source text
 */
export function updateFromText(text) {
  // Clear previous errors
  errorsDiv.textContent = '';

  // Parse text to AST
  currentAst = parse(text);

  // Log AST for debugging
  console.log('AST:', currentAst);

  // Render AST to SVG
  const svg = render(currentAst);

  // Replace diagram in container
  const existingSvg = diagramContainer.querySelector('svg');
  if (existingSvg) {
    existingSvg.remove();
  }
  diagramContainer.appendChild(svg);

  // Check for errors in AST
  const errors = currentAst.filter(node => node.type === 'error');
  if (errors.length > 0) {
    errorsDiv.textContent = `${errors.length} error(s) found`;
  }

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
