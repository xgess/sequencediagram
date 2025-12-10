// Text -> AST parser
// See DESIGN.md for parser strategy and AST structure

import { generateId } from './nodes.js';

/**
 * Parse sequence diagram text into AST
 * @param {string} text - Source text
 * @returns {Array} AST nodes array
 */
export function parse(text) {
  const lines = text.split('\n');
  const ast = [];
  let i = 0;

  while (i < lines.length) {
    const result = parseAt(lines, i, ast);
    i = result.nextLine;
  }

  return ast;
}

/**
 * Parse starting at a given line index
 * @param {string[]} lines - All lines
 * @param {number} lineIndex - Current line index (0-indexed)
 * @param {Array} ast - AST array to append nodes to
 * @returns {{nextLine: number}} Next line to process
 */
function parseAt(lines, lineIndex, ast) {
  const line = lines[lineIndex];
  const lineNumber = lineIndex + 1; // 1-indexed for source tracking
  const trimmed = line.trim();

  // Parse blank lines as blankline nodes
  if (!trimmed) {
    ast.push({
      id: generateId('blankline'),
      type: 'blankline',
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    });
    return { nextLine: lineIndex + 1 };
  }

  // Try parsing as comment (// or #)
  const comment = parseComment(trimmed, lineNumber);
  if (comment) {
    ast.push(comment);
    return { nextLine: lineIndex + 1 };
  }

  // Try parsing as directive (title, etc.)
  const directive = parseDirective(trimmed, lineNumber);
  if (directive) {
    ast.push(directive);
    return { nextLine: lineIndex + 1 };
  }

  // Try parsing as fragment (alt, loop, etc.)
  if (isFragmentStart(trimmed)) {
    const result = parseFragment(lines, lineIndex, ast);
    return { nextLine: result.endLine + 1 };
  }

  // Try parsing as participant
  const participant = parseParticipant(trimmed, lineNumber);
  if (participant) {
    ast.push(participant);
    return { nextLine: lineIndex + 1 };
  }

  // Try parsing as message
  const message = parseMessage(trimmed, lineNumber);
  if (message) {
    ast.push(message);
    return { nextLine: lineIndex + 1 };
  }

  // Unrecognized line - create error node
  ast.push({
    id: generateId('error'),
    type: 'error',
    text: trimmed,
    message: `Unrecognized syntax: "${trimmed}"`,
    sourceLineStart: lineNumber,
    sourceLineEnd: lineNumber
  });
  return { nextLine: lineIndex + 1 };
}

/**
 * Parse a directive line
 * Syntax: title Text
 * @param {string} line - Trimmed source line
 * @param {number} lineNumber - 1-indexed line number
 * @returns {Object|null} Directive AST node or null
 */
function parseDirective(line, lineNumber) {
  // Match title directive
  const titleMatch = line.match(/^title\s+(.+)$/);
  if (titleMatch) {
    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: 'title',
      value: titleMatch[1],
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }
  return null;
}

/**
 * Parse a comment line
 * Syntax: // comment or # comment
 * @param {string} line - Trimmed source line
 * @param {number} lineNumber - 1-indexed line number
 * @returns {Object|null} Comment AST node or null
 */
