// Tests for context-sensitive cursor behavior (BACKLOG-072)

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initCursors, removeCursors } from '../src/interaction/cursors.js';

// Mock SVG creation
function createMockSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', 'diagram');

  // Participant group
  const participant = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  participant.setAttribute('class', 'participant');
  participant.setAttribute('data-node-id', 'p_1');
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  participant.appendChild(rect);
  svg.appendChild(participant);

  // Message group
  const message = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  message.setAttribute('class', 'message');
  message.setAttribute('data-node-id', 'm_1');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', '100');
  line.setAttribute('y1', '50');
  line.setAttribute('x2', '200');
  line.setAttribute('y2', '50');
  message.appendChild(line);
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  message.appendChild(text);
  svg.appendChild(message);

  // Fragment group
  const fragment = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  fragment.setAttribute('class', 'fragment');
  fragment.setAttribute('data-node-id', 'f_1');
  const fragRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  fragRect.setAttribute('x', '50');
  fragRect.setAttribute('y', '100');
  fragRect.setAttribute('width', '200');
  fragRect.setAttribute('height', '100');
  fragment.appendChild(fragRect);
  svg.appendChild(fragment);

  // Error group
  const error = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  error.setAttribute('class', 'error');
  error.setAttribute('data-node-id', 'e_1');
  const errRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  error.appendChild(errRect);
  svg.appendChild(error);

  return svg;
}

describe('Context-sensitive Cursors (BACKLOG-072)', () => {
  let svg;

  beforeEach(() => {
    // Cleanup any existing styles
    const existingStyle = document.getElementById('cursor-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    svg = createMockSvg();
    document.body.appendChild(svg);
  });

  afterEach(() => {
    removeCursors(svg);
    document.body.removeChild(svg);
  });

  describe('initCursors', () => {
    it('should add cursor styles to document', () => {
      initCursors(svg);

      const styles = document.getElementById('cursor-styles');
      expect(styles).not.toBeNull();
      expect(styles.textContent).toContain('cursor-pointer');
      expect(styles.textContent).toContain('cursor-move');
      expect(styles.textContent).toContain('cursor-grab');
    });

    it('should not duplicate styles on multiple inits', () => {
      initCursors(svg);
      initCursors(svg);

      const styles = document.querySelectorAll('#cursor-styles');
      expect(styles.length).toBe(1);
    });
  });

  describe('participant hover', () => {
    beforeEach(() => {
      initCursors(svg);
    });

    it('should show grab cursor on participant hover', () => {
      const participant = svg.querySelector('.participant');
      const rect = participant.querySelector('rect');

      const event = new MouseEvent('mouseover', { bubbles: true });
      rect.dispatchEvent(event);

      expect(participant.classList.contains('cursor-grab')).toBe(true);
    });

    it('should remove cursor class on mouseout', () => {
      const participant = svg.querySelector('.participant');
      const rect = participant.querySelector('rect');

      rect.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      expect(participant.classList.contains('cursor-grab')).toBe(true);

      rect.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      expect(participant.classList.contains('cursor-grab')).toBe(false);
    });
  });

  describe('message hover', () => {
    beforeEach(() => {
      initCursors(svg);
    });

    it('should show move cursor on message line hover', () => {
      const message = svg.querySelector('.message');
      const line = message.querySelector('line');

      const event = new MouseEvent('mouseover', { bubbles: true });
      line.dispatchEvent(event);

      expect(message.classList.contains('cursor-move')).toBe(true);
    });

    it('should show pointer cursor on message text hover', () => {
      const message = svg.querySelector('.message');
      const text = message.querySelector('text');

      const event = new MouseEvent('mouseover', { bubbles: true });
      text.dispatchEvent(event);

      expect(message.classList.contains('cursor-pointer')).toBe(true);
    });
  });

  describe('fragment hover', () => {
    beforeEach(() => {
      initCursors(svg);
    });

    it('should show pointer cursor on fragment hover', () => {
      const fragment = svg.querySelector('.fragment');
      const rect = fragment.querySelector('rect');

      // Hover in the middle of fragment (not near edge)
      const event = new MouseEvent('mouseover', {
        bubbles: true,
        clientX: 150,
        clientY: 150
      });
      rect.dispatchEvent(event);

      expect(fragment.classList.contains('cursor-pointer')).toBe(true);
    });
  });

  describe('error hover', () => {
    beforeEach(() => {
      initCursors(svg);
    });

    it('should show pointer cursor on error hover', () => {
      const error = svg.querySelector('.error');
      const rect = error.querySelector('rect');

      const event = new MouseEvent('mouseover', { bubbles: true });
      rect.dispatchEvent(event);

      expect(error.classList.contains('cursor-pointer')).toBe(true);
    });
  });

  describe('removeCursors', () => {
    it('should remove event listeners', () => {
      initCursors(svg);
      removeCursors(svg);

      const participant = svg.querySelector('.participant');
      const rect = participant.querySelector('rect');

      rect.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

      // Cursor class should not be added since handlers are removed
      expect(participant.classList.contains('cursor-grab')).toBe(false);
    });
  });
});
