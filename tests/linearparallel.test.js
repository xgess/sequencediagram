// Tests for linear and parallel directives

import { describe, it, expect } from 'vitest';
import { parse } from '../public/src/ast/parser.js';
import { serialize } from '../public/src/ast/serializer.js';
import { render } from '../public/src/rendering/renderer.js';
import { calculateLayout } from '../public/src/rendering/layout.js';

describe('Linear and Parallel Directives', () => {

  describe('Parsing linear directive', () => {
    it('should parse linear (on)', () => {
      const ast = parse('linear');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive).toBeDefined();
      expect(directive.directiveType).toBe('linear');
      expect(directive.value).toBe(true);
    });

    it('should parse linear off', () => {
      const ast = parse('linear off');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.directiveType).toBe('linear');
      expect(directive.value).toBe(false);
    });
  });

  describe('Parsing parallel directive', () => {
    it('should parse parallel (on)', () => {
      const ast = parse('parallel');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive).toBeDefined();
      expect(directive.directiveType).toBe('parallel');
      expect(directive.value).toBe(true);
    });

    it('should parse parallel off', () => {
      const ast = parse('parallel off');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.directiveType).toBe('parallel');
      expect(directive.value).toBe(false);
    });
  });

  describe('Serialization', () => {
    it('should serialize linear', () => {
      const ast = parse('linear');
      const output = serialize(ast);
      expect(output).toBe('linear');
    });

    it('should serialize linear off', () => {
      const ast = parse('linear off');
      const output = serialize(ast);
      expect(output).toBe('linear off');
    });

    it('should serialize parallel', () => {
      const ast = parse('parallel');
      const output = serialize(ast);
      expect(output).toBe('parallel');
    });

    it('should serialize parallel off', () => {
      const ast = parse('parallel off');
      const output = serialize(ast);
      expect(output).toBe('parallel off');
    });
  });

  describe('Layout with linear directive', () => {
    it('should place non-overlapping messages at same Y in linear mode', () => {
      const input = `participant A
participant B
participant C
linear
A->B:first
B->C:second
linear off
A->C:after`;
      const ast = parse(input);
      const { layout } = calculateLayout(ast);

      const messages = ast.filter(n => n.type === 'message');
      const firstY = layout.get(messages[0].id).y;
      const secondY = layout.get(messages[1].id).y;
      const afterY = layout.get(messages[2].id).y;

      // A->B and B->C don't overlap, should be at the same Y
      expect(firstY).toBe(secondY);

      // After should be below the linear section
      expect(afterY).toBeGreaterThan(firstY);
    });

    it('should place overlapping messages on different lines', () => {
      const input = `participant A
participant B
participant C
linear
A->B:first
A->C:second
linear off`;
      const ast = parse(input);
      const { layout } = calculateLayout(ast);

      const messages = ast.filter(n => n.type === 'message');
      const firstY = layout.get(messages[0].id).y;
      const secondY = layout.get(messages[1].id).y;

      // A->B and A->C overlap at A, should be on different lines
      expect(secondY).toBeGreaterThan(firstY);
    });

    it('should handle request/response pattern - going right then left', () => {
      const input = `participant User
participant Service
participant DB
linear
User->Service:request1
Service->DB:request2
Service<--DB:response2
User<--Service:response1
linear off`;
      const ast = parse(input);
      const { layout } = calculateLayout(ast);

      const messages = ast.filter(n => n.type === 'message');
      const req1Y = layout.get(messages[0].id).y;  // User->Service
      const req2Y = layout.get(messages[1].id).y;  // Service->DB
      const resp2Y = layout.get(messages[2].id).y; // Service<--DB
      const resp1Y = layout.get(messages[3].id).y; // User<--Service

      // Request messages going right don't overlap
      expect(req1Y).toBe(req2Y);

      // Response messages going left don't overlap with each other
      expect(resp2Y).toBe(resp1Y);

      // But responses overlap with requests (share participants)
      expect(resp2Y).toBeGreaterThan(req1Y);
    });

    it('should render diagram with linear messages', () => {
      const input = `participant A
participant B
linear
A->B:first
A->B:second
linear off`;
      const ast = parse(input);
      const svg = render(ast);

      // Should have 2 messages
      const messages = svg.querySelectorAll('.message');
      expect(messages.length).toBe(2);
    });
  });

  describe('Layout with parallel directive', () => {
    it('should place messages at same Y in parallel mode', () => {
      const input = `participant A
participant B
participant C
parallel
A->B:first
B->C:second
parallel off
A->C:after`;
      const ast = parse(input);
      const { layout } = calculateLayout(ast);

      const messages = ast.filter(n => n.type === 'message');
      const firstY = layout.get(messages[0].id).y;
      const secondY = layout.get(messages[1].id).y;
      const afterY = layout.get(messages[2].id).y;

      // First and second should be at the same Y (parallel)
      expect(firstY).toBe(secondY);

      // After should be below the parallel section
      expect(afterY).toBeGreaterThan(firstY);
    });

    it('should stack messages normally without parallel', () => {
      const input = `participant A
participant B
A->B:first
A->B:second`;
      const ast = parse(input);
      const { layout } = calculateLayout(ast);

      const messages = ast.filter(n => n.type === 'message');
      const firstY = layout.get(messages[0].id).y;
      const secondY = layout.get(messages[1].id).y;

      // Messages should be at different Y positions
      expect(secondY).toBeGreaterThan(firstY);
    });

    it('should handle multiple parallel sections', () => {
      const input = `participant A
participant B
parallel
A->B:p1a
A->B:p1b
parallel off
A->B:between
parallel
A->B:p2a
A->B:p2b
parallel off`;
      const ast = parse(input);
      const { layout } = calculateLayout(ast);

      const messages = ast.filter(n => n.type === 'message');
      const p1aY = layout.get(messages[0].id).y;
      const p1bY = layout.get(messages[1].id).y;
      const betweenY = layout.get(messages[2].id).y;
      const p2aY = layout.get(messages[3].id).y;
      const p2bY = layout.get(messages[4].id).y;

      // First parallel section
      expect(p1aY).toBe(p1bY);

      // Between should be after first section
      expect(betweenY).toBeGreaterThan(p1aY);

      // Second parallel section
      expect(p2aY).toBe(p2bY);

      // Second section should be after between
      expect(p2aY).toBeGreaterThan(betweenY);
    });
  });

  describe('Rendering with parallel directive', () => {
    it('should render diagram with parallel messages', () => {
      const input = `participant A
participant B
parallel
A->B:first
A->B:second
parallel off`;
      const ast = parse(input);
      const svg = render(ast);

      // Should have 2 messages
      const messages = svg.querySelectorAll('.message');
      expect(messages.length).toBe(2);
    });
  });

  describe('Round-trip', () => {
    it('should round-trip linear directive', () => {
      const input = 'linear';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.directiveType).toBe(d1.directiveType);
      expect(d2.value).toBe(d1.value);
    });

    it('should round-trip linear off directive', () => {
      const input = 'linear off';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.value).toBe(false);
    });

    it('should round-trip parallel directive', () => {
      const input = 'parallel';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.directiveType).toBe(d1.directiveType);
      expect(d2.value).toBe(d1.value);
    });
  });
});
