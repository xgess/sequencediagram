// Dialog for adding participants from context menu

// Dialog state
let dialogElement = null;
let currentCallback = null;

// Participant types
const PARTICIPANT_TYPES = [
  { value: 'participant', label: 'Participant' },
  { value: 'actor', label: 'Actor' },
  { value: 'database', label: 'Database' },
  { value: 'queue', label: 'Queue' }
];

/**
 * Show add participant dialog
 * @param {number} x - X position (client coordinates)
 * @param {number} y - Y position (client coordinates)
 * @param {string} defaultType - Default participant type
 * @param {Function} onComplete - Callback: (result) => void where result is {type, alias, displayName} or null
 */
export function showAddParticipantDialog(x, y, defaultType = 'participant', onComplete) {
  // Remove any existing dialog
  hideAddParticipantDialog();

  currentCallback = onComplete;

  // Create dialog
  dialogElement = document.createElement('div');
  dialogElement.className = 'add-dialog add-participant-dialog';

  // Build type options
  const typeOptions = PARTICIPANT_TYPES.map(t =>
    `<option value="${t.value}"${t.value === defaultType ? ' selected' : ''}>${t.label}</option>`
  ).join('');

  dialogElement.innerHTML = `
    <div class="add-dialog-title">Add Participant</div>
    <div class="add-dialog-field">
      <label class="add-dialog-label">Type</label>
      <select class="add-dialog-select" id="add-participant-type">
        ${typeOptions}
      </select>
    </div>
    <div class="add-dialog-field">
      <label class="add-dialog-label">Name</label>
      <input type="text" class="add-dialog-input" id="add-participant-name" placeholder="e.g. Alice">
    </div>
    <div class="add-dialog-field">
      <label class="add-dialog-label">Alias (optional)</label>
      <input type="text" class="add-dialog-input" id="add-participant-alias" placeholder="e.g. A">
    </div>
    <div class="add-dialog-buttons">
      <button type="button" class="add-dialog-cancel">Cancel</button>
      <button type="button" class="add-dialog-ok">Add</button>
    </div>
  `;

  // Position dialog
  dialogElement.style.position = 'fixed';
  dialogElement.style.left = `${x}px`;
  dialogElement.style.top = `${y}px`;
  dialogElement.style.zIndex = '10002';

  document.body.appendChild(dialogElement);

  // Adjust position if dialog goes off screen
  const rect = dialogElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (rect.right > viewportWidth) {
    dialogElement.style.left = `${viewportWidth - rect.width - 10}px`;
  }
  if (rect.bottom > viewportHeight) {
    dialogElement.style.top = `${viewportHeight - rect.height - 10}px`;
  }

  // Get input elements
  const nameInput = dialogElement.querySelector('#add-participant-name');
  const aliasInput = dialogElement.querySelector('#add-participant-alias');
  const typeSelect = dialogElement.querySelector('#add-participant-type');
  const okBtn = dialogElement.querySelector('.add-dialog-ok');
  const cancelBtn = dialogElement.querySelector('.add-dialog-cancel');

  // Add event handlers
  okBtn.addEventListener('click', handleOk);
  cancelBtn.addEventListener('click', handleCancel);
  nameInput.addEventListener('keydown', handleKeydown);
  aliasInput.addEventListener('keydown', handleKeydown);

  // Auto-generate alias from name as user types
  nameInput.addEventListener('input', () => {
    if (!aliasInput.dataset.userEdited) {
      // Generate alias from name - take first letter of each word
      const name = nameInput.value.trim();
      if (name) {
        const words = name.split(/\s+/);
        if (words.length === 1) {
          // Single word - use the name directly without spaces
          aliasInput.value = name.replace(/\s/g, '');
        } else {
          // Multiple words - use initials
          aliasInput.value = words.map(w => w[0]).join('').toUpperCase();
        }
      } else {
        aliasInput.value = '';
      }
    }
  });

  // Mark alias as user-edited when they type in it
  aliasInput.addEventListener('input', () => {
    aliasInput.dataset.userEdited = 'true';
  });

  // Focus name input
  nameInput.focus();

  // Add styles
  addDialogStyles();
}

/**
 * Hide and remove the dialog
 */
export function hideAddParticipantDialog() {
  if (dialogElement && dialogElement.parentNode) {
    dialogElement.parentNode.removeChild(dialogElement);
  }
  dialogElement = null;
  currentCallback = null;
}

/**
 * Check if dialog is visible
 * @returns {boolean}
 */
export function isAddParticipantDialogVisible() {
  return dialogElement !== null;
}

/**
 * Handle OK button click
 */
function handleOk() {
  if (!dialogElement || !currentCallback) return;

  const nameInput = dialogElement.querySelector('#add-participant-name');
  const aliasInput = dialogElement.querySelector('#add-participant-alias');
  const typeSelect = dialogElement.querySelector('#add-participant-type');

  const name = nameInput.value.trim();
  const alias = aliasInput.value.trim() || name.replace(/\s/g, '');
  const type = typeSelect.value;

  // Validate
  if (!name) {
    nameInput.focus();
    nameInput.classList.add('error');
    return;
  }

  // Validate alias - cannot contain spaces or special characters
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) {
    aliasInput.focus();
    aliasInput.classList.add('error');
    return;
  }

  const callback = currentCallback;
  hideAddParticipantDialog();
  callback({ type, alias, displayName: name });
}

/**
 * Handle Cancel button click
 */
function handleCancel() {
  const callback = currentCallback;
  hideAddParticipantDialog();
  if (callback) {
    callback(null);
  }
}

/**
 * Handle keydown in inputs
 * @param {KeyboardEvent} event
 */
function handleKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleOk();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    handleCancel();
  }
}

/**
 * Add CSS styles for dialog
 */
function addDialogStyles() {
  if (document.getElementById('add-dialog-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'add-dialog-styles';
  style.textContent = `
    .add-dialog {
      background: white;
      border: 1px solid #ccc;
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      padding: 16px;
      min-width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    }

    .add-dialog-title {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 16px;
      color: #333;
    }

    .add-dialog-field {
      margin-bottom: 12px;
    }

    .add-dialog-label {
      display: block;
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .add-dialog-input,
    .add-dialog-select {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
      box-sizing: border-box;
    }

    .add-dialog-input:focus,
    .add-dialog-select:focus {
      outline: none;
      border-color: #4a90d9;
      box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.2);
    }

    .add-dialog-input.error {
      border-color: #d9534f;
      box-shadow: 0 0 0 2px rgba(217, 83, 79, 0.2);
    }

    .add-dialog-buttons {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 16px;
    }

    .add-dialog-ok,
    .add-dialog-cancel {
      padding: 8px 16px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #f5f5f5;
      cursor: pointer;
      font-size: 14px;
      font-family: inherit;
    }

    .add-dialog-ok:hover,
    .add-dialog-cancel:hover {
      background: #e5e5e5;
    }

    .add-dialog-ok {
      background: #4a90d9;
      border-color: #4a90d9;
      color: white;
    }

    .add-dialog-ok:hover {
      background: #3a7fc8;
    }
  `;

  document.head.appendChild(style);
}