function parseComment(line, lineNumber) {
  if (line.startsWith('//') || line.startsWith('#')) {
    return {
      id: generateId('comment'),
      type: 'comment',
      text: line,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }
  return null;
}

/**
 * Check if a line starts a fragment
 * @param {string} trimmed - Trimmed line
 * @returns {boolean}
 */
function isFragmentStart(trimmed) {
  return /^(alt|loop|opt|par|break|critical|ref|seq|strict|neg|ignore|consider|assert|region|group)\b/.test(trimmed);
}

/**
 * Parse a fragment (alt, loop, etc.)
 * @param {string[]} lines - All lines
 * @param {number} startLine - Starting line index (0-indexed)
 * @param {Array} ast - AST array to append child nodes to
 * @returns {{endLine: number}} Ending line index
 */
function parseFragment(lines, startLine, ast) {
  const firstLine = lines[startLine].trim();
  // Match fragment type, optional styling, and optional condition
  // Syntax: fragmentType[#operatorColor] [#fill] [#border;width;style] [condition]
  const match = firstLine.match(/^(alt|loop|opt|par|break|critical|ref|seq|strict|neg|ignore|consider|assert|region|group)(#[^\s#]+)?(.*)$/);

  const fragmentType = match[1];
  const { style, condition } = parseFragmentStyleAndCondition(match[2] || '', match[3] || '');

  const fragmentId = generateId('fragment');
  const entries = [];
  const elseClauses = [];
  let currentEntries = entries;
  let currentElseCondition = null;

  let i = startLine + 1;
  const fragmentStartLine = startLine + 1; // 1-indexed

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === 'end') {
      // Fragment complete
      const fragmentNode = {
        id: fragmentId,
        type: 'fragment',
        fragmentType,
        condition,
        entries,
        elseClauses,
        style,
        sourceLineStart: fragmentStartLine,
        sourceLineEnd: i + 1 // 1-indexed
      };
      ast.push(fragmentNode);
      return { endLine: i };
    }

    if (line.startsWith('else')) {
      // Start a new else clause
      // Syntax: else [#fill] [#border;width;style] [condition]
      const elseMatch = line.match(/^else\s*(.*)/);
      const elseRest = elseMatch ? elseMatch[1] : '';
      const { style: elseStyle, condition: elseCondition } = parseElseStyleAndCondition(elseRest);

      const newElseClause = {
        condition: elseCondition,
        entries: [],
        style: elseStyle
      };
      elseClauses.push(newElseClause);
      currentEntries = newElseClause.entries;
      i++;
      continue;
    }

    // Parse blank lines inside fragment
    if (!line) {
      const blankline = {
        id: generateId('blankline'),
        type: 'blankline',
        sourceLineStart: i + 1,
        sourceLineEnd: i + 1
      };
      ast.push(blankline);
      currentEntries.push(blankline.id);
      i++;
      continue;
    }

    // Try parsing as comment (inside fragment)
    const comment = parseComment(line, i + 1);
    if (comment) {
      ast.push(comment);
      currentEntries.push(comment.id);
      i++;
      continue;
    }

    // Check for nested fragment
    if (isFragmentStart(line)) {
      const result = parseFragment(lines, i, ast);
      // The nested fragment was added to ast, get its ID
      const nestedFragment = ast[ast.length - 1];
      currentEntries.push(nestedFragment.id);
      i = result.endLine + 1;
      continue;
    }

    // Try parsing as participant (inside fragment)
    const participant = parseParticipant(line, i + 1);
    if (participant) {
      ast.push(participant);
      currentEntries.push(participant.id);
      i++;
      continue;
    }

    // Try parsing as message
    const message = parseMessage(line, i + 1);
    if (message) {
      ast.push(message);
      currentEntries.push(message.id);
      i++;
      continue;
    }

    // Unrecognized line inside fragment - create error node
    const errorNode = {
      id: generateId('error'),
      type: 'error',
      text: line,
      message: `Unrecognized syntax: "${line}"`,
      sourceLineStart: i + 1,
      sourceLineEnd: i + 1
    };
    ast.push(errorNode);
    currentEntries.push(errorNode.id);
    i++;
  }

  // Missing 'end' - create fragment anyway with what we have and add error
  const errorNode = {
    id: generateId('error'),
    type: 'error',
    text: '',
    message: `Unclosed fragment "${fragmentType}" starting at line ${fragmentStartLine}`,
    sourceLineStart: fragmentStartLine,
    sourceLineEnd: i
  };
  ast.push(errorNode);

  const fragmentNode = {
    id: fragmentId,
    type: 'fragment',
    fragmentType,
    condition,
    entries,
    elseClauses,
    style,
    sourceLineStart: fragmentStartLine,
    sourceLineEnd: i // End of file
  };
  ast.push(fragmentNode);
  return { endLine: i - 1 };
}

/**
 * Parse a participant declaration
 * Syntax: participant Name [#fill] [#border;width;style]
 *         participant "Display Name" as Alias [styling]
 * @param {string} line - Trimmed source line
 * @param {number} lineNumber - 1-indexed line number
 * @returns {Object|null} Participant AST node or null
 */
function parseParticipant(line, lineNumber) {
  // Try quoted display name with alias first: participant "Display Name" as Alias [styling]
  const quotedMatch = line.match(/^(participant|actor|database)\s+"((?:[^"\\]|\\.)*)"\s+as\s+([^\s#]+)(.*)$/);
  if (quotedMatch) {
    const [, participantType, displayNameRaw, alias, styleStr] = quotedMatch;
    const displayName = unescapeString(displayNameRaw);
    const style = parseParticipantStyle(styleStr.trim());

    return {
      id: generateId('participant'),
      type: 'participant',
      participantType,
      alias,
      displayName,
      style,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Simple syntax: participantType Name [styling]
  // Name can't contain # or whitespace to distinguish from styling
  const match = line.match(/^(participant|actor|database)\s+([^\s#]+)(.*)$/);
  if (!match) {
    return null;
  }

  const [, participantType, name, styleStr] = match;
  const style = parseParticipantStyle(styleStr.trim());

  return {
    id: generateId('participant'),
    type: 'participant',
    participantType,
    alias: name,
    displayName: name,
    style,
    sourceLineStart: lineNumber,
    sourceLineEnd: lineNumber
  };
}

/**
 * Unescape a quoted string (handle \" and \n)
 * @param {string} str - Raw string content
 * @returns {string} Unescaped string
 */
function unescapeString(str) {
  return str
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\\\/g, '\\');
}

/**
 * Parse else clause style and condition from the remaining text
 * Syntax: [#fill] [#border;width;style] [condition]
 * @param {string} rest - Remaining text after "else"
 * @returns {{style: Object|null, condition: string}}
 */
function parseElseStyleAndCondition(rest) {
  const style = {};
  rest = rest.trim();

  // Match fill color (a # followed by non-space, non-# chars, not followed by ;)
  const fillMatch = rest.match(/^(#[^\s#;]+)(?:\s|$)/);
  if (fillMatch) {
    style.fill = fillMatch[1];
    rest = rest.slice(fillMatch[0].length).trim();
  }

  // Match border styling: #color;width;style or #color;width or #color
  // Only if it has a semicolon (to distinguish from fill-only)
  const borderMatch = rest.match(/^(#[^\s;]+)(;(\d+)?(;(solid|dashed))?)?(?:\s|$)/);
  if (borderMatch && borderMatch[0].includes(';')) {
    style.border = borderMatch[1];
    if (borderMatch[3] !== undefined) {
      style.borderWidth = parseInt(borderMatch[3], 10);
    }
    if (borderMatch[5]) {
      style.borderStyle = borderMatch[5];
    }
    rest = rest.slice(borderMatch[0].length).trim();
  }

  const condition = rest;
  return { style: Object.keys(style).length > 0 ? style : null, condition };
}

/**
 * Parse fragment style and condition from the remaining text
 * Syntax: [#operatorColor] [#fill] [#border;width;style] [condition]
 * @param {string} operatorColorStr - Operator color (e.g., "#yellow")
 * @param {string} rest - Remaining text after fragment type
 * @returns {{style: Object, condition: string}}
 */
function parseFragmentStyleAndCondition(operatorColorStr, rest) {
  const style = {};
  rest = rest.trim();

  // Handle operator color (attached to fragment type)
  if (operatorColorStr) {
    style.operatorColor = operatorColorStr;
  }

  // Now parse rest which may contain: [#fill] [#border;width;style] [condition]
  // Match fill color (a # followed by non-space, non-# chars, not followed by ;)
  const fillMatch = rest.match(/^(#[^\s#;]+)(?:\s|$)/);
  if (fillMatch) {
    style.fill = fillMatch[1];
    rest = rest.slice(fillMatch[0].length).trim();
  }

  // Match border styling: #color;width;style or #color;width or #color
  // Only if it has a semicolon (to distinguish from fill-only)
  const borderMatch = rest.match(/^(#[^\s;]+)(;(\d+)?(;(solid|dashed))?)?(?:\s|$)/);
  if (borderMatch && borderMatch[0].includes(';')) {
    // This is border styling (has semicolon)
    style.border = borderMatch[1];
    if (borderMatch[3] !== undefined) {
      style.borderWidth = parseInt(borderMatch[3], 10);
    }
    if (borderMatch[5]) {
      style.borderStyle = borderMatch[5];
    }
    rest = rest.slice(borderMatch[0].length).trim();
  } else if (borderMatch && !fillMatch) {
    // If no fill was matched yet, the first color is fill, check if there's a second one
    // This case is handled above, so we just continue
  }

  // What remains is the condition
  const condition = rest;

  return { style: Object.keys(style).length > 0 ? style : null, condition };
}

/**
 * Parse participant styling string
 * Syntax: #fill #border;width;style or just #fill or ;width etc.
 * @param {string} styleStr - Style string (e.g., "#lightblue #green;3;dashed")
 * @returns {Object} Style object
 */
function parseParticipantStyle(styleStr) {
  const style = {};

  if (!styleStr) {
    return style;
  }

  // Match fill color: #color (but not followed by border params)
  // Match border: #color;width;style or just ;width or ;width;style
  const fillMatch = styleStr.match(/^(#[^\s#;]+)/);
  if (fillMatch) {
    style.fill = fillMatch[1];
    styleStr = styleStr.slice(fillMatch[0].length).trim();
  }

  // Match border styling: #color;width;style or ;width;style or ;width
  const borderMatch = styleStr.match(/^(#[^\s;]+)?;?(\d+)?;?(solid|dashed)?/);
  if (borderMatch) {
    const [, borderColor, borderWidth, borderStyle] = borderMatch;
    if (borderColor) {
      style.border = borderColor;
    }
    if (borderWidth !== undefined) {
      style.borderWidth = parseInt(borderWidth, 10);
    }
    if (borderStyle) {
      style.borderStyle = borderStyle;
    }
  }

  return style;
}

/**
 * Parse a message between participants
 * Syntax: From->To:Label or From->>To:Label etc.
 * @param {string} line - Trimmed source line
 * @param {number} lineNumber - 1-indexed line number
 * @returns {Object|null} Message AST node or null
 */
function parseMessage(line, lineNumber) {
  // Match: From ARROW To : Label
  // Arrow types: -> ->> --> -->>
  // Use [^\s\-] for 'from' to avoid consuming dashes that are part of the arrow
  const match = line.match(/^([^\s\-]+)(-->>|-->|->>|->)([^\s:]+):(.*)$/);
  if (!match) {
    return null;
  }

  const [, from, arrowType, to, label] = match;

  return {
    id: generateId('message'),
    type: 'message',
    from,
    to,
    arrowType,
    label: label.trim(),
    style: null,
    sourceLineStart: lineNumber,
    sourceLineEnd: lineNumber
  };
}
