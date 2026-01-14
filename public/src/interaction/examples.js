/**
 * Examples dropdown menu
 * Shows a list of example diagrams that can be loaded into the editor
 */

// Example files (relative to public folder when served)
const EXAMPLES = [
  { name: 'Quick Start', file: 'quick-start.txt' },
  { name: 'Syntax Reference', file: 'syntax-reference.txt' },
  { name: 'API Flow', file: 'api-flow.txt' }
];

let dropdown = null;
let loadCallback = null;

/**
 * Initialize the examples dropdown
 * @param {Function} onLoad - Callback to load text into editor: (text) => void
 */
export function initExamplesDropdown(onLoad) {
  loadCallback = onLoad;

  const toolbar = document.getElementById('editor-toolbar');
  if (!toolbar) return;

  // Create the dropdown container
  const container = document.createElement('div');
  container.className = 'examples-dropdown';
  container.innerHTML = `
    <span id="examples-btn" class="examples-link" title="Load example diagram">See An Example <span class="dropdown-arrow">▾</span></span>
    <div class="examples-menu"></div>
  `;

  // Insert before the Open button (first child)
  const firstChild = toolbar.firstChild;
  if (firstChild) {
    toolbar.insertBefore(container, firstChild);
  } else {
    toolbar.appendChild(container);
  }

  const btn = container.querySelector('#examples-btn');
  const menu = container.querySelector('.examples-menu');
  dropdown = menu;

  // Populate menu items
  for (const example of EXAMPLES) {
    const item = document.createElement('div');
    item.className = 'examples-menu-item';
    item.textContent = example.name;
    item.dataset.file = example.file;
    item.addEventListener('click', () => loadExample(example.name, example.file));
    menu.appendChild(item);
  }

  // Toggle menu on button click
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('open');
  });

  // Close menu when clicking outside
  document.addEventListener('click', () => {
    menu.classList.remove('open');
  });

  // Prevent menu clicks from closing it immediately
  menu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Add styles
  addStyles();
}

/**
 * Load an example file into the editor
 */
async function loadExample(name, filename) {
  dropdown?.classList.remove('open');

  // Confirm before replacing current work
  const confirmed = confirm(`Load "${name}" example?\n\nThis will replace your current diagram.`);
  if (!confirmed) return;

  try {
    // Fetch the example file
    const response = await fetch(`../examples/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}`);
    }
    const text = await response.text();

    // Load into editor via callback
    if (loadCallback) {
      loadCallback(text);
    }
  } catch (err) {
    console.error('Failed to load example:', err);
    alert(`Failed to load example: ${filename}`);
  }
}

/**
 * Add dropdown styles
 */
function addStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .examples-dropdown {
      position: relative;
      display: inline-block;
      margin-right: 12px;
    }

    .examples-link {
      color: #0066cc;
      cursor: pointer;
      font-size: 13px;
      text-decoration: none;
    }

    .examples-link:hover {
      text-decoration: underline;
    }

    .dropdown-arrow {
      font-size: 10px;
      margin-left: 2px;
    }

    .examples-menu {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      min-width: 150px;
      margin-top: 4px;
    }

    .examples-menu.open {
      display: block;
    }

    .examples-menu-item {
      padding: 8px 12px;
      cursor: pointer;
      white-space: nowrap;
      font-size: 13px;
    }

    .examples-menu-item:hover {
      background: #f0f0f0;
    }

    .examples-menu-item:first-child {
      border-radius: 4px 4px 0 0;
    }

    .examples-menu-item:last-child {
      border-radius: 0 0 4px 4px;
    }
  `;
  document.head.appendChild(style);
}
