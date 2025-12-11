// App initialization and main entry point
// Wires together parser, renderer, and UI with CodeMirror editor

import { parse } from './ast/parser.js';
import { serialize } from './ast/serializer.js';
import { render } from './rendering/renderer.js';
import { defineMode } from './editor/mode.js';
import { registerHint, setupAutoComplete } from './editor/hint.js';
import { registerLinter, setupLinting } from './editor/linter.js';
import { CommandHistory } from './commands/Command.js';
import { ReplaceASTCommand } from './commands/ReplaceASTCommand.js';
import { RemoveNodeCommand } from './commands/RemoveNodeCommand.js';
import { initSelection, removeSelection, selectElement, deselectAll, getSelectedId } from './interaction/selection.js';
import { initCursors, removeCursors } from './interaction/cursors.js';
import { initDrag, removeDrag } from './interaction/drag.js';
import { ReorderNodeCommand } from './commands/ReorderNodeCommand.js';
import { MoveMessageTargetCommand } from './commands/MoveMessageTargetCommand.js';
import { MoveMessageSourceCommand } from './commands/MoveMessageSourceCommand.js';
import { EditMessageLabelCommand } from './commands/EditMessageLabelCommand.js';
import { AddMessageCommand } from './commands/AddMessageCommand.js';
import { ReorderParticipantCommand } from './commands/ReorderParticipantCommand.js';
import { showInlineEdit, hideInlineEdit } from './interaction/inlineEdit.js';
import { initLifelineDrag, removeLifelineDrag } from './interaction/lifelineDrag.js';

// App state
let currentAst = [];
let editor = null;
let debounceTimer = null;
let commandHistory = new CommandHistory(100);
let previousText = '';
let isUndoRedoInProgress = false;
let currentSvg = null;

// DOM element references
let editorContainer;
let diagramContainer;
let errorsDiv;
let wrapToggleBtn;

// Debounce delay for auto-render (ms)
const DEBOUNCE_DELAY = 300;

