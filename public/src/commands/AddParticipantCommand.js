// AddParticipant Command
// Adds a new participant to the AST

import { Command } from './Command.js';
import { generateId } from '../ast/nodes.js';

/**
 * Command to add a new participant
 */
export class AddParticipantCommand extends Command {
  /**
   * @param {string} participantType - Type: 'participant', 'actor', 'database', 'queue'
   * @param {string} alias - Participant alias (identifier)
   * @param {string} displayName - Display name (can be different from alias)
   * @param {number} insertIndex - Index to insert at in AST (default: end)
   */
  constructor(participantType, alias, displayName, insertIndex = -1) {
    super(`Add ${participantType} ${alias}`);
    this.participantType = participantType;
    this.alias = alias;
    this.displayName = displayName || alias;
    this.insertIndex = insertIndex;
    this.participantId = generateId('participant');
  }

  /**
   * Execute: add new participant to AST
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with added participant
   */
  do(ast) {
    const newParticipant = {
      id: this.participantId,
      type: 'participant',
      participantType: this.participantType,
      alias: this.alias,
      displayName: this.displayName,
      style: {},
      sourceLineStart: 0,
      sourceLineEnd: 0
    };

    const newAst = [...ast];

    // Find insert position - if insertIndex is -1, insert after last participant
    let idx = this.insertIndex;
    if (idx < 0) {
      // Find the last participant index
      let lastParticipantIdx = -1;
      for (let i = 0; i < newAst.length; i++) {
        if (newAst[i].type === 'participant') {
          lastParticipantIdx = i;
        }
      }
      idx = lastParticipantIdx >= 0 ? lastParticipantIdx + 1 : 0;
    }

    newAst.splice(idx, 0, newParticipant);
    return newAst;
  }

  /**
   * Undo: remove the added participant
   * @param {Array} ast - Current AST
   * @returns {Array} AST without the participant
   */
  undo(ast) {
    return ast.filter(node => node.id !== this.participantId);
  }

  /**
   * Get the ID of the created participant
   * @returns {string}
   */
  getParticipantId() {
    return this.participantId;
  }
}
