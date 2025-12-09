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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1; // 1-indexed

    const node = parseLine(line, lineNumber);
    if (node) {
      ast.push(node);
    }
  }

  return ast;
}

/**
 * Parse a single line into an AST node
 * @param {string} line - Source line
 * @param {number} lineNumber - 1-indexed line number
 * @returns {Object|null} AST node or null for empty/unrecognized lines
 */
function parseLine(line, lineNumber) {
  const trimmed = line.trim();

  // Skip empty lines for now
  if (!trimmed) {
    return null;
  }

  // Try parsing as participant
  const participant = parseParticipant(trimmed, lineNumber);
  if (participant) {
    return participant;
  }

  // Try parsing as message
  const message = parseMessage(trimmed, lineNumber);
  if (message) {
    return message;
  }

  // Unrecognized line - skip for now
  // TODO(Phase1): Add error node creation in BACKLOG-048
  return null;
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
