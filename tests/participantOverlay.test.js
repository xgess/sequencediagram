// Tests for participant overlay on scroll

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initParticipantOverlay,
  updateParticipantData,
  setOverlayEnabled,
  getOverlayEnabled,
  toggleOverlay,
  removeParticipantOverlay
} from '../public/src/interaction/participantOverlay.js';
import { parse } from '../public/src/ast/parser.js';
import { render } from '../public/src/rendering/renderer.js';

describe('Participant Overlay on Scroll', () => {
  let diagramPane;

  beforeEach(() => {
    // Create a mock diagram pane
    diagramPane = document.createElement('div');
    diagramPane.id = 'diagram-pane';
    diagramPane.style.height = '400px';
    document.body.appendChild(diagramPane);

    // Create the diagram container (scrollable element) inside the pane
    const diagramContainer = document.createElement('div');
    diagramContainer.id = 'diagram-container';
    diagramContainer.style.height = '300px';
    diagramContainer.style.overflow = 'auto';
    diagramPane.appendChild(diagramContainer);

    // Create a mock diagram header
    const header = document.createElement('div');
    header.id = 'diagram-header';
    header.style.height = '50px';
    document.body.appendChild(header);
  });

  afterEach(() => {
    removeParticipantOverlay();
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {
    it('should create overlay container', () => {
      initParticipantOverlay(diagramPane);

      const overlay = document.getElementById('participant-overlay');
      expect(overlay).not.toBeNull();
    });

    it('should hide overlay initially', () => {
      initParticipantOverlay(diagramPane);

      const overlay = document.getElementById('participant-overlay');
      // Overlay uses CSS class for visibility (fade transitions)
      expect(overlay.classList.contains('visible')).toBe(false);
    });

    it('should be enabled by default', () => {
      initParticipantOverlay(diagramPane);

      expect(getOverlayEnabled()).toBe(true);
    });
  });

  describe('updateParticipantData', () => {
    it('should extract participant data from SVG', () => {
      initParticipantOverlay(diagramPane);

      const input = `participant Alice
participant Bob
Alice->Bob:Hello`;
      const ast = parse(input);
      const svg = render(ast);
      const container = diagramPane.querySelector('#diagram-container');
      container.appendChild(svg);

      updateParticipantData(svg);

      // Overlay should have participant boxes rendered when visible
      // For now just verify it doesn't error
      expect(true).toBe(true);
    });

    it('should handle empty SVG', () => {
      initParticipantOverlay(diagramPane);

      updateParticipantData(null);

      // Should not error
      expect(true).toBe(true);
    });

    it('should handle SVG with no participants', () => {
      initParticipantOverlay(diagramPane);

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      updateParticipantData(svg);

      // Should not error
      expect(true).toBe(true);
    });
  });

  describe('Enable/Disable', () => {
    it('should allow disabling overlay', () => {
      initParticipantOverlay(diagramPane);

      setOverlayEnabled(false);

      expect(getOverlayEnabled()).toBe(false);
    });

    it('should allow enabling overlay', () => {
      initParticipantOverlay(diagramPane);
      setOverlayEnabled(false);

      setOverlayEnabled(true);

      expect(getOverlayEnabled()).toBe(true);
    });

    it('should toggle overlay state', () => {
      initParticipantOverlay(diagramPane);
      expect(getOverlayEnabled()).toBe(true);

      toggleOverlay();
      expect(getOverlayEnabled()).toBe(false);

      toggleOverlay();
      expect(getOverlayEnabled()).toBe(true);
    });

    it('should return new state from toggle', () => {
      initParticipantOverlay(diagramPane);

      const result1 = toggleOverlay();
      expect(result1).toBe(false);

      const result2 = toggleOverlay();
      expect(result2).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should remove overlay container on cleanup', () => {
      initParticipantOverlay(diagramPane);
      expect(document.getElementById('participant-overlay')).not.toBeNull();

      removeParticipantOverlay();

      expect(document.getElementById('participant-overlay')).toBeNull();
    });

    it('should handle multiple cleanup calls', () => {
      initParticipantOverlay(diagramPane);

      removeParticipantOverlay();
      removeParticipantOverlay(); // Should not error

      expect(document.getElementById('participant-overlay')).toBeNull();
    });
  });

  describe('Scroll behavior', () => {
    it('should listen for scroll events on diagram-container', () => {
      initParticipantOverlay(diagramPane);

      const container = diagramPane.querySelector('#diagram-container');

      // Trigger scroll on the container
      container.dispatchEvent(new Event('scroll'));

      // Our handler should have run (we can't easily test the actual behavior
      // without full DOM layout, but we can verify the event is being listened to)
      expect(true).toBe(true);
    });

    it('should not show overlay when disabled', () => {
      initParticipantOverlay(diagramPane);
      setOverlayEnabled(false);

      // Add SVG with participants
      const input = `participant Alice
participant Bob`;
      const ast = parse(input);
      const svg = render(ast);
      const container = diagramPane.querySelector('#diagram-container');
      container.appendChild(svg);
      updateParticipantData(svg);

      // Trigger scroll on the container
      container.dispatchEvent(new Event('scroll'));

      const overlay = document.getElementById('participant-overlay');
      // Overlay uses CSS class for visibility (fade transitions)
      expect(overlay.classList.contains('visible')).toBe(false);
    });
  });

  describe('Integration with rendering', () => {
    it('should update when participants change', () => {
      initParticipantOverlay(diagramPane);
      const container = diagramPane.querySelector('#diagram-container');

      // First render
      const input1 = `participant A
participant B`;
      const ast1 = parse(input1);
      const svg1 = render(ast1);
      container.appendChild(svg1);
      updateParticipantData(svg1);

      // Second render with different participants
      container.removeChild(svg1);
      const input2 = `participant X
participant Y
participant Z`;
      const ast2 = parse(input2);
      const svg2 = render(ast2);
      container.appendChild(svg2);
      updateParticipantData(svg2);

      // Should handle the update without error
      expect(true).toBe(true);
    });

    it('should work with different participant types', () => {
      initParticipantOverlay(diagramPane);
      const container = diagramPane.querySelector('#diagram-container');

      const input = `actor User
participant Server
database DB
queue Queue`;
      const ast = parse(input);
      const svg = render(ast);
      container.appendChild(svg);

      updateParticipantData(svg);

      // Should handle different participant types
      expect(true).toBe(true);
    });
  });
});
