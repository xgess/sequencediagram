import { createShareURL } from '../storage/url.js';

function showShareDialog(getTextCallback) {
  const text = getTextCallback();
  if (!text) return;

  const modal = document.createElement('div');
  modal.className = 'share-dialog-modal';

  const header = document.createElement('h2');
  header.textContent = 'Share Diagram';
  modal.appendChild(header);

  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.readOnly = true;
  urlInput.value = createShareURL(text);
  modal.appendChild(urlInput);

  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy';
  copyButton.addEventListener('click', () => {
    urlInput.select();
    document.execCommand('copy');
  });
  modal.appendChild(copyButton);

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.addEventListener('click', () => {
    modal.remove();
  });
  modal.appendChild(closeButton);

  document.body.appendChild(modal);
}

export { showShareDialog };
