// AddMessage Command
// Adds a new message to the AST

import { Command } from './Command.js';
import { generateId } from '../ast/nodes.js';

/**
 * Command to add a new message
 */
export class AddMessageCommand extends Command {
  /**
   * @param {string} from - Source participant alias
   * @param {string} to - Target participant alias
   * @param {string} label - Message label
   * @param {string} arrowType - Arrow type (default '->')
   * @param {number} insertIndex - Index to insert at in AST
   * @param {string|null} parentId - Fragment ID if inserting into fragment
   * @param {string|null} parentProperty - 'entries' or 'elseClauses'
   * @param {number|null} clauseIndex - Index of else clause if parentProperty is 'elseClauses'
   */
  constructor(from, to, label, arrowType = '->', insertIndex = -1, parentId = null, parentProperty = null, clauseIndex = null) {
    super(`Add message from ${from} to ${to}`);
    this.from = from;
    this.to = to;
    this.label = label;
    this.arrowType = arrowType;
    this.insertIndex = insertIndex;
    this.parentId = parentId;
    this.parentProperty = parentProperty;
    this.clauseIndex = clauseIndex;
    this.messageId = generateId('msg');
  }

  /**
   * Execute: add new message to AST
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with added message
   */
  do(ast) {
    const newMessage = {
      id: this.messageId,
      type: 'message',
      from: this.from,
      to: this.to,
      arrowType: this.arrowType,
      label: this.label,
      sourceLineStart: 0,
      sourceLineEnd: 0
    };

    // If inserting into a fragment
    if (this.parentId) {
      return ast.map(node => {
        if (node.id === this.parentId && node.type === 'fragment') {
          const newNode = { ...node };

          if (this.parentProperty === 'entries') {
            const newEntries = [...node.entries];
            const idx = this.insertIndex >= 0 ? this.insertIndex : newEntries.length;
            newEntries.splice(idx, 0, newMessage);
            newNode.entries = newEntries;
          } else if (this.parentProperty === 'elseClauses' && this.clauseIndex !== null) {
            const newElseClauses = node.elseClauses.map((clause, ci) => {
              if (ci === this.clauseIndex) {
                const newEntries = [...clause.entries];
                const idx = this.insertIndex >= 0 ? this.insertIndex : newEntries.length;
                newEntries.splice(idx, 0, newMessage);
                return { ...clause, entries: newEntries };
              }
              return clause;
            });
            newNode.elseClauses = newElseClauses;
          }

          return newNode;
        }
        return node;
      });
    }

    // Insert at top level
    const newAst = [...ast];
    const idx = this.insertIndex >= 0 ? this.insertIndex : newAst.length;
    newAst.splice(idx, 0, newMessage);
    return newAst;
  }

  /**
   * Undo: remove the added message
   * @param {Array} ast - Current AST
   * @returns {Array} AST without the message
   */
  undo(ast) {
    // If in a fragment
    if (this.parentId) {
      return ast.map(node => {
        if (node.id === this.parentId && node.type === 'fragment') {
          const newNode = { ...node };

          if (this.parentProperty === 'entries') {
            newNode.entries = node.entries.filter(e => e.id !== this.messageId);
          } else if (this.parentProperty === 'elseClauses' && this.clauseIndex !== null) {
            newNode.elseClauses = node.elseClauses.map((clause, ci) => {
              if (ci === this.clauseIndex) {
                return { ...clause, entries: clause.entries.filter(e => e.id !== this.messageId) };
              }
              return clause;
            });
          }

          return newNode;
        }
        return node;
      });
    }

    // Remove from top level
    return ast.filter(node => node.id !== this.messageId);
  }

  /**
   * Get the ID of the created message
   * @returns {string}
   */
  getMessageId() {
    return this.messageId;
  }
}
