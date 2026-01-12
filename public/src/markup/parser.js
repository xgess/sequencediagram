// Text markup parser
// See DESIGN.md for markup syntax and rendering strategy
// BACKLOG-139: Advanced text markup support

/**
 * Parse text with markup into an array of segments
 * Supports nested markup (e.g., ""++big mono++"" works correctly)
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
 * @returns {Array<{type: string, content?: string, children?: Array, value?: string|number}>} Array of segments
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

    // Check for escape sequences: \* \/ \- \+ \~ \\ \" \< \>
    // These should become literal characters
    const escapeMatch = remaining.match(/^\\([*\/\-+~\\"<>])/);
    if (escapeMatch) {
      segments.push({ type: 'text', content: escapeMatch[1] });
      remaining = remaining.substring(2);
      continue;
    }

    // Check for **bold**
    const boldMatch = remaining.match(/^\*\*(.*?)\*\*/);
    if (boldMatch) {
      if (boldMatch[1]) {
        const innerContent = boldMatch[1];
        const children = hasMarkup(innerContent) ? parseMarkup(innerContent) : null;
        segments.push({ type: 'bold', content: innerContent, children });
      }
      remaining = remaining.substring(boldMatch[0].length);
      continue;
    }

    // Check for //italic//
    const italicMatch = remaining.match(/^\/\/(.*?)\/\//);
    if (italicMatch) {
      if (italicMatch[1]) {
        const innerContent = italicMatch[1];
        const children = hasMarkup(innerContent) ? parseMarkup(innerContent) : null;
        segments.push({ type: 'italic', content: innerContent, children });
      }
      remaining = remaining.substring(italicMatch[0].length);
      continue;
    }

    // Check for __underline__
    const underlineMatch = remaining.match(/^__(.*?)__/);
    if (underlineMatch) {
      if (underlineMatch[1]) {
        const innerContent = underlineMatch[1];
        const children = hasMarkup(innerContent) ? parseMarkup(innerContent) : null;
        segments.push({ type: 'underline', content: innerContent, children });
      }
      remaining = remaining.substring(underlineMatch[0].length);
      continue;
    }

    // Check for --small--
    const smallMatch = remaining.match(/^--(.*?)--/);
    if (smallMatch) {
      if (smallMatch[1]) {
        const innerContent = smallMatch[1];
        const children = hasMarkup(innerContent) ? parseMarkup(innerContent) : null;
        segments.push({ type: 'small', content: innerContent, children });
      }
      remaining = remaining.substring(smallMatch[0].length);
      continue;
    }

    // Check for ++big++
    const bigMatch = remaining.match(/^\+\+(.*?)\+\+/);
    if (bigMatch) {
      if (bigMatch[1]) {
        const innerContent = bigMatch[1];
        const children = hasMarkup(innerContent) ? parseMarkup(innerContent) : null;
        segments.push({ type: 'big', content: innerContent, children });
      }
      remaining = remaining.substring(bigMatch[0].length);
      continue;
    }

    // Check for ""mono""
    const monoMatch = remaining.match(/^""(.*?)""/);
    if (monoMatch) {
      if (monoMatch[1]) {
        const innerContent = monoMatch[1];
        const children = hasMarkup(innerContent) ? parseMarkup(innerContent) : null;
        segments.push({ type: 'mono', content: innerContent, children });
      }
      remaining = remaining.substring(monoMatch[0].length);
      continue;
    }

    // Check for ~~strike~~
    const strikeMatch = remaining.match(/^~~(.*?)~~/);
    if (strikeMatch) {
      if (strikeMatch[1]) {
        const innerContent = strikeMatch[1];
        const children = hasMarkup(innerContent) ? parseMarkup(innerContent) : null;
        segments.push({ type: 'strike', content: innerContent, children });
      }
      remaining = remaining.substring(strikeMatch[0].length);
      continue;
    }

    // Check for <color:#hex>text</color> or <color:name>text</color>
    const colorMatch = remaining.match(/^<color:(#[a-fA-F0-9a-zA-Z]+|[a-zA-Z]+)>(.*?)<\/color>/);
    if (colorMatch) {
      const innerContent = colorMatch[2];
      const children = hasMarkup(innerContent) ? parseMarkup(innerContent) : null;
      segments.push({ type: 'color', value: colorMatch[1], content: innerContent, children });
      remaining = remaining.substring(colorMatch[0].length);
      continue;
    }

    // Check for <size:N>text</size>
    const sizeMatch = remaining.match(/^<size:(\d+)>(.*?)<\/size>/);
    if (sizeMatch) {
      const innerContent = sizeMatch[2];
      const children = hasMarkup(innerContent) ? parseMarkup(innerContent) : null;
      segments.push({ type: 'size', value: parseInt(sizeMatch[1], 10), content: innerContent, children });
      remaining = remaining.substring(sizeMatch[0].length);
      continue;
    }

    // Check for <sub>text</sub>
    const subMatch = remaining.match(/^<sub>(.*?)<\/sub>/);
    if (subMatch) {
      const innerContent = subMatch[1];
      const children = hasMarkup(innerContent) ? parseMarkup(innerContent) : null;
      segments.push({ type: 'sub', content: innerContent, children });
      remaining = remaining.substring(subMatch[0].length);
      continue;
    }

    // Check for <sup>text</sup>
    const supMatch = remaining.match(/^<sup>(.*?)<\/sup>/);
    if (supMatch) {
      const innerContent = supMatch[1];
      const children = hasMarkup(innerContent) ? parseMarkup(innerContent) : null;
      segments.push({ type: 'sup', content: innerContent, children });
      remaining = remaining.substring(supMatch[0].length);
      continue;
    }

    // Check for <link:URL>text</link>
    const linkMatch = remaining.match(/^<link:([^>]+)>(.*?)<\/link>/);
    if (linkMatch) {
      const innerContent = linkMatch[2];
      const children = hasMarkup(innerContent) ? parseMarkup(innerContent) : null;
      segments.push({ type: 'link', value: linkMatch[1], content: innerContent, children });
      remaining = remaining.substring(linkMatch[0].length);
      continue;
    }

    // Check for <stroke:N:#color>text</stroke> or <stroke:N:name>text</stroke>
    const strokeMatch = remaining.match(/^<stroke:(\d+):(#[a-fA-F0-9a-zA-Z]+|[a-zA-Z]+)>(.*?)<\/stroke>/);
    if (strokeMatch) {
      const innerContent = strokeMatch[3];
      const children = hasMarkup(innerContent) ? parseMarkup(innerContent) : null;
      segments.push({
        type: 'stroke',
        strokeWidth: parseInt(strokeMatch[1], 10),
        strokeColor: strokeMatch[2],
        content: innerContent,
        children
      });
      remaining = remaining.substring(strokeMatch[0].length);
      continue;
    }

    // Check for <background:#color>text</background> or <background:name>text</background>
    const bgMatch = remaining.match(/^<background:(#[a-fA-F0-9a-zA-Z]+|[a-zA-Z]+)>(.*?)<\/background>/);
    if (bgMatch) {
      const innerContent = bgMatch[2];
      const children = hasMarkup(innerContent) ? parseMarkup(innerContent) : null;
      segments.push({ type: 'background', value: bgMatch[1], content: innerContent, children });
      remaining = remaining.substring(bgMatch[0].length);
      continue;
    }

    // Check for <align:left|center|right>text</align>
    const alignMatch = remaining.match(/^<align:(left|center|right)>(.*?)<\/align>/);
    if (alignMatch) {
      const innerContent = alignMatch[2];
      const children = hasMarkup(innerContent) ? parseMarkup(innerContent) : null;
      segments.push({ type: 'align', value: alignMatch[1], content: innerContent, children });
      remaining = remaining.substring(alignMatch[0].length);
      continue;
    }

    // Check for <position:left|center|right>text</position>
    const positionMatch = remaining.match(/^<position:(left|center|right)>(.*?)<\/position>/);
    if (positionMatch) {
      const innerContent = positionMatch[2];
      const children = hasMarkup(innerContent) ? parseMarkup(innerContent) : null;
      segments.push({ type: 'position', value: positionMatch[1], content: innerContent, children });
      remaining = remaining.substring(positionMatch[0].length);
      continue;
    }

    // Plain text until next markup (including escape sequences)
    const nextMarkup = remaining.search(/(\*\*|\/\/|__|--|\+\+|""|~~|\\n|\\[*\/\-+~\\"<>]|<color:|<size:|<sub>|<sup>|<link:|<stroke:|<background:|<align:|<position:)/);
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
      case 'align':
        return `<align:${seg.value}>${seg.content || ''}</align>`;
      case 'position':
        return `<position:${seg.value}>${seg.content || ''}</position>`;
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
  // Check for all supported markup patterns (including escape sequences)
  return /(\*\*.*?\*\*|\/\/.*?\/\/|__.*?__|--.*?--|\+\+.*?\+\+|"".*?""|~~.*?~~|<color:|<size:|<sub>|<sup>|<link:|<stroke:|<background:|<align:|<position:|\\n|\\[*\/\-+~\\"<>])/.test(text);
}
