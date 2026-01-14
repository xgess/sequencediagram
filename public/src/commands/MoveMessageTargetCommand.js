// MoveMessageTarget Command
// Changes the target (to) of a message

import { Command } from './Command.js';

/**
 * Command to change the target of a message
 */
export class MoveMessageTargetCommand extends Command {
  /**
   * @param {string} messageId - ID of the message to modify
   * @param {string} oldTarget - Original target participant alias
   * @param {string} newTarget - New target participant alias
   */
  constructor(messageId, oldTarget, newTarget) {
    super(`Move message target from ${oldTarget} to ${newTarget}`);
    this.messageId = messageId;
    this.oldTarget = oldTarget;
    this.newTarget = newTarget;
  }

  /**
   * Execute: change message target to newTarget
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with updated message
   */
  do(ast) {
    return this.updateMessageTarget(ast, this.newTarget);
  }

  /**
   * Undo: restore message target to oldTarget
   * @param {Array} ast - Current AST
   * @returns {Array} AST with original message target
   */
  undo(ast) {
    return this.updateMessageTarget(ast, this.oldTarget);
  }

  /**
   * Update message target in AST
   * @param {Array} ast
   * @param {string} target
   * @returns {Array}
   */
  updateMessageTarget(ast, target) {
    return ast.map(node => {
      if (node.id === this.messageId && node.type === 'message') {
        return { ...node, to: target };
      }

      // Check fragment entries
      if (node.type === 'fragment') {
        let modified = false;
        let newNode = { ...node };

        if (node.entries) {
          const newEntries = node.entries.map(entry => {
            if (entry.id === this.messageId && entry.type === 'message') {
              modified = true;
              return { ...entry, to: target };
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
                  return { ...entry, to: target };
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
