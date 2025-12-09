// Serializer tests
// See DESIGN.md for serialization format

import { describe, it, expect } from 'vitest';
import { serialize } from '../src/ast/serializer.js';
import { parse } from '../src/ast/parser.js';

describe('Serializer', () => {
  describe('empty AST', () => {
    it('should return empty string for empty AST', () => {
      const text = serialize([]);
      expect(text).toBe('');
    });
  });

  describe('participant serialization (BACKLOG-006)', () => {
    it('should serialize basic participant', () => {
      const ast = parse('participant Alice');
      const text = serialize(ast);
      expect(text).toBe('participant Alice');
    });

    it('should serialize actor participant', () => {
      const ast = parse('actor User');
      const text = serialize(ast);
      expect(text).toBe('actor User');
    });

    it('should serialize database participant', () => {
      const ast = parse('database DB');
      const text = serialize(ast);
      expect(text).toBe('database DB');
    });

    it('should serialize multiple participants', () => {
      const ast = parse('participant Alice\nparticipant Bob');
      const text = serialize(ast);
      expect(text).toBe('participant Alice\nparticipant Bob');
    });
  });

  describe('round-trip tests', () => {
    it('should round-trip basic participant', () => {
      const input = 'participant Alice';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);

      expect(ast2).toHaveLength(1);
      expect(ast2[0].type).toBe(ast1[0].type);
      expect(ast2[0].participantType).toBe(ast1[0].participantType);
      expect(ast2[0].alias).toBe(ast1[0].alias);
      expect(ast2[0].displayName).toBe(ast1[0].displayName);
    });

    it('should round-trip multiple participants', () => {
      const input = 'participant Alice\nactor Bob\ndatabase DB';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);

      expect(ast2).toHaveLength(3);
      expect(ast2[0].alias).toBe('Alice');
      expect(ast2[1].alias).toBe('Bob');
      expect(ast2[2].alias).toBe('DB');
    });
  });

  describe('message serialization (BACKLOG-012)', () => {
    it('should serialize sync message (->)', () => {
      const ast = parse('Alice->Bob:Hello');
      const text = serialize(ast);
      expect(text).toBe('Alice->Bob:Hello');
    });

    it('should serialize async message (->>)', () => {
      const ast = parse('Alice->>Bob:Async');
      const text = serialize(ast);
      expect(text).toBe('Alice->>Bob:Async');
    });

    it('should serialize return message (-->)', () => {
      const ast = parse('Bob-->Alice:Response');
      const text = serialize(ast);
      expect(text).toBe('Bob-->Alice:Response');
    });

    it('should serialize async return message (-->>)', () => {
      const ast = parse('Bob-->>Alice:Async Response');
      const text = serialize(ast);
      expect(text).toBe('Bob-->>Alice:Async Response');
    });

    it('should serialize message with empty label', () => {
      const ast = parse('Alice->Bob:');
      const text = serialize(ast);
      expect(text).toBe('Alice->Bob:');
    });
  });

  describe('round-trip tests (messages)', () => {
    it('should round-trip message', () => {
      const input = 'Alice->Bob:Hello World';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);

      expect(ast2).toHaveLength(1);
      expect(ast2[0].from).toBe(ast1[0].from);
      expect(ast2[0].to).toBe(ast1[0].to);
      expect(ast2[0].arrowType).toBe(ast1[0].arrowType);
      expect(ast2[0].label).toBe(ast1[0].label);
    });

    it('should round-trip participants and messages', () => {
      const input = 'participant Alice\nparticipant Bob\nAlice->Bob:Hello\nBob-->Alice:Hi';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);

      expect(ast2).toHaveLength(4);
      expect(ast2[0].alias).toBe('Alice');
      expect(ast2[1].alias).toBe('Bob');
      expect(ast2[2].label).toBe('Hello');
      expect(ast2[3].label).toBe('Hi');
    });
  });

  // TODO(Phase1): Add serializer tests as features are implemented
  // - BACKLOG-036: Serialize fragment
});
