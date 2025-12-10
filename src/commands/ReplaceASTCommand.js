// ReplaceAST Command - BACKLOG-067
// Used for text edits - replaces entire AST

import { Command } from './Command.js';

/**
 * Command to replace the entire AST
 * Used when user edits text and we re-parse
 */
export class ReplaceASTCommand extends Command {
  /**
   * @param {Array} oldAst - AST before the text edit
   * @param {Array} newAst - AST after parsing the edited text
   * @param {string} oldText - Source text before edit
   * @param {string} newText - Source text after edit
   */
  constructor(oldAst, newAst, oldText = '', newText = '') {
    super('Text edit');
    this.oldAst = oldAst;
    this.newAst = newAst;
    this.oldText = oldText;
    this.newText = newText;
  }

  /**
   * Execute: return the new AST
   * @param {Array} ast - Current AST (ignored, we use stored newAst)
   * @returns {Array} New AST
   */
  do(ast) {
    return this.newAst;
  }

  /**
   * Undo: return the old AST
   * @param {Array} ast - Current AST (ignored, we use stored oldAst)
   * @returns {Array} Old AST
   */
  undo(ast) {
    return this.oldAst;
  }

  /**
   * Get the old source text
   * @returns {string}
   */
  getOldText() {
    return this.oldText;
  }

  /**
   * Get the new source text
   * @returns {string}
   */
  getNewText() {
    return this.newText;
  }
}
