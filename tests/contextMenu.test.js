// Tests for context menu (BACKLOG-088)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showContextMenu, hideContextMenu, isContextMenuVisible } from '../src/interaction/contextMenu.js';

describe('Context Menu (BACKLOG-088)', () => {
  let actionCallback;

  beforeEach(() => {
    // Clean up any existing styles and menus
    const existingStyle = document.getElementById('context-menu-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    hideContextMenu();
    actionCallback = vi.fn();
  });

  afterEach(() => {
    hideContextMenu();
  });

  describe('showContextMenu', () => {
    it('should create and display context menu', () => {
      showContextMenu(100, 100, null, null, actionCallback);

      const menu = document.querySelector('.context-menu');
      expect(menu).not.toBeNull();
      expect(isContextMenuVisible()).toBe(true);
    });

    it('should position menu at click coordinates', () => {
      showContextMenu(150, 200, null, null, actionCallback);

      const menu = document.querySelector('.context-menu');
      expect(menu.style.left).toBe('150px');
      expect(menu.style.top).toBe('200px');
    });

    it('should add context menu styles to document', () => {
      showContextMenu(100, 100, null, null, actionCallback);

      const styles = document.getElementById('context-menu-styles');
      expect(styles).not.toBeNull();
      expect(styles.textContent).toContain('.context-menu');
    });

    it('should not duplicate styles on multiple shows', () => {
      showContextMenu(100, 100, null, null, actionCallback);
      hideContextMenu();
      showContextMenu(100, 100, null, null, actionCallback);

      const styles = document.querySelectorAll('#context-menu-styles');
      expect(styles.length).toBe(1);
    });

    it('should show add options when clicking on background', () => {
      showContextMenu(100, 100, null, null, actionCallback);

      const menu = document.querySelector('.context-menu');
      const items = menu.querySelectorAll('.context-menu-item');

      // Should have add options
      const addParticipant = Array.from(items).find(i => i.textContent === 'Add Participant');
      const addMessage = Array.from(items).find(i => i.textContent === 'Add Message');
      const addFragment = Array.from(items).find(i => i.textContent === 'Add Fragment');

      expect(addParticipant).not.toBeUndefined();
      expect(addMessage).not.toBeUndefined();
      expect(addFragment).not.toBeUndefined();
    });

    it('should show edit/delete options when clicking on element', () => {
      showContextMenu(100, 100, 'p_123', 'participant', actionCallback);

      const menu = document.querySelector('.context-menu');
      const items = menu.querySelectorAll('.context-menu-item');

      const editItem = Array.from(items).find(i => i.textContent === 'Edit');
      const deleteItem = Array.from(items).find(i => i.textContent === 'Delete');

      expect(editItem).not.toBeUndefined();
      expect(deleteItem).not.toBeUndefined();
    });

    it('should close previous menu when opening new one', () => {
      showContextMenu(100, 100, null, null, actionCallback);
      const firstMenu = document.querySelector('.context-menu');

      showContextMenu(200, 200, null, null, actionCallback);

      const menus = document.querySelectorAll('.context-menu');
      expect(menus.length).toBe(1);
      expect(menus[0]).not.toBe(firstMenu);
    });
  });

  describe('hideContextMenu', () => {
    it('should remove context menu from DOM', () => {
      showContextMenu(100, 100, null, null, actionCallback);
      hideContextMenu();

      const menu = document.querySelector('.context-menu');
      expect(menu).toBeNull();
      expect(isContextMenuVisible()).toBe(false);
    });

    it('should handle being called when no menu exists', () => {
      expect(() => hideContextMenu()).not.toThrow();
    });
  });

  describe('menu item clicks', () => {
    it('should call callback with action on item click', () => {
      showContextMenu(100, 100, null, null, actionCallback);

      const menu = document.querySelector('.context-menu');
      const addParticipant = menu.querySelector('[data-action="add-participant"]');
      addParticipant.click();

      expect(actionCallback).toHaveBeenCalledWith('add-participant', null);
    });

    it('should call callback with nodeId for element context', () => {
      showContextMenu(100, 100, 'p_123', 'participant', actionCallback);

      const menu = document.querySelector('.context-menu');
      const editItem = menu.querySelector('[data-action="edit"]');
      editItem.click();

      expect(actionCallback).toHaveBeenCalledWith('edit', 'p_123');
    });

    it('should close menu after item click', () => {
      showContextMenu(100, 100, null, null, actionCallback);

      const menu = document.querySelector('.context-menu');
      const addParticipant = menu.querySelector('[data-action="add-participant"]');
      addParticipant.click();

      expect(isContextMenuVisible()).toBe(false);
    });
  });

  describe('keyboard handling', () => {
    it('should close menu on Escape key', () => {
      showContextMenu(100, 100, null, null, actionCallback);

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(event);

      expect(isContextMenuVisible()).toBe(false);
    });
  });

  describe('click outside', () => {
    it('should close menu when clicking outside', () => {
      showContextMenu(100, 100, null, null, actionCallback);

      // Click on document body (outside menu)
      const event = new MouseEvent('click', { bubbles: true });
      document.body.dispatchEvent(event);

      expect(isContextMenuVisible()).toBe(false);
    });

    it('should not close menu when clicking inside', () => {
      showContextMenu(100, 100, null, null, actionCallback);

      const menu = document.querySelector('.context-menu');
      const event = new MouseEvent('click', { bubbles: true });
      menu.dispatchEvent(event);

      // Menu should still be visible (only closes on item click)
      expect(isContextMenuVisible()).toBe(true);
    });
  });

  describe('menu item structure', () => {
    it('should include all participant types', () => {
      showContextMenu(100, 100, null, null, actionCallback);

      const menu = document.querySelector('.context-menu');
      expect(menu.querySelector('[data-action="add-participant"]')).not.toBeNull();
      expect(menu.querySelector('[data-action="add-actor"]')).not.toBeNull();
      expect(menu.querySelector('[data-action="add-database"]')).not.toBeNull();
      expect(menu.querySelector('[data-action="add-queue"]')).not.toBeNull();
    });

    it('should include separator between edit and add sections', () => {
      showContextMenu(100, 100, 'p_123', 'participant', actionCallback);

      const menu = document.querySelector('.context-menu');
      const separator = menu.querySelector('.context-menu-separator');
      expect(separator).not.toBeNull();
    });
  });
});
