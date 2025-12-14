// Tests for autonumbering (BACKLOG-133)

import { describe, it, expect } from 'vitest';
import { parse } from '../src/ast/parser.js';
import { serialize } from '../src/ast/serializer.js';
import { render } from '../src/rendering/renderer.js';

describe('Autonumbering (BACKLOG-133)', () => {

  describe('Parsing autonumber directive', () => {
    it('should parse autonumber with start value', () => {
      const ast = parse('autonumber 1');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive).toBeDefined();
      expect(directive.directiveType).toBe('autonumber');
      expect(directive.value).toBe(1);
    });

    it('should parse autonumber starting at different value', () => {
      const ast = parse('autonumber 10');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.value).toBe(10);
    });

    it('should parse autonumber off', () => {
      const ast = parse('autonumber off');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.directiveType).toBe('autonumber');
      expect(directive.value).toBeNull();
    });
  });

  describe('Serialization', () => {
    it('should serialize autonumber directive', () => {
      const ast = parse('autonumber 1');
      const output = serialize(ast);
      expect(output).toBe('autonumber 1');
    });

    it('should serialize autonumber off', () => {
      const ast = parse('autonumber off');
      const output = serialize(ast);
      expect(output).toBe('autonumber off');
    });
  });

  describe('Rendering with numbers', () => {
    it('should render message numbers when autonumber is active', () => {
      const input = `participant A
participant B
autonumber 1
A->B:first
A->B:second`;
      const ast = parse(input);
      const svg = render(ast);

      const texts = svg.querySelectorAll('.message text');
      expect(texts.length).toBe(2);
      expect(texts[0].textContent).toBe('1. first');
      expect(texts[1].textContent).toBe('2. second');
    });

    it('should start numbering from specified value', () => {
      const input = `participant A
participant B
autonumber 5
A->B:first
A->B:second`;
      const ast = parse(input);
      const svg = render(ast);

      const texts = svg.querySelectorAll('.message text');
      expect(texts[0].textContent).toBe('5. first');
      expect(texts[1].textContent).toBe('6. second');
    });

    it('should not number messages before autonumber directive', () => {
      const input = `participant A
participant B
A->B:unnumbered
autonumber 1
A->B:numbered`;
      const ast = parse(input);
      const svg = render(ast);

      const texts = svg.querySelectorAll('.message text');
      expect(texts[0].textContent).toBe('unnumbered');
      expect(texts[1].textContent).toBe('1. numbered');
    });

    it('should stop numbering after autonumber off', () => {
      const input = `participant A
participant B
autonumber 1
A->B:numbered
autonumber off
A->B:unnumbered`;
      const ast = parse(input);
      const svg = render(ast);

      const texts = svg.querySelectorAll('.message text');
      expect(texts[0].textContent).toBe('1. numbered');
      expect(texts[1].textContent).toBe('unnumbered');
    });

    it('should restart numbering after autonumber off then on', () => {
      const input = `participant A
participant B
autonumber 1
A->B:first
autonumber off
A->B:unnumbered
autonumber 10
A->B:restarted`;
      const ast = parse(input);
      const svg = render(ast);

      const texts = svg.querySelectorAll('.message text');
      expect(texts[0].textContent).toBe('1. first');
      expect(texts[1].textContent).toBe('unnumbered');
      expect(texts[2].textContent).toBe('10. restarted');
    });
  });

  describe('Round-trip', () => {
    it('should round-trip autonumber directive', () => {
      const input = 'autonumber 1';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.directiveType).toBe(d1.directiveType);
      expect(d2.value).toBe(d1.value);
    });

    it('should round-trip autonumber off', () => {
      const input = 'autonumber off';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.value).toBe(d1.value);
    });
  });
});
