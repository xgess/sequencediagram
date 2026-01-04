// Tests for frame directive (BACKLOG-135)

import { describe, it, expect } from 'vitest';
import { parse } from '../src/ast/parser.js';
import { serialize } from '../src/ast/serializer.js';
import { render } from '../src/rendering/renderer.js';

describe('Frame Directive (BACKLOG-135)', () => {

  describe('Parsing frame directive', () => {
    it('should parse frame with title only', () => {
      const ast = parse('frame My Diagram');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive).toBeDefined();
      expect(directive.directiveType).toBe('frame');
      expect(directive.value).toBe('My Diagram');
      expect(directive.style).toBeNull();
    });

    it('should parse frame without title', () => {
      const ast = parse('frame');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.directiveType).toBe('frame');
      expect(directive.value).toBe('');
    });

    it('should parse frame with operator color', () => {
      const ast = parse('frame#red My Diagram');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.style.operatorColor).toBe('#red');
      expect(directive.value).toBe('My Diagram');
    });

    it('should parse frame with fill color', () => {
      const ast = parse('frame #lightblue My Diagram');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.style.fill).toBe('#lightblue');
      expect(directive.value).toBe('My Diagram');
    });

    it('should parse frame with border color', () => {
      const ast = parse('frame #lightblue #black My Diagram');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.style.fill).toBe('#lightblue');
      expect(directive.style.border).toBe('#black');
      expect(directive.value).toBe('My Diagram');
    });

    it('should parse frame with border width', () => {
      const ast = parse('frame #lightblue #black;3 My Diagram');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.style.border).toBe('#black');
      expect(directive.style.borderWidth).toBe(3);
      expect(directive.value).toBe('My Diagram');
    });

    it('should parse frame with border style', () => {
      const ast = parse('frame #lightblue #black;2;dashed My Diagram');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.style.border).toBe('#black');
      expect(directive.style.borderWidth).toBe(2);
      expect(directive.style.borderStyle).toBe('dashed');
    });

    it('should parse frame with operator color and all styles', () => {
      const ast = parse('frame#red #lightblue #black;2;solid My Title');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.style.operatorColor).toBe('#red');
      expect(directive.style.fill).toBe('#lightblue');
      expect(directive.style.border).toBe('#black');
      expect(directive.style.borderWidth).toBe(2);
      expect(directive.style.borderStyle).toBe('solid');
      expect(directive.value).toBe('My Title');
    });
  });

  describe('Serialization', () => {
    it('should serialize frame with title only', () => {
      const ast = parse('frame My Diagram');
      const output = serialize(ast);
      expect(output).toBe('frame My Diagram');
    });

    it('should serialize frame without title', () => {
      const ast = parse('frame');
      const output = serialize(ast);
      expect(output).toBe('frame');
    });

    it('should serialize frame with operator color', () => {
      const ast = parse('frame#red My Diagram');
      const output = serialize(ast);
      expect(output).toBe('frame#red My Diagram');
    });

    it('should serialize frame with fill and border', () => {
      const ast = parse('frame #lightblue #black My Diagram');
      const output = serialize(ast);
      expect(output).toBe('frame #lightblue #black My Diagram');
    });

    it('should serialize frame with full styling', () => {
      const ast = parse('frame#red #lightblue #black;2;dashed My Title');
      const output = serialize(ast);
      expect(output).toBe('frame#red #lightblue #black;2;dashed My Title');
    });
  });

  describe('Rendering with frame', () => {
    it('should render frame around diagram', () => {
      const input = `frame My Diagram
participant A
A->A:self`;
      const ast = parse(input);
      const svg = render(ast);

      const frame = svg.querySelector('.diagram-frame');
      expect(frame).toBeDefined();

      // Should have main rect
      const rects = frame.querySelectorAll('rect');
      expect(rects.length).toBeGreaterThanOrEqual(1);
    });

    it('should render frame with label', () => {
      const input = `frame My Diagram
participant A
A->A:self`;
      const ast = parse(input);
      const svg = render(ast);

      const frame = svg.querySelector('.diagram-frame');
      const text = frame.querySelector('text');
      expect(text).toBeDefined();
      expect(text.textContent).toBe('My Diagram');
    });

    it('should render frame without label when no title', () => {
      const input = `frame
participant A
A->A:self`;
      const ast = parse(input);
      const svg = render(ast);

      const frame = svg.querySelector('.diagram-frame');
      const text = frame.querySelector('text');
      expect(text).toBeNull();
    });

    it('should apply custom border style', () => {
      const input = `frame #none #blue;3;dashed My Diagram
participant A
A->A:self`;
      const ast = parse(input);
      const svg = render(ast);

      const frame = svg.querySelector('.diagram-frame');
      const rect = frame.querySelector('rect');
      // Named colors are rendered without the # prefix for SVG
      expect(rect.getAttribute('stroke')).toBe('blue');
      expect(rect.getAttribute('stroke-width')).toBe('3');
      expect(rect.getAttribute('stroke-dasharray')).toBe('5,5');
    });
  });

  describe('Round-trip', () => {
    it('should round-trip frame directive', () => {
      const input = 'frame My Diagram';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.directiveType).toBe(d1.directiveType);
      expect(d2.value).toBe(d1.value);
    });

    it('should round-trip styled frame directive', () => {
      const input = 'frame#red #lightblue #black;2;dashed Title';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.style.operatorColor).toBe(d1.style.operatorColor);
      expect(d2.style.fill).toBe(d1.style.fill);
      expect(d2.style.border).toBe(d1.style.border);
      expect(d2.style.borderWidth).toBe(d1.style.borderWidth);
      expect(d2.style.borderStyle).toBe(d1.style.borderStyle);
    });
  });
});
