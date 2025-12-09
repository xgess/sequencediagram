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

  // TODO(Phase1): Add renderer tests as features are implemented
  // - BACKLOG-033: Render fragment
});
