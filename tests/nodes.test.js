// AST node utilities tests

import { describe, it, expect } from 'vitest';
import { generateId, NODE_TYPES } from '../public/src/ast/nodes.js';

describe('Node utilities', () => {
  describe('generateId', () => {
    it('should generate ID with correct prefix for participant', () => {
      const id = generateId('participant');
      expect(id).toMatch(/^p_[a-z0-9]{8}$/);
    });

    it('should generate ID with correct prefix for message', () => {
      const id = generateId('message');
      expect(id).toMatch(/^m_[a-z0-9]{8}$/);
    });

    it('should generate ID with correct prefix for fragment', () => {
      const id = generateId('fragment');
      expect(id).toMatch(/^f_[a-z0-9]{8}$/);
    });

    it('should generate ID with correct prefix for comment', () => {
      const id = generateId('comment');
      expect(id).toMatch(/^c_[a-z0-9]{8}$/);
    });

    it('should generate ID with correct prefix for blankline', () => {
      const id = generateId('blankline');
      expect(id).toMatch(/^bl_[a-z0-9]{8}$/);
    });

    it('should generate ID with correct prefix for directive', () => {
      const id = generateId('directive');
      expect(id).toMatch(/^d_[a-z0-9]{8}$/);
    });

    it('should generate ID with correct prefix for error', () => {
      const id = generateId('error');
      expect(id).toMatch(/^e_[a-z0-9]{8}$/);
    });

    it('should use default prefix for unknown type', () => {
      const id = generateId('unknown');
      expect(id).toMatch(/^n_[a-z0-9]{8}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId('message'));
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('NODE_TYPES', () => {
    it('should define all base node types', () => {
      expect(NODE_TYPES.PARTICIPANT).toBe('participant');
      expect(NODE_TYPES.MESSAGE).toBe('message');
      expect(NODE_TYPES.FRAGMENT).toBe('fragment');
      expect(NODE_TYPES.COMMENT).toBe('comment');
      expect(NODE_TYPES.BLANKLINE).toBe('blankline');
      expect(NODE_TYPES.DIRECTIVE).toBe('directive');
      expect(NODE_TYPES.ERROR).toBe('error');
    });
  });
});
