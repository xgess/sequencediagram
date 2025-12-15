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
import { EditParticipantCommand } from './commands/EditParticipantCommand.js';
import { AdjustFragmentBoundaryCommand } from './commands/AdjustFragmentBoundaryCommand.js';
import { MoveEntryBetweenClausesCommand } from './commands/MoveEntryBetweenClausesCommand.js';
import { EditFragmentConditionCommand } from './commands/EditFragmentConditionCommand.js';
import { EditElseConditionCommand } from './commands/EditElseConditionCommand.js';
import { ChangeEntrySpacingCommand } from './commands/ChangeEntrySpacingCommand.js';
import { EditNoteTextCommand } from './commands/EditNoteTextCommand.js';
import { ToggleExpandableCommand } from './commands/ToggleExpandableCommand.js';
import { showInlineEdit, showParticipantEdit, hideInlineEdit } from './interaction/inlineEdit.js';
import { showConfirmDialog } from './interaction/confirmDialog.js';
import { initLifelineDrag, removeLifelineDrag } from './interaction/lifelineDrag.js';
import { showContextMenu, hideContextMenu } from './interaction/contextMenu.js';
import { showAddParticipantDialog, hideAddParticipantDialog } from './interaction/addParticipantDialog.js';
import { showAddMessageDialog, hideAddMessageDialog } from './interaction/addMessageDialog.js';
import { showAddFragmentDialog, hideAddFragmentDialog } from './interaction/addFragmentDialog.js';
import { AddParticipantCommand } from './commands/AddParticipantCommand.js';
import { AddFragmentCommand } from './commands/AddFragmentCommand.js';
import { downloadPNG, copyPNGToClipboard } from './export/png.js';
import { showShareDialog } from './interaction/share.js';
import { showDiagramManager } from './interaction/diagramManager.js';
import { startAutosave, recoverAutosave } from './storage/autosave.js';
import { loadFromURL } from './storage/url.js';
import { initSplitter } from './interaction/splitter.js';
import { initZoom, getZoomLevel, shrinkToFit as applyShrinkToFit } from './interaction/zoom.js';
import { initPresentation, enterPresentationMode, exitPresentationMode, togglePresentationMode, isInPresentationMode, enterReadOnlyMode, exitReadOnlyMode, toggleReadOnlyMode, isInReadOnlyMode } from './interaction/presentation.js';
import { initParticipantOverlay, updateParticipantData } from './interaction/participantOverlay.js';

// App state
let currentAst = [];
let editor = null;
let debounceTimer = null;
let commandHistory = new CommandHistory(100);
let previousText = '';
let isUndoRedoInProgress = false;
let currentSvg = null;
let currentFileHandle = null; // File System Access API handle

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
  const splitter = document.getElementById('splitter');
  const editorPane = document.getElementById('editor-pane');

  if (!editorContainer || !diagramContainer || !splitter || !editorPane) {
    console.error('Required DOM elements not found');
    return;
  }

  // Initialize splitter
  initSplitter(splitter, editorPane, diagramContainer);

  // Initialize CodeMirror
  initCodeMirror();

  // Initialize toolbar
  initToolbar();

  // Initialize zoom controls
  const diagramSvg = document.getElementById('diagram');
  const zoomLevelEl = document.getElementById('zoom-level');
  if (diagramSvg && zoomLevelEl) {
    initZoom(diagramSvg, zoomLevelEl);
  }

  // Initialize presentation mode
  initPresentation(() => {
    // Callback when presentation mode exits
    updatePresentButton();
    updateReadOnlyButton();
  });

  // Initialize participant overlay
  initParticipantOverlay(diagramContainer);

  // Initialize keyboard shortcuts for diagram
  initDiagramKeyboard();

  // Handle initial URL load
  const data = loadFromURL();
  if (data) {
    const { text, presentation, shrinkToFit } = data;
    if (text) {
      loadTextIntoEditor(text);
    }
    // Apply presentation mode and/or shrink to fit if requested
    // Small delay to let diagram render first
    if (presentation || shrinkToFit) {
      setTimeout(() => {
        if (shrinkToFit) {
          applyShrinkToFit();
        }
        if (presentation) {
          enterPresentationMode();
          updatePresentButton();
        }
      }, 100);
    }
  } else {
    // If no URL data, check for autosave
    const autosavedText = recoverAutosave();
    if (autosavedText) {
      loadTextIntoEditor(autosavedText);
    }
  }

  // Start autosave
  startAutosave(() => editor.getValue());

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
  initSelection(svg, handleSelectionChange, handleDoubleClick, handleContextMenu, handleExpandableToggle);
  initCursors(svg);
  initDrag(svg, handleDragComplete, handleEndpointChange, handleParticipantReorder, handleFragmentBoundaryChange, handleElseDividerChange);
  initLifelineDrag(svg, handleLifelineDrag);

  // Update participant overlay data
  updateParticipantData(svg);

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
  initSelection(svg, handleSelectionChange, handleDoubleClick, handleContextMenu, handleExpandableToggle);
  initCursors(svg);
  initDrag(svg, handleDragComplete, handleEndpointChange, handleParticipantReorder, handleFragmentBoundaryChange, handleElseDividerChange);
  initLifelineDrag(svg, handleLifelineDrag);

  // Update participant overlay data
  updateParticipantData(svg);

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
 * @param {Object|null} extra - Extra info (e.g., { type: 'else', index: 0 } for else labels)
 */
