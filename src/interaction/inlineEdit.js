// Inline edit dialog for editing message labels and participants (BACKLOG-076, BACKLOG-079)
// Shows a text input near the clicked element

// Dialog state
let dialogElement = null;
let currentCallback = null;
let currentNodeId = null;
let isParticipantEdit = false;

/**
 * Show inline edit dialog near an SVG element
 * @param {SVGElement} svgElement - The SVG element to position near
 * @param {string} nodeId - ID of the node being edited
 * @param {string} currentValue - Current text value
 * @param {Function} onComplete - Callback: (nodeId, newValue) => void, or (nodeId, null) if cancelled
 */
export function showInlineEdit(svgElement, nodeId, currentValue, onComplete) {
  // Remove any existing dialog
  hideInlineEdit();

  currentCallback = onComplete;
  currentNodeId = nodeId;

  // Get position from SVG element
  const bbox = svgElement.getBoundingClientRect();

  // Create dialog
  dialogElement = document.createElement('div');
  dialogElement.className = 'inline-edit-dialog';
  dialogElement.innerHTML = `
    <input type="text" class="inline-edit-input" value="">
    <div class="inline-edit-buttons">
      <button type="button" class="inline-edit-ok">OK</button>
      <button type="button" class="inline-edit-cancel">Cancel</button>
    </div>
  `;

  // Position dialog near the element
  dialogElement.style.position = 'fixed';
  dialogElement.style.left = `${bbox.left}px`;
  dialogElement.style.top = `${bbox.bottom + 5}px`;
  dialogElement.style.zIndex = '10000';

  document.body.appendChild(dialogElement);

  // Get input and set value
  const input = dialogElement.querySelector('.inline-edit-input');
  input.value = currentValue;

  // Add event handlers
  const okBtn = dialogElement.querySelector('.inline-edit-ok');
  const cancelBtn = dialogElement.querySelector('.inline-edit-cancel');

  okBtn.addEventListener('click', handleOk);
  cancelBtn.addEventListener('click', handleCancel);
  input.addEventListener('keydown', handleKeydown);

  // Focus and select input
  input.focus();
  input.select();

  // Add styles if not already present
  addInlineEditStyles();
}

/**
 * Show inline edit dialog for participant (two fields: display name and alias)
 * @param {SVGElement} svgElement - The SVG element to position near
 * @param {string} nodeId - ID of the node being edited
 * @param {string} currentDisplayName - Current display name
 * @param {string} currentAlias - Current alias
 * @param {Function} onComplete - Callback: (nodeId, {displayName, alias}) => void, or (nodeId, null) if cancelled
 */
export function showParticipantEdit(svgElement, nodeId, currentDisplayName, currentAlias, onComplete) {
  // Remove any existing dialog
  hideInlineEdit();

  currentCallback = onComplete;
  currentNodeId = nodeId;
  isParticipantEdit = true;

  // Get position from SVG element
  const bbox = svgElement.getBoundingClientRect();

  // Create dialog with two fields
  dialogElement = document.createElement('div');
  dialogElement.className = 'inline-edit-dialog participant-edit-dialog';
  dialogElement.innerHTML = `
    <div class="inline-edit-field">
      <label class="inline-edit-label">Display Name</label>
      <input type="text" class="inline-edit-input" id="edit-display-name" value="">
    </div>
    <div class="inline-edit-field">
      <label class="inline-edit-label">Alias</label>
      <input type="text" class="inline-edit-input" id="edit-alias" value="">
    </div>
    <div class="inline-edit-buttons">
      <button type="button" class="inline-edit-ok">OK</button>
      <button type="button" class="inline-edit-cancel">Cancel</button>
    </div>
  `;

  // Position dialog near the element
  dialogElement.style.position = 'fixed';
  dialogElement.style.left = `${bbox.left}px`;
  dialogElement.style.top = `${bbox.bottom + 5}px`;
  dialogElement.style.zIndex = '10000';

  document.body.appendChild(dialogElement);

  // Get inputs and set values
  const displayNameInput = dialogElement.querySelector('#edit-display-name');
  const aliasInput = dialogElement.querySelector('#edit-alias');
  displayNameInput.value = currentDisplayName;
  aliasInput.value = currentAlias;

  // Add event handlers
  const okBtn = dialogElement.querySelector('.inline-edit-ok');
  const cancelBtn = dialogElement.querySelector('.inline-edit-cancel');

  okBtn.addEventListener('click', handleOk);
  cancelBtn.addEventListener('click', handleCancel);
  displayNameInput.addEventListener('keydown', handleKeydown);
  aliasInput.addEventListener('keydown', handleKeydown);

  // Focus display name input
  displayNameInput.focus();
  displayNameInput.select();

  // Add styles if not already present
  addInlineEditStyles();
}

