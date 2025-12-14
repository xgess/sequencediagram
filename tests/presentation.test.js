// Tests for presentation mode (BACKLOG-111)

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initPresentation,
  enterPresentationMode,
  exitPresentationMode,
  togglePresentationMode,
  isInPresentationMode
} from '../src/interaction/presentation.js';

describe('Presentation Mode (BACKLOG-111)', () => {
  let exitCallbackCalled = false;

  beforeEach(() => {
    exitCallbackCalled = false;
    // Ensure we start outside presentation mode
    if (isInPresentationMode()) {
      exitPresentationMode();
    }
    // Initialize with callback
    initPresentation(() => {
      exitCallbackCalled = true;
    });
  });

  afterEach(() => {
    // Clean up
    if (isInPresentationMode()) {
      exitPresentationMode();
    }
    document.body.classList.remove('presentation-mode');
  });

  describe('enterPresentationMode', () => {
    it('should add presentation-mode class to body', () => {
      enterPresentationMode();
      expect(document.body.classList.contains('presentation-mode')).toBe(true);
    });

    it('should set isInPresentationMode to true', () => {
      enterPresentationMode();
      expect(isInPresentationMode()).toBe(true);
    });

    it('should not double-enter if already in presentation mode', () => {
      enterPresentationMode();
      enterPresentationMode();
      expect(document.body.classList.contains('presentation-mode')).toBe(true);
    });
  });

  describe('exitPresentationMode', () => {
    it('should remove presentation-mode class from body', () => {
      enterPresentationMode();
      exitPresentationMode();
      expect(document.body.classList.contains('presentation-mode')).toBe(false);
    });

    it('should set isInPresentationMode to false', () => {
      enterPresentationMode();
      exitPresentationMode();
      expect(isInPresentationMode()).toBe(false);
    });

    it('should call exit callback', () => {
      enterPresentationMode();
      exitPresentationMode();
      expect(exitCallbackCalled).toBe(true);
    });

    it('should not call callback if not in presentation mode', () => {
      exitPresentationMode();
      expect(exitCallbackCalled).toBe(false);
    });
  });

  describe('togglePresentationMode', () => {
    it('should enter presentation mode when not active', () => {
      togglePresentationMode();
      expect(isInPresentationMode()).toBe(true);
    });

    it('should exit presentation mode when active', () => {
      enterPresentationMode();
      togglePresentationMode();
      expect(isInPresentationMode()).toBe(false);
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

    it('should exit on Escape when in presentation mode', () => {
      enterPresentationMode();
      const event = createKeyEvent('Escape');
      document.dispatchEvent(event);
      expect(isInPresentationMode()).toBe(false);
    });

    it('should not exit on Escape when not in presentation mode', () => {
      const event = createKeyEvent('Escape');
      document.dispatchEvent(event);
      expect(isInPresentationMode()).toBe(false);
    });

    it('should toggle on Ctrl+M', () => {
      const event = createKeyEvent('m', true, false);
      document.dispatchEvent(event);
      expect(isInPresentationMode()).toBe(true);
    });

    it('should toggle off on Ctrl+M when active', () => {
      enterPresentationMode();
      const event = createKeyEvent('m', true, false);
      document.dispatchEvent(event);
      expect(isInPresentationMode()).toBe(false);
    });
  });
});
