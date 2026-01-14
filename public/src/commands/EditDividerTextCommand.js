// EditDividerText Command
// Changes the text of a divider

import { Command } from './Command.js';

/**
 * Command to change the text of a divider
 */
export class EditDividerTextCommand extends Command {
  /**
   * @param {string} dividerId - ID of the divider to modify
   * @param {string} oldText - Original text
   * @param {string} newText - New text
   */
  constructor(dividerId, oldText, newText) {
    super(`Edit divider text`);
    this.dividerId = dividerId;
    this.oldText = oldText;
    this.newText = newText;
  }

  /**
   * Execute: change divider text to newText
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with updated divider
   */
  do(ast) {
    return this.updateDividerText(ast, this.newText);
  }

  /**
   * Undo: restore divider text to oldText
   * @param {Array} ast - Current AST
   * @returns {Array} AST with original divider text
   */
  undo(ast) {
    return this.updateDividerText(ast, this.oldText);
  }

  /**
   * Update divider text in AST
   * @param {Array} ast
   * @param {string} text
   * @returns {Array}
   */
  updateDividerText(ast, text) {
    return ast.map(node => {
      if (node.id === this.dividerId && node.type === 'divider') {
        return { ...node, text };
      }
      return node;
    });
  }
}
