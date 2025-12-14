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

  // Try parsing as divider (==text==)
  const divider = parseDivider(trimmed, lineNumber);
  if (divider) {
    ast.push(divider);
    return { nextLine: lineIndex + 1 };
  }

  // Try parsing as note/box/abox/rbox/ref/state
  const note = parseNote(trimmed, lineNumber);
  if (note) {
    ast.push(note);
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
 * Syntax: title Text, entryspacing N, autonumber N, autonumber off
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

  // Match entryspacing directive
  const entryspacingMatch = line.match(/^entryspacing\s+([\d.]+)$/);
  if (entryspacingMatch) {
    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: 'entryspacing',
      value: parseFloat(entryspacingMatch[1]),
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Match autonumber directive: autonumber N or autonumber off
  const autonumberMatch = line.match(/^autonumber\s+(off|\d+)$/);
  if (autonumberMatch) {
    const value = autonumberMatch[1] === 'off' ? null : parseInt(autonumberMatch[1], 10);
    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: 'autonumber',
      value,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Match space directive: space, space N, space -N
  const spaceMatch = line.match(/^space(\s+(-?\d+))?$/);
  if (spaceMatch) {
    const value = spaceMatch[2] !== undefined ? parseInt(spaceMatch[2], 10) : 1;
    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: 'space',
      value,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Match participantspacing directive
  const participantSpacingMatch = line.match(/^participantspacing\s+(\d+|equal)$/);
  if (participantSpacingMatch) {
    const value = participantSpacingMatch[1] === 'equal' ? 'equal' : parseInt(participantSpacingMatch[1], 10);
    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: 'participantspacing',
      value,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Match lifelinestyle directive
  // Syntax: lifelinestyle #color;width;style (global) OR lifelinestyle Participant #color;width;style (per-participant)
  const lifelinestyleMatch = line.match(/^lifelinestyle(?:\s+([^\s#][^\s]*))?(?:\s+)?(#[^\s;]+)?(?:;(\d+))?(?:;(solid|dashed|dotted))?$/);
  if (lifelinestyleMatch) {
    const participant = lifelinestyleMatch[1] || null;
    const color = lifelinestyleMatch[2] || null;
    const width = lifelinestyleMatch[3] ? parseInt(lifelinestyleMatch[3], 10) : null;
    const lineStyle = lifelinestyleMatch[4] || null;
    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: 'lifelinestyle',
      participant,
      style: {
        color,
        width,
        lineStyle
      },
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
  const quotedMatch = line.match(/^(participant|rparticipant|actor|database|boundary|control|entity)\s+"((?:[^"\\]|\\.)*)"\s+as\s+([^\s#]+)(.*)$/);
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
  const match = line.match(/^(participant|rparticipant|actor|database|boundary|control|entity)\s+([^\s#]+)(.*)$/);
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
 * Arrow types: -> ->> --> -->> <- <->> <-- <-->> <-> <->> -x --x
 * Delay syntax: From->(N)To:Label where N is delay units
 * Boundary syntax: [->A, A->], [<-A, A<-] for edge messages
 * Styling syntax: A-[#color;width]>B or A-[##styleName]>B
 * @param {string} line - Trimmed source line
 * @param {number} lineNumber - 1-indexed line number
 * @returns {Object|null} Message AST node or null
 */
function parseMessage(line, lineNumber) {
  // Try styled message first: A-[#color;width]>B or A-[##style]>B
  // The bracket style goes between the dash(es) and the arrow head
  const styledMatch = line.match(/^(\[|[^\s\-<\[]+)(-{1,2})\[([^\]]+)\](>>?|x)(\(\d+\))?(\]|[^\s:\]]+):(.*)$/);
  if (styledMatch) {
    const [, from, dashes, styleStr, arrowHead, delayStr, to, label] = styledMatch;
    const delay = delayStr ? parseInt(delayStr.slice(1, -1), 10) : null;
    const arrowType = dashes + '>' + (arrowHead === '>>' ? '>' : arrowHead === 'x' ? '' : '');
    // Reconstruct proper arrow: - + > or >> or x
    const actualArrow = dashes + (arrowHead === 'x' ? 'x' : arrowHead);

    return {
      id: generateId('message'),
      type: 'message',
      from,
      to,
      arrowType: actualArrow,
      delay,
      label: label.trim(),
      style: parseMessageStyle(styleStr),
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Try boundary/regular message: [->A or A->]
  const boundaryMatch = line.match(/^(\[|[^\s\-<\[]+)(<-->>|<->>|<-->|<->|<--|<-|-->>|-->|->>|->|--x|-x)(\(\d+\))?(\]|[^\s:\]]+):(.*)$/);
  if (boundaryMatch) {
    const [, from, arrowType, delayStr, to, label] = boundaryMatch;
    const delay = delayStr ? parseInt(delayStr.slice(1, -1), 10) : null;

    return {
      id: generateId('message'),
      type: 'message',
      from,
      to,
      arrowType,
      delay,
      label: label.trim(),
      style: null,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  return null;
}

/**
 * Parse message styling string
 * Syntax: #color;width or ##styleName
 * @param {string} styleStr - Style string inside brackets
 * @returns {Object} Style object
 */
function parseMessageStyle(styleStr) {
  const style = {};

  // Check for named style reference: ##styleName
  if (styleStr.startsWith('##')) {
    style.styleName = styleStr.slice(2);
    return style;
  }

  // Parse inline style: #color;width
  const match = styleStr.match(/^(#[^\s;]+)?;?(\d+)?$/);
  if (match) {
    if (match[1]) {
      style.color = match[1];
    }
    if (match[2]) {
      style.width = parseInt(match[2], 10);
    }
  }

  return Object.keys(style).length > 0 ? style : null;
}

/**
 * Parse a divider line
 * Syntax: ==text==
 * @param {string} line - Trimmed source line
 * @param {number} lineNumber - 1-indexed line number
 * @returns {Object|null} Divider AST node or null
 */
function parseDivider(line, lineNumber) {
  // Match ==text== with optional styling
  // Syntax: ==text==[#fill] [#border;width;style]
  const match = line.match(/^==(.+?)==(.*)$/);
  if (!match) {
    return null;
  }

  const [, text, styleStr] = match;
  const style = parseNoteStyle(styleStr.trim());

  return {
    id: generateId('divider'),
    type: 'divider',
    text: text.trim(),
    style,
    sourceLineStart: lineNumber,
    sourceLineEnd: lineNumber
  };
}

/**
 * Parse a note/box/abox/rbox/ref/state line
 * Syntax: noteType position participant(s):text
 * Examples:
 *   note over A:text
 *   note over A,B:text
 *   note left of A:text
 *   note right of A:text
 *   box over A:text
 *   abox over A:text
 *   rbox over A:text
 *   ref over A,B:text
 *   state over A:text
 * @param {string} line - Trimmed source line
 * @param {number} lineNumber - 1-indexed line number
 * @returns {Object|null} Note AST node or null
 */
function parseNote(line, lineNumber) {
  // Match note types with various positions
  // Syntax: (note|box|abox|rbox|ref|state) (over|left of|right of) participant(,participant)?:text
  const match = line.match(/^(note|box|abox|rbox|ref|state)\s+(over|left of|right of)\s+([^:]+):(.*)$/);
  if (!match) {
    return null;
  }

  const [, noteType, position, participantsStr, text] = match;

  // Parse participants (comma-separated, with optional styling)
  // For now, just split by comma and trim
  const participantsPart = participantsStr.trim();

  // Check for styling before participants: note over A,B #fill:text
  // The styling comes after participants but before the colon
  let participants = [];
  let style = null;

  // Split by # to separate participants from styling
  const hashIndex = participantsPart.indexOf('#');
  if (hashIndex >= 0) {
    const participantNames = participantsPart.substring(0, hashIndex).trim();
    const styleStr = participantsPart.substring(hashIndex);
    participants = participantNames.split(',').map(p => p.trim()).filter(p => p);
    style = parseNoteStyle(styleStr);
  } else {
    participants = participantsPart.split(',').map(p => p.trim()).filter(p => p);
  }

  return {
    id: generateId('note'),
    type: 'note',
    noteType,
    position,
    participants,
    text: text.trim(),
    style,
    sourceLineStart: lineNumber,
    sourceLineEnd: lineNumber
  };
}

/**
 * Parse note/divider styling string
 * Syntax: #fill #border;width;style
 * @param {string} styleStr - Style string
 * @returns {Object|null} Style object or null
 */
function parseNoteStyle(styleStr) {
  if (!styleStr) return null;

  const style = {};

  // Match fill color
  const fillMatch = styleStr.match(/(#[^\s#;]+)/);
  if (fillMatch) {
    style.fill = fillMatch[1];
    styleStr = styleStr.slice(fillMatch[0].length).trim();
  }

  // Match border styling: #color;width;style
  const borderMatch = styleStr.match(/(#[^\s;]+)?;?(\d+)?;?(solid|dashed)?/);
  if (borderMatch) {
    const [, borderColor, borderWidth, borderStyle] = borderMatch;
    if (borderColor) style.border = borderColor;
    if (borderWidth) style.borderWidth = parseInt(borderWidth, 10);
    if (borderStyle) style.borderStyle = borderStyle;
  }

  return Object.keys(style).length > 0 ? style : null;
}
