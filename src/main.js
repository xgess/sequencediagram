// App initialization and main entry point
// Wires together parser, renderer, and UI with CodeMirror editor

import { parse } from './ast/parser.js';
import { serialize } from './ast/serializer.js';
import { render } from './rendering/renderer.js';
import { defineMode } from './editor/mode.js';
import { registerHint, setupAutoComplete } from './editor/hint.js';
import { registerLinter, setupLinting } from './editor/linter.js';

// App state
let currentAst = [];
let editor = null;
let debounceTimer = null;

// DOM element references
let editorContainer;
let diagramContainer;
let errorsDiv;

// Debounce delay for auto-render (ms)
const DEBOUNCE_DELAY = 300;

/**
 * Initialize the application
 */
export function init() {
  // Get DOM elements
  editorContainer = document.getElementById('editor');
  diagramContainer = document.getElementById('diagram-pane');
  errorsDiv = document.getElementById('errors');

  if (!editorContainer || !diagramContainer) {
    console.error('Required DOM elements not found');
    return;
  }

  // Initialize CodeMirror
  initCodeMirror();

  console.log('Sequence Diagram Tool initialized');
}

/**
 * Initialize CodeMirror editor
 */
function initCodeMirror() {
  // Check if CodeMirror is available
  if (typeof CodeMirror === 'undefined') {
    console.error('CodeMirror not loaded');
    return;
  }

  // Define our custom syntax highlighting mode
  defineMode(CodeMirror);

  // Register hint provider
  registerHint(CodeMirror);

  // Register linter
  registerLinter(CodeMirror);

  // Sample diagram text
  const sampleText = `title Sample Diagram

participant Alice
participant Bob
database DB

// Send a message
Alice->Bob:Hello
Bob-->Alice:Hi there!

// Database interaction
Alice->>DB:Save data
DB-->>Alice:OK`;

  // Create CodeMirror instance
  editor = CodeMirror(editorContainer, {
    value: sampleText,
    mode: 'sequence-diagram',
    lineNumbers: true,
    lineWrapping: false,
    tabSize: 2,
    indentWithTabs: false,
    theme: 'default',
    autofocus: true
  });

  // Setup auto-completion
  setupAutoComplete(editor);

  // Setup linting (error markers)
  setupLinting(editor);

  // Wire up change handler with debounce
  editor.on('change', handleEditorChange);

  // Initial render
  updateFromText(sampleText);
}

/**
 * Handle editor content change with debounce
 */
function handleEditorChange() {
  // Clear previous timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // Set new timer for debounced update
  debounceTimer = setTimeout(() => {
    const text = editor.getValue();
    updateFromText(text);
  }, DEBOUNCE_DELAY);
}

/**
 * Parse text and update diagram
 * @param {string} text - Source text
 */
export function updateFromText(text) {
  // Clear previous errors
  if (errorsDiv) {
    errorsDiv.textContent = '';
  }

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
  if (!errorsDiv) return;

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
 * Scroll editor to show the specified line
 * @param {number} lineNum - 1-indexed line number
 */
function scrollToLine(lineNum) {
  if (!editor) return;

  // CodeMirror uses 0-indexed lines
  const line = lineNum - 1;

  // Move cursor to line and select it
  editor.setCursor({ line, ch: 0 });
  editor.setSelection(
    { line, ch: 0 },
    { line, ch: editor.getLine(line)?.length || 0 }
  );

  // Scroll the line into view
  editor.scrollIntoView({ line, ch: 0 }, 100);

  // Focus the editor
  editor.focus();
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

/**
 * Get CodeMirror editor instance
 * @returns {CodeMirror} Editor instance
 */
export function getEditor() {
  return editor;
}

// Auto-init when DOM ready (for browser)
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
