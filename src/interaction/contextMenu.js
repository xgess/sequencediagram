// Context menu for diagram elements (BACKLOG-088)
// Shows right-click menu with options to add/edit elements

// Menu state
let menuElement = null;
let currentCallback = null;
let clickedNodeId = null;

/**
 * Menu item definitions
 */
const MENU_ITEMS = {
  // Add submenu items
  addParticipant: { label: 'Add Participant', category: 'add', action: 'add-participant' },
  addActor: { label: 'Add Actor', category: 'add', action: 'add-actor' },
  addDatabase: { label: 'Add Database', category: 'add', action: 'add-database' },
  addQueue: { label: 'Add Queue', category: 'add', action: 'add-queue' },
  addMessage: { label: 'Add Message', category: 'add', action: 'add-message' },
  addFragment: { label: 'Add Fragment', category: 'add', action: 'add-fragment' },
  // Edit actions for when clicking on elements
  editElement: { label: 'Edit', category: 'edit', action: 'edit' },
  deleteElement: { label: 'Delete', category: 'edit', action: 'delete' }
};

/**
 * Show context menu at given position
 * @param {number} x - X coordinate (client)
 * @param {number} y - Y coordinate (client)
 * @param {string|null} nodeId - ID of the clicked node, null for background
 * @param {string|null} nodeType - Type of the clicked node, null for background
 * @param {Function} onAction - Callback: (action, nodeId) => void
 */
export function showContextMenu(x, y, nodeId, nodeType, onAction) {
  // Remove any existing menu
  hideContextMenu();

  currentCallback = onAction;
  clickedNodeId = nodeId;

  // Create menu element
  menuElement = document.createElement('div');
  menuElement.className = 'context-menu';

  // Build menu items based on context
  const items = buildMenuItems(nodeId, nodeType);

  // Create menu HTML
  let html = '';
  let lastCategory = null;

  for (const item of items) {
    // Add separator between categories
    if (lastCategory && item.category !== lastCategory) {
      html += '<div class="context-menu-separator"></div>';
    }
    lastCategory = item.category;

    html += `<div class="context-menu-item" data-action="${item.action}">${item.label}</div>`;
  }

  menuElement.innerHTML = html;

  // Position menu
  menuElement.style.position = 'fixed';
  menuElement.style.left = `${x}px`;
  menuElement.style.top = `${y}px`;
  menuElement.style.zIndex = '10001';

  document.body.appendChild(menuElement);

  // Adjust position if menu goes off screen
  const rect = menuElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (rect.right > viewportWidth) {
    menuElement.style.left = `${viewportWidth - rect.width - 5}px`;
  }
  if (rect.bottom > viewportHeight) {
    menuElement.style.top = `${viewportHeight - rect.height - 5}px`;
  }

  // Add click handlers to menu items
  const menuItems = menuElement.querySelectorAll('.context-menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', handleItemClick);
  });

  // Add global handlers to close menu
  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('contextmenu', handleOutsideContextMenu);

  // Add styles
  addContextMenuStyles();
}

/**
 * Hide and remove the context menu
 */
export function hideContextMenu() {
  if (menuElement && menuElement.parentNode) {
    menuElement.parentNode.removeChild(menuElement);
  }
  menuElement = null;
  currentCallback = null;
  clickedNodeId = null;

  // Remove global handlers
  document.removeEventListener('click', handleOutsideClick);
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('contextmenu', handleOutsideContextMenu);
}

/**
 * Check if context menu is visible
 * @returns {boolean}
 */
export function isContextMenuVisible() {
  return menuElement !== null;
}

/**
 * Build menu items based on context
 * @param {string|null} nodeId - Clicked node ID
 * @param {string|null} nodeType - Clicked node type
 * @returns {Array} Menu items to show
 */
function buildMenuItems(nodeId, nodeType) {
  const items = [];

  // If clicked on an element, show edit/delete options first
  if (nodeId && nodeType) {
    items.push(MENU_ITEMS.editElement);
    items.push(MENU_ITEMS.deleteElement);
  }

  // Always show Add options
  items.push(MENU_ITEMS.addParticipant);
  items.push(MENU_ITEMS.addActor);
  items.push(MENU_ITEMS.addDatabase);
  items.push(MENU_ITEMS.addQueue);
  items.push(MENU_ITEMS.addMessage);
  items.push(MENU_ITEMS.addFragment);

  return items;
}

/**
 * Handle menu item click
 * @param {MouseEvent} event
 */
function handleItemClick(event) {
  const action = event.target.getAttribute('data-action');
  const callback = currentCallback;
  const nodeId = clickedNodeId;

  hideContextMenu();

  if (callback && action) {
    callback(action, nodeId);
  }
}

/**
 * Handle click outside menu
 * @param {MouseEvent} event
 */
function handleOutsideClick(event) {
  if (menuElement && !menuElement.contains(event.target)) {
    hideContextMenu();
  }
}

/**
 * Handle another context menu event
 * @param {MouseEvent} event
 */
function handleOutsideContextMenu(event) {
  // If right-clicking outside the menu, close current menu
  // (the new context menu will be opened by the normal handler)
  if (menuElement && !menuElement.contains(event.target)) {
    hideContextMenu();
  }
}

/**
 * Handle keyboard events
 * @param {KeyboardEvent} event
 */
function handleKeydown(event) {
  if (event.key === 'Escape') {
    hideContextMenu();
  }
}

/**
 * Add CSS styles for context menu
 */
function addContextMenuStyles() {
  if (document.getElementById('context-menu-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'context-menu-styles';
  style.textContent = `
    .context-menu {
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      min-width: 160px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      padding: 4px 0;
    }

    .context-menu-item {
      padding: 8px 16px;
      cursor: pointer;
      white-space: nowrap;
    }

    .context-menu-item:hover {
      background: #4a90d9;
      color: white;
    }

    .context-menu-separator {
      height: 1px;
      background: #e0e0e0;
      margin: 4px 0;
    }
  `;

  document.head.appendChild(style);
}
