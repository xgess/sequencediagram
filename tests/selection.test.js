// Tests for selection handling (BACKLOG-069)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initSelection, removeSelection, selectElement, deselectAll, getSelectedId } from '../src/interaction/selection.js';

// Mock document for tests
function createMockSvg() {
  // Create a mock SVG with selectable elements
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  // Participant group
  const participant = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  participant.setAttribute('data-node-id', 'p_123');
  participant.setAttribute('class', 'participant');
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  participant.appendChild(rect);
  svg.appendChild(participant);

  // Message group
  const message = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  message.setAttribute('data-node-id', 'm_456');
  message.setAttribute('class', 'message');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  message.appendChild(line);
  svg.appendChild(message);

  // Fragment group
  const fragment = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  fragment.setAttribute('data-node-id', 'f_789');
  fragment.setAttribute('class', 'fragment');
  const fragRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  fragment.appendChild(fragRect);
  svg.appendChild(fragment);

  // Background (no data-node-id)
  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('id', 'background');
  svg.appendChild(background);

  return svg;
}

describe('Selection (BACKLOG-069)', () => {
  let svg;
  let selectionCallback;

  beforeEach(() => {
    // Cleanup any existing styles
    const existingStyle = document.getElementById('selection-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Reset selection state
    deselectAll();

    svg = createMockSvg();
    document.body.appendChild(svg);
    selectionCallback = vi.fn();
  });

  afterEach(() => {
    removeSelection(svg);
    document.body.removeChild(svg);
  });

  describe('initSelection', () => {
    it('should add selection styles to document', () => {
      initSelection(svg, selectionCallback);

      const styles = document.getElementById('selection-styles');
      expect(styles).not.toBeNull();
      expect(styles.textContent).toContain('selected');
    });

    it('should not duplicate styles on multiple inits', () => {
      initSelection(svg, selectionCallback);
      initSelection(svg, selectionCallback);

      const styles = document.querySelectorAll('#selection-styles');
      expect(styles.length).toBe(1);
    });
  });

  describe('selectElement', () => {
    beforeEach(() => {
      initSelection(svg, selectionCallback);
    });

    it('should select element by ID', () => {
      selectElement('p_123');

      expect(getSelectedId()).toBe('p_123');
    });

    it('should add selected class to element', () => {
      selectElement('p_123');

      const element = svg.querySelector('[data-node-id="p_123"]');
      expect(element.classList.contains('selected')).toBe(true);
    });

    it('should call selection callback', () => {
      selectElement('p_123');

      expect(selectionCallback).toHaveBeenCalledWith('p_123');
    });

    it('should deselect previous element when selecting new one', () => {
      selectElement('p_123');
      selectElement('m_456');

      const participant = svg.querySelector('[data-node-id="p_123"]');
      const message = svg.querySelector('[data-node-id="m_456"]');

      expect(participant.classList.contains('selected')).toBe(false);
      expect(message.classList.contains('selected')).toBe(true);
    });

    it('should not call callback if same element selected', () => {
      selectElement('p_123');
      selectionCallback.mockClear();
      selectElement('p_123');

      expect(selectionCallback).not.toHaveBeenCalled();
    });
  });

  describe('deselectAll', () => {
    beforeEach(() => {
      initSelection(svg, selectionCallback);
    });

    it('should clear selection', () => {
      selectElement('p_123');
      deselectAll();

      expect(getSelectedId()).toBeNull();
    });

    it('should remove selected class', () => {
      selectElement('p_123');
      deselectAll();

      const element = svg.querySelector('[data-node-id="p_123"]');
      expect(element.classList.contains('selected')).toBe(false);
    });

    it('should call callback with null', () => {
      selectElement('p_123');
      selectionCallback.mockClear();
      deselectAll();

      expect(selectionCallback).toHaveBeenCalledWith(null);
    });

    it('should not call callback if already deselected', () => {
      selectionCallback.mockClear();
      deselectAll();

      expect(selectionCallback).not.toHaveBeenCalled();
    });
  });

  describe('click handling', () => {
    beforeEach(() => {
      initSelection(svg, selectionCallback);
    });

    it('should select element on click', () => {
      const participant = svg.querySelector('[data-node-id="p_123"]');
      const rect = participant.querySelector('rect');

      // Simulate click on child element
      const event = new MouseEvent('click', { bubbles: true });
      rect.dispatchEvent(event);

      expect(getSelectedId()).toBe('p_123');
    });

    it('should deselect on background click', () => {
      selectElement('p_123');
      selectionCallback.mockClear();

      const background = svg.querySelector('#background');
      const event = new MouseEvent('click', { bubbles: true });
      background.dispatchEvent(event);

      expect(getSelectedId()).toBeNull();
      expect(selectionCallback).toHaveBeenCalledWith(null);
    });

    it('should select different elements on sequential clicks', () => {
      const participant = svg.querySelector('[data-node-id="p_123"]');
      const message = svg.querySelector('[data-node-id="m_456"]');

      participant.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getSelectedId()).toBe('p_123');

      message.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(getSelectedId()).toBe('m_456');
    });
  });

  describe('removeSelection', () => {
    it('should remove click handler', () => {
      initSelection(svg, selectionCallback);
      removeSelection(svg);

      const participant = svg.querySelector('[data-node-id="p_123"]');
      participant.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // Selection should not have happened
      expect(selectionCallback).not.toHaveBeenCalled();
    });
  });

  describe('only one element selected at a time', () => {
    beforeEach(() => {
      initSelection(svg, selectionCallback);
    });

    it('should only have one element with selected class', () => {
      selectElement('p_123');
      selectElement('m_456');
      selectElement('f_789');

      const selectedElements = svg.querySelectorAll('.selected');
      expect(selectedElements.length).toBe(1);
      expect(selectedElements[0].getAttribute('data-node-id')).toBe('f_789');
    });
  });
});
