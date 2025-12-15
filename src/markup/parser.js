// Text markup parser
// See DESIGN.md for markup syntax and rendering strategy
// BACKLOG-139: Advanced text markup support

/**
 * Parse text with markup into an array of segments
 * Supports:
 * - **bold**, //italic//, __underline__
 * - --small--, ++big++, ""mono"", ~~strike~~
 * - <color:#hex>text</color>
 * - <size:N>text</size>
 * - <sub>text</sub>, <sup>text</sup>
 * - <link:URL>text</link>
 * - <stroke:N:#color>text</stroke>
 * - <background:#color>text</background>
 * - \n (linebreak)
 * @param {string} text - Text with markup
 * @returns {Array<{type: string, content?: string, value?: string|number}>} Array of segments
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

    // Check for __underline__
    const underlineMatch = remaining.match(/^__(.*?)__/);
    if (underlineMatch) {
      if (underlineMatch[1]) {
        segments.push({ type: 'underline', content: underlineMatch[1] });
      }
      remaining = remaining.substring(underlineMatch[0].length);
      continue;
    }

    // Check for --small--
    const smallMatch = remaining.match(/^--(.*?)--/);
    if (smallMatch) {
      if (smallMatch[1]) {
        segments.push({ type: 'small', content: smallMatch[1] });
      }
      remaining = remaining.substring(smallMatch[0].length);
      continue;
    }

    // Check for ++big++
    const bigMatch = remaining.match(/^\+\+(.*?)\+\+/);
    if (bigMatch) {
      if (bigMatch[1]) {
        segments.push({ type: 'big', content: bigMatch[1] });
      }
      remaining = remaining.substring(bigMatch[0].length);
      continue;
    }

    // Check for ""mono""
    const monoMatch = remaining.match(/^""(.*?)""/);
    if (monoMatch) {
      if (monoMatch[1]) {
        segments.push({ type: 'mono', content: monoMatch[1] });
      }
      remaining = remaining.substring(monoMatch[0].length);
      continue;
    }

    // Check for ~~strike~~
    const strikeMatch = remaining.match(/^~~(.*?)~~/);
    if (strikeMatch) {
      if (strikeMatch[1]) {
        segments.push({ type: 'strike', content: strikeMatch[1] });
      }
      remaining = remaining.substring(strikeMatch[0].length);
      continue;
    }

    // Check for <color:#hex>text</color> or <color:name>text</color>
    const colorMatch = remaining.match(/^<color:(#[a-fA-F0-9a-zA-Z]+|[a-zA-Z]+)>(.*?)<\/color>/);
    if (colorMatch) {
      segments.push({ type: 'color', value: colorMatch[1], content: colorMatch[2] });
      remaining = remaining.substring(colorMatch[0].length);
      continue;
    }

    // Check for <size:N>text</size>
    const sizeMatch = remaining.match(/^<size:(\d+)>(.*?)<\/size>/);
    if (sizeMatch) {
      segments.push({ type: 'size', value: parseInt(sizeMatch[1], 10), content: sizeMatch[2] });
      remaining = remaining.substring(sizeMatch[0].length);
      continue;
    }

    // Check for <sub>text</sub>
    const subMatch = remaining.match(/^<sub>(.*?)<\/sub>/);
    if (subMatch) {
      segments.push({ type: 'sub', content: subMatch[1] });
      remaining = remaining.substring(subMatch[0].length);
      continue;
    }

    // Check for <sup>text</sup>
    const supMatch = remaining.match(/^<sup>(.*?)<\/sup>/);
    if (supMatch) {
      segments.push({ type: 'sup', content: supMatch[1] });
      remaining = remaining.substring(supMatch[0].length);
      continue;
    }

    // Check for <link:URL>text</link>
    const linkMatch = remaining.match(/^<link:([^>]+)>(.*?)<\/link>/);
    if (linkMatch) {
      segments.push({ type: 'link', value: linkMatch[1], content: linkMatch[2] });
      remaining = remaining.substring(linkMatch[0].length);
      continue;
    }

    // Check for <stroke:N:#color>text</stroke> or <stroke:N:name>text</stroke>
    const strokeMatch = remaining.match(/^<stroke:(\d+):(#[a-fA-F0-9a-zA-Z]+|[a-zA-Z]+)>(.*?)<\/stroke>/);
    if (strokeMatch) {
      segments.push({
        type: 'stroke',
        strokeWidth: parseInt(strokeMatch[1], 10),
        strokeColor: strokeMatch[2],
        content: strokeMatch[3]
      });
      remaining = remaining.substring(strokeMatch[0].length);
      continue;
    }

    // Check for <background:#color>text</background> or <background:name>text</background>
    const bgMatch = remaining.match(/^<background:(#[a-fA-F0-9a-zA-Z]+|[a-zA-Z]+)>(.*?)<\/background>/);
    if (bgMatch) {
      segments.push({ type: 'background', value: bgMatch[1], content: bgMatch[2] });
      remaining = remaining.substring(bgMatch[0].length);
      continue;
    }

    // Plain text until next markup
    const nextMarkup = remaining.search(/(\*\*|\/\/|__|--|\+\+|""|~~|\\n|<color:|<size:|<sub>|<sup>|<link:|<stroke:|<background:)/);
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
 * @param {Array<{type: string, content?: string, value?: string|number}>} segments - Array of segments
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
      case 'underline':
        return `__${seg.content || ''}__`;
      case 'small':
        return `--${seg.content || ''}--`;
      case 'big':
        return `++${seg.content || ''}++`;
      case 'mono':
        return `""${seg.content || ''}""`;
      case 'strike':
        return `~~${seg.content || ''}~~`;
      case 'color':
        return `<color:${seg.value}>${seg.content || ''}</color>`;
      case 'size':
        return `<size:${seg.value}>${seg.content || ''}</size>`;
      case 'sub':
        return `<sub>${seg.content || ''}</sub>`;
      case 'sup':
        return `<sup>${seg.content || ''}</sup>`;
      case 'link':
        return `<link:${seg.value}>${seg.content || ''}</link>`;
      case 'stroke':
        return `<stroke:${seg.strokeWidth}:${seg.strokeColor}>${seg.content || ''}</stroke>`;
      case 'background':
        return `<background:${seg.value}>${seg.content || ''}</background>`;
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
  // Check for all supported markup patterns
  return /(\*\*.*?\*\*|\/\/.*?\/\/|__.*?__|--.*?--|\+\+.*?\+\+|"".*?""|~~.*?~~|<color:|<size:|<sub>|<sup>|<link:|<stroke:|<background:|\\n)/.test(text);
}
