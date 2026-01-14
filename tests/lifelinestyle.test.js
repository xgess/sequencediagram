// Tests for lifeline styling

import { describe, it, expect } from 'vitest';
import { parse } from '../public/src/ast/parser.js';
import { serialize } from '../public/src/ast/serializer.js';
import { render } from '../public/src/rendering/renderer.js';

describe('Lifeline Styling', () => {

  describe('Parsing lifelinestyle directive', () => {
    it('should parse global lifelinestyle with color only', () => {
      const ast = parse('lifelinestyle #red');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive).toBeDefined();
      expect(directive.directiveType).toBe('lifelinestyle');
      expect(directive.participant).toBeNull();
      expect(directive.style.color).toBe('#red');
      expect(directive.style.width).toBeNull();
      expect(directive.style.lineStyle).toBeNull();
    });

    it('should parse global lifelinestyle with color and width', () => {
      const ast = parse('lifelinestyle #blue;3');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.style.color).toBe('#blue');
      expect(directive.style.width).toBe(3);
      expect(directive.style.lineStyle).toBeNull();
    });

    it('should parse global lifelinestyle with all options', () => {
      const ast = parse('lifelinestyle #green;2;solid');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.style.color).toBe('#green');
      expect(directive.style.width).toBe(2);
      expect(directive.style.lineStyle).toBe('solid');
    });

    it('should parse per-participant lifelinestyle', () => {
      const ast = parse('lifelinestyle A #purple;4;dashed');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.participant).toBe('A');
      expect(directive.style.color).toBe('#purple');
      expect(directive.style.width).toBe(4);
      expect(directive.style.lineStyle).toBe('dashed');
    });

    it('should parse per-participant lifelinestyle with color only', () => {
      const ast = parse('lifelinestyle MyParticipant #orange');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.participant).toBe('MyParticipant');
      expect(directive.style.color).toBe('#orange');
    });

    it('should parse lifelinestyle with dotted style', () => {
      const ast = parse('lifelinestyle #black;1;dotted');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.style.lineStyle).toBe('dotted');
    });

    it('should parse lifelinestyle with width only (no color)', () => {
      const ast = parse('lifelinestyle ;4');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.participant).toBeNull();
      expect(directive.style.color).toBeNull();
      expect(directive.style.width).toBe(4);
      expect(directive.style.lineStyle).toBeNull();
    });

    it('should parse lifelinestyle with width and style (no color)', () => {
      const ast = parse('lifelinestyle ;2;solid');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.participant).toBeNull();
      expect(directive.style.color).toBeNull();
      expect(directive.style.width).toBe(2);
      expect(directive.style.lineStyle).toBe('solid');
    });
  });

  describe('Serialization', () => {
    it('should serialize global lifelinestyle with color', () => {
      const ast = parse('lifelinestyle #red');
      const output = serialize(ast);
      expect(output).toBe('lifelinestyle #red');
    });

    it('should serialize global lifelinestyle with color and width', () => {
      const ast = parse('lifelinestyle #blue;3');
      const output = serialize(ast);
      expect(output).toBe('lifelinestyle #blue;3');
    });

    it('should serialize global lifelinestyle with all options', () => {
      const ast = parse('lifelinestyle #green;2;solid');
      const output = serialize(ast);
      expect(output).toBe('lifelinestyle #green;2;solid');
    });

    it('should serialize per-participant lifelinestyle', () => {
      const ast = parse('lifelinestyle A #purple;4;dashed');
      const output = serialize(ast);
      expect(output).toBe('lifelinestyle A #purple;4;dashed');
    });
  });

  describe('Rendering with lifelinestyle', () => {
    it('should render lifeline with custom color', () => {
      const input = `participant A
lifelinestyle #red
A->A:self`;
      const ast = parse(input);
      const svg = render(ast);

      const lifeline = svg.querySelector('.lifeline[data-participant="A"]');
      expect(lifeline).toBeDefined();
      // Named colors are rendered without the # prefix for SVG
      expect(lifeline.getAttribute('stroke')).toBe('red');
    });

    it('should render lifeline with custom width', () => {
      const input = `participant A
lifelinestyle #black;3
A->A:self`;
      const ast = parse(input);
      const svg = render(ast);

      const lifeline = svg.querySelector('.lifeline[data-participant="A"]');
      expect(lifeline.getAttribute('stroke-width')).toBe('3');
    });

    it('should render lifeline with solid style', () => {
      const input = `participant A
lifelinestyle #black;1;solid
A->A:self`;
      const ast = parse(input);
      const svg = render(ast);

      const lifeline = svg.querySelector('.lifeline[data-participant="A"]');
      // Solid lines should not have stroke-dasharray
      expect(lifeline.hasAttribute('stroke-dasharray')).toBe(false);
    });

    it('should render lifeline with dotted style', () => {
      const input = `participant A
lifelinestyle #black;1;dotted
A->A:self`;
      const ast = parse(input);
      const svg = render(ast);

      const lifeline = svg.querySelector('.lifeline[data-participant="A"]');
      expect(lifeline.getAttribute('stroke-dasharray')).toBe('2,2');
    });

    it('should render lifeline with dashed style (default)', () => {
      const input = `participant A
lifelinestyle #black;1;dashed
A->A:self`;
      const ast = parse(input);
      const svg = render(ast);

      const lifeline = svg.querySelector('.lifeline[data-participant="A"]');
      expect(lifeline.getAttribute('stroke-dasharray')).toBe('5,5');
    });

    it('should apply per-participant style to specific participant', () => {
      const input = `participant A
participant B
lifelinestyle A #red;2;solid
A->B:msg`;
      const ast = parse(input);
      const svg = render(ast);

      const lifelineA = svg.querySelector('.lifeline[data-participant="A"]');
      const lifelineB = svg.querySelector('.lifeline[data-participant="B"]');

      // Named colors are rendered without the # prefix for SVG
      expect(lifelineA.getAttribute('stroke')).toBe('red');
      expect(lifelineA.getAttribute('stroke-width')).toBe('2');

      // B should have default styling
      expect(lifelineB.getAttribute('stroke')).toBe('#ccc');
      expect(lifelineB.getAttribute('stroke-width')).toBe('1');
    });

    it('should prefer per-participant style over global', () => {
      const input = `participant A
participant B
lifelinestyle #blue
lifelinestyle A #red
A->B:msg`;
      const ast = parse(input);
      const svg = render(ast);

      const lifelineA = svg.querySelector('.lifeline[data-participant="A"]');
      const lifelineB = svg.querySelector('.lifeline[data-participant="B"]');

      // Named colors are rendered without the # prefix for SVG
      expect(lifelineA.getAttribute('stroke')).toBe('red');
      expect(lifelineB.getAttribute('stroke')).toBe('blue');
    });

    it('should use default styling without lifelinestyle directive', () => {
      const input = `participant A
A->A:self`;
      const ast = parse(input);
      const svg = render(ast);

      const lifeline = svg.querySelector('.lifeline[data-participant="A"]');
      expect(lifeline.getAttribute('stroke')).toBe('#ccc');
      expect(lifeline.getAttribute('stroke-width')).toBe('1');
      expect(lifeline.getAttribute('stroke-dasharray')).toBe('5,5');
    });
  });

  describe('Round-trip', () => {
    it('should round-trip global lifelinestyle', () => {
      const input = 'lifelinestyle #red;2;solid';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.directiveType).toBe(d1.directiveType);
      expect(d2.style.color).toBe(d1.style.color);
      expect(d2.style.width).toBe(d1.style.width);
      expect(d2.style.lineStyle).toBe(d1.style.lineStyle);
    });

    it('should round-trip per-participant lifelinestyle', () => {
      const input = 'lifelinestyle A #purple;4;dashed';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.participant).toBe(d1.participant);
      expect(d2.style.color).toBe(d1.style.color);
    });
  });
});