function handleDoubleClick(nodeId, element, extra) {
  if (!nodeId) return;

  // Find the node
  const node = findNodeById(nodeId);
  if (!node) return;

  // Handle based on node type
  if (node.type === 'message') {
    // Show inline edit for message label
    showInlineEdit(element, nodeId, node.label || '', handleLabelEditComplete);
  } else if (node.type === 'participant') {
    // Show participant edit dialog with display name and alias
    const displayName = node.displayName || node.alias;
    showParticipantEdit(element, nodeId, displayName, node.alias, handleParticipantEditComplete);
  } else if (node.type === 'fragment') {
    // Check if this is an else label click
    if (extra && extra.type === 'else') {
      const elseClause = node.elseClauses && node.elseClauses[extra.index];
      if (elseClause) {
        // Store the else index for the callback
        showInlineEdit(element, nodeId, elseClause.condition || '', (id, newValue) => {
          handleElseConditionEditComplete(id, extra.index, newValue);
        });
      }
    } else {
      // Show inline edit for fragment condition
      showInlineEdit(element, nodeId, node.condition || '', handleFragmentConditionEditComplete);
    }
  } else if (node.type === 'note') {
    // Show inline edit for note text
    showInlineEdit(element, nodeId, node.text || '', handleNoteTextEditComplete);
  }
}

/**
 * Handle right-click context menu on diagram
 * @param {number} x - Client X coordinate
 * @param {number} y - Client Y coordinate
 * @param {string|null} nodeId - ID of the clicked node, null for background
 * @param {string|null} nodeType - Type of the clicked node
 */
function handleContextMenu(x, y, nodeId, nodeType) {
  showContextMenu(x, y, nodeId, nodeType, handleContextMenuAction);
}

/**
 * Handle context menu action selection
 * @param {string} action - The selected action
 * @param {string|null} nodeId - ID of the clicked node
 */
function handleContextMenuAction(action, nodeId) {
  console.log('Context menu action:', action, 'nodeId:', nodeId);

  switch (action) {
    case 'edit':
      // Trigger edit on the selected element (same as double-click)
      if (nodeId) {
        const node = findNodeById(nodeId);
        const element = currentSvg.querySelector(`[data-node-id="${nodeId}"]`);
        if (node && element) {
          handleDoubleClick(nodeId, element, null);
        }
      }
      break;

    case 'delete':
      // Delete the selected element
      if (nodeId) {
        deleteSelectedElement();
      }
      break;

    case 'add-participant':
      showAddParticipantDialog(100, 100, 'participant', handleAddParticipantComplete);
      break;

    case 'add-actor':
      showAddParticipantDialog(100, 100, 'actor', handleAddParticipantComplete);
      break;

    case 'add-database':
      showAddParticipantDialog(100, 100, 'database', handleAddParticipantComplete);
      break;

    case 'add-queue':
      showAddParticipantDialog(100, 100, 'queue', handleAddParticipantComplete);
      break;

    case 'add-message':
      // Get list of participants for the dropdown
      const participants = currentAst.filter(n => n.type === 'participant');
      if (participants.length < 2) {
        console.warn('Need at least 2 participants to add a message');
        break;
      }
      showAddMessageDialog(100, 100, participants, handleAddMessageComplete);
      break;

    case 'add-fragment':
      showAddFragmentDialog(100, 100, handleAddFragmentComplete);
      break;

    default:
      console.log('Unknown action:', action);
  }
}

