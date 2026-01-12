// AddFragment Command - BACKLOG-091
// Adds a new fragment to the AST

import { Command } from './Command.js';
import { generateId } from '../ast/nodes.js';

/**
 * Command to add a new fragment
 */
export class AddFragmentCommand extends Command {
  /**
   * @param {string} fragmentType - Type: 'alt', 'loop', 'opt', 'par', 'break', 'critical'
   * @param {string} condition - Fragment condition text
   * @param {number} insertIndex - Index to insert at in AST (default: end)
   */
  constructor(fragmentType, condition, insertIndex = -1) {
    super(`Add ${fragmentType} fragment`);
    this.fragmentType = fragmentType;
    this.condition = condition;
    this.insertIndex = insertIndex;
    this.fragmentId = generateId('fragment');
  }

  /**
   * Execute: add new fragment to AST
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with added fragment
   */
  do(ast) {
    const newFragment = {
      id: this.fragmentId,
      type: 'fragment',
      fragmentType: this.fragmentType,
      condition: this.condition,
      entries: [],
      elseClauses: [],
      style: null,
      sourceLineStart: 0,
      sourceLineEnd: 0
    };

    const newAst = [...ast];

    // Find insert position - if insertIndex is -1, insert at end
    let idx = this.insertIndex;
    if (idx < 0) {
      idx = newAst.length;
    }

    newAst.splice(idx, 0, newFragment);
    return newAst;
  }

  /**
   * Undo: remove the added fragment
   * @param {Array} ast - Current AST
   * @returns {Array} AST without the fragment
   */
  undo(ast) {
    return ast.filter(node => node.id !== this.fragmentId);
  }

  /**
   * Get the ID of the created fragment
   * @returns {string}
   */
  getFragmentId() {
    return this.fragmentId;
  }
}
