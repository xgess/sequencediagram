// EditParticipant Command
// Changes the display name and/or alias of a participant

import { Command } from './Command.js';

/**
 * Command to edit a participant's display name and alias
 */
export class EditParticipantCommand extends Command {
  /**
   * @param {string} participantId - ID of the participant to modify
   * @param {string} oldDisplayName - Original display name
   * @param {string} newDisplayName - New display name
   * @param {string} oldAlias - Original alias
   * @param {string} newAlias - New alias
   */
  constructor(participantId, oldDisplayName, newDisplayName, oldAlias, newAlias) {
    super(`Edit participant`);
    this.participantId = participantId;
    this.oldDisplayName = oldDisplayName;
    this.newDisplayName = newDisplayName;
    this.oldAlias = oldAlias;
    this.newAlias = newAlias;
  }

  /**
   * Execute: update participant and all message references
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with updated participant
   */
  do(ast) {
    return this.updateParticipant(ast, this.newDisplayName, this.newAlias, this.oldAlias);
  }

  /**
   * Undo: restore original participant and message references
   * @param {Array} ast - Current AST
   * @returns {Array} AST with original participant
   */
  undo(ast) {
    return this.updateParticipant(ast, this.oldDisplayName, this.oldAlias, this.newAlias);
  }

  /**
   * Update participant and message references
   * @param {Array} ast
   * @param {string} displayName
   * @param {string} newAlias
   * @param {string} oldAlias - The alias to replace in messages
   * @returns {Array}
   */
  updateParticipant(ast, displayName, newAlias, oldAlias) {
    const aliasChanged = oldAlias !== newAlias;

    return ast.map(node => {
      // Update participant
      if (node.id === this.participantId && node.type === 'participant') {
        return {
          ...node,
          displayName: displayName,
          alias: newAlias
        };
      }

      // Update message references if alias changed
      if (aliasChanged && node.type === 'message') {
        let updated = false;
        const newNode = { ...node };

        if (node.from === oldAlias) {
          newNode.from = newAlias;
          updated = true;
        }
        if (node.to === oldAlias) {
          newNode.to = newAlias;
          updated = true;
        }

        return updated ? newNode : node;
      }

      // Update fragment entries if alias changed
      if (aliasChanged && node.type === 'fragment') {
        let modified = false;
        const newNode = { ...node };

        if (node.entries) {
          const newEntries = node.entries.map(entry => {
            if (entry.type === 'message') {
              let updated = false;
              const newEntry = { ...entry };

              if (entry.from === oldAlias) {
                newEntry.from = newAlias;
                updated = true;
              }
              if (entry.to === oldAlias) {
                newEntry.to = newAlias;
                updated = true;
              }

              if (updated) {
                modified = true;
                return newEntry;
              }
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
              let clauseModified = false;
              const newEntries = clause.entries.map(entry => {
                if (entry.type === 'message') {
                  let updated = false;
                  const newEntry = { ...entry };

                  if (entry.from === oldAlias) {
                    newEntry.from = newAlias;
                    updated = true;
                  }
                  if (entry.to === oldAlias) {
                    newEntry.to = newAlias;
                    updated = true;
                  }

                  if (updated) {
                    clauseModified = true;
                    modified = true;
                    return newEntry;
                  }
                }
                return entry;
              });

              if (clauseModified) {
                return { ...clause, entries: newEntries };
              }
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