// localStorage keys
const STORAGE_KEY_WRAP = 'sequencediagram.wordWrap';
const STORAGE_KEY_TAB_SIZE = 'sequencediagram.tabSize';

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

  // Initialize toolbar
  initToolbar();

  // Initialize keyboard shortcuts for diagram
  initDiagramKeyboard();

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

  // Load preferences from localStorage
  const wordWrap = loadPreference(STORAGE_KEY_WRAP, false);
  const tabSize = loadPreference(STORAGE_KEY_TAB_SIZE, 2);

  // Create CodeMirror instance
  // Undo/redo is built-in: Ctrl-Z/Cmd-Z to undo, Ctrl-Y/Cmd-Shift-Z to redo
  // undoDepth configures history size (default 200, we use 100)
  editor = CodeMirror(editorContainer, {
    value: sampleText,
    mode: 'sequence-diagram',
    lineNumbers: true,
    lineWrapping: wordWrap,
    tabSize: tabSize,
    indentWithTabs: false,
    indentUnit: tabSize,
    smartIndent: true,
    theme: 'default',
    autofocus: true,
    undoDepth: 100,  // History depth for undo/redo
    extraKeys: {
      // Tab inserts spaces
      'Tab': function(cm) {
        if (cm.somethingSelected()) {
          cm.indentSelection('add');
        } else {
          cm.replaceSelection(' '.repeat(cm.getOption('indentUnit')), 'end');
        }
      },
      // Shift-Tab de-indents
      'Shift-Tab': function(cm) {
        cm.indentSelection('subtract');
      }
    }
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
  // Skip if this change is from undo/redo
  if (isUndoRedoInProgress) {
    return;
  }

  // Clear previous timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // Set new timer for debounced update
  debounceTimer = setTimeout(() => {
    const text = editor.getValue();

    // Only create command if text actually changed
    if (text !== previousText) {
      updateFromText(text, true); // true = create command
    }
  }, DEBOUNCE_DELAY);
}

/**
 * Parse text and update diagram
 * @param {string} text - Source text
 * @param {boolean} createCommand - Whether to create a ReplaceAST command
 */
export function updateFromText(text, createCommand = false) {
  // Clear previous errors
  if (errorsDiv) {
    errorsDiv.textContent = '';
  }

  // Store old AST for command
  const oldAst = currentAst;
  const oldText = previousText;

  // Parse text to AST
  currentAst = parse(text);

  // Create command if requested and text changed
  if (createCommand && text !== oldText) {
    const cmd = new ReplaceASTCommand(oldAst, currentAst, oldText, text);
    commandHistory.execute(cmd, oldAst);
  }

  // Update previous text for next comparison
  previousText = text;

  // Log AST for debugging
  console.log('AST:', currentAst);

  // Render AST to SVG
  const svg = render(currentAst);

  // Remove handlers from old SVG if exists
  if (currentSvg) {
    removeSelection(currentSvg);
    removeCursors(currentSvg);
    removeDrag(currentSvg);
    removeLifelineDrag(currentSvg);
  }

  // Replace diagram in container
  const existingSvg = diagramContainer.querySelector('svg');
  if (existingSvg) {
    existingSvg.remove();
  }
  diagramContainer.appendChild(svg);

  // Store reference and initialize interactions
  currentSvg = svg;
  initSelection(svg, handleSelectionChange, handleDoubleClick);
  initCursors(svg);
  initDrag(svg, handleDragComplete, handleEndpointChange, handleParticipantReorder);
  initLifelineDrag(svg, handleLifelineDrag);

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

/**
 * Undo the last change
 * Uses command history for structural edits, falls back to CodeMirror for typing
 */
export function undo() {
  if (!editor) return;

  // Check if we have command history to undo
  if (commandHistory.canUndo()) {
    isUndoRedoInProgress = true;

    // Get the command's old text
    const lastCommand = commandHistory.undoStack[commandHistory.undoStack.length - 1];
    const oldText = lastCommand.getOldText();

    // Undo the command (updates AST internally)
    currentAst = commandHistory.undo(currentAst);
    previousText = oldText;

    // Update editor without triggering new command
    editor.setValue(oldText);

    // Re-render with the old AST
    renderCurrentAst();

    isUndoRedoInProgress = false;
  } else {
    // Fall back to CodeMirror's character-level undo
    editor.undo();
  }
}

/**
 * Redo the last undone change
 * Uses command history for structural edits, falls back to CodeMirror for typing
 */
export function redo() {
  if (!editor) return;

  // Check if we have command history to redo
  if (commandHistory.canRedo()) {
    isUndoRedoInProgress = true;

    // Get the command's new text
    const nextCommand = commandHistory.redoStack[commandHistory.redoStack.length - 1];
    const newText = nextCommand.getNewText();

    // Redo the command (updates AST internally)
    currentAst = commandHistory.redo(currentAst);
    previousText = newText;

    // Update editor without triggering new command
    editor.setValue(newText);

    // Re-render with the new AST
    renderCurrentAst();

    isUndoRedoInProgress = false;
  } else {
    // Fall back to CodeMirror's character-level redo
    editor.redo();
  }
}

/**
 * Render current AST to diagram (without parsing)
 */
function renderCurrentAst() {
  const svg = render(currentAst);

  // Remove handlers from old SVG if exists
  if (currentSvg) {
    removeSelection(currentSvg);
    removeCursors(currentSvg);
    removeDrag(currentSvg);
    removeLifelineDrag(currentSvg);
  }

  // Replace diagram in container
  const existingSvg = diagramContainer.querySelector('svg');
  if (existingSvg) {
    existingSvg.remove();
  }
  diagramContainer.appendChild(svg);

  // Store reference and initialize interactions
  currentSvg = svg;
  initSelection(svg, handleSelectionChange, handleDoubleClick);
  initCursors(svg);
  initDrag(svg, handleDragComplete, handleEndpointChange, handleParticipantReorder);
  initLifelineDrag(svg, handleLifelineDrag);

  // Check for errors in AST and display them
  displayErrors(currentAst);
}

/**
 * Get undo/redo history info
 * @returns {Object} {canUndo, canRedo, undoSize, redoSize, commandCanUndo, commandCanRedo}
 */
export function getHistoryInfo() {
  if (!editor) return { canUndo: false, canRedo: false, undoSize: 0, redoSize: 0, commandCanUndo: false, commandCanRedo: false };

  const cmHistory = editor.getDoc().historySize();
  const cmdInfo = commandHistory.getInfo();

  return {
    canUndo: cmHistory.undo > 0 || cmdInfo.canUndo,
    canRedo: cmHistory.redo > 0 || cmdInfo.canRedo,
    undoSize: cmHistory.undo,
    redoSize: cmHistory.redo,
    commandCanUndo: cmdInfo.canUndo,
    commandCanRedo: cmdInfo.canRedo,
    commandUndoCount: cmdInfo.undoCount,
    commandRedoCount: cmdInfo.redoCount
  };
}

/**
 * Get command history instance
 * @returns {CommandHistory}
 */
export function getCommandHistory() {
  return commandHistory;
}

/**
 * Clear command history
 */
export function clearCommandHistory() {
  commandHistory.clear();
}

// Line highlight marker in CodeMirror
let lineHighlightMarker = null;

/**
 * Handle selection change callback
 * @param {string|null} nodeId - Selected node ID or null
 */
function handleSelectionChange(nodeId) {
  console.log('Selection changed:', nodeId);

  // Clear previous line highlight
  clearLineHighlight();

  // Find the node in AST
  const node = nodeId ? findNodeById(nodeId) : null;

  // Log for debugging
  if (node) {
    console.log('Selected node:', node);

    // Highlight source lines in editor
    if (node.sourceLineStart !== undefined) {
      highlightSourceLines(node.sourceLineStart, node.sourceLineEnd || node.sourceLineStart);
    }
  }
}

/**
 * Highlight source lines in CodeMirror
 * @param {number} startLine - 1-indexed start line
 * @param {number} endLine - 1-indexed end line
 */
function highlightSourceLines(startLine, endLine) {
  if (!editor) return;

  // CodeMirror uses 0-indexed lines
  const start = startLine - 1;
  const end = endLine - 1;

  // Mark the lines
  lineHighlightMarker = editor.markText(
    { line: start, ch: 0 },
    { line: end, ch: editor.getLine(end)?.length || 0 },
    { className: 'cm-selection-highlight' }
  );

  // Scroll the start line into view
  editor.scrollIntoView({ line: start, ch: 0 }, 100);
}

/**
 * Clear line highlight in CodeMirror
 */
function clearLineHighlight() {
  if (lineHighlightMarker) {
    lineHighlightMarker.clear();
    lineHighlightMarker = null;
  }
}

/**
 * Handle drag completion - reorder node
 * @param {string} nodeId - ID of dragged node
 * @param {number} deltaIndex - How many positions to move (positive = down, negative = up)
 */
function handleDragComplete(nodeId, deltaIndex) {
  if (!nodeId || deltaIndex === 0) return;

  // Find node and its current index
  const nodeInfo = findNodeWithLocation(nodeId);
  if (!nodeInfo) return;

  const { index: oldIndex, parentId, parentProperty, clauseIndex } = nodeInfo;

  // Calculate new index
  let newIndex = oldIndex + deltaIndex;

  // Get the array length for bounds checking
  let maxIndex;
  if (parentId) {
    const parent = currentAst.find(n => n.id === parentId);
    if (!parent) return;

    if (parentProperty === 'entries') {
      maxIndex = parent.entries.length - 1;
    } else if (parentProperty === 'elseClauses' && clauseIndex !== null) {
      maxIndex = parent.elseClauses[clauseIndex].entries.length - 1;
    }
  } else {
    maxIndex = currentAst.length - 1;
  }

  // Clamp to valid range
  newIndex = Math.max(0, Math.min(newIndex, maxIndex));

  // Don't reorder if index didn't change
  if (newIndex === oldIndex) return;

  // Create and execute reorder command
  const cmd = new ReorderNodeCommand(nodeId, oldIndex, newIndex, parentId, parentProperty, clauseIndex);
  currentAst = commandHistory.execute(cmd, currentAst);

  // Update text and re-render
  const newText = serialize(currentAst);
  previousText = newText;

  // Update editor without creating another command
  isUndoRedoInProgress = true;
  editor.setValue(newText);
  isUndoRedoInProgress = false;

  // Re-render
  renderCurrentAst();

  console.log(`Reordered ${nodeId} from ${oldIndex} to ${newIndex}`);
}

/**
 * Handle endpoint change - modify message source or target
 * @param {string} nodeId - ID of the message node
 * @param {string} endpointType - 'source' or 'target'
 * @param {string} newParticipant - Alias of the new participant
 */
function handleEndpointChange(nodeId, endpointType, newParticipant) {
  if (!nodeId || !newParticipant) return;

  // Find the message node
  const node = findNodeById(nodeId);
  if (!node || node.type !== 'message') return;

  // Get old participant
  const oldParticipant = endpointType === 'source' ? node.from : node.to;

  // Don't change if same participant
  if (oldParticipant === newParticipant) return;

  // Create and execute appropriate command
  let cmd;
  if (endpointType === 'source') {
    cmd = new MoveMessageSourceCommand(nodeId, oldParticipant, newParticipant);
  } else {
    cmd = new MoveMessageTargetCommand(nodeId, oldParticipant, newParticipant);
  }

  currentAst = commandHistory.execute(cmd, currentAst);

  // Update text and re-render
  const newText = serialize(currentAst);
  previousText = newText;

  // Update editor without creating another command
  isUndoRedoInProgress = true;
  editor.setValue(newText);
  isUndoRedoInProgress = false;

  // Re-render
  renderCurrentAst();

  console.log(`Changed message ${nodeId} ${endpointType} from ${oldParticipant} to ${newParticipant}`);
}

/**
 * Handle double-click on diagram element
 * @param {string} nodeId - ID of the double-clicked node
 * @param {SVGElement} element - The SVG element that was clicked
 */
function handleDoubleClick(nodeId, element) {
  if (!nodeId) return;

  // Find the node
  const node = findNodeById(nodeId);
  if (!node) return;

  // Handle based on node type
  if (node.type === 'message') {
    // Show inline edit for message label
    showInlineEdit(element, nodeId, node.label || '', handleLabelEditComplete);
  }
  // Future: handle other node types (participant, fragment condition, etc.)
}

/**
 * Handle completion of label edit
 * @param {string} nodeId - ID of the edited node
 * @param {string|null} newLabel - New label value, or null if cancelled
 */
function handleLabelEditComplete(nodeId, newLabel) {
  // Cancelled
  if (newLabel === null) return;

  // Find the node
  const node = findNodeById(nodeId);
  if (!node || node.type !== 'message') return;

  // Don't create command if label unchanged
  if (node.label === newLabel) return;

  // Create and execute edit command
  const cmd = new EditMessageLabelCommand(nodeId, node.label || '', newLabel);
  currentAst = commandHistory.execute(cmd, currentAst);

  // Update text and re-render
  const newText = serialize(currentAst);
  previousText = newText;

  // Update editor without creating another command
  isUndoRedoInProgress = true;
  editor.setValue(newText);
  isUndoRedoInProgress = false;

  // Re-render
  renderCurrentAst();

  console.log(`Changed message ${nodeId} label to "${newLabel}"`);
}

/**
 * Handle lifeline drag to create new message
 * @param {string} from - Source participant alias
 * @param {string} to - Target participant alias
 * @param {string} arrowType - Arrow type based on modifier keys
 * @param {number} yPosition - Y position where drag occurred (for insert position)
 */
function handleLifelineDrag(from, to, arrowType, yPosition) {
  if (!from || !to || from === to) return;

  // Find insert index based on Y position
  // For now, insert at end of AST after all messages
  const insertIndex = findInsertIndexByY(yPosition);

  // Create the message with empty label first
  const cmd = new AddMessageCommand(from, to, '', arrowType, insertIndex);
  currentAst = commandHistory.execute(cmd, currentAst);

  // Update text and re-render
  const newText = serialize(currentAst);
  previousText = newText;

  // Update editor without creating another command
  isUndoRedoInProgress = true;
  editor.setValue(newText);
  isUndoRedoInProgress = false;

  // Re-render
  renderCurrentAst();

  // Find the new message element and show edit dialog for label
  const messageId = cmd.getMessageId();
  const messageElement = currentSvg.querySelector(`[data-node-id="${messageId}"]`);

  if (messageElement) {
    // Select the new message
    selectElement(messageId);

    // Show inline edit for the label
    showInlineEdit(messageElement, messageId, '', handleLabelEditComplete);
  }

  console.log(`Created message ${from}->${to} with type ${arrowType}`);
}

/**
 * Find insert index in AST based on Y position
 * @param {number} y - Y coordinate
 * @returns {number} Insert index
 */
function findInsertIndexByY(y) {
  // Simple approach: insert after last message or at end
  // Future: could calculate exact position based on layout
  let lastMessageIndex = -1;

  for (let i = 0; i < currentAst.length; i++) {
    if (currentAst[i].type === 'message') {
      lastMessageIndex = i;
    }
  }

  return lastMessageIndex >= 0 ? lastMessageIndex + 1 : currentAst.length;
}

/**
 * Handle participant reorder via drag
 * @param {string} nodeId - ID of the dragged participant
 * @param {number} oldIndex - Original visual position (0-based from left)
 * @param {number} newIndex - Target visual position (0-based from left)
 */
function handleParticipantReorder(nodeId, oldIndex, newIndex) {
  if (!nodeId || oldIndex === newIndex) return;

  // Find the AST indices for participants
  // oldIndex/newIndex are visual positions, need to map to AST indices
  const participants = currentAst.filter(n => n.type === 'participant');

  if (oldIndex >= participants.length || newIndex >= participants.length) return;
  if (oldIndex < 0 || newIndex < 0) return;

  // Get AST indices
  const oldAstIndex = currentAst.findIndex(n => n.id === participants[oldIndex].id);
  const newAstIndex = currentAst.findIndex(n => n.id === participants[newIndex].id);

  if (oldAstIndex === -1 || newAstIndex === -1) return;

  // Create and execute reorder command
  const cmd = new ReorderParticipantCommand(nodeId, oldAstIndex, newAstIndex);
  currentAst = commandHistory.execute(cmd, currentAst);

  // Update text and re-render
  const newText = serialize(currentAst);
  previousText = newText;

  // Update editor without creating another command
  isUndoRedoInProgress = true;
  editor.setValue(newText);
  isUndoRedoInProgress = false;

  // Re-render
  renderCurrentAst();

  console.log(`Reordered participant from position ${oldIndex} to ${newIndex}`);
}

/**
 * Find node in AST by ID
 * @param {string} nodeId
 * @returns {Object|null}
 */
function findNodeById(nodeId) {
  // Search in flat AST
  for (const node of currentAst) {
    if (node.id === nodeId) {
      return node;
    }
    // Check fragment entries
    if (node.type === 'fragment') {
      if (node.entries) {
        for (const entry of node.entries) {
          if (entry.id === nodeId) {
            return entry;
          }
        }
      }
      if (node.elseClauses) {
        for (const clause of node.elseClauses) {
          if (clause.entries) {
            for (const entry of clause.entries) {
              if (entry.id === nodeId) {
                return entry;
              }
            }
          }
        }
      }
    }
  }
  return null;
}

/**
 * Get currently selected node
 * @returns {Object|null} Selected node or null
 */
export function getSelectedNode() {
  const nodeId = getSelectedId();
  return nodeId ? findNodeById(nodeId) : null;
}

/**
 * Select a node by ID
 * @param {string} nodeId
 */
export function select(nodeId) {
  selectElement(nodeId);
}

/**
 * Deselect all nodes
 */
export function clearSelection() {
  deselectAll();
}

/**
 * Get selected element ID
 * @returns {string|null}
 */
export { getSelectedId };

/**
 * Initialize keyboard shortcuts for diagram interactions
 */
function initDiagramKeyboard() {
  document.addEventListener('keydown', handleDiagramKeydown);
}

/**
 * Handle keydown events for diagram interactions
 * @param {KeyboardEvent} event
 */
function handleDiagramKeydown(event) {
  // Don't handle keys when typing in editor
  if (event.target.closest('.CodeMirror')) {
    return;
  }

  // Delete key - remove selected element
  if (event.key === 'Delete' || event.key === 'Backspace') {
    const selectedId = getSelectedId();
    if (selectedId) {
      deleteSelectedElement();
      event.preventDefault();
    }
  }

  // Escape - deselect
  if (event.key === 'Escape') {
    deselectAll();
    clearLineHighlight();
  }
}

/**
 * Delete the currently selected element
 */
export function deleteSelectedElement() {
  const selectedId = getSelectedId();
  if (!selectedId) return;

  // Find the node and its location
  const nodeInfo = findNodeWithLocation(selectedId);
  if (!nodeInfo) return;

  const { node, index, parentId, parentProperty, clauseIndex } = nodeInfo;

  // Create and execute the remove command
  const cmd = new RemoveNodeCommand(selectedId, node, index, parentId, parentProperty, clauseIndex);
  currentAst = commandHistory.execute(cmd, currentAst);

  // Clear selection
  deselectAll();
  clearLineHighlight();

  // Update text and re-render
  const newText = serialize(currentAst);
  previousText = newText;

  // Update editor without creating another command
  isUndoRedoInProgress = true;
  editor.setValue(newText);
  isUndoRedoInProgress = false;

  // Re-render
  renderCurrentAst();
}

/**
 * Find node in AST with location info for undo
 * @param {string} nodeId
 * @returns {Object|null} {node, index, parentId, parentProperty, clauseIndex}
 */
function findNodeWithLocation(nodeId) {
  // Search in flat AST
  for (let i = 0; i < currentAst.length; i++) {
    const node = currentAst[i];
    if (node.id === nodeId) {
      return { node, index: i, parentId: null, parentProperty: null, clauseIndex: null };
    }

    // Check fragment entries
    if (node.type === 'fragment') {
      if (node.entries) {
        for (let j = 0; j < node.entries.length; j++) {
          if (node.entries[j].id === nodeId) {
            return {
              node: node.entries[j],
              index: j,
              parentId: node.id,
              parentProperty: 'entries',
              clauseIndex: null
            };
          }
        }
      }

      if (node.elseClauses) {
        for (let ci = 0; ci < node.elseClauses.length; ci++) {
          const clause = node.elseClauses[ci];
          if (clause.entries) {
            for (let j = 0; j < clause.entries.length; j++) {
              if (clause.entries[j].id === nodeId) {
                return {
                  node: clause.entries[j],
                  index: j,
                  parentId: node.id,
                  parentProperty: 'elseClauses',
                  clauseIndex: ci
                };
              }
            }
          }
        }
      }
    }
  }
  return null;
}

/**
 * Initialize toolbar buttons and their handlers
 */
function initToolbar() {
  wrapToggleBtn = document.getElementById('wrap-toggle');

  if (wrapToggleBtn) {
    // Set initial state from editor
    updateWrapButton();

    // Handle click
    wrapToggleBtn.addEventListener('click', toggleWordWrap);
  }
}

/**
 * Toggle word wrap on/off
 */
export function toggleWordWrap() {
  if (!editor) return;

  const currentWrap = editor.getOption('lineWrapping');
  const newWrap = !currentWrap;

  editor.setOption('lineWrapping', newWrap);
  savePreference(STORAGE_KEY_WRAP, newWrap);
  updateWrapButton();
}

/**
 * Update word wrap button text and state
 */
function updateWrapButton() {
  if (!wrapToggleBtn || !editor) return;

  const isWrapping = editor.getOption('lineWrapping');
  wrapToggleBtn.textContent = `Wrap: ${isWrapping ? 'On' : 'Off'}`;
  wrapToggleBtn.classList.toggle('active', isWrapping);
}

/**
 * Get current word wrap state
 * @returns {boolean} True if word wrap is enabled
 */
export function getWordWrap() {
  return editor ? editor.getOption('lineWrapping') : false;
}

/**
 * Set word wrap state
 * @param {boolean} enabled - Whether to enable word wrap
 */
export function setWordWrap(enabled) {
  if (!editor) return;

  editor.setOption('lineWrapping', enabled);
  savePreference(STORAGE_KEY_WRAP, enabled);
  updateWrapButton();
}

/**
 * Get current tab size
 * @returns {number} Tab size in spaces
 */
export function getTabSize() {
  return editor ? editor.getOption('tabSize') : 2;
}

/**
 * Set tab size
 * @param {number} size - Tab size in spaces
 */
export function setTabSize(size) {
  if (!editor || size < 1 || size > 8) return;

  editor.setOption('tabSize', size);
  editor.setOption('indentUnit', size);
  savePreference(STORAGE_KEY_TAB_SIZE, size);
}

/**
 * Load preference from localStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Stored value or default
 */
function loadPreference(key, defaultValue) {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    return JSON.parse(stored);
  } catch {
    return defaultValue;
  }
}

/**
 * Save preference to localStorage
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
function savePreference(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors (e.g., private browsing)
  }
}

// Auto-init when DOM ready (for browser)
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
