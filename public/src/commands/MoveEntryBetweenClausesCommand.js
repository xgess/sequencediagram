// MoveEntryBetweenClauses Command
// Moves entries between fragment.entries and elseClauses[clauseIndex].entries

import { Command } from './Command.js';

/**
 * Command to move entries between a fragment's main entries and an else clause
 */
export class MoveEntryBetweenClausesCommand extends Command {
  /**
   * @param {string} fragmentId - ID of the fragment
   * @param {number} clauseIndex - Index of the else clause (0 for first else)
   * @param {number} delta - Number of entries to move (positive = move from main to else, negative = else to main)
   */
  constructor(fragmentId, clauseIndex, delta) {
    super(`Move entries between clauses`);
    this.fragmentId = fragmentId;
    this.clauseIndex = clauseIndex;
    this.delta = delta;
  }

  /**
   * Execute: move entries between clauses
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with moved entries
   */
  do(ast) {
    return this.moveEntries(ast, this.delta);
  }

  /**
   * Undo: reverse the move
   * @param {Array} ast - Current AST
   * @returns {Array} AST with entries moved back
   */
  undo(ast) {
    return this.moveEntries(ast, -this.delta);
  }

  /**
   * Move entries between main and else clause
   * @param {Array} ast
   * @param {number} delta - positive = main to else, negative = else to main
   * @returns {Array}
   */
  moveEntries(ast, delta) {
    const newAst = [...ast];
    const fragIndex = newAst.findIndex(n => n.id === this.fragmentId);
    if (fragIndex === -1) return ast;

    const fragment = { ...newAst[fragIndex] };
    fragment.entries = [...fragment.entries];
    fragment.elseClauses = fragment.elseClauses.map((c, i) =>
      i === this.clauseIndex ? { ...c, entries: [...c.entries] } : c
    );

    const elseClause = fragment.elseClauses[this.clauseIndex];
    if (!elseClause) return ast;

    if (delta > 0) {
      // Move from main entries to else clause (expand else / contract main)
      // Take entries from the END of main entries
      const count = Math.min(delta, fragment.entries.length);
      if (count === 0) return ast;

      const entriesToMove = fragment.entries.slice(-count);
      fragment.entries = fragment.entries.slice(0, -count);

      // Add to BEGINNING of else clause entries
      elseClause.entries = [...entriesToMove, ...elseClause.entries];
    } else if (delta < 0) {
      // Move from else clause to main entries (contract else / expand main)
      // Take entries from the BEGINNING of else clause entries
      const count = Math.min(-delta, elseClause.entries.length);
      if (count === 0) return ast;

      const entriesToMove = elseClause.entries.slice(0, count);
      elseClause.entries = elseClause.entries.slice(count);

      // Add to END of main entries
      fragment.entries = [...fragment.entries, ...entriesToMove];
    }

    newAst[fragIndex] = fragment;
    return newAst;
  }
}
