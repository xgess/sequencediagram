// Parser integration tests
// See DESIGN.md for AST structure

import { describe, it, expect } from 'vitest';
import { parse } from '../src/ast/parser.js';

describe('Parser', () => {
  describe('placeholder', () => {
    it('should return empty AST for empty input', () => {
      const ast = parse('');
      expect(ast).toEqual([]);
    });
  });

  // TODO(Phase1): Add parser tests as features are implemented
  // - BACKLOG-004: Basic participant
  // - BACKLOG-008: Basic message
  // - BACKLOG-014: Participant styling
  // - BACKLOG-017: Participant alias
  // - BACKLOG-031: Fragments
});
