import LZString from '../../lib/lz-string/lz-string.js';

function createShareURL(text, options = {}) {
  const compressed = LZString.compressToEncodedURIComponent(text);
  const baseUrl = window.location.origin + window.location.pathname;
  
  let url = `${baseUrl}#initialData=${compressed}`;
  
  if (options.presentation) {
    url += '&presentation=true';
  }
  if (options.shrinkToFit) {
    url += '&shrinkToFit=true';
  }
  
  return url;
}

function loadFromURL() {
  const hash = window.location.hash.substring(1);
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  
  const compressed = params.get('initialData');
  if (!compressed) return null;
  
  const text = LZString.decompressFromEncodedURIComponent(compressed);
  const presentation = params.get('presentation') === 'true';
  const shrinkToFit = params.get('shrinkToFit') === 'true';
  
  return { text, presentation, shrinkToFit };
}

export { createShareURL, loadFromURL };
