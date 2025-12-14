// Tests for presentation mode (BACKLOG-111)
// Tests for read-only presentation mode (BACKLOG-112)

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initPresentation,
  enterPresentationMode,
  exitPresentationMode,
  togglePresentationMode,
  isInPresentationMode,
  enterReadOnlyMode,
  exitReadOnlyMode,
  toggleReadOnlyMode,
  isInReadOnlyMode
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
    if (isInReadOnlyMode()) {
      exitReadOnlyMode();
    }
    if (isInPresentationMode()) {
      exitPresentationMode();
    }
    document.body.classList.remove('presentation-mode');
    document.body.classList.remove('read-only-mode');
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

describe('Read-Only Presentation Mode (BACKLOG-112)', () => {
  let diagramPane;

  beforeEach(() => {
    // Create mock diagram pane
    diagramPane = document.createElement('div');
    diagramPane.id = 'diagram-pane';
    document.body.appendChild(diagramPane);

    // Ensure we start clean
    if (isInReadOnlyMode()) {
      exitReadOnlyMode();
    }
    if (isInPresentationMode()) {
      exitPresentationMode();
    }

    initPresentation(() => {});
  });

  afterEach(() => {
    if (isInReadOnlyMode()) {
      exitReadOnlyMode();
    }
    if (isInPresentationMode()) {
      exitPresentationMode();
    }
    document.body.classList.remove('presentation-mode');
    document.body.classList.remove('read-only-mode');
    if (diagramPane && diagramPane.parentNode) {
      diagramPane.parentNode.removeChild(diagramPane);
    }
  });

  describe('enterReadOnlyMode', () => {
    it('should add read-only-mode class to body', () => {
      enterReadOnlyMode();
      expect(document.body.classList.contains('read-only-mode')).toBe(true);
    });

    it('should also enter presentation mode', () => {
      enterReadOnlyMode();
      expect(isInPresentationMode()).toBe(true);
    });

    it('should set isInReadOnlyMode to true', () => {
      enterReadOnlyMode();
      expect(isInReadOnlyMode()).toBe(true);
    });

    it('should not double-enter if already in read-only mode', () => {
      enterReadOnlyMode();
      enterReadOnlyMode();
      expect(document.body.classList.contains('read-only-mode')).toBe(true);
    });
  });

  describe('exitReadOnlyMode', () => {
    it('should remove read-only-mode class from body', () => {
      enterReadOnlyMode();
      exitReadOnlyMode();
      expect(document.body.classList.contains('read-only-mode')).toBe(false);
    });

    it('should set isInReadOnlyMode to false', () => {
      enterReadOnlyMode();
      exitReadOnlyMode();
      expect(isInReadOnlyMode()).toBe(false);
    });

    it('should not affect presentation mode', () => {
      enterReadOnlyMode();
      exitReadOnlyMode();
      expect(isInPresentationMode()).toBe(true);
    });
  });

  describe('toggleReadOnlyMode', () => {
    it('should enter read-only mode when not active', () => {
      toggleReadOnlyMode();
      expect(isInReadOnlyMode()).toBe(true);
    });

    it('should exit both modes when active', () => {
      enterReadOnlyMode();
      toggleReadOnlyMode();
      expect(isInReadOnlyMode()).toBe(false);
      expect(isInPresentationMode()).toBe(false);
    });
  });

  describe('exitPresentationMode should also exit read-only mode', () => {
    it('should exit read-only mode when exiting presentation mode', () => {
      enterReadOnlyMode();
      exitPresentationMode();
      expect(isInReadOnlyMode()).toBe(false);
    });
  });

  describe('Keyboard shortcuts', () => {
    function createKeyEvent(key, ctrlKey = false, metaKey = false, shiftKey = false) {
      return new KeyboardEvent('keydown', {
        key,
        ctrlKey,
        metaKey,
        shiftKey,
        bubbles: true
      });
    }

    it('should toggle read-only mode on Ctrl+Shift+M', () => {
      const event = createKeyEvent('m', true, false, true);
      document.dispatchEvent(event);
      expect(isInReadOnlyMode()).toBe(true);
    });

    it('should toggle off on Ctrl+Shift+M when active', () => {
      enterReadOnlyMode();
      const event = createKeyEvent('m', true, false, true);
      document.dispatchEvent(event);
      expect(isInReadOnlyMode()).toBe(false);
    });
  });
});