/**
 * Handle completion of add participant dialog
 * @param {Object|null} result - {type, alias, displayName} or null if cancelled
 */
function handleAddParticipantComplete(result) {
  if (!result) return;

  const { type, alias, displayName } = result;

  // Check if alias already exists
  const existingParticipant = currentAst.find(
    n => n.type === 'participant' && n.alias === alias
  );
  if (existingParticipant) {
    console.warn(`Participant with alias "${alias}" already exists`);
    return;
  }

  // Create and execute the command
  const cmd = new AddParticipantCommand(type, alias, displayName);
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

  // Select the new participant
  const participantId = cmd.getParticipantId();
  selectElement(participantId);

  console.log(`Added ${type} ${alias} (${displayName})`);
}

/**
 * Handle completion of add message dialog
 * @param {Object|null} result - {from, to, arrowType, label} or null if cancelled
 */
function handleAddMessageComplete(result) {
  if (!result) return;

  const { from, to, arrowType, label } = result;

  // Create and execute the command
  const cmd = new AddMessageCommand(from, to, label, arrowType);
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

  // Select the new message
  const messageId = cmd.getMessageId();
  selectElement(messageId);

  console.log(`Added message ${from}${arrowType}${to}: ${label}`);
}

/**
 * Handle completion of add fragment dialog
 * @param {Object|null} result - {fragmentType, condition} or null if cancelled
 */
