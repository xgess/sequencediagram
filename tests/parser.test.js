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

  describe('message (BACKLOG-008)', () => {
    it('should parse basic sync message (->)', () => {
      const ast = parse('Alice->Bob:Hello');
      const messages = ast.filter(n => n.type === 'message');
      expect(messages).toHaveLength(1);
      expect(messages[0].from).toBe('Alice');
      expect(messages[0].to).toBe('Bob');
      expect(messages[0].arrowType).toBe('->');
      expect(messages[0].label).toBe('Hello');
    });

    it('should generate valid ID for message', () => {
      const ast = parse('Alice->Bob:Hello');
      const message = ast.find(n => n.type === 'message');
      expect(message.id).toMatch(/^m_[a-z0-9]{8}$/);
    });

    it('should parse async message (->>)', () => {
      const ast = parse('Alice->>Bob:Async');
      const message = ast.find(n => n.type === 'message');
      expect(message.arrowType).toBe('->>');
    });

    it('should parse return message (-->)', () => {
      const ast = parse('Bob-->Alice:Response');
      const message = ast.find(n => n.type === 'message');
      expect(message.arrowType).toBe('-->');
      expect(message.from).toBe('Bob');
      expect(message.to).toBe('Alice');
    });

    it('should parse async return message (-->>)', () => {
      const ast = parse('Bob-->>Alice:Async Response');
      const message = ast.find(n => n.type === 'message');
      expect(message.arrowType).toBe('-->>');
    });

    it('should parse message with spaces in label', () => {
      const ast = parse('Alice->Bob:Hello World!');
      const message = ast.find(n => n.type === 'message');
      expect(message.label).toBe('Hello World!');
    });

    it('should parse message with empty label', () => {
      const ast = parse('Alice->Bob:');
      const message = ast.find(n => n.type === 'message');
      expect(message.label).toBe('');
    });

    it('should set correct line numbers', () => {
      const ast = parse('participant Alice\nparticipant Bob\nAlice->Bob:Hi');
      const message = ast.find(n => n.type === 'message');
      expect(message.sourceLineStart).toBe(3);
      expect(message.sourceLineEnd).toBe(3);
    });

    it('should parse multiple messages', () => {
      const ast = parse('Alice->Bob:Hello\nBob-->Alice:Hi');
      const messages = ast.filter(n => n.type === 'message');
      expect(messages).toHaveLength(2);
      expect(messages[0].label).toBe('Hello');
      expect(messages[1].label).toBe('Hi');
    });
  });

  describe('participant styling (BACKLOG-014)', () => {
    it('should parse participant with fill color', () => {
      const ast = parse('participant Alice #lightblue');
      expect(ast[0].style.fill).toBe('#lightblue');
    });

    it('should parse participant with fill and border color', () => {
      const ast = parse('participant Alice #lightblue #green');
      expect(ast[0].style.fill).toBe('#lightblue');
      expect(ast[0].style.border).toBe('#green');
    });

    it('should parse participant with full styling', () => {
      const ast = parse('participant Alice #lightblue #green;3;dashed');
      expect(ast[0].style.fill).toBe('#lightblue');
      expect(ast[0].style.border).toBe('#green');
      expect(ast[0].style.borderWidth).toBe(3);
      expect(ast[0].style.borderStyle).toBe('dashed');
    });

    it('should parse participant with border width only', () => {
      const ast = parse('participant Alice ;2');
      expect(ast[0].style.fill).toBeUndefined();
      expect(ast[0].style.borderWidth).toBe(2);
    });

    it('should parse participant with fill and border width', () => {
      const ast = parse('participant Alice #pink ;3');
      expect(ast[0].style.fill).toBe('#pink');
      expect(ast[0].style.borderWidth).toBe(3);
    });

    it('should parse participant with no border (width 0)', () => {
      const ast = parse('participant Alice #yellow ;0');
      expect(ast[0].style.fill).toBe('#yellow');
      expect(ast[0].style.borderWidth).toBe(0);
    });

    it('should handle hex colors with digits', () => {
      const ast = parse('participant Alice #ff0000');
      expect(ast[0].style.fill).toBe('#ff0000');
    });

    it('should handle solid border style', () => {
      const ast = parse('participant Alice #white #black;1;solid');
      expect(ast[0].style.borderStyle).toBe('solid');
    });
  });

  describe('participant alias (BACKLOG-017)', () => {
    it('should parse quoted display name with alias', () => {
      const ast = parse('participant "Web Server" as WS');
      expect(ast[0].displayName).toBe('Web Server');
      expect(ast[0].alias).toBe('WS');
    });

    it('should parse multiline display name', () => {
      const ast = parse('participant "Line1\\nLine2" as A');
      expect(ast[0].displayName).toBe('Line1\nLine2');
      expect(ast[0].alias).toBe('A');
    });

    it('should parse escaped quotes in display name', () => {
      const ast = parse('participant "My \\"DB\\"" as DB');
      expect(ast[0].displayName).toBe('My "DB"');
      expect(ast[0].alias).toBe('DB');
    });

    it('should parse alias with styling', () => {
      const ast = parse('participant "Web Server" as WS #lightblue');
      expect(ast[0].displayName).toBe('Web Server');
      expect(ast[0].alias).toBe('WS');
      expect(ast[0].style.fill).toBe('#lightblue');
    });

    it('should parse alias with full styling', () => {
      const ast = parse('participant "My Service" as MS #pink #blue;2;dashed');
      expect(ast[0].displayName).toBe('My Service');
      expect(ast[0].alias).toBe('MS');
      expect(ast[0].style.fill).toBe('#pink');
      expect(ast[0].style.border).toBe('#blue');
      expect(ast[0].style.borderWidth).toBe(2);
      expect(ast[0].style.borderStyle).toBe('dashed');
    });

    it('should use alias for simple participant (no quotes)', () => {
      const ast = parse('participant Alice');
      expect(ast[0].displayName).toBe('Alice');
      expect(ast[0].alias).toBe('Alice');
    });

    it('should parse actor with alias', () => {
      const ast = parse('actor "External User" as EU');
      expect(ast[0].participantType).toBe('actor');
      expect(ast[0].displayName).toBe('External User');
      expect(ast[0].alias).toBe('EU');
    });
  });

  describe('fragment parsing (BACKLOG-031)', () => {
    it('should parse basic alt fragment', () => {
      const ast = parse('alt success\nend');
      const fragment = ast.find(n => n.type === 'fragment');
      expect(fragment).not.toBeNull();
      expect(fragment.fragmentType).toBe('alt');
      expect(fragment.condition).toBe('success');
      expect(fragment.entries).toEqual([]);
      expect(fragment.elseClauses).toEqual([]);
    });

    it('should generate valid ID for fragment', () => {
      const ast = parse('alt success\nend');
      const fragment = ast.find(n => n.type === 'fragment');
      expect(fragment.id).toMatch(/^f_[a-z0-9]{8}$/);
    });

    it('should parse alt fragment with message inside', () => {
      const ast = parse('alt success\nAlice->Bob:OK\nend');
      const fragment = ast.find(n => n.type === 'fragment');
      const message = ast.find(n => n.type === 'message');

      expect(fragment.entries).toHaveLength(1);
      expect(fragment.entries[0]).toBe(message.id);
    });

    it('should parse alt fragment with else clause', () => {
      const ast = parse('alt success\nAlice->Bob:OK\nelse failure\nAlice->Bob:Error\nend');
      const fragment = ast.find(n => n.type === 'fragment');
      const messages = ast.filter(n => n.type === 'message');

      expect(fragment.entries).toHaveLength(1);
      expect(fragment.elseClauses).toHaveLength(1);
      expect(fragment.elseClauses[0].condition).toBe('failure');
      expect(fragment.elseClauses[0].entries).toHaveLength(1);
      expect(fragment.elseClauses[0].entries[0]).toBe(messages[1].id);
    });

    it('should parse alt fragment with multiple else clauses', () => {
      const ast = parse('alt case1\nAlice->Bob:One\nelse case2\nAlice->Bob:Two\nelse case3\nAlice->Bob:Three\nend');
      const fragment = ast.find(n => n.type === 'fragment');

      expect(fragment.entries).toHaveLength(1);
      expect(fragment.elseClauses).toHaveLength(2);
      expect(fragment.elseClauses[0].condition).toBe('case2');
      expect(fragment.elseClauses[1].condition).toBe('case3');
    });

    it('should parse loop fragment', () => {
      const ast = parse('loop 10 times\nAlice->Bob:Ping\nend');
      const fragment = ast.find(n => n.type === 'fragment');

      expect(fragment.fragmentType).toBe('loop');
      expect(fragment.condition).toBe('10 times');
      expect(fragment.entries).toHaveLength(1);
    });

    it('should parse nested fragments', () => {
      const ast = parse('alt outer\nloop inner\nAlice->Bob:Hi\nend\nend');
      const fragments = ast.filter(n => n.type === 'fragment');

      expect(fragments).toHaveLength(2);
      const outer = fragments.find(f => f.fragmentType === 'alt');
      const inner = fragments.find(f => f.fragmentType === 'loop');

      expect(outer.entries).toContain(inner.id);
    });

    it('should set sourceLineStart and sourceLineEnd', () => {
      const ast = parse('alt success\nAlice->Bob:OK\nend');
      const fragment = ast.find(n => n.type === 'fragment');

      expect(fragment.sourceLineStart).toBe(1);
      expect(fragment.sourceLineEnd).toBe(3);
    });

    it('should handle fragment with participants and messages', () => {
      const input = `participant Alice
participant Bob
alt success
Alice->Bob:Request
Bob-->Alice:Response
end`;
      const ast = parse(input);
      const fragment = ast.find(n => n.type === 'fragment');
      const messages = ast.filter(n => n.type === 'message');

      expect(fragment.entries).toHaveLength(2);
      expect(fragment.entries).toContain(messages[0].id);
      expect(fragment.entries).toContain(messages[1].id);
    });
  });

  // TODO(Phase1): Add parser tests as features are implemented
});
