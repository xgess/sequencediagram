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

  // Check for errors in AST and display them
  displayErrors(currentAst);

  return svg;
}

/**
 * Display parse errors in the errors div
 * @param {Array} ast - AST nodes array
 */
function displayErrors(ast) {
  const errors = ast.filter(node => node.type === 'error');

  if (errors.length === 0) {
    errorsDiv.innerHTML = '';
    errorsDiv.style.display = 'none';
    return;
  }

  errorsDiv.style.display = 'block';

  // Build error list HTML
  const errorCount = errors.length === 1 ? '1 error' : `${errors.length} errors`;
  let html = `<div class="error-header">${errorCount}</div><ul class="error-list">`;

  for (const error of errors) {
    const lineNum = error.sourceLineStart;
    const escapedMessage = escapeHtml(error.message);
    html += `<li class="error-item" data-line="${lineNum}">`;
    html += `<span class="error-line">Line ${lineNum}:</span> `;
    html += `<span class="error-text">${escapedMessage}</span>`;
    html += `</li>`;
  }

  html += '</ul>';
  errorsDiv.innerHTML = html;

  // Add click handlers to scroll to error line
  const errorItems = errorsDiv.querySelectorAll('.error-item');
  errorItems.forEach(item => {
    item.addEventListener('click', () => {
      const lineNum = parseInt(item.getAttribute('data-line'), 10);
      scrollToLine(lineNum);
    });
  });
}

/**
 * Scroll textarea to show the specified line
 * @param {number} lineNum - 1-indexed line number
 */
function scrollToLine(lineNum) {
  if (!sourceTextarea) return;

  const text = sourceTextarea.value;
  const lines = text.split('\n');

  // Calculate character position of the line start
  let charPos = 0;
  for (let i = 0; i < lineNum - 1 && i < lines.length; i++) {
    charPos += lines[i].length + 1; // +1 for newline
  }

  // Select the line
  const lineEnd = charPos + (lines[lineNum - 1]?.length || 0);
  sourceTextarea.focus();
  sourceTextarea.setSelectionRange(charPos, lineEnd);

  // Try to scroll the selection into view
  // This is a simple approximation since textarea doesn't have great scroll-to-line support
  const lineHeight = 20; // approximate
  sourceTextarea.scrollTop = (lineNum - 1) * lineHeight;
}

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
