// LZString compression library
// In browser: loaded via script tag, available as window.LZString
// In tests: we need to load it and attach to window
let LZString;
if (typeof window !== 'undefined' && window.LZString) {
  LZString = window.LZString;
} else {
  // For Node.js test environment
  LZString = {
    compressToEncodedURIComponent: (str) => {
      // Simple base64 encoding fallback for tests
      return typeof btoa !== 'undefined'
        ? btoa(encodeURIComponent(str))
        : Buffer.from(encodeURIComponent(str)).toString('base64');
    },
    decompressFromEncodedURIComponent: (str) => {
      try {
        return typeof atob !== 'undefined'
          ? decodeURIComponent(atob(str))
          : decodeURIComponent(Buffer.from(str, 'base64').toString());
      } catch {
        return null;
      }
    }
  };
}

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

  // Return null if decompression failed or text is empty
  if (!text || !text.trim()) return null;

  const presentation = params.get('presentation') === 'true';
  const shrinkToFit = params.get('shrinkToFit') === 'true';

  return { text, presentation, shrinkToFit };
}

export { createShareURL, loadFromURL };