function handleAddFragmentComplete(result) {
  if (!result) return;

  const { fragmentType, condition } = result;

  // Create and execute the command
  const cmd = new AddFragmentCommand(fragmentType, condition);
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

  // Select the new fragment
  const fragmentId = cmd.getFragmentId();
  selectElement(fragmentId);

  console.log(`Added ${fragmentType} fragment: ${condition}`);
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
 * Handle completion of note text edit
 * @param {string} nodeId - ID of the edited node
 * @param {string|null} newText - New text or null if cancelled
 */
function handleNoteTextEditComplete(nodeId, newText) {
  // Cancelled
  if (newText === null) return;

  // Find the node
  const node = findNodeById(nodeId);
  if (!node || node.type !== 'note') return;

  // Don't create command if text unchanged
  if (node.text === newText) return;

  // Create and execute edit command
  const cmd = new EditNoteTextCommand(nodeId, node.text || '', newText);
  currentAst = commandHistory.execute(cmd, currentAst);

  // Update text and re-render
  const newText2 = serialize(currentAst);
  previousText = newText2;

  // Update editor without creating another command
  isUndoRedoInProgress = true;
  editor.setValue(newText2);
  isUndoRedoInProgress = false;

  // Re-render
  renderCurrentAst();

  console.log(`Changed note ${nodeId} text to "${newText}"`);
}

/**
 * Handle click on expandable fragment toggle icon
 * @param {string} nodeId - ID of the expandable fragment
 */
function handleExpandableToggle(nodeId) {
  if (!nodeId) return;

  // Find the fragment
  const node = findNodeById(nodeId);
  if (!node || node.type !== 'fragment' || node.fragmentType !== 'expandable') return;

  // Create and execute toggle command
  const cmd = new ToggleExpandableCommand(nodeId, node.collapsed || false);
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

  console.log(`Toggled expandable fragment ${nodeId} collapsed: ${!node.collapsed}`);
}

/**
 * Handle completion of participant edit
 * @param {string} nodeId - ID of the edited node
 * @param {Object|null} result - {displayName, alias} or null if cancelled
 */
function handleParticipantEditComplete(nodeId, result) {
  // Cancelled
  if (result === null) return;

  // Find the node
  const node = findNodeById(nodeId);
  if (!node || node.type !== 'participant') return;

  const { displayName, alias } = result;

  // Validate alias - cannot be empty
  if (!alias || alias.trim() === '') {
    console.warn('Alias cannot be empty');
    return;
  }

  const oldDisplayName = node.displayName || node.alias;
  const oldAlias = node.alias;

  // Don't create command if nothing changed
  if (oldDisplayName === displayName && oldAlias === alias) return;

  // Create and execute edit command
  const cmd = new EditParticipantCommand(nodeId, oldDisplayName, displayName, oldAlias, alias);
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

  console.log(`Changed participant ${nodeId}: displayName="${displayName}", alias="${alias}"`);
}

/**
 * Handle completion of fragment condition edit
 * @param {string} nodeId - ID of the edited node
 * @param {string|null} newCondition - New condition value, or null if cancelled
 */
function handleFragmentConditionEditComplete(nodeId, newCondition) {
  // Cancelled
  if (newCondition === null) return;

  // Find the node
  const node = findNodeById(nodeId);
  if (!node || node.type !== 'fragment') return;

  // Don't create command if condition unchanged
  if (node.condition === newCondition) return;

  // Create and execute edit command
  const cmd = new EditFragmentConditionCommand(nodeId, node.condition || '', newCondition);
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

  console.log(`Changed fragment ${nodeId} condition to "${newCondition}"`);
}

/**
 * Handle completion of else condition edit
 * @param {string} nodeId - ID of the fragment
 * @param {number} clauseIndex - Index of the else clause
 * @param {string|null} newCondition - New condition value, or null if cancelled
 */
function handleElseConditionEditComplete(nodeId, clauseIndex, newCondition) {
  // Cancelled
  if (newCondition === null) return;

  // Find the node
  const node = findNodeById(nodeId);
  if (!node || node.type !== 'fragment') return;

  // Get the else clause
  const elseClause = node.elseClauses && node.elseClauses[clauseIndex];
  if (!elseClause) return;

  // Don't create command if condition unchanged
  if (elseClause.condition === newCondition) return;

  // Create and execute edit command
  const cmd = new EditElseConditionCommand(nodeId, clauseIndex, elseClause.condition || '', newCondition);
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

  console.log(`Changed fragment ${nodeId} else clause ${clauseIndex} condition to "${newCondition}"`);
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
 * Handle fragment boundary change via drag
 * @param {string} nodeId - ID of the fragment
 * @param {string} boundary - 'top' or 'bottom'
 * @param {number} delta - Number of entries to move (positive = expand, negative = contract)
 */
function handleFragmentBoundaryChange(nodeId, boundary, delta) {
  if (!nodeId || delta === 0) return;

  // Find the fragment
  const fragment = findNodeById(nodeId);
  if (!fragment || fragment.type !== 'fragment') return;

  // Find AST index of the fragment
  const astIndex = currentAst.findIndex(n => n.id === nodeId);
  if (astIndex === -1) return;

  // Calculate what entries will be moved for undo info
  const movedEntries = [];

  // Create and execute the command
  const cmd = new AdjustFragmentBoundaryCommand(nodeId, boundary, delta, movedEntries, astIndex);
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

  console.log(`Adjusted fragment ${nodeId} ${boundary} boundary by ${delta}`);
}

/**
 * Handle else divider change via drag
 * @param {string} nodeId - ID of the fragment
 * @param {number} clauseIndex - Index of the else clause (0 for first else)
 * @param {number} delta - Number of entries to move (positive = main to else, negative = else to main)
 */
function handleElseDividerChange(nodeId, clauseIndex, delta) {
  if (!nodeId || delta === 0) return;

  // Find the fragment
  const fragment = findNodeById(nodeId);
  if (!fragment || fragment.type !== 'fragment') return;

  // Check if else clause exists
  if (!fragment.elseClauses || !fragment.elseClauses[clauseIndex]) return;

  // Create and execute the command
  const cmd = new MoveEntryBetweenClausesCommand(nodeId, clauseIndex, delta);
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

  console.log(`Moved entries between fragment ${nodeId} main and else clause ${clauseIndex} by ${delta}`);
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

  // +/= key - increase entry spacing
  if (event.key === '+' || event.key === '=') {
    changeEntrySpacing(0.1);
    event.preventDefault();
  }

  // - key - decrease entry spacing
  if (event.key === '-' || event.key === '_') {
    changeEntrySpacing(-0.1);
    event.preventDefault();
  }
}

/**
 * Change entry spacing by delta amount
 * @param {number} delta - Amount to change (positive = increase, negative = decrease)
 */
function changeEntrySpacing(delta) {
  // Find existing entryspacing directive
  const directive = currentAst.find(n => n.type === 'directive' && n.directiveType === 'entryspacing');

  const currentValue = directive ? directive.value : 1.0;
  const newValue = Math.max(0.1, Math.round((currentValue + delta) * 10) / 10); // Round to 1 decimal, min 0.1

  // Don't create command if value unchanged
  if (newValue === currentValue) return;

  // Create and execute command
  const cmd = new ChangeEntrySpacingCommand(
    currentValue,
    newValue,
    directive ? directive.id : null
  );
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

  console.log(`Entry spacing changed to ${newValue}`);
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

  // Check if it's a participant with references
  if (node.type === 'participant') {
    const refCount = countParticipantReferences(node.alias);
    if (refCount > 0) {
      // Show warning dialog
      const message = `${refCount} message${refCount > 1 ? 's' : ''} reference${refCount === 1 ? 's' : ''} this participant. Deleting it will cause those messages to show as errors.`;
      showConfirmDialog(
        'Delete Participant?',
        message,
        () => executeDelete(selectedId, node, index, parentId, parentProperty, clauseIndex)
      );
      return;
    }
  }

  // No references or not a participant - delete directly
  executeDelete(selectedId, node, index, parentId, parentProperty, clauseIndex);
}

/**
 * Execute the actual deletion
 * @param {string} selectedId
 * @param {Object} node
 * @param {number} index
 * @param {string|null} parentId
 * @param {string|null} parentProperty
 * @param {number|null} clauseIndex
 */
function executeDelete(selectedId, node, index, parentId, parentProperty, clauseIndex) {
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
 * Count how many messages reference a participant alias
 * @param {string} alias - Participant alias to check
 * @returns {number} Number of references
 */
function countParticipantReferences(alias) {
  let count = 0;

  function checkEntries(entries) {
    for (const entry of entries) {
      if (entry.type === 'message') {
        if (entry.from === alias) count++;
        if (entry.to === alias) count++;
      }
    }
  }

  for (const node of currentAst) {
    if (node.type === 'message') {
      if (node.from === alias) count++;
      if (node.to === alias) count++;
    } else if (node.type === 'fragment') {
      if (node.entries) {
        checkEntries(node.entries);
      }
      if (node.elseClauses) {
        for (const clause of node.elseClauses) {
          if (clause.entries) {
            checkEntries(clause.entries);
          }
        }
      }
    }
  }

  return count;
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

    // Check fragment entries (entries are ID strings, not objects)
    if (node.type === 'fragment') {
      if (node.entries) {
        for (let j = 0; j < node.entries.length; j++) {
          // entries are ID strings - compare directly
          if (node.entries[j] === nodeId) {
            // Find the actual node in the flat AST
            const entryNode = currentAst.find(n => n.id === nodeId);
            return {
              node: entryNode,
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
              // entries are ID strings - compare directly
              if (clause.entries[j] === nodeId) {
                // Find the actual node in the flat AST
                const entryNode = currentAst.find(n => n.id === nodeId);
                return {
                  node: entryNode,
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

  // File buttons
  const fileOpenBtn = document.getElementById('file-open');
  const fileSaveBtn = document.getElementById('file-save');

  if (fileOpenBtn) {
    fileOpenBtn.addEventListener('click', handleFileOpen);
  }
  if (fileSaveBtn) {
    fileSaveBtn.addEventListener('click', handleFileSave);
  }

  // Export buttons
  const exportPngBtn = document.getElementById('export-png');
  const copyPngBtn = document.getElementById('copy-png');
  const exportSvgBtn = document.getElementById('export-svg');
  const exportTxtBtn = document.getElementById('export-txt');

  if (exportPngBtn) {
    exportPngBtn.addEventListener('click', handleExportPNG);
  }
  if (copyPngBtn) {
    copyPngBtn.addEventListener('click', handleCopyPNG);
  }
  if (exportSvgBtn) {
    exportSvgBtn.addEventListener('click', handleExportSVG);
  }
  if (exportTxtBtn) {
    exportTxtBtn.addEventListener('click', handleExportTXT);
  }

  // Keyboard shortcuts for file operations
  document.addEventListener('keydown', handleFileKeydown);

  const shareBtn = document.getElementById('share');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      showShareDialog(() => editor.getValue());
    });
  }

  // Present button
  const presentBtn = document.getElementById('present-btn');
  if (presentBtn) {
    presentBtn.addEventListener('click', () => {
      togglePresentationMode();
      updatePresentButton();
      updateReadOnlyButton();
    });
  }

  // Read-only (View) button
  const readOnlyBtn = document.getElementById('readonly-btn');
  if (readOnlyBtn) {
    readOnlyBtn.addEventListener('click', () => {
      toggleReadOnlyMode();
      updatePresentButton();
      updateReadOnlyButton();
    });
  }
}

/**
 * Update Present button state
 */
function updatePresentButton() {
  const presentBtn = document.getElementById('present-btn');
  if (presentBtn) {
    if (isInPresentationMode() && !isInReadOnlyMode()) {
      presentBtn.classList.add('active');
      presentBtn.textContent = 'Exit';
    } else {
      presentBtn.classList.remove('active');
      presentBtn.textContent = 'Present';
    }
  }
}

/**
 * Update Read-only button state
 */
function updateReadOnlyButton() {
  const readOnlyBtn = document.getElementById('readonly-btn');
  if (readOnlyBtn) {
    if (isInReadOnlyMode()) {
      readOnlyBtn.classList.add('active');
      readOnlyBtn.textContent = 'Exit View';
    } else {
      readOnlyBtn.classList.remove('active');
      readOnlyBtn.textContent = 'View';
    }
  }
}

/**
 * Handle Export PNG button click
 * Uses zoom level to determine export scale
 */
async function handleExportPNG() {
  if (!currentSvg) return;

  try {
    // Base scale is 2x for high DPI, multiply by zoom level
    const zoomLevel = getZoomLevel();
    const exportScale = 2 * zoomLevel;
    await downloadPNG(currentSvg, 'diagram.png', exportScale);
    console.log(`PNG exported successfully at ${Math.round(zoomLevel * 100)}% zoom (${exportScale}x scale)`);
  } catch (error) {
    console.error('Failed to export PNG:', error);
  }
}

/**
 * Handle Copy PNG to clipboard button click (BACKLOG-094)
 * Uses zoom level to determine export scale
 */
async function handleCopyPNG() {
  if (!currentSvg) return;

  try {
    // Base scale is 2x for high DPI, multiply by zoom level
    const zoomLevel = getZoomLevel();
    const exportScale = 2 * zoomLevel;
    await copyPNGToClipboard(currentSvg, exportScale);
    console.log(`PNG copied to clipboard at ${Math.round(zoomLevel * 100)}% zoom (${exportScale}x scale)`);
  } catch (error) {
    console.error('Failed to copy PNG to clipboard:', error);
    alert('Failed to copy to clipboard. Your browser may not support this feature or clipboard permissions may be denied.');
  }
}

/**
 * Handle Export SVG button click
 */
function handleExportSVG() {
  if (!currentSvg) return;

  // Clone the SVG
  const clonedSvg = currentSvg.cloneNode(true);

  // Get dimensions
  const bbox = currentSvg.getBBox();
  const width = Math.ceil(bbox.width + bbox.x + 20);
  const height = Math.ceil(bbox.height + bbox.y + 20);

  clonedSvg.setAttribute('width', width);
  clonedSvg.setAttribute('height', height);
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Add source text as description
  const desc = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
  desc.textContent = serialize(currentAst);
  clonedSvg.insertBefore(desc, clonedSvg.firstChild);

  // Serialize
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);

  // Download
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'diagram.svg';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('SVG exported successfully');
}

/**
 * Handle Export TXT button click
 */
function handleExportTXT() {
  const text = serialize(currentAst);

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'diagram.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('TXT exported successfully');
}

/**
 * Handle keyboard shortcuts for file operations
 * @param {KeyboardEvent} event
 */
function handleFileKeydown(event) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? event.metaKey : event.ctrlKey;

  // Ctrl/Cmd-O: Open file
  if (modKey && event.key === 'o') {
    event.preventDefault();
    handleFileOpen();
  }

  // Ctrl/Cmd-S: Save file
  if (modKey && event.key === 's') {
    event.preventDefault();
    if (event.shiftKey) {
      handleFileSaveAs();
    } else {
      handleFileSave();
    }
  }
}

/**
 * Handle File Open button click
 * Uses File System Access API when available, falls back to input element
 */
async function handleFileOpen() {
  // Check for File System Access API support
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Sequence Diagram Files',
            accept: {
              'text/plain': ['.txt', '.sduml'],
              'image/svg+xml': ['.svg']
            }
          }
        ],
        multiple: false
      });

      await loadFileFromHandle(handle);
    } catch (err) {
      // User cancelled or error
      if (err.name !== 'AbortError') {
        console.error('Failed to open file:', err);
      }
    }
  } else {
    // Fallback for browsers without File System Access API
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.sduml,.svg';

    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (file) {
        await loadFileFromFile(file);
      }
    };

    input.click();
  }
}

