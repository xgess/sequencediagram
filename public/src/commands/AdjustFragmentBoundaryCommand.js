// AdjustFragmentBoundary Command
// Moves entries in/out of a fragment by adjusting its top or bottom boundary

import { Command } from './Command.js';

/**
 * Command to adjust fragment boundaries (move entries in/out)
 */
export class AdjustFragmentBoundaryCommand extends Command {
  /**
   * @param {string} fragmentId - ID of the fragment to adjust
   * @param {string} boundary - 'top' or 'bottom'
   * @param {number} delta - Number of entries to move (positive = expand, negative = contract)
   * @param {Array} movedEntries - The entries being moved (for undo)
   * @param {number} astIndex - Index of fragment in AST
   */
  constructor(fragmentId, boundary, delta, movedEntries, astIndex) {
    super(`Adjust fragment ${boundary} boundary`);
    this.fragmentId = fragmentId;
    this.boundary = boundary;
    this.delta = delta;
    this.movedEntries = movedEntries;
    this.astIndex = astIndex;
  }

  /**
   * Execute: adjust fragment boundary
   * @param {Array} ast - Current AST
   * @returns {Array} New AST with adjusted fragment
   */
  do(ast) {
    if (this.boundary === 'top') {
      return this.adjustTopBoundary(ast, this.delta);
    } else {
      return this.adjustBottomBoundary(ast, this.delta);
    }
  }

  /**
   * Undo: reverse the boundary adjustment
   * @param {Array} ast - Current AST
   * @returns {Array} AST with original boundaries
   */
  undo(ast) {
    if (this.boundary === 'top') {
      return this.adjustTopBoundary(ast, -this.delta);
    } else {
      return this.adjustBottomBoundary(ast, -this.delta);
    }
  }

  /**
   * Adjust top boundary - move entries before fragment in/out
   * @param {Array} ast
   * @param {number} delta - positive = expand (pull entries in), negative = contract (push entries out)
   * @returns {Array}
   */
  adjustTopBoundary(ast, delta) {
    const newAst = [...ast];
    const fragIndex = newAst.findIndex(n => n.id === this.fragmentId);
    if (fragIndex === -1) return ast;

    const fragment = { ...newAst[fragIndex] };
    fragment.entries = [...fragment.entries];

    if (delta > 0) {
      // Expanding top - pull entries from before fragment into fragment.entries
      const entriesToMove = [];
      let count = 0;
      for (let i = fragIndex - 1; i >= 0 && count < delta; i--) {
        if (newAst[i].type === 'message') {
          entriesToMove.unshift(newAst[i]);
          count++;
        }
      }

      // Remove from AST and add to fragment entries at beginning
      for (const entry of entriesToMove) {
        const idx = newAst.findIndex(n => n.id === entry.id);
        if (idx !== -1) {
          newAst.splice(idx, 1);
        }
      }

      // Recalculate fragment index after removals
      const newFragIndex = newAst.findIndex(n => n.id === this.fragmentId);
      fragment.entries = [...entriesToMove, ...fragment.entries];
      newAst[newFragIndex] = fragment;

    } else if (delta < 0) {
      // Contracting top - push entries from fragment.entries to before fragment
      const count = Math.min(-delta, fragment.entries.length);
      const entriesToMove = fragment.entries.slice(0, count);
      fragment.entries = fragment.entries.slice(count);

      // Insert before fragment
      newAst.splice(fragIndex, 0, ...entriesToMove);
      // Update fragment at new position
      const newFragIndex = newAst.findIndex(n => n.id === this.fragmentId);
      newAst[newFragIndex] = fragment;
    }

    return newAst;
  }

  /**
   * Adjust bottom boundary - move entries after fragment in/out
   * @param {Array} ast
   * @param {number} delta - positive = expand (pull entries in), negative = contract (push entries out)
   * @returns {Array}
   */
  adjustBottomBoundary(ast, delta) {
    const newAst = [...ast];
    const fragIndex = newAst.findIndex(n => n.id === this.fragmentId);
    if (fragIndex === -1) return ast;

    const fragment = { ...newAst[fragIndex] };
    fragment.entries = [...fragment.entries];

    if (delta > 0) {
      // Expanding bottom - pull entries from after fragment into fragment.entries
      const entriesToMove = [];
      let count = 0;
      for (let i = fragIndex + 1; i < newAst.length && count < delta; i++) {
        if (newAst[i].type === 'message') {
          entriesToMove.push(newAst[i]);
          count++;
        }
      }

      // Remove from AST and add to fragment entries at end
      for (const entry of entriesToMove) {
        const idx = newAst.findIndex(n => n.id === entry.id);
        if (idx !== -1) {
          newAst.splice(idx, 1);
        }
      }

      // Recalculate fragment index after removals
      const newFragIndex = newAst.findIndex(n => n.id === this.fragmentId);
      fragment.entries = [...fragment.entries, ...entriesToMove];
      newAst[newFragIndex] = fragment;

    } else if (delta < 0) {
      // Contracting bottom - push entries from fragment.entries to after fragment
      const count = Math.min(-delta, fragment.entries.length);
      const entriesToMove = fragment.entries.slice(-count);
      fragment.entries = fragment.entries.slice(0, -count);

      // Insert after fragment
      newAst.splice(fragIndex + 1, 0, ...entriesToMove);
      // Update fragment
      newAst[fragIndex] = fragment;
    }

    return newAst;
  }
}
