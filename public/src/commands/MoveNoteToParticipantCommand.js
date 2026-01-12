// MoveNoteToParticipant Command
// Changes which participant a note is attached to

import { Command } from './Command.js';

/**
 * Command to move a note to a different participant
 */
export class MoveNoteToParticipantCommand extends Command {
  /**
   * @param {string} noteId - ID of the note to modify
   * @param {string} oldParticipant - Original participant alias
   * @param {string} newParticipant - New participant alias
   */
  constructor(noteId, oldParticipant, newParticipant) {
    super(`Move note to ${newParticipant}`);
    this.noteId = noteId;
    this.oldParticipant = oldParticipant;
    this.newParticipant = newParticipant;
  }

  /**
   * Execute: change note participant to newParticipant
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with updated note
   */
  do(ast) {
    return this.updateNoteParticipant(ast, this.newParticipant);
  }

  /**
   * Undo: restore note participant to oldParticipant
   * @param {Array} ast - Current AST
   * @returns {Array} AST with original note participant
   */
  undo(ast) {
    return this.updateNoteParticipant(ast, this.oldParticipant);
  }

  /**
   * Update note participant in AST
   * @param {Array} ast
   * @param {string} participant
   * @returns {Array}
   */
  updateNoteParticipant(ast, participant) {
    return ast.map(node => {
      if (node.id === this.noteId && node.type === 'note') {
        return { ...node, participants: [participant] };
      }

      // Check fragment entries (notes can be inside fragments)
      if (node.type === 'fragment') {
        let modified = false;
        let newNode = { ...node };

        if (node.entries) {
          const newEntries = node.entries.map(entry => {
            if (entry.id === this.noteId && entry.type === 'note') {
              modified = true;
              return { ...entry, participants: [participant] };
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
                if (entry.id === this.noteId && entry.type === 'note') {
                  modified = true;
                  return { ...entry, participants: [participant] };
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
