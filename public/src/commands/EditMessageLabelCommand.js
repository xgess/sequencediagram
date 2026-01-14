// EditMessageLabel Command
// Changes the label text of a message

import { Command } from './Command.js';

/**
 * Command to change the label of a message
 */
export class EditMessageLabelCommand extends Command {
  /**
   * @param {string} messageId - ID of the message to modify
   * @param {string} oldLabel - Original label text
   * @param {string} newLabel - New label text
   */
  constructor(messageId, oldLabel, newLabel) {
    super(`Edit message label`);
    this.messageId = messageId;
    this.oldLabel = oldLabel;
    this.newLabel = newLabel;
  }

  /**
   * Execute: change message label to newLabel
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with updated message
   */
  do(ast) {
    return this.updateMessageLabel(ast, this.newLabel);
  }

  /**
   * Undo: restore message label to oldLabel
   * @param {Array} ast - Current AST
   * @returns {Array} AST with original message label
   */
  undo(ast) {
    return this.updateMessageLabel(ast, this.oldLabel);
  }

  /**
   * Update message label in AST
   * @param {Array} ast
   * @param {string} label
   * @returns {Array}
   */
  updateMessageLabel(ast, label) {
    return ast.map(node => {
      if (node.id === this.messageId && node.type === 'message') {
        return { ...node, label };
      }

      // Check fragment entries
      if (node.type === 'fragment') {
        let modified = false;
        let newNode = { ...node };

        if (node.entries) {
          const newEntries = node.entries.map(entry => {
            if (entry.id === this.messageId && entry.type === 'message') {
              modified = true;
              return { ...entry, label };
            }
            return entry;
          });
          if (modified) {
            newNode.entries = newEntries;
          }
        }

        if (node.elseClauses) {
          const newElseClauses = node.elseClauses.map(clause => {
            if (clause.entries) {
              const newEntries = clause.entries.map(entry => {
                if (entry.id === this.messageId && entry.type === 'message') {
                  modified = true;
                  return { ...entry, label };
                }
                return entry;
              });
              return { ...clause, entries: newEntries };
            }
            return clause;
          });
          if (modified) {
            newNode.elseClauses = newElseClauses;
          }
        }

        return modified ? newNode : node;
      }

      return node;
    });
  }
}
