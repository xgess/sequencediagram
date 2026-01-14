// Dialog for adding fragments from context menu

// Dialog state
let dialogElement = null;
let currentCallback = null;

// Fragment types
const FRAGMENT_TYPES = [
  { value: 'alt', label: 'alt (alternatives)' },
  { value: 'opt', label: 'opt (optional)' },
  { value: 'loop', label: 'loop (repetition)' },
  { value: 'par', label: 'par (parallel)' },
  { value: 'break', label: 'break (exception)' },
  { value: 'critical', label: 'critical (atomic)' }
];

/**
 * Show add fragment dialog
 * @param {number} x - X position (client coordinates)
 * @param {number} y - Y position (client coordinates)
 * @param {Function} onComplete - Callback: (result) => void where result is {fragmentType, condition} or null
 */
export function showAddFragmentDialog(x, y, onComplete) {
  // Remove any existing dialog
  hideAddFragmentDialog();

  currentCallback = onComplete;

  // Create dialog
  dialogElement = document.createElement('div');
  dialogElement.className = 'add-dialog add-fragment-dialog';

  // Build fragment type options
  const typeOptions = FRAGMENT_TYPES.map(t =>
    `<option value="${t.value}">${t.label}</option>`
  ).join('');

  dialogElement.innerHTML = `
    <div class="add-dialog-title">Add Fragment</div>
    <div class="add-dialog-field">
      <label class="add-dialog-label">Type</label>
      <select class="add-dialog-select" id="add-fragment-type">
        ${typeOptions}
      </select>
    </div>
    <div class="add-dialog-field">
      <label class="add-dialog-label">Condition</label>
      <input type="text" class="add-dialog-input" id="add-fragment-condition" placeholder="e.g. x > 0">
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
  const conditionInput = dialogElement.querySelector('#add-fragment-condition');
  const okBtn = dialogElement.querySelector('.add-dialog-ok');
  const cancelBtn = dialogElement.querySelector('.add-dialog-cancel');

  // Add event handlers
  okBtn.addEventListener('click', handleOk);
  cancelBtn.addEventListener('click', handleCancel);
  conditionInput.addEventListener('keydown', handleKeydown);

  // Focus condition input
  conditionInput.focus();

  // Add styles (reuses add-dialog styles from addParticipantDialog)
  addDialogStyles();
}

/**
 * Hide and remove the dialog
 */
export function hideAddFragmentDialog() {
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
export function isAddFragmentDialogVisible() {
  return dialogElement !== null;
}

/**
 * Handle OK button click
 */
function handleOk() {
  if (!dialogElement || !currentCallback) return;

  const typeSelect = dialogElement.querySelector('#add-fragment-type');
  const conditionInput = dialogElement.querySelector('#add-fragment-condition');

  const fragmentType = typeSelect.value;
  const condition = conditionInput.value.trim();

  // Condition can be empty, but we should provide a default for some types
  const callback = currentCallback;
  hideAddFragmentDialog();
  callback({ fragmentType, condition });
}

/**
 * Handle Cancel button click
 */
function handleCancel() {
  const callback = currentCallback;
  hideAddFragmentDialog();
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
 * Add CSS styles for dialog (ensure base add-dialog styles exist)
 */
function addDialogStyles() {
  // The base add-dialog styles are added by addParticipantDialog
  // This function is a no-op if we depend on that being loaded first
  // If not, we could add them here, but for consistency we rely on the existing styles
}
