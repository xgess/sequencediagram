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

  // Try parsing as participant group
  if (isParticipantGroupStart(trimmed)) {
    const result = parseParticipantGroup(lines, lineIndex, ast);
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

  // Match linear directive: linear or linear off
  const linearMatch = line.match(/^linear(\s+off)?$/);
  if (linearMatch) {
    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: 'linear',
      value: linearMatch[1] ? false : true,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Match parallel directive: parallel or parallel off
  const parallelMatch = line.match(/^parallel(\s+off)?$/);
  if (parallelMatch) {
    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: 'parallel',
      value: parallelMatch[1] ? false : true,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Match bottomparticipants directive
  if (line === 'bottomparticipants') {
    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: 'bottomparticipants',
      value: true,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Match fontfamily directive: fontfamily sans-serif or fontfamily "Custom Font"
  const fontfamilyMatch = line.match(/^fontfamily\s+(?:"([^"]+)"|(\S+))$/);
  if (fontfamilyMatch) {
    const value = fontfamilyMatch[1] || fontfamilyMatch[2];
    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: 'fontfamily',
      value,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Match destroy directives: destroy C, destroyafter C, destroysilent C
  const destroyMatch = line.match(/^(destroy|destroyafter|destroysilent)\s+(\S+)$/);
  if (destroyMatch) {
    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: destroyMatch[1],
      participant: destroyMatch[2],
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Match activate directive: activate B or activate B #lightblue
  const activateMatch = line.match(/^activate\s+(\S+)(?:\s+(#[^\s]+))?$/);
  if (activateMatch) {
    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: 'activate',
      participant: activateMatch[1],
      color: activateMatch[2] || null,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Match deactivate directives: deactivate B, deactivateafter B
  const deactivateMatch = line.match(/^(deactivate|deactivateafter)\s+(\S+)$/);
  if (deactivateMatch) {
    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: deactivateMatch[1],
      participant: deactivateMatch[2],
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Match autoactivation directive: autoactivation on/off
  const autoactivationMatch = line.match(/^autoactivation\s+(on|off)$/);
  if (autoactivationMatch) {
    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: 'autoactivation',
      value: autoactivationMatch[1] === 'on',
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Match activecolor directive: activecolor #color or activecolor Participant #color
  const activecolorMatch = line.match(/^activecolor(?:\s+([^\s#]+))?\s+(#[^\s]+)$/);
  if (activecolorMatch) {
    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: 'activecolor',
      participant: activecolorMatch[1] || null,
      color: activecolorMatch[2],
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Match frame directive: frame Title or frame#operatorColor #fill #border;width;style Title
  const frameMatch = line.match(/^frame(#[^\s#]+)?(?:\s+(#[^\s;]+))?(?:\s+(#[^\s;]+)(?:;(\d+))?(?:;(solid|dashed|dotted))?)?(?:\s+(.+))?$/);
  if (frameMatch) {
    const style = {};
    if (frameMatch[1]) style.operatorColor = frameMatch[1];
    if (frameMatch[2]) style.fill = frameMatch[2];
    if (frameMatch[3]) style.border = frameMatch[3];
    if (frameMatch[4]) style.borderWidth = parseInt(frameMatch[4], 10);
    if (frameMatch[5]) style.borderStyle = frameMatch[5];

    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: 'frame',
      value: frameMatch[6] || '',
      style: Object.keys(style).length > 0 ? style : null,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Match style definition: style myName #fill #border;width;style,textMarkup
  // Syntax: style name [#fill] [#border[;width][;style]][,textMarkup]
  const styleMatch = line.match(/^style\s+(\S+)\s+(.+)$/);
  if (styleMatch) {
    const styleName = styleMatch[1];
    const styleSpec = styleMatch[2];
    const parsedStyle = parseNamedStyleSpec(styleSpec);

    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: 'style',
      name: styleName,
      style: parsedStyle,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Match type-based style directives
  // Syntax: typestyle #fill #border;width;style,textMarkup
  // Types: participantstyle, notestyle, messagestyle, dividerstyle, boxstyle,
  //        aboxstyle, rboxstyle, aboxrightstyle, aboxleftstyle
  const typeStyleMatch = line.match(/^(participantstyle|notestyle|messagestyle|dividerstyle|boxstyle|aboxstyle|rboxstyle|aboxrightstyle|aboxleftstyle)(?:\s+(.*))?$/);
  if (typeStyleMatch) {
    const typeStyleName = typeStyleMatch[1];
    const styleSpec = typeStyleMatch[2] || '';
    const parsedStyle = parseTypeStyleSpec(styleSpec);

    return {
      id: generateId('directive'),
      type: 'directive',
      directiveType: typeStyleName,
      style: parsedStyle,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  return null;
}

/**
 * Parse named style specification
 * Syntax: #fill #border;width;style,textMarkup
 * @param {string} spec - Style specification string
 * @returns {Object} Parsed style object
 */
function parseNamedStyleSpec(spec) {
  const style = {};

  // Split by comma to separate shape styling from text markup
  const commaIndex = spec.indexOf(',');
  let shapePart = spec;
  let textMarkup = null;

  if (commaIndex > -1) {
    shapePart = spec.substring(0, commaIndex);
    textMarkup = spec.substring(commaIndex + 1);
    if (textMarkup) {
      style.textMarkup = textMarkup;
    }
  }

  // Parse shape styling: #fill #border;width;style
  const parts = shapePart.trim().split(/\s+/);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part.startsWith('#')) continue;

    // Check if this part has semicolons (border styling)
    if (part.includes(';') || (i > 0 && parts[i - 1] && !parts[i - 1].includes(';'))) {
      // This is likely border styling: #color;width;style
      const borderMatch = part.match(/^(#[^\s;]+)(?:;(\d+))?(?:;(solid|dashed|dotted))?$/);
      if (borderMatch) {
        if (borderMatch[1]) style.border = borderMatch[1];
        if (borderMatch[2]) style.borderWidth = parseInt(borderMatch[2], 10);
        if (borderMatch[3]) style.borderStyle = borderMatch[3];
      }
    } else if (!style.fill) {
      // First standalone color is fill
      style.fill = part;
    } else if (!style.border) {
      // Second standalone color is border (without width/style)
      style.border = part;
    }
  }

  return style;
}

/**
 * Parse type-based style specification
 * Can be just text markup (e.g., "<color:#blue>//**") or shape+text styling
 * Syntax: [#fill] [#border;width;style],textMarkup  OR  just textMarkup
 * @param {string} spec - Style specification string
 * @returns {Object} Parsed style object
 */
function parseTypeStyleSpec(spec) {
  const style = {};

  if (!spec || spec.trim() === '') {
    return style;
  }

  // Check if starts with # (shape styling) or < (text markup) or just text markup chars
  const trimmed = spec.trim();

  // Split by comma to separate shape styling from text markup
  const commaIndex = trimmed.indexOf(',');

  if (commaIndex > -1) {
    // Has comma - split shape part and text markup
    const shapePart = trimmed.substring(0, commaIndex);
    const textMarkup = trimmed.substring(commaIndex + 1);
    if (textMarkup) {
      style.textMarkup = textMarkup;
    }

    // Parse shape part if it exists and starts with # or ;
    if (shapePart.trim()) {
      parseShapeStyling(shapePart.trim(), style);
    }
  } else if (trimmed.startsWith('#')) {
    // No comma, but starts with # - this is shape-only styling
    parseShapeStyling(trimmed, style);
  } else {
    // No comma and no #, treat entire string as text markup
    style.textMarkup = trimmed;
  }

  return style;
}

/**
 * Parse shape styling portion of a type style
 * @param {string} shapePart - Shape styling string
 * @param {Object} style - Style object to populate
 */
function parseShapeStyling(shapePart, style) {
  // Handle formats like:
  // #green - fill only
  // #green #red - fill and border
  // #green #red;3;dashed - fill and border with width/style
  // #lightblue;2 - color with width (treated as message color+width)
  // ;3 - just width

  const parts = shapePart.split(/\s+/);

  for (const part of parts) {
    if (part.startsWith('#')) {
      // Color with optional width/style
      const colorMatch = part.match(/^(#[^\s;]+)(?:;(\d+))?(?:;(solid|dashed|dotted))?$/);
      if (colorMatch) {
        if (!style.fill) {
          style.fill = colorMatch[1];
          if (colorMatch[2]) style.borderWidth = parseInt(colorMatch[2], 10);
          if (colorMatch[3]) style.borderStyle = colorMatch[3];
        } else if (!style.border) {
          style.border = colorMatch[1];
          if (colorMatch[2]) style.borderWidth = parseInt(colorMatch[2], 10);
          if (colorMatch[3]) style.borderStyle = colorMatch[3];
        }
      }
    } else if (part.startsWith(';')) {
      // Just width/style without color: ;3 or ;3;dashed
      const widthMatch = part.match(/^;(\d+)(?:;(solid|dashed|dotted))?$/);
      if (widthMatch) {
        if (widthMatch[1]) style.borderWidth = parseInt(widthMatch[1], 10);
        if (widthMatch[2]) style.borderStyle = widthMatch[2];
      }
    }
  }
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
  return /^(alt|loop|opt|par|break|critical|ref|seq|strict|neg|ignore|consider|assert|region|group|expandable[+\-])(\s|$|#)/.test(trimmed);
}

/**
 * Check if a line starts a participant group
 * @param {string} trimmed - Trimmed line
 * @returns {boolean}
 */
function isParticipantGroupStart(trimmed) {
  return /^participantgroup\b/.test(trimmed);
}

/**
 * Parse a participant group
 * Syntax: participantgroup #color Label
 * @param {string[]} lines - All lines
 * @param {number} startLine - Starting line index (0-indexed)
 * @param {Array} ast - AST array to append child nodes to
 * @returns {{endLine: number}} Ending line index
 */
function parseParticipantGroup(lines, startLine, ast) {
  const firstLine = lines[startLine].trim();
  // Match: participantgroup [#color] [Label]
  const match = firstLine.match(/^participantgroup\s*(#[^\s]+)?\s*(.*)$/);

  const color = match ? match[1] || null : null;
  const label = match ? match[2] || '' : '';

  const groupId = generateId('participantgroup');
  const participants = []; // List of participant aliases in this group
  const nestedGroups = []; // List of nested group IDs

  let i = startLine + 1;
  const groupStartLine = startLine + 1; // 1-indexed

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === 'end') {
      // Group complete
      const groupNode = {
        id: groupId,
        type: 'participantgroup',
        color,
        label,
        participants,
        nestedGroups,
        sourceLineStart: groupStartLine,
        sourceLineEnd: i + 1 // 1-indexed
      };
      ast.push(groupNode);
      return { endLine: i };
    }

    // Skip blank lines
    if (!line) {
      i++;
      continue;
    }

    // Skip comments
    if (line.startsWith('//') || line.startsWith('#')) {
      const comment = parseComment(line, i + 1);
      if (comment) {
        ast.push(comment);
      }
      i++;
      continue;
    }

    // Check for nested participant group
    if (isParticipantGroupStart(line)) {
      const result = parseParticipantGroup(lines, i, ast);
      const nestedGroup = ast[ast.length - 1];
      nestedGroups.push(nestedGroup.id);
      i = result.endLine + 1;
      continue;
    }

    // Try parsing as participant
    const participant = parseParticipant(line, i + 1);
    if (participant) {
      ast.push(participant);
      participants.push(participant.alias);
      i++;
      continue;
    }

    // Unknown line inside participant group - skip it
    i++;
  }

  // If we reach here, the group was never closed - create it anyway
  const groupNode = {
    id: groupId,
    type: 'participantgroup',
    color,
    label,
    participants,
    nestedGroups,
    sourceLineStart: groupStartLine,
    sourceLineEnd: lines.length
  };
  ast.push(groupNode);
  return { endLine: lines.length - 1 };
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
  const match = firstLine.match(/^(alt|loop|opt|par|break|critical|ref|seq|strict|neg|ignore|consider|assert|region|group|expandable[+\-])(#[^\s#]+)?(.*)$/);

  let fragmentType = match[1];

  // Handle expandable+ and expandable- with collapsed state
  let collapsed = false;
  if (fragmentType === 'expandable+') {
    fragmentType = 'expandable';
    collapsed = false;
  } else if (fragmentType === 'expandable-') {
    fragmentType = 'expandable';
    collapsed = true;
  }
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
      // Add collapsed property only for expandable fragments
      if (fragmentType === 'expandable') {
        fragmentNode.collapsed = collapsed;
      }
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
  // Add collapsed property only for expandable fragments
  if (fragmentType === 'expandable') {
    fragmentNode.collapsed = collapsed;
  }
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
  // Try icon participant types with quoted display name:
  // fontawesome7solid f48e "Display Name" as Alias [styling]
  // mdi F01C9 "Display Name" as Alias [styling]
  const iconQuotedMatch = line.match(/^(fontawesome7solid|fontawesome7regular|fontawesome7brands|mdi)\s+([a-fA-F0-9]+)\s+"((?:[^"\\]|\\.)*)"\s+as\s+([^\s#]+)(.*)$/);
  if (iconQuotedMatch) {
    const [, participantType, iconCode, displayNameRaw, alias, styleStr] = iconQuotedMatch;
    const displayName = unescapeString(displayNameRaw);
    const style = parseParticipantStyle(styleStr.trim());

    return {
      id: generateId('participant'),
      type: 'participant',
      participantType,
      iconCode,
      alias,
      displayName,
      style,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Try icon participant simple syntax:
  // fontawesome7solid f48e Name [styling]
  // mdi F01C9 Name [styling]
  const iconMatch = line.match(/^(fontawesome7solid|fontawesome7regular|fontawesome7brands|mdi)\s+([a-fA-F0-9]+)\s+([^\s#]+)(.*)$/);
  if (iconMatch) {
    const [, participantType, iconCode, name, styleStr] = iconMatch;
    const style = parseParticipantStyle(styleStr.trim());

    return {
      id: generateId('participant'),
      type: 'participant',
      participantType,
      iconCode,
      alias: name,
      displayName: name,
      style,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

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
  // Also supports: A-[style]->B, A-[style]->>B, A<-[style]-B (reversed)
  // The bracket style goes between parts of the arrow
  // Also handles create syntax with * prefix: A-[#red]>*B:<<create>>
  const styledMatch = line.match(/^(\[|[^\s\-<\[]+)(<)?(-{1,2})\[([^\]]+)\](-{0,2})(>>?|>|x)?(\(\d+\))?(\*)?(\]|[^\s:\]]+):(.*)$/);
  if (styledMatch) {
    const [, from, startArrow, startDashes, styleStr, endDashes, arrowHead, delayStr, createMarker, to, label] = styledMatch;
    const delay = delayStr ? parseInt(delayStr.slice(1, -1), 10) : null;

    // Reconstruct arrow type from parts
    // startArrow: < or undefined (for reversed arrows)
    // startDashes: - or --
    // endDashes: - or -- or empty (extra dash before head)
    // arrowHead: > or >> or x or undefined
    let arrowType;
    if (startArrow === '<') {
      // Reversed arrow: A<-[style]-B becomes <-
      arrowType = '<' + startDashes;
    } else {
      // Forward arrow: A-[style]->B becomes ->
      // The dashes are startDashes, and endDashes is what's after the bracket
      // If endDashes has -, we're looking at something like -[style]->
      // where startDashes=- and endDashes=-
      // We want -> not -->
      // Actually the regex captures: A(-)(stuff)(-)> so startDashes=-, endDashes=-
      // The intended arrow is -> not -->
      // So we should use startDashes if endDashes is empty, or just -(head)
      arrowType = startDashes + (arrowHead || '>');
    }

    const isCreate = createMarker === '*' || label.trim().includes('<<create>>');

    return {
      id: generateId('message'),
      type: 'message',
      from,
      to,
      arrowType,
      delay,
      label: label.trim(),
      style: parseMessageStyle(styleStr),
      isCreate: isCreate || null,
      sourceLineStart: lineNumber,
      sourceLineEnd: lineNumber
    };
  }

  // Try boundary/regular message: [->A or A->]
  // Also handles create syntax: A->*B:<<create>> (with * prefix on target)
  const boundaryMatch = line.match(/^(\[|[^\s\-<\[]+)(<-->>|<->>|<-->|<->|<--|<-|-->>|-->|->>|->|--x|-x)(\(\d+\))?(\*)?(\]|[^\s:\]]+):(.*)$/);
  if (boundaryMatch) {
    const [, from, arrowType, delayStr, createMarker, to, label] = boundaryMatch;
    const delay = delayStr ? parseInt(delayStr.slice(1, -1), 10) : null;
    const isCreate = createMarker === '*' || label.trim().includes('<<create>>');

    return {
      id: generateId('message'),
      type: 'message',
      from,
      to,
      arrowType,
      delay,
      label: label.trim(),
      style: null,
      isCreate: isCreate || null,
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
