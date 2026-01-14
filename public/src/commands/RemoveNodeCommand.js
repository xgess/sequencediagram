// RemoveNode Command
// Removes a node from the AST

import { Command } from './Command.js';

/**
 * Command to remove a node from the AST
 */
export class RemoveNodeCommand extends Command {
  /**
   * @param {string} nodeId - ID of the node to remove
   * @param {Object} node - The node being removed (for undo)
   * @param {number} index - Original index in AST (for undo)
   * @param {string} parentId - Parent node ID if nested (for fragments)
   * @param {string} parentProperty - Property name in parent ('entries' or 'elseClauses')
   * @param {number} clauseIndex - Index in elseClauses if applicable
   */
  constructor(nodeId, node, index, parentId = null, parentProperty = null, clauseIndex = null) {
    super(`Remove ${node.type}: ${node.alias || node.label || nodeId}`);
    this.nodeId = nodeId;
    this.node = node;
    this.index = index;
    this.parentId = parentId;
    this.parentProperty = parentProperty;
    this.clauseIndex = clauseIndex;
  }

  /**
   * Execute: remove the node from AST
   * @param {Array} ast - Current AST
   * @returns {Array} New AST without the node
   */
  do(ast) {
    if (this.parentId) {
      // Remove from nested location (fragment entries)
      return this.removeFromParent(ast);
    } else {
      // Remove from top-level AST
      return ast.filter(node => node.id !== this.nodeId);
    }
  }

  /**
   * Undo: restore the node to AST
   * @param {Array} ast - Current AST
   * @returns {Array} AST with node restored
   */
  undo(ast) {
    if (this.parentId) {
      // Restore to nested location
      return this.restoreToParent(ast);
    } else {
      // Restore to top-level AST
      const result = [...ast];
      result.splice(this.index, 0, this.node);
      return result;
    }
  }

  /**
   * Remove node from a parent's entries
   * @param {Array} ast
   * @returns {Array}
   */
  removeFromParent(ast) {
    return ast.map(node => {
      if (node.id === this.parentId && node.type === 'fragment') {
        const copy = { ...node };

        if (this.parentProperty === 'entries') {
          copy.entries = node.entries.filter(e => e.id !== this.nodeId);
        } else if (this.parentProperty === 'elseClauses' && this.clauseIndex !== null) {
          copy.elseClauses = [...node.elseClauses];
          copy.elseClauses[this.clauseIndex] = {
            ...copy.elseClauses[this.clauseIndex],
            entries: copy.elseClauses[this.clauseIndex].entries.filter(e => e.id !== this.nodeId)
          };
        }

        return copy;
      }
      return node;
    });
  }

  /**
   * Restore node to a parent's entries
   * @param {Array} ast
   * @returns {Array}
   */
  restoreToParent(ast) {
    return ast.map(node => {
      if (node.id === this.parentId && node.type === 'fragment') {
        const copy = { ...node };

        if (this.parentProperty === 'entries') {
          copy.entries = [...node.entries];
          copy.entries.splice(this.index, 0, this.node);
        } else if (this.parentProperty === 'elseClauses' && this.clauseIndex !== null) {
          copy.elseClauses = [...node.elseClauses];
          copy.elseClauses[this.clauseIndex] = {
            ...copy.elseClauses[this.clauseIndex],
            entries: [...copy.elseClauses[this.clauseIndex].entries]
          };
          copy.elseClauses[this.clauseIndex].entries.splice(this.index, 0, this.node);
        }

        return copy;
      }
      return node;
    });
  }
}
