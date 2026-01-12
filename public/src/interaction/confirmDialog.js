// Confirmation dialog for destructive actions (BACKLOG-080)
// Shows a warning dialog with OK/Cancel buttons

/**
 * Show a confirmation dialog
 * @param {string} title - Dialog title
 * @param {string} message - Warning message
 * @param {Function} onConfirm - Called if user confirms
 * @param {Function} onCancel - Called if user cancels (optional)
 */
export function showConfirmDialog(title, message, onConfirm, onCancel) {
  // Remove any existing dialog
  hideConfirmDialog();

  // Create dialog
  const dialogElement = document.createElement('div');
  dialogElement.className = 'confirm-dialog-overlay';
  dialogElement.id = 'confirm-dialog';
  dialogElement.innerHTML = `
    <div class="confirm-dialog">
      <div class="confirm-dialog-title">${escapeHtml(title)}</div>
      <div class="confirm-dialog-message">${escapeHtml(message)}</div>
      <div class="confirm-dialog-buttons">
        <button type="button" class="confirm-dialog-cancel">Cancel</button>
        <button type="button" class="confirm-dialog-ok">Delete</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialogElement);

  // Get buttons
  const okBtn = dialogElement.querySelector('.confirm-dialog-ok');
  const cancelBtn = dialogElement.querySelector('.confirm-dialog-cancel');

  // Handle confirm
  const handleConfirm = () => {
    hideConfirmDialog();
    if (onConfirm) onConfirm();
  };

  // Handle cancel
  const handleCancel = () => {
    hideConfirmDialog();
    if (onCancel) onCancel();
  };

  // Handle escape key
  const handleKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    }
  };

  okBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', handleCancel);
  document.addEventListener('keydown', handleKeydown);

  // Store cleanup function
  dialogElement._cleanup = () => {
    document.removeEventListener('keydown', handleKeydown);
  };

  // Focus cancel button (safer default)
  cancelBtn.focus();

  // Add styles
  addConfirmDialogStyles();
}

/**
 * Hide and remove the confirmation dialog
 */
export function hideConfirmDialog() {
  const dialog = document.getElementById('confirm-dialog');
  if (dialog) {
    if (dialog._cleanup) dialog._cleanup();
    dialog.parentNode.removeChild(dialog);
  }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Add CSS styles for confirmation dialog
 */
function addConfirmDialogStyles() {
  if (document.getElementById('confirm-dialog-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'confirm-dialog-styles';
  style.textContent = `
    .confirm-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    }

    .confirm-dialog {
      background: white;
      border-radius: 6px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      padding: 20px;
      min-width: 300px;
      max-width: 450px;
      font-family: sans-serif;
    }

    .confirm-dialog-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #333;
    }

    .confirm-dialog-message {
      font-size: 14px;
      color: #666;
      margin-bottom: 20px;
      line-height: 1.5;
    }

    .confirm-dialog-buttons {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    .confirm-dialog-ok,
    .confirm-dialog-cancel {
      padding: 8px 16px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
    }

    .confirm-dialog-cancel {
      background: #f5f5f5;
    }

    .confirm-dialog-cancel:hover {
      background: #e5e5e5;
    }

    .confirm-dialog-ok {
      background: #dc3545;
      border-color: #dc3545;
      color: white;
    }

    .confirm-dialog-ok:hover {
      background: #c82333;
    }
  `;

  document.head.appendChild(style);
}
