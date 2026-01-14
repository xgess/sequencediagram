// EditFragmentCondition Command
// Edits a fragment's condition text

import { Command } from './Command.js';

/**
 * Command to edit a fragment's condition
 */
export class EditFragmentConditionCommand extends Command {
  /**
   * @param {string} fragmentId - ID of the fragment
   * @param {string} oldCondition - Previous condition text
   * @param {string} newCondition - New condition text
   */
  constructor(fragmentId, oldCondition, newCondition) {
    super(`Edit fragment condition`);
    this.fragmentId = fragmentId;
    this.oldCondition = oldCondition;
    this.newCondition = newCondition;
  }

  /**
   * Execute: update the condition
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with updated condition
   */
  do(ast) {
    return this.updateCondition(ast, this.newCondition);
  }

  /**
   * Undo: restore the old condition
   * @param {Array} ast - Current AST
   * @returns {Array} AST with original condition
   */
  undo(ast) {
    return this.updateCondition(ast, this.oldCondition);
  }

  /**
   * Update fragment condition in AST
   * @param {Array} ast
   * @param {string} condition
   * @returns {Array}
   */
  updateCondition(ast, condition) {
    return ast.map(node => {
      if (node.id === this.fragmentId && node.type === 'fragment') {
        return { ...node, condition };
      }
      return node;
    });
  }
}
