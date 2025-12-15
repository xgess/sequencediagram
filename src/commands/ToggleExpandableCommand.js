// ToggleExpandable Command - BACKLOG-125
// Toggles the collapsed state of an expandable fragment

import { Command } from './Command.js';

/**
 * Command to toggle the collapsed state of an expandable fragment
 */
export class ToggleExpandableCommand extends Command {
  /**
   * @param {string} fragmentId - ID of the expandable fragment
   * @param {boolean} wasCollapsed - Previous collapsed state
   */
  constructor(fragmentId, wasCollapsed) {
    super(`Toggle expandable fragment`);
    this.fragmentId = fragmentId;
    this.wasCollapsed = wasCollapsed;
  }

  /**
   * Execute: toggle collapsed state to opposite
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with toggled fragment
   */
  do(ast) {
    return this.setCollapsed(ast, !this.wasCollapsed);
  }

  /**
   * Undo: restore original collapsed state
   * @param {Array} ast - Current AST
   * @returns {Array} AST with original collapsed state
   */
  undo(ast) {
    return this.setCollapsed(ast, this.wasCollapsed);
  }

  /**
   * Set collapsed state on the fragment
   * @param {Array} ast
   * @param {boolean} collapsed
   * @returns {Array}
   */
  setCollapsed(ast, collapsed) {
    return ast.map(node => {
      if (node.id === this.fragmentId && node.type === 'fragment' && node.fragmentType === 'expandable') {
        return { ...node, collapsed };
      }
      return node;
    });
  }
}
