// ChangeEntrySpacing Command
// Changes the entryspacing directive value or adds one if not present

import { Command } from './Command.js';
import { generateId } from '../ast/nodes.js';

/**
 * Command to change entry spacing
 */
export class ChangeEntrySpacingCommand extends Command {
  /**
   * @param {number} oldValue - Previous spacing value (1.0 = default, null if no directive)
   * @param {number} newValue - New spacing value
   * @param {string|null} existingDirectiveId - ID of existing directive, or null to create new
   */
  constructor(oldValue, newValue, existingDirectiveId) {
    super(`Change entry spacing`);
    this.oldValue = oldValue;
    this.newValue = newValue;
    this.existingDirectiveId = existingDirectiveId;
    this.createdDirectiveId = null;
  }

  /**
   * Execute: update or create entryspacing directive
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with updated spacing
   */
  do(ast) {
    if (this.existingDirectiveId) {
      // Update existing directive
      return ast.map(node => {
        if (node.id === this.existingDirectiveId) {
          return { ...node, value: this.newValue };
        }
        return node;
      });
    } else {
      // Create new directive - insert after participants, before messages
      const newAst = [...ast];
      this.createdDirectiveId = generateId('directive');

      // Find insert position - after last participant
      let insertIndex = 0;
      for (let i = 0; i < newAst.length; i++) {
        if (newAst[i].type === 'participant') {
          insertIndex = i + 1;
        }
      }

      // Also skip title directive if present
      for (let i = 0; i < insertIndex; i++) {
        if (newAst[i].type === 'directive' && newAst[i].directiveType === 'title') {
          if (i + 1 > insertIndex) insertIndex = i + 1;
        }
      }

      const newDirective = {
        id: this.createdDirectiveId,
        type: 'directive',
        directiveType: 'entryspacing',
        value: this.newValue,
        sourceLineStart: insertIndex + 1,
        sourceLineEnd: insertIndex + 1
      };

      newAst.splice(insertIndex, 0, newDirective);
      return newAst;
    }
  }

  /**
   * Undo: restore old value or remove created directive
   * @param {Array} ast - Current AST
   * @returns {Array} AST with original spacing
   */
  undo(ast) {
    if (this.existingDirectiveId) {
      // Restore old value
      return ast.map(node => {
        if (node.id === this.existingDirectiveId) {
          return { ...node, value: this.oldValue };
        }
        return node;
      });
    } else if (this.createdDirectiveId) {
      // Remove the created directive
      return ast.filter(node => node.id !== this.createdDirectiveId);
    }
    return ast;
  }
}