/**
 * Hide and remove the inline edit dialog
 */
export function hideInlineEdit() {
  if (dialogElement && dialogElement.parentNode) {
    dialogElement.parentNode.removeChild(dialogElement);
  }
  dialogElement = null;
  currentCallback = null;
  currentNodeId = null;
  isParticipantEdit = false;
}

/**
 * Check if inline edit dialog is currently shown
 * @returns {boolean}
 */
export function isInlineEditVisible() {
  return dialogElement !== null;
}

/**
 * Handle OK button click
 */
function handleOk() {
  if (!dialogElement || !currentCallback) return;

  const nodeId = currentNodeId;
  const callback = currentCallback;

  if (isParticipantEdit) {
    // Participant edit - return object with both fields
    const displayNameInput = dialogElement.querySelector('#edit-display-name');
    const aliasInput = dialogElement.querySelector('#edit-alias');
    const result = {
      displayName: displayNameInput.value,
      alias: aliasInput.value
    };
    hideInlineEdit();
    callback(nodeId, result);
  } else {
    // Simple single-field edit
    const input = dialogElement.querySelector('.inline-edit-input');
    const newValue = input.value;
    hideInlineEdit();
    callback(nodeId, newValue);
  }
}

/**
 * Handle Cancel button click
 */
function handleCancel() {
  if (!currentCallback) return;

  const nodeId = currentNodeId;
  const callback = currentCallback;

  hideInlineEdit();
  callback(nodeId, null);
}

/**
 * Handle keydown in input
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
 * Add CSS styles for inline edit dialog
 */
function addInlineEditStyles() {
  if (document.getElementById('inline-edit-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'inline-edit-styles';
  style.textContent = `
    .inline-edit-dialog {
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      padding: 8px;
      font-family: sans-serif;
      font-size: 14px;
    }

    .inline-edit-input {
      width: 200px;
      padding: 6px 8px;
      border: 1px solid #ccc;
      border-radius: 3px;
      font-size: 14px;
      margin-bottom: 8px;
      display: block;
    }

    .inline-edit-input:focus {
      outline: none;
      border-color: #4a90d9;
      box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.2);
    }

    .inline-edit-buttons {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .inline-edit-ok,
    .inline-edit-cancel {
      padding: 4px 12px;
      border: 1px solid #ccc;
      border-radius: 3px;
      background: #f5f5f5;
      cursor: pointer;
      font-size: 13px;
    }

    .inline-edit-ok:hover,
    .inline-edit-cancel:hover {
      background: #e5e5e5;
    }

    .inline-edit-ok {
      background: #4a90d9;
      border-color: #4a90d9;
      color: white;
    }

    .inline-edit-ok:hover {
      background: #3a7fc8;
    }

    /* Participant edit dialog styles */
    .inline-edit-field {
      margin-bottom: 8px;
    }

    .inline-edit-label {
      display: block;
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .participant-edit-dialog .inline-edit-input {
      margin-bottom: 0;
    }
  `;

  document.head.appendChild(style);
}
