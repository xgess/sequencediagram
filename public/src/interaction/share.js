import { createShareURL } from '../storage/url.js';

function showShareDialog(getTextCallback) {
  const text = getTextCallback();
  if (!text) return;

  // Create backdrop overlay
  const backdrop = document.createElement('div');
  backdrop.className = 'share-dialog-backdrop';

  const modal = document.createElement('div');
  modal.className = 'share-dialog-modal';

  const header = document.createElement('h2');
  header.textContent = 'Share Diagram';
  modal.appendChild(header);

  const urlInput = document.createElement('textarea');
  urlInput.readOnly = true;
  urlInput.value = createShareURL(text);
  urlInput.rows = 3;
  modal.appendChild(urlInput);

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'share-dialog-buttons';

  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy';
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(urlInput.value);
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);
    } catch {
      // Fallback for older browsers
      urlInput.select();
      document.execCommand('copy');
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 2000);
    }
  });
  buttonContainer.appendChild(copyButton);

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.addEventListener('click', closeDialog);
  buttonContainer.appendChild(closeButton);

  modal.appendChild(buttonContainer);

  // Close handlers
  function closeDialog() {
    backdrop.remove();
    document.removeEventListener('keydown', handleKeydown);
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      closeDialog();
    }
  }

  // Click backdrop to close
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeDialog();
    }
  });

  document.addEventListener('keydown', handleKeydown);

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // Select all text and focus
  urlInput.focus();
  urlInput.select();
}

export { showShareDialog };