/**
 * Load file content from File System Access API handle
 * @param {FileSystemFileHandle} handle
 */
async function loadFileFromHandle(handle) {
  try {
    const file = await handle.getFile();
    const text = await file.text();
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.svg')) {
      // Extract source from SVG
      const source = extractSourceFromSVG(text);
      if (source !== null) {
        loadTextIntoEditor(source);
        currentFileHandle = null; // Don't save over SVG file
        console.log(`Loaded from SVG: ${file.name}`);
      } else {
        console.error('SVG file does not contain embedded source text');
        alert('This SVG file does not contain embedded source text. It may not have been created by this tool.');
      }
    } else {
      // Regular text file
      loadTextIntoEditor(text);
      currentFileHandle = handle;
      console.log(`Opened file: ${file.name}`);
    }
  } catch (err) {
    console.error('Failed to load file:', err);
  }
}

/**
 * Load file content from File object (fallback method)
 * @param {File} file
 */
async function loadFileFromFile(file) {
  try {
    const text = await file.text();
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.svg')) {
      // Extract source from SVG
      const source = extractSourceFromSVG(text);
      if (source !== null) {
        loadTextIntoEditor(source);
        currentFileHandle = null;
        console.log(`Loaded from SVG: ${file.name}`);
      } else {
        console.error('SVG file does not contain embedded source text');
        alert('This SVG file does not contain embedded source text. It may not have been created by this tool.');
      }
    } else {
      // Regular text file
      loadTextIntoEditor(text);
      currentFileHandle = null; // Can't save with File API fallback
      console.log(`Opened file: ${file.name}`);
    }
  } catch (err) {
    console.error('Failed to load file:', err);
  }
}

