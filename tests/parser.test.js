// Parser integration tests
// See DESIGN.md for AST structure

import { describe, it, expect } from 'vitest';
import { parse } from '../src/ast/parser.js';

describe('Parser', () => {
  describe('empty input', () => {
    it('should return empty AST for empty input', () => {
      const ast = parse('');
      expect(ast).toEqual([]);
    });

    it('should return empty AST for whitespace-only input', () => {
      const ast = parse('   \n  \n   ');
      expect(ast).toEqual([]);
    });
  });

  describe('participant (BACKLOG-004)', () => {
    it('should parse basic participant declaration', () => {
      const ast = parse('participant Alice');
      expect(ast).toHaveLength(1);
      expect(ast[0].type).toBe('participant');
      expect(ast[0].participantType).toBe('participant');
      expect(ast[0].alias).toBe('Alice');
      expect(ast[0].displayName).toBe('Alice');
      expect(ast[0].style).toEqual({});
    });

    it('should generate valid ID for participant', () => {
      const ast = parse('participant Alice');
      expect(ast[0].id).toMatch(/^p_[a-z0-9]{8}$/);
    });

    it('should set sourceLineStart and sourceLineEnd', () => {
      const ast = parse('participant Alice');
      expect(ast[0].sourceLineStart).toBe(1);
      expect(ast[0].sourceLineEnd).toBe(1);
    });

    it('should parse multiple participants', () => {
      const ast = parse('participant Alice\nparticipant Bob');
      expect(ast).toHaveLength(2);
      expect(ast[0].alias).toBe('Alice');
      expect(ast[1].alias).toBe('Bob');
      expect(ast[1].sourceLineStart).toBe(2);
    });

    it('should parse actor participant type', () => {
      const ast = parse('actor User');
      expect(ast).toHaveLength(1);
      expect(ast[0].participantType).toBe('actor');
      expect(ast[0].alias).toBe('User');
    });

    it('should parse database participant type', () => {
      const ast = parse('database DB');
      expect(ast).toHaveLength(1);
      expect(ast[0].participantType).toBe('database');
      expect(ast[0].alias).toBe('DB');
    });

    it('should skip lines with leading whitespace', () => {
      const ast = parse('  participant Alice');
      expect(ast).toHaveLength(1);
      expect(ast[0].alias).toBe('Alice');
    });
  });

  // TODO(Phase1): Add parser tests as features are implemented
  // - BACKLOG-008: Basic message
  // - BACKLOG-014: Participant styling
  // - BACKLOG-017: Participant alias
  // - BACKLOG-031: Fragments
});
