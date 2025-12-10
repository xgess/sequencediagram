// MoveMessageSource Command - BACKLOG-075
// Changes the source (from) of a message

import { Command } from './Command.js';

/**
 * Command to change the source of a message
 */
export class MoveMessageSourceCommand extends Command {
  /**
   * @param {string} messageId - ID of the message to modify
   * @param {string} oldSource - Original source participant alias
   * @param {string} newSource - New source participant alias
   */
  constructor(messageId, oldSource, newSource) {
    super(`Move message source from ${oldSource} to ${newSource}`);
    this.messageId = messageId;
    this.oldSource = oldSource;
    this.newSource = newSource;
  }

  /**
   * Execute: change message source to newSource
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with updated message
   */
  do(ast) {
    return this.updateMessageSource(ast, this.newSource);
  }

  /**
   * Undo: restore message source to oldSource
   * @param {Array} ast - Current AST
   * @returns {Array} AST with original message source
   */
  undo(ast) {
    return this.updateMessageSource(ast, this.oldSource);
  }

  /**
   * Update message source in AST
   * @param {Array} ast
   * @param {string} source
   * @returns {Array}
   */
  updateMessageSource(ast, source) {
    return ast.map(node => {
      if (node.id === this.messageId && node.type === 'message') {
        return { ...node, from: source };
      }

      // Check fragment entries
      if (node.type === 'fragment') {
        let modified = false;
        let newNode = { ...node };

        if (node.entries) {
          const newEntries = node.entries.map(entry => {
            if (entry.id === this.messageId && entry.type === 'message') {
              modified = true;
              return { ...entry, from: source };
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
                  return { ...entry, from: source };
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
