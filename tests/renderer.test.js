// Renderer integration tests
// See DESIGN.md for SVG structure

import { describe, it, expect } from 'vitest';
import { render } from '../src/rendering/renderer.js';
import { parse } from '../src/ast/parser.js';

describe('Renderer', () => {
  describe('empty AST', () => {
    it('should return SVG element for empty AST', () => {
      const svg = render([]);
      expect(svg.tagName).toBe('svg');
      expect(svg.id).toBe('diagram');
    });

    it('should have participants group', () => {
      const svg = render([]);
      const participantsGroup = svg.querySelector('#participants');
      expect(participantsGroup).not.toBeNull();
    });
  });

  describe('participant rendering (BACKLOG-005)', () => {
    it('should render single participant with rect and text', () => {
      const ast = parse('participant Alice');
      const svg = render(ast);

      const participant = svg.querySelector('[data-node-id^="p_"]');
      expect(participant).not.toBeNull();
      expect(participant.classList.contains('participant')).toBe(true);

      const rect = participant.querySelector('rect');
      expect(rect).not.toBeNull();
      expect(rect.getAttribute('fill')).toBe('white');
      expect(rect.getAttribute('stroke')).toBe('black');

      const text = participant.querySelector('text');
      expect(text).not.toBeNull();
      expect(text.textContent).toBe('Alice');
    });

    it('should set data-node-id on participant group', () => {
      const ast = parse('participant Alice');
      const svg = render(ast);

      const participant = svg.querySelector('.participant');
      expect(participant.getAttribute('data-node-id')).toMatch(/^p_[a-z0-9]{8}$/);
    });

    it('should render multiple participants', () => {
      const ast = parse('participant Alice\nparticipant Bob');
      const svg = render(ast);

      const participants = svg.querySelectorAll('.participant');
      expect(participants).toHaveLength(2);

      const texts = svg.querySelectorAll('.participant text');
      expect(texts[0].textContent).toBe('Alice');
      expect(texts[1].textContent).toBe('Bob');
    });

    it('should position participants horizontally', () => {
      const ast = parse('participant Alice\nparticipant Bob');
      const svg = render(ast);

      const rects = svg.querySelectorAll('.participant rect');
      const x1 = parseInt(rects[0].getAttribute('x'));
      const x2 = parseInt(rects[1].getAttribute('x'));

      expect(x2).toBeGreaterThan(x1);
    });

    it('should set SVG dimensions based on participants', () => {
      const ast = parse('participant Alice\nparticipant Bob');
      const svg = render(ast);

      const width = parseInt(svg.getAttribute('width'));
      expect(width).toBeGreaterThan(200);
    });
  });

  describe('message rendering (BACKLOG-010)', () => {
    it('should render message with line and label', () => {
      const ast = parse('participant Alice\nparticipant Bob\nAlice->Bob:Hello');
      const svg = render(ast);

      const message = svg.querySelector('.message');
      expect(message).not.toBeNull();
      expect(message.getAttribute('data-node-id')).toMatch(/^m_[a-z0-9]{8}$/);

      const line = message.querySelector('line');
      expect(line).not.toBeNull();

      const text = message.querySelector('text');
      expect(text).not.toBeNull();
      expect(text.textContent).toBe('Hello');
    });

    it('should render message with arrow marker', () => {
      const ast = parse('participant Alice\nparticipant Bob\nAlice->Bob:Hello');
      const svg = render(ast);

      const line = svg.querySelector('.message line');
      expect(line.getAttribute('marker-end')).toContain('arrowhead');
    });

    it('should render multiple messages', () => {
      const ast = parse('participant Alice\nparticipant Bob\nAlice->Bob:Hello\nBob-->Alice:Hi');
      const svg = render(ast);

      const messages = svg.querySelectorAll('.message');
      expect(messages).toHaveLength(2);
    });

    it('should render dashed line for return messages', () => {
      const ast = parse('participant Alice\nparticipant Bob\nBob-->Alice:Response');
      const svg = render(ast);

      const line = svg.querySelector('.message line');
      expect(line.getAttribute('stroke-dasharray')).toBe('5,5');
    });

    it('should have defs with arrow markers', () => {
      const ast = parse('participant Alice\nparticipant Bob\nAlice->Bob:Hello');
      const svg = render(ast);

      const defs = svg.querySelector('defs');
      expect(defs).not.toBeNull();

      const solidMarker = svg.querySelector('#arrowhead-solid');
      expect(solidMarker).not.toBeNull();

      const openMarker = svg.querySelector('#arrowhead-open');
      expect(openMarker).not.toBeNull();
    });
  });

  describe('lifelines (BACKLOG-011)', () => {
    it('should render lifeline for each participant', () => {
      const ast = parse('participant Alice\nparticipant Bob');
      const svg = render(ast);

      const lifelines = svg.querySelectorAll('.lifeline');
      expect(lifelines).toHaveLength(2);
    });

    it('should have lifelines group before participants (for z-order)', () => {
      const ast = parse('participant Alice\nAlice->Alice:Self');
      const svg = render(ast);

      const groups = Array.from(svg.querySelectorAll('g[id]'));
      const lifelinesIndex = groups.findIndex(g => g.id === 'lifelines');
      const participantsIndex = groups.findIndex(g => g.id === 'participants');

      expect(lifelinesIndex).toBeLessThan(participantsIndex);
    });

    it('should have dashed stroke on lifelines', () => {
      const ast = parse('participant Alice');
      const svg = render(ast);

      const lifeline = svg.querySelector('.lifeline');
      expect(lifeline.getAttribute('stroke-dasharray')).toBe('5,5');
    });

    it('should set data-participant attribute', () => {
      const ast = parse('participant Alice');
      const svg = render(ast);

      const lifeline = svg.querySelector('.lifeline');
      expect(lifeline.getAttribute('data-participant')).toBe('Alice');
    });
  });

  describe('SVG dimensions (BACKLOG-013)', () => {
    it('should set viewBox matching width and height', () => {
      const ast = parse('participant Alice\nparticipant Bob\nAlice->Bob:Hello');
      const svg = render(ast);

      const width = svg.getAttribute('width');
      const height = svg.getAttribute('height');
      const viewBox = svg.getAttribute('viewBox');

      expect(viewBox).toBe(`0 0 ${width} ${height}`);
    });

    it('should increase height with more messages', () => {
      const ast1 = parse('participant Alice\nparticipant Bob\nAlice->Bob:One');
      const ast2 = parse('participant Alice\nparticipant Bob\nAlice->Bob:One\nBob->Alice:Two\nAlice->Bob:Three');

      const svg1 = render(ast1);
      const svg2 = render(ast2);

      const height1 = parseInt(svg1.getAttribute('height'));
      const height2 = parseInt(svg2.getAttribute('height'));

      expect(height2).toBeGreaterThan(height1);
    });

    it('should increase width with more participants', () => {
      const ast1 = parse('participant Alice\nparticipant Bob');
      const ast2 = parse('participant Alice\nparticipant Bob\nparticipant Carol\nparticipant Dave');

      const svg1 = render(ast1);
      const svg2 = render(ast2);

      const width1 = parseInt(svg1.getAttribute('width'));
      const width2 = parseInt(svg2.getAttribute('width'));

      expect(width2).toBeGreaterThan(width1);
    });
  });

  describe('participant styling (BACKLOG-015)', () => {
    it('should apply fill color to participant rect', () => {
      const ast = parse('participant Alice #lightblue');
      const svg = render(ast);

      const rect = svg.querySelector('.participant rect');
      expect(rect.getAttribute('fill')).toBe('#lightblue');
    });

    it('should apply border color to participant rect', () => {
      const ast = parse('participant Alice #white #red');
      const svg = render(ast);

      const rect = svg.querySelector('.participant rect');
      expect(rect.getAttribute('stroke')).toBe('#red');
    });

    it('should apply border width to participant rect', () => {
      const ast = parse('participant Alice #white #black;3');
      const svg = render(ast);

      const rect = svg.querySelector('.participant rect');
      expect(rect.getAttribute('stroke-width')).toBe('3');
    });

    it('should apply dashed border style', () => {
      const ast = parse('participant Alice #white #black;1;dashed');
      const svg = render(ast);

      const rect = svg.querySelector('.participant rect');
      expect(rect.getAttribute('stroke-dasharray')).toBe('5,5');
    });

    it('should use defaults when no styling specified', () => {
      const ast = parse('participant Alice');
      const svg = render(ast);

      const rect = svg.querySelector('.participant rect');
      expect(rect.getAttribute('fill')).toBe('white');
      expect(rect.getAttribute('stroke')).toBe('black');
      expect(rect.getAttribute('stroke-width')).toBe('1');
    });

    it('should handle zero border width', () => {
      const ast = parse('participant Alice #yellow ;0');
      const svg = render(ast);

      const rect = svg.querySelector('.participant rect');
      expect(rect.getAttribute('stroke-width')).toBe('0');
    });
  });

  describe('multiline participant names (BACKLOG-018)', () => {
    it('should render single line name as text content', () => {
      const ast = parse('participant Alice');
      const svg = render(ast);

      const text = svg.querySelector('.participant text');
      expect(text.textContent).toBe('Alice');
      expect(text.querySelectorAll('tspan')).toHaveLength(0);
    });

    it('should render multiline name with tspans', () => {
      const ast = parse('participant "Line1\\nLine2" as A');
      const svg = render(ast);

      const text = svg.querySelector('.participant text');
      const tspans = text.querySelectorAll('tspan');
      expect(tspans).toHaveLength(2);
      expect(tspans[0].textContent).toBe('Line1');
      expect(tspans[1].textContent).toBe('Line2');
    });

    it('should render three-line name with three tspans', () => {
      const ast = parse('participant "A\\nB\\nC" as ABC');
      const svg = render(ast);

      const tspans = svg.querySelectorAll('.participant text tspan');
      expect(tspans).toHaveLength(3);
      expect(tspans[0].textContent).toBe('A');
      expect(tspans[1].textContent).toBe('B');
      expect(tspans[2].textContent).toBe('C');
    });

    it('should center multiline text horizontally', () => {
      const ast = parse('participant "Web\\nServer" as WS');
      const svg = render(ast);

      const tspans = svg.querySelectorAll('.participant text tspan');
      // All tspans should have the same x (centered)
      const x1 = tspans[0].getAttribute('x');
      const x2 = tspans[1].getAttribute('x');
      expect(x1).toBe(x2);
    });
  });

  describe('actor rendering (BACKLOG-027)', () => {
    it('should render actor with stick figure elements', () => {
      const ast = parse('actor User');
      const svg = render(ast);

      const participant = svg.querySelector('.participant');
      expect(participant).not.toBeNull();

      // Should have circle (head)
      const circle = participant.querySelector('circle');
      expect(circle).not.toBeNull();

      // Should have lines (body, arms, legs)
      const lines = participant.querySelectorAll('line');
      expect(lines.length).toBeGreaterThanOrEqual(4);

      // Should have text label
      const text = participant.querySelector('text');
      expect(text).not.toBeNull();
      expect(text.textContent).toBe('User');
    });

    it('should render actor with styling', () => {
      const ast = parse('actor User #lightblue #red');
      const svg = render(ast);

      const circle = svg.querySelector('.participant circle');
      expect(circle.getAttribute('fill')).toBe('#lightblue');
      expect(circle.getAttribute('stroke')).toBe('#red');
    });
  });

  describe('database rendering (BACKLOG-029)', () => {
    it('should render database with cylinder elements', () => {
      const ast = parse('database DB');
      const svg = render(ast);

      const participant = svg.querySelector('.participant');
      expect(participant).not.toBeNull();

      // Should have ellipse (top of cylinder)
      const ellipse = participant.querySelector('ellipse');
      expect(ellipse).not.toBeNull();

      // Should have path (bottom curve)
      const path = participant.querySelector('path');
      expect(path).not.toBeNull();

      // Should have text label
      const text = participant.querySelector('text');
      expect(text).not.toBeNull();
      expect(text.textContent).toBe('DB');
    });

    it('should render database with styling', () => {
      const ast = parse('database DB #yellow #blue');
      const svg = render(ast);

      const ellipse = svg.querySelector('.participant ellipse');
      expect(ellipse.getAttribute('fill')).toBe('#yellow');
      expect(ellipse.getAttribute('stroke')).toBe('#blue');
    });
  });

  // TODO(Phase1): Add renderer tests as features are implemented
  // - BACKLOG-033: Render fragment
});
