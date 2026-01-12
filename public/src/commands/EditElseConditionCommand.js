// EditElseCondition Command - BACKLOG-085
// Edits an else clause's condition text

import { Command } from './Command.js';

/**
 * Command to edit an else clause's condition
 */
export class EditElseConditionCommand extends Command {
  /**
   * @param {string} fragmentId - ID of the fragment
   * @param {number} clauseIndex - Index of the else clause (0 for first else)
   * @param {string} oldCondition - Previous condition text
   * @param {string} newCondition - New condition text
   */
  constructor(fragmentId, clauseIndex, oldCondition, newCondition) {
    super(`Edit else condition`);
    this.fragmentId = fragmentId;
    this.clauseIndex = clauseIndex;
    this.oldCondition = oldCondition;
    this.newCondition = newCondition;
  }

  /**
   * Execute: update the else condition
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with updated condition
   */
  do(ast) {
    return this.updateCondition(ast, this.newCondition);
  }

  /**
   * Undo: restore the old else condition
   * @param {Array} ast - Current AST
   * @returns {Array} AST with original condition
   */
  undo(ast) {
    return this.updateCondition(ast, this.oldCondition);
  }

  /**
   * Update else clause condition in AST
   * @param {Array} ast
   * @param {string} condition
   * @returns {Array}
   */
  updateCondition(ast, condition) {
    return ast.map(node => {
      if (node.id === this.fragmentId && node.type === 'fragment') {
        const newNode = { ...node };
        newNode.elseClauses = node.elseClauses.map((clause, index) => {
          if (index === this.clauseIndex) {
            return { ...clause, condition };
          }
          return clause;
        });
        return newNode;
      }
      return node;
    });
  }
}
