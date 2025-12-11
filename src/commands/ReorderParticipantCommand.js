// ReorderParticipant Command - BACKLOG-078
// Moves a participant to a new position in the AST

import { Command } from './Command.js';

/**
 * Command to reorder a participant in the AST
 */
export class ReorderParticipantCommand extends Command {
  /**
   * @param {string} participantId - ID of the participant to move
   * @param {number} oldIndex - Original index in AST
   * @param {number} newIndex - Target index in AST
   */
  constructor(participantId, oldIndex, newIndex) {
    super(`Reorder participant`);
    this.participantId = participantId;
    this.oldIndex = oldIndex;
    this.newIndex = newIndex;
  }

  /**
   * Execute: move participant to new position
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with reordered participant
   */
  do(ast) {
    return this.moveNode(ast, this.oldIndex, this.newIndex);
  }

  /**
   * Undo: move participant back to original position
   * @param {Array} ast - Current AST
   * @returns {Array} AST with participant in original position
   */
  undo(ast) {
    return this.moveNode(ast, this.newIndex, this.oldIndex);
  }

  /**
   * Move a node from one index to another
   * @param {Array} ast
   * @param {number} fromIndex
   * @param {number} toIndex
   * @returns {Array}
   */
  moveNode(ast, fromIndex, toIndex) {
    if (fromIndex === toIndex) return ast;

    const newAst = [...ast];
    const [removed] = newAst.splice(fromIndex, 1);
    newAst.splice(toIndex, 0, removed);
    return newAst;
  }
}
