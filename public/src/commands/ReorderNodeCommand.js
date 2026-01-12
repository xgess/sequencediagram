// ReorderNode Command - BACKLOG-073
// Moves a node to a different position in the AST

import { Command } from './Command.js';

/**
 * Command to reorder a node within the AST
 */
export class ReorderNodeCommand extends Command {
  /**
   * @param {string} nodeId - ID of the node to move
   * @param {number} oldIndex - Original index in AST
   * @param {number} newIndex - New index in AST
   * @param {string} parentId - Parent node ID if nested (for fragments)
   * @param {string} parentProperty - Property name in parent ('entries' or 'elseClauses')
   * @param {number} clauseIndex - Index in elseClauses if applicable
   */
  constructor(nodeId, oldIndex, newIndex, parentId = null, parentProperty = null, clauseIndex = null) {
    super(`Reorder from ${oldIndex} to ${newIndex}`);
    this.nodeId = nodeId;
    this.oldIndex = oldIndex;
    this.newIndex = newIndex;
    this.parentId = parentId;
    this.parentProperty = parentProperty;
    this.clauseIndex = clauseIndex;
  }

  /**
   * Execute: move node to new position
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with node at new position
   */
  do(ast) {
    if (this.parentId) {
      return this.reorderInParent(ast, this.oldIndex, this.newIndex);
    } else {
      return this.reorderTopLevel(ast, this.oldIndex, this.newIndex);
    }
  }

  /**
   * Undo: move node back to original position
   * @param {Array} ast - Current AST
   * @returns {Array} AST with node at original position
   */
  undo(ast) {
    if (this.parentId) {
      return this.reorderInParent(ast, this.newIndex, this.oldIndex);
    } else {
      return this.reorderTopLevel(ast, this.newIndex, this.oldIndex);
    }
  }

  /**
   * Reorder at top level
   * @param {Array} ast
   * @param {number} fromIndex
   * @param {number} toIndex
   * @returns {Array}
   */
  reorderTopLevel(ast, fromIndex, toIndex) {
    const result = [...ast];
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);
    return result;
  }

  /**
   * Reorder within a parent's entries
   * @param {Array} ast
   * @param {number} fromIndex
   * @param {number} toIndex
   * @returns {Array}
   */
  reorderInParent(ast, fromIndex, toIndex) {
    return ast.map(node => {
      if (node.id === this.parentId && node.type === 'fragment') {
        const copy = { ...node };

        if (this.parentProperty === 'entries') {
          copy.entries = [...node.entries];
          const [removed] = copy.entries.splice(fromIndex, 1);
          copy.entries.splice(toIndex, 0, removed);
        } else if (this.parentProperty === 'elseClauses' && this.clauseIndex !== null) {
          copy.elseClauses = [...node.elseClauses];
          copy.elseClauses[this.clauseIndex] = {
            ...copy.elseClauses[this.clauseIndex],
            entries: [...copy.elseClauses[this.clauseIndex].entries]
          };
          const entries = copy.elseClauses[this.clauseIndex].entries;
          const [removed] = entries.splice(fromIndex, 1);
          entries.splice(toIndex, 0, removed);
        }

        return copy;
      }
      return node;
    });
  }
}
