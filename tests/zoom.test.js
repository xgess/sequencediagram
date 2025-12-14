// Tests for zoom controls (BACKLOG-110)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initZoom, getZoomLevel, setZoomLevel, zoomIn, zoomOut, resetZoom } from '../src/interaction/zoom.js';

describe('Zoom Controls (BACKLOG-110)', () => {
  let diagramEl;
  let zoomLevelEl;
  let zoomInBtn;
  let zoomOutBtn;
  let zoomResetBtn;

  beforeEach(() => {
    // Create mock DOM elements
    diagramEl = document.createElement('div');
    diagramEl.id = 'diagram';
    document.body.appendChild(diagramEl);

    zoomLevelEl = document.createElement('span');
    zoomLevelEl.id = 'zoom-level';
    document.body.appendChild(zoomLevelEl);

    zoomInBtn = document.createElement('button');
    zoomInBtn.id = 'zoom-in';
    document.body.appendChild(zoomInBtn);

    zoomOutBtn = document.createElement('button');
    zoomOutBtn.id = 'zoom-out';
    document.body.appendChild(zoomOutBtn);

    zoomResetBtn = document.createElement('button');
    zoomResetBtn.id = 'zoom-reset';
    document.body.appendChild(zoomResetBtn);

    // Initialize zoom with mock elements
    initZoom(diagramEl, zoomLevelEl);
  });

  afterEach(() => {
    // Clean up DOM
    diagramEl.remove();
    zoomLevelEl.remove();
    zoomInBtn.remove();
    zoomOutBtn.remove();
    zoomResetBtn.remove();

    // Reset zoom to default for next test
    setZoomLevel(1);
  });

  describe('Initial state', () => {
    it('should start at 100% zoom', () => {
      expect(getZoomLevel()).toBe(1);
    });

    it('should display 100% in zoom level element', () => {
      expect(zoomLevelEl.textContent).toBe('100%');
    });

    it('should set transform origin to top left', () => {
      expect(diagramEl.style.transformOrigin).toBe('top left');
    });
  });

  describe('Zoom in', () => {
    it('should increase zoom level by 10%', () => {
      zoomIn();
      expect(getZoomLevel()).toBeCloseTo(1.1);
    });

    it('should update display text', () => {
      zoomIn();
      expect(zoomLevelEl.textContent).toBe('110%');
    });

    it('should update transform scale', () => {
      zoomIn();
      expect(diagramEl.style.transform).toBe('scale(1.1)');
    });

    it('should not exceed maximum zoom (500%)', () => {
      setZoomLevel(5);
      zoomIn();
      expect(getZoomLevel()).toBe(5);
    });

    it('should work via button click', () => {
      zoomInBtn.click();
      expect(getZoomLevel()).toBeCloseTo(1.1);
    });
  });

  describe('Zoom out', () => {
    it('should decrease zoom level by 10%', () => {
      zoomOut();
      expect(getZoomLevel()).toBeCloseTo(0.9);
    });

    it('should update display text', () => {
      zoomOut();
      expect(zoomLevelEl.textContent).toBe('90%');
    });

    it('should update transform scale', () => {
      zoomOut();
      expect(diagramEl.style.transform).toBe('scale(0.9)');
    });

    it('should not go below minimum zoom (10%)', () => {
      setZoomLevel(0.1);
      zoomOut();
      expect(getZoomLevel()).toBe(0.1);
    });

    it('should work via button click', () => {
      zoomOutBtn.click();
      expect(getZoomLevel()).toBeCloseTo(0.9);
    });
  });

  describe('Reset zoom', () => {
    it('should reset zoom to 100%', () => {
      setZoomLevel(2);
      resetZoom();
      expect(getZoomLevel()).toBe(1);
    });

    it('should update display to 100%', () => {
      setZoomLevel(2);
      resetZoom();
      expect(zoomLevelEl.textContent).toBe('100%');
    });

    it('should work via button click', () => {
      setZoomLevel(2);
      zoomResetBtn.click();
      expect(getZoomLevel()).toBe(1);
    });
  });

  describe('setZoomLevel', () => {
    it('should set arbitrary zoom level', () => {
      setZoomLevel(1.5);
      expect(getZoomLevel()).toBe(1.5);
    });

    it('should clamp to minimum', () => {
      setZoomLevel(0);
      expect(getZoomLevel()).toBe(0.1);
    });

    it('should clamp to maximum', () => {
      setZoomLevel(10);
      expect(getZoomLevel()).toBe(5);
    });

    it('should update display correctly', () => {
      setZoomLevel(1.5);
      expect(zoomLevelEl.textContent).toBe('150%');
    });
  });

  describe('Keyboard shortcuts', () => {
    function createKeyEvent(key, ctrlKey = false, metaKey = false) {
      return new KeyboardEvent('keydown', {
        key,
        ctrlKey,
        metaKey,
        bubbles: true
      });
    }

    it('should zoom in with Ctrl+=', () => {
      const event = createKeyEvent('=', true, false);
      document.dispatchEvent(event);
      expect(getZoomLevel()).toBeCloseTo(1.1);
    });

    it('should zoom in with Ctrl++', () => {
      resetZoom();
      const event = createKeyEvent('+', true, false);
      document.dispatchEvent(event);
      expect(getZoomLevel()).toBeCloseTo(1.1);
    });

    it('should zoom out with Ctrl+-', () => {
      const event = createKeyEvent('-', true, false);
      document.dispatchEvent(event);
      expect(getZoomLevel()).toBeCloseTo(0.9);
    });

    it('should reset with Ctrl+0', () => {
      setZoomLevel(2);
      const event = createKeyEvent('0', true, false);
      document.dispatchEvent(event);
      expect(getZoomLevel()).toBe(1);
    });

    it('should not handle keys without Ctrl/Cmd', () => {
      const event = createKeyEvent('=', false, false);
      document.dispatchEvent(event);
      expect(getZoomLevel()).toBe(1);
    });
  });
});
