// Tests for font family directive (BACKLOG-138)

import { describe, it, expect } from 'vitest';
import { parse } from '../public/src/ast/parser.js';
import { serialize } from '../public/src/ast/serializer.js';
import { render } from '../public/src/rendering/renderer.js';

describe('Font Family Directive (BACKLOG-138)', () => {

  describe('Parsing fontfamily directive', () => {
    it('should parse fontfamily with simple value', () => {
      const ast = parse('fontfamily sans-serif');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive).toBeDefined();
      expect(directive.directiveType).toBe('fontfamily');
      expect(directive.value).toBe('sans-serif');
    });

    it('should parse fontfamily with quoted value', () => {
      const ast = parse('fontfamily "Helvetica Neue"');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.directiveType).toBe('fontfamily');
      expect(directive.value).toBe('Helvetica Neue');
    });

    it('should parse fontfamily with monospace', () => {
      const ast = parse('fontfamily monospace');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.value).toBe('monospace');
    });
  });

  describe('Serialization', () => {
    it('should serialize fontfamily with simple value', () => {
      const ast = parse('fontfamily sans-serif');
      const output = serialize(ast);
      expect(output).toBe('fontfamily sans-serif');
    });

    it('should serialize fontfamily with spaces in quotes', () => {
      const ast = parse('fontfamily "Helvetica Neue"');
      const output = serialize(ast);
      expect(output).toBe('fontfamily "Helvetica Neue"');
    });
  });

  describe('Rendering with fontfamily', () => {
    it('should apply font family to text elements', () => {
      const input = `fontfamily Arial
participant A
A->A:msg`;
      const ast = parse(input);
      const svg = render(ast);

      const textElements = svg.querySelectorAll('text');
      expect(textElements.length).toBeGreaterThan(0);

      // All text elements should have the specified font family
      textElements.forEach(text => {
        expect(text.getAttribute('font-family')).toBe('Arial');
      });
    });

    it('should apply quoted font family', () => {
      const input = `fontfamily "Comic Sans MS"
participant A
A->A:msg`;
      const ast = parse(input);
      const svg = render(ast);

      const textElements = svg.querySelectorAll('text');
      textElements.forEach(text => {
        expect(text.getAttribute('font-family')).toBe('Comic Sans MS');
      });
    });

    it('should not change font family without directive', () => {
      const input = `participant A
A->A:msg`;
      const ast = parse(input);
      const svg = render(ast);

      const textElements = svg.querySelectorAll('text');
      // Default font family should contain system fonts
      textElements.forEach(text => {
        const fontFamily = text.getAttribute('font-family');
        // Default includes -apple-system, BlinkMacSystemFont, sans-serif
        expect(fontFamily).toContain('sans-serif');
      });
    });
  });

  describe('Round-trip', () => {
    it('should round-trip fontfamily directive', () => {
      const input = 'fontfamily monospace';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.directiveType).toBe(d1.directiveType);
      expect(d2.value).toBe(d1.value);
    });

    it('should round-trip fontfamily with spaces', () => {
      const input = 'fontfamily "Times New Roman"';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.value).toBe('Times New Roman');
    });
  });
});
