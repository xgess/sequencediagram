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

  // TODO(Phase1): Add renderer tests as features are implemented
  // - BACKLOG-010: Render message
  // - BACKLOG-033: Render fragment
});
