// Tests for spacing controls

import { describe, it, expect } from 'vitest';
import { parse } from '../public/src/ast/parser.js';
import { serialize } from '../public/src/ast/serializer.js';
import { render } from '../public/src/rendering/renderer.js';
import { calculateLayout } from '../public/src/rendering/layout.js';

describe('Spacing Controls', () => {

  describe('Parsing space directive', () => {
    it('should parse space without value (default 1)', () => {
      const ast = parse('space');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive).toBeDefined();
      expect(directive.directiveType).toBe('space');
      expect(directive.value).toBe(1);
    });

    it('should parse space with positive value', () => {
      const ast = parse('space 3');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.directiveType).toBe('space');
      expect(directive.value).toBe(3);
    });

    it('should parse space with negative value', () => {
      const ast = parse('space -2');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.directiveType).toBe('space');
      expect(directive.value).toBe(-2);
    });
  });

  describe('Parsing participantspacing directive', () => {
    it('should parse participantspacing with numeric value', () => {
      const ast = parse('participantspacing 200');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive).toBeDefined();
      expect(directive.directiveType).toBe('participantspacing');
      expect(directive.value).toBe(200);
    });

    it('should parse participantspacing equal', () => {
      const ast = parse('participantspacing equal');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.directiveType).toBe('participantspacing');
      expect(directive.value).toBe('equal');
    });
  });

  describe('Serialization', () => {
    it('should serialize space with default value as bare space', () => {
      const ast = parse('space');
      const output = serialize(ast);
      expect(output).toBe('space');
    });

    it('should serialize space with non-default value', () => {
      const ast = parse('space 3');
      const output = serialize(ast);
      expect(output).toBe('space 3');
    });

    it('should serialize space with negative value', () => {
      const ast = parse('space -2');
      const output = serialize(ast);
      expect(output).toBe('space -2');
    });

    it('should serialize participantspacing numeric', () => {
      const ast = parse('participantspacing 200');
      const output = serialize(ast);
      expect(output).toBe('participantspacing 200');
    });

    it('should serialize participantspacing equal', () => {
      const ast = parse('participantspacing equal');
      const output = serialize(ast);
      expect(output).toBe('participantspacing equal');
    });
  });

  describe('Layout with space directive', () => {
    it('should add vertical space with positive space', () => {
      const input = `participant A
participant B
A->B:before
space 2
A->B:after`;
      const ast = parse(input);
      const { layout } = calculateLayout(ast);

      const messages = ast.filter(n => n.type === 'message');
      const beforeY = layout.get(messages[0].id).y;
      const afterY = layout.get(messages[1].id).y;

      // The gap should be larger than default (50 + 2*20 = 90)
      expect(afterY - beforeY).toBeGreaterThan(70);
    });

    it('should subtract vertical space with negative space', () => {
      const input = `participant A
participant B
A->B:before
space -1
A->B:after`;
      const ast = parse(input);
      const { layout } = calculateLayout(ast);

      const messages = ast.filter(n => n.type === 'message');
      const beforeY = layout.get(messages[0].id).y;
      const afterY = layout.get(messages[1].id).y;

      // The gap should be smaller than default (50 - 20 = 30)
      expect(afterY - beforeY).toBeLessThan(50);
    });

    it('should handle multiple space directives', () => {
      const input = `participant A
participant B
A->B:first
space
A->B:second
space 2
A->B:third`;
      const ast = parse(input);
      const { layout } = calculateLayout(ast);

      const messages = ast.filter(n => n.type === 'message');
      const firstY = layout.get(messages[0].id).y;
      const secondY = layout.get(messages[1].id).y;
      const thirdY = layout.get(messages[2].id).y;

      // Each successive gap should be larger
      const gap1 = secondY - firstY;
      const gap2 = thirdY - secondY;

      expect(gap1).toBeGreaterThan(50); // 50 + 20 = 70
      expect(gap2).toBeGreaterThan(gap1); // 50 + 40 = 90
    });
  });

  describe('Layout with participantspacing directive', () => {
    it('should change horizontal spacing between participants', () => {
      const input = `participantspacing 200
participant A
participant B
participant C`;
      const ast = parse(input);
      const { participantLayout } = calculateLayout(ast);

      const aX = participantLayout.get('A').x;
      const bX = participantLayout.get('B').x;
      const cX = participantLayout.get('C').x;

      expect(bX - aX).toBe(200);
      expect(cX - bX).toBe(200);
    });

    it('should use default spacing without directive', () => {
      const input = `participant A
participant B`;
      const ast = parse(input);
      const { participantLayout } = calculateLayout(ast);

      const aX = participantLayout.get('A').x;
      const bX = participantLayout.get('B').x;

      expect(bX - aX).toBe(150); // Default PARTICIPANT_SPACING
    });

    it('should handle participantspacing equal', () => {
      const input = `participantspacing equal
participant A
participant B
participant C`;
      const ast = parse(input);
      const { participantLayout } = calculateLayout(ast);

      const aX = participantLayout.get('A').x;
      const bX = participantLayout.get('B').x;
      const cX = participantLayout.get('C').x;

      // With equal spacing and 3 participants, should use default spacing
      expect(bX - aX).toBe(cX - bX);
    });
  });

  describe('Rendering with space directive', () => {
    it('should render diagram with space directives', () => {
      const input = `participant A
participant B
A->B:first
space
A->B:second`;
      const ast = parse(input);
      const svg = render(ast);

      // Should have 2 messages rendered
      const messages = svg.querySelectorAll('.message');
      expect(messages.length).toBe(2);
    });
  });

  describe('Round-trip', () => {
    it('should round-trip space directive', () => {
      const input = 'space 3';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.directiveType).toBe(d1.directiveType);
      expect(d2.value).toBe(d1.value);
    });

    it('should round-trip participantspacing directive', () => {
      const input = 'participantspacing 200';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.directiveType).toBe(d1.directiveType);
      expect(d2.value).toBe(d1.value);
    });

    it('should round-trip participantspacing equal', () => {
      const input = 'participantspacing equal';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.value).toBe('equal');
    });
  });
});