/**
 * Extract source text from SVG file's <desc> element
 * @param {string} svgText - SVG file content
 * @returns {string|null} Source text or null if not found
 */
function extractSourceFromSVG(svgText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      console.error('Failed to parse SVG:', parseError.textContent);
      return null;
    }

    // Find <desc> element
    const desc = doc.querySelector('desc');
    if (desc && desc.textContent) {
      return desc.textContent;
    }

    return null;
  } catch (err) {
    console.error('Failed to extract source from SVG:', err);
    return null;
  }
}

/**
 * Load text content into editor and update diagram
 * @param {string} text - Text content to load
 */
function loadTextIntoEditor(text) {
  // Clear command history for new file
  commandHistory.clear();

  // Update editor
  isUndoRedoInProgress = true;
  editor.setValue(text);
  isUndoRedoInProgress = false;

  // Update from text
  updateFromText(text, false);
}

/**
 * Handle File Save button click
 */
async function handleFileSave() {
  // If we have a file handle, save directly
  if (currentFileHandle) {
    await saveToHandle(currentFileHandle);
  } else {
    // Otherwise, show Save As dialog
    await handleFileSaveAs();
  }
}

/**
 * Handle File Save As
 */
async function handleFileSaveAs() {
  const text = serialize(currentAst);

  // Check for File System Access API support
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'diagram.txt',
        types: [
          {
            description: 'Sequence Diagram Text',
            accept: {
              'text/plain': ['.txt', '.sduml']
            }
          }
        ]
      });

      await saveToHandle(handle);
      currentFileHandle = handle;
    } catch (err) {
      // User cancelled or error
      if (err.name !== 'AbortError') {
        console.error('Failed to save file:', err);
      }
    }
  } else {
    // Fallback: download as file
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'diagram.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('File downloaded (fallback method)');
  }
}

/**
 * Save current text to file handle
 * @param {FileSystemFileHandle} handle
 */
async function saveToHandle(handle) {
  try {
    const writable = await handle.createWritable();
    const text = serialize(currentAst);
    await writable.write(text);
    await writable.close();
    console.log(`Saved to: ${handle.name}`);
  } catch (err) {
    console.error('Failed to save file:', err);
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
