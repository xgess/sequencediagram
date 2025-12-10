// Text markup parser
// See DESIGN.md for markup syntax and rendering strategy

/**
 * Parse text with markup into an array of segments
 * Supports: **bold**, //italic//, \n (linebreak)
 * @param {string} text - Text with markup
 * @returns {Array<{type: string, content?: string}>} Array of segments
 */
export function parseMarkup(text) {
  if (!text) {
    return [];
  }

  const segments = [];
  let remaining = text;

  while (remaining) {
    // Check for \n (literal backslash-n, not newline character)
    if (remaining.startsWith('\\n')) {
      segments.push({ type: 'linebreak' });
      remaining = remaining.substring(2);
      continue;
    }

    // Check for **bold**
    const boldMatch = remaining.match(/^\*\*(.*?)\*\*/);
    if (boldMatch) {
      if (boldMatch[1]) {
        segments.push({ type: 'bold', content: boldMatch[1] });
      }
      remaining = remaining.substring(boldMatch[0].length);
      continue;
    }

    // Check for //italic//
    const italicMatch = remaining.match(/^\/\/(.*?)\/\//);
    if (italicMatch) {
      if (italicMatch[1]) {
        segments.push({ type: 'italic', content: italicMatch[1] });
      }
      remaining = remaining.substring(italicMatch[0].length);
      continue;
    }

    // Plain text until next markup
    const nextMarkup = remaining.search(/(\*\*|\/\/|\\n)/);
    if (nextMarkup === -1) {
      segments.push({ type: 'text', content: remaining });
      break;
    } else if (nextMarkup > 0) {
      segments.push({ type: 'text', content: remaining.substring(0, nextMarkup) });
      remaining = remaining.substring(nextMarkup);
    } else {
      // nextMarkup === 0 but didn't match above patterns (unclosed markup)
      // Treat single char as plain text and continue
      segments.push({ type: 'text', content: remaining[0] });
      remaining = remaining.substring(1);
    }
  }

  return segments;
}

/**
 * Serialize markup segments back to text
 * @param {Array<{type: string, content?: string}>} segments - Array of segments
 * @returns {string} Text with markup
 */
export function serializeMarkup(segments) {
  if (!segments || segments.length === 0) {
    return '';
  }

  return segments.map(seg => {
    switch (seg.type) {
      case 'text':
        return seg.content || '';
      case 'bold':
        return `**${seg.content || ''}**`;
      case 'italic':
        return `//${seg.content || ''}//`;
      case 'linebreak':
        return '\\n';
      default:
        return seg.content || '';
    }
  }).join('');
}

/**
 * Check if text contains any markup
 * @param {string} text - Text to check
 * @returns {boolean} True if text contains markup
 */
export function hasMarkup(text) {
  if (!text) return false;
  return /(\*\*.*?\*\*|\/\/.*?\/\/|\\n)/.test(text);
}
