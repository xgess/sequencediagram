// EditNoteText Command - BACKLOG-128
// Changes the text of a note, box, abox, or rbox

import { Command } from './Command.js';

/**
 * Command to change the text of a note
 */
export class EditNoteTextCommand extends Command {
  /**
   * @param {string} noteId - ID of the note to modify
   * @param {string} oldText - Original text
   * @param {string} newText - New text
   */
  constructor(noteId, oldText, newText) {
    super(`Edit note text`);
    this.noteId = noteId;
    this.oldText = oldText;
    this.newText = newText;
  }

  /**
   * Execute: change note text to newText
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with updated note
   */
  do(ast) {
    return this.updateNoteText(ast, this.newText);
  }

  /**
   * Undo: restore note text to oldText
   * @param {Array} ast - Current AST
   * @returns {Array} AST with original note text
   */
  undo(ast) {
    return this.updateNoteText(ast, this.oldText);
  }

  /**
   * Update note text in AST
   * @param {Array} ast
   * @param {string} text
   * @returns {Array}
   */
  updateNoteText(ast, text) {
    return ast.map(node => {
      if (node.id === this.noteId && node.type === 'note') {
        return { ...node, text };
      }

      // Check fragment entries (notes can be inside fragments)
      if (node.type === 'fragment') {
        let modified = false;
        let newNode = { ...node };

        if (node.entries) {
          const newEntries = node.entries.map(entry => {
            if (entry.id === this.noteId && entry.type === 'note') {
              modified = true;
              return { ...entry, text };
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
                  return { ...entry, text };
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
