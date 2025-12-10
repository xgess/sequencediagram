// Command Pattern Base Classes
// Per DESIGN.md - Command for undo/redo operations

/**
 * Base Command class
 * All commands must implement do() and undo() methods
 */
export class Command {
  /**
   * @param {string} description - Human-readable description for debugging/logging
   */
  constructor(description) {
    this.description = description;
  }

  /**
   * Execute the command
   * @param {Array} ast - Current AST
   * @returns {Array} New AST after command execution
   */
  do(ast) {
    throw new Error('Command.do() must be implemented by subclass');
  }

  /**
   * Undo the command
   * @param {Array} ast - Current AST
   * @returns {Array} AST restored to state before command
   */
  undo(ast) {
    throw new Error('Command.undo() must be implemented by subclass');
  }
}

/**
 * CommandHistory manages undo/redo stacks
 * Capped at 100 levels per DESIGN.md
 */
export class CommandHistory {
  /**
   * @param {number} maxSize - Maximum history size (default 100)
   */
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Execute a command and add to history
   * @param {Command} command - Command to execute
   * @param {Array} currentAst - Current AST
   * @returns {Array} New AST after command execution
   */
  execute(command, currentAst) {
    const newAst = command.do(currentAst);
    this.undoStack.push(command);

    // Enforce max size
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }

    // Clear redo stack when new command is executed
    this.redoStack = [];

    return newAst;
  }

  /**
   * Undo the last command
   * @param {Array} currentAst - Current AST
   * @returns {Array} AST after undo, or original if nothing to undo
   */
  undo(currentAst) {
    if (this.undoStack.length === 0) {
      return currentAst;
    }

    const command = this.undoStack.pop();
    this.redoStack.push(command);
    return command.undo(currentAst);
  }

  /**
   * Redo the last undone command
   * @param {Array} currentAst - Current AST
   * @returns {Array} AST after redo, or original if nothing to redo
   */
  redo(currentAst) {
    if (this.redoStack.length === 0) {
      return currentAst;
    }

    const command = this.redoStack.pop();
    this.undoStack.push(command);
    return command.do(currentAst);
  }

  /**
   * Check if undo is available
   * @returns {boolean}
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   * @returns {boolean}
   */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * Get history info
   * @returns {Object} {undoCount, redoCount, canUndo, canRedo}
   */
  getInfo() {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    };
  }

  /**
   * Clear all history
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Get description of last undoable command
   * @returns {string|null}
   */
  getLastUndoDescription() {
    if (this.undoStack.length === 0) return null;
    return this.undoStack[this.undoStack.length - 1].description;
  }

  /**
   * Get description of last redoable command
   * @returns {string|null}
   */
  getLastRedoDescription() {
    if (this.redoStack.length === 0) return null;
    return this.redoStack[this.redoStack.length - 1].description;
  }
}
