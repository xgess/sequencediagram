// Dialog for adding messages from context menu

// Dialog state
let dialogElement = null;
let currentCallback = null;
let participantList = [];

// Arrow types
const ARROW_TYPES = [
  { value: '->', label: 'Sync (→)' },
  { value: '->>', label: 'Async (→→)' },
  { value: '-->', label: 'Return (⇢)' },
  { value: '-->>', label: 'Async Return (⇢⇢)' }
];

/**
 * Show add message dialog
 * @param {number} x - X position (client coordinates)
 * @param {number} y - Y position (client coordinates)
 * @param {Array} participants - Array of participant objects with alias and displayName
 * @param {Function} onComplete - Callback: (result) => void where result is {from, to, arrowType, label} or null
 */
export function showAddMessageDialog(x, y, participants, onComplete) {
  // Remove any existing dialog
  hideAddMessageDialog();

  if (!participants || participants.length < 2) {
    console.warn('Need at least 2 participants to add a message');
    if (onComplete) onComplete(null);
    return;
  }

  currentCallback = onComplete;
  participantList = participants;

  // Create dialog
  dialogElement = document.createElement('div');
  dialogElement.className = 'add-dialog add-message-dialog';

  // Build participant options
  const participantOptions = participants.map(p =>
    `<option value="${p.alias}">${p.displayName || p.alias}</option>`
  ).join('');

  // Build arrow type options
  const arrowOptions = ARROW_TYPES.map(t =>
    `<option value="${t.value}">${t.label}</option>`
  ).join('');

  dialogElement.innerHTML = `
    <div class="add-dialog-title">Add Message</div>
    <div class="add-dialog-row">
      <div class="add-dialog-field add-dialog-field-half">
        <label class="add-dialog-label">From</label>
        <select class="add-dialog-select" id="add-message-from">
          ${participantOptions}
        </select>
      </div>
      <div class="add-dialog-field add-dialog-field-half">
        <label class="add-dialog-label">To</label>
        <select class="add-dialog-select" id="add-message-to">
          ${participantOptions}
        </select>
      </div>
    </div>
    <div class="add-dialog-field">
      <label class="add-dialog-label">Arrow Type</label>
      <select class="add-dialog-select" id="add-message-arrow">
        ${arrowOptions}
      </select>
    </div>
    <div class="add-dialog-field">
      <label class="add-dialog-label">Label</label>
      <input type="text" class="add-dialog-input" id="add-message-label" placeholder="e.g. Request data">
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

  // Set default "To" to second participant
  const toSelect = dialogElement.querySelector('#add-message-to');
  if (participants.length > 1) {
    toSelect.value = participants[1].alias;
  }

  // Get input elements
  const labelInput = dialogElement.querySelector('#add-message-label');
  const okBtn = dialogElement.querySelector('.add-dialog-ok');
  const cancelBtn = dialogElement.querySelector('.add-dialog-cancel');

  // Add event handlers
  okBtn.addEventListener('click', handleOk);
  cancelBtn.addEventListener('click', handleCancel);
  labelInput.addEventListener('keydown', handleKeydown);

  // Focus label input
  labelInput.focus();

  // Add styles
  addDialogStyles();
}

/**
 * Hide and remove the dialog
 */
export function hideAddMessageDialog() {
  if (dialogElement && dialogElement.parentNode) {
    dialogElement.parentNode.removeChild(dialogElement);
  }
  dialogElement = null;
  currentCallback = null;
  participantList = [];
}

/**
 * Check if dialog is visible
 * @returns {boolean}
 */
export function isAddMessageDialogVisible() {
  return dialogElement !== null;
}

/**
 * Handle OK button click
 */
function handleOk() {
  if (!dialogElement || !currentCallback) return;

  const fromSelect = dialogElement.querySelector('#add-message-from');
  const toSelect = dialogElement.querySelector('#add-message-to');
  const arrowSelect = dialogElement.querySelector('#add-message-arrow');
  const labelInput = dialogElement.querySelector('#add-message-label');

  const from = fromSelect.value;
  const to = toSelect.value;
  const arrowType = arrowSelect.value;
  const label = labelInput.value.trim();

  // Validate - from and to cannot be the same
  if (from === to) {
    fromSelect.classList.add('error');
    toSelect.classList.add('error');
    return;
  }

  const callback = currentCallback;
  hideAddMessageDialog();
  callback({ from, to, arrowType, label });
}

/**
 * Handle Cancel button click
 */
function handleCancel() {
  const callback = currentCallback;
  hideAddMessageDialog();
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
 * Add CSS styles for dialog (extends add-dialog styles)
 */
function addDialogStyles() {
  if (document.getElementById('add-message-dialog-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'add-message-dialog-styles';
  style.textContent = `
    .add-dialog-row {
      display: flex;
      gap: 12px;
    }

    .add-dialog-field-half {
      flex: 1;
    }

    .add-dialog-select.error,
    .add-dialog-input.error {
      border-color: #d9534f;
      box-shadow: 0 0 0 2px rgba(217, 83, 79, 0.2);
    }
  `;

  document.head.appendChild(style);
}
