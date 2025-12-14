// AST -> Text serializer
// See DESIGN.md for serialization format and escaping rules

/**
 * Serialize AST back to text format
 * @param {Array} ast - AST nodes array
 * @returns {string} Serialized text
 */
export function serialize(ast) {
  // Build node lookup by ID
  const nodeById = new Map();
  for (const node of ast) {
    nodeById.set(node.id, node);
  }

  // Track which entries are inside fragments (so we skip them at top level)
  const fragmentEntries = new Set();
  for (const node of ast) {
    if (node.type === 'fragment') {
      for (const entryId of node.entries) {
        fragmentEntries.add(entryId);
      }
      for (const elseClause of node.elseClauses) {
        for (const entryId of elseClause.entries) {
          fragmentEntries.add(entryId);
        }
      }
    }
  }

  // Track which participants are inside participant groups (so we skip them at top level)
  const groupedParticipants = new Set();
  const collectGroupedParticipants = (groups) => {
    for (const node of groups) {
      if (node.type === 'participantgroup') {
        for (const alias of node.participants) {
          groupedParticipants.add(alias);
        }
        // Collect from nested groups
        for (const nestedId of node.nestedGroups) {
          const nested = nodeById.get(nestedId);
          if (nested) {
            collectGroupedParticipants([nested]);
          }
        }
      }
    }
  };
  collectGroupedParticipants(ast);

  const lines = [];

  for (const node of ast) {
    // Skip entries that are inside fragments (they'll be serialized by the fragment)
    if (fragmentEntries.has(node.id)) continue;

    // Skip participants that are inside groups (they'll be serialized by the group)
    if (node.type === 'participant' && groupedParticipants.has(node.alias)) continue;

    const serialized = serializeNode(node, nodeById, 0);
    if (serialized !== null) {
      lines.push(serialized);
    }
  }

  return lines.join('\n');
}

/**
 * Serialize a single AST node to text
 * @param {Object} node - AST node
 * @param {Map} nodeById - Node lookup map
 * @param {number} indent - Current indentation level
 * @returns {string|null} Serialized line(s) or null
 */
function serializeNode(node, nodeById, indent) {
  switch (node.type) {
    case 'participant':
      return indentStr(indent) + serializeParticipant(node);
    case 'message':
      return indentStr(indent) + serializeMessage(node);
    case 'fragment':
      return serializeFragment(node, nodeById, indent);
    case 'participantgroup':
      return serializeParticipantGroup(node, nodeById, indent);
    case 'note':
      return indentStr(indent) + serializeNote(node);
    case 'divider':
      return indentStr(indent) + serializeDivider(node);
    case 'comment':
      return indentStr(indent) + node.text;
    case 'blankline':
      return '';
    case 'directive':
      return indentStr(indent) + serializeDirective(node);
    case 'error':
      // Serialize error nodes as comments to preserve information
      return indentStr(indent) + `// ERROR: ${node.message} - "${node.text}"`;
    default:
      return null;
  }
}

/**
 * Get indentation string
 * @param {number} level - Indentation level
 * @returns {string} Indentation spaces
 */
function indentStr(level) {
  return '  '.repeat(level);
}

/**
 * Serialize a participant node
 * @param {Object} node - Participant AST node
 * @returns {string} Serialized participant declaration
 */
function serializeParticipant(node) {
  let output = node.participantType;

  // If displayName differs from alias, use quoted syntax
  if (node.displayName !== node.alias) {
    const escapedName = escapeString(node.displayName);
    output += ` "${escapedName}" as ${node.alias}`;
  } else {
    output += ` ${node.alias}`;
  }

  // Add styling if present
  const styleStr = serializeParticipantStyle(node.style);
  if (styleStr) {
    output += ' ' + styleStr;
  }

  return output;
}

/**
 * Escape a string for quoted output (handle " and \n)
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

/**
 * Serialize participant style object to string
 * @param {Object} style - Style object
 * @returns {string} Style string or empty string
 */
function serializeParticipantStyle(style) {
  if (!style || Object.keys(style).length === 0) {
    return '';
  }

  let parts = [];

  // Add fill color
  if (style.fill) {
    parts.push(style.fill);
  }

  // Add border styling
  const hasBorderColor = style.border !== undefined;
  const hasBorderWidth = style.borderWidth !== undefined;
  const hasBorderStyle = style.borderStyle !== undefined;

  if (hasBorderColor || hasBorderWidth || hasBorderStyle) {
    let borderPart = '';

    if (hasBorderColor) {
      borderPart += style.border;
    }

    if (hasBorderWidth || hasBorderStyle) {
      borderPart += ';';
      if (hasBorderWidth) {
        borderPart += style.borderWidth;
      }
      if (hasBorderStyle) {
        borderPart += ';' + style.borderStyle;
      }
    }

    parts.push(borderPart);
  }

  return parts.join(' ');
}

/**
 * Serialize fragment style object to string
 * Note: operator color is attached directly to fragment type (no space)
 * @param {Object} style - Style object
 * @returns {string} Style string or empty string
 */
function serializeFragmentStyle(style) {
  if (!style || Object.keys(style).length === 0) {
    return '';
  }

  let result = '';

  // Operator color is attached directly (no space)
  if (style.operatorColor) {
    result += style.operatorColor;
  }

  // Fill and border are space-separated
  const fillBorder = serializeElseStyle(style);
  if (fillBorder) {
    result += ' ' + fillBorder;
  }

  return result;
}

/**
 * Serialize else clause style object to string
 * @param {Object} style - Style object
 * @returns {string} Style string or empty string
 */
function serializeElseStyle(style) {
  if (!style || Object.keys(style).length === 0) {
    return '';
  }

  let parts = [];

  // Add fill color
  if (style.fill) {
    parts.push(style.fill);
  }

  // Add border styling
  const hasBorderColor = style.border !== undefined;
  const hasBorderWidth = style.borderWidth !== undefined;
  const hasBorderStyle = style.borderStyle !== undefined;

  if (hasBorderColor || hasBorderWidth || hasBorderStyle) {
    let borderPart = '';

    if (hasBorderColor) {
      borderPart += style.border;
    }

    if (hasBorderWidth || hasBorderStyle) {
      borderPart += ';';
      if (hasBorderWidth) {
        borderPart += style.borderWidth;
      }
      if (hasBorderStyle) {
        borderPart += ';' + style.borderStyle;
      }
    }

    parts.push(borderPart);
  }

  return parts.join(' ');
}

/**
 * Serialize a directive node
 * @param {Object} node - Directive AST node
 * @returns {string} Serialized directive
 */
function serializeDirective(node) {
  if (node.directiveType === 'title') {
    return `title ${node.value}`;
  }
  if (node.directiveType === 'entryspacing') {
    return `entryspacing ${node.value}`;
  }
  if (node.directiveType === 'autonumber') {
    return node.value === null ? 'autonumber off' : `autonumber ${node.value}`;
  }
  if (node.directiveType === 'space') {
    return node.value === 1 ? 'space' : `space ${node.value}`;
  }
  if (node.directiveType === 'participantspacing') {
    return `participantspacing ${node.value}`;
  }
  if (node.directiveType === 'lifelinestyle') {
    let output = 'lifelinestyle';
    if (node.participant) {
      output += ' ' + node.participant;
    }
    const style = node.style || {};
    let styleStr = '';
    if (style.color) {
      styleStr += style.color;
    }
    if (style.width !== null && style.width !== undefined) {
      styleStr += ';' + style.width;
    }
    if (style.lineStyle) {
      if (!styleStr.includes(';')) styleStr += ';';
      styleStr += ';' + style.lineStyle;
    }
    if (styleStr) {
      output += ' ' + styleStr;
    }
    return output;
  }
  if (node.directiveType === 'linear') {
    return node.value ? 'linear' : 'linear off';
  }
  if (node.directiveType === 'parallel') {
    return node.value ? 'parallel' : 'parallel off';
  }
  if (node.directiveType === 'bottomparticipants') {
    return 'bottomparticipants';
  }
  if (node.directiveType === 'frame') {
    let output = 'frame';
    const style = node.style || {};
    if (style.operatorColor) {
      output += style.operatorColor;
    }
    if (style.fill) {
      output += ' ' + style.fill;
    }
    if (style.border) {
      let borderPart = style.border;
      if (style.borderWidth !== undefined) {
        borderPart += ';' + style.borderWidth;
      }
      if (style.borderStyle) {
        if (style.borderWidth === undefined) borderPart += ';';
        borderPart += ';' + style.borderStyle;
      }
      output += ' ' + borderPart;
    }
    if (node.value) {
      output += ' ' + node.value;
    }
    return output;
  }
  return '';
}

/**
 * Serialize a message node
 * @param {Object} node - Message AST node
 * @returns {string} Serialized message
 */
function serializeMessage(node) {
  const delay = node.delay ? `(${node.delay})` : '';

  // If message has styling, use bracket syntax
  if (node.style && (node.style.color || node.style.width || node.style.styleName)) {
    const styleStr = serializeMessageStyle(node.style);
    // Insert style brackets between dashes and arrow head
    // e.g., -> becomes -[#red;3]>
    const arrow = node.arrowType;
    let dashes, head;
    if (arrow.startsWith('--')) {
      dashes = '--';
      head = arrow.slice(2);
    } else {
      dashes = '-';
      head = arrow.slice(1);
    }
    return `${node.from}${dashes}[${styleStr}]${head}${delay}${node.to}:${node.label}`;
  }

  return `${node.from}${node.arrowType}${delay}${node.to}:${node.label}`;
}

/**
 * Serialize message style to bracket format
 * @param {Object} style - Style object
 * @returns {string} Style string
 */
function serializeMessageStyle(style) {
  if (style.styleName) {
    return `##${style.styleName}`;
  }

  let result = '';
  if (style.color) {
    result += style.color;
  }
  if (style.width !== undefined) {
    result += `;${style.width}`;
  }
  return result;
}

/**
 * Serialize a fragment node
 * @param {Object} node - Fragment AST node
 * @param {Map} nodeById - Node lookup map
 * @param {number} indent - Current indentation level
 * @returns {string} Serialized fragment
 */
function serializeFragment(node, nodeById, indent) {
  const lines = [];
  const prefix = indentStr(indent);

  // Opening line: fragmentType[#operatorColor] [#fill] [#border;width;style] [condition]
  let opening = node.fragmentType;

  // Add styling
  const styleStr = serializeFragmentStyle(node.style);
  if (styleStr) {
    opening += styleStr;
  }

  // Add condition (with space separator if there's content)
  if (node.condition) {
    opening += ' ' + node.condition;
  }
  lines.push(prefix + opening);

  // Serialize main entries
  for (const entryId of node.entries) {
    const entry = nodeById.get(entryId);
    if (entry) {
      const serialized = serializeNode(entry, nodeById, indent + 1);
      if (serialized !== null) {
        lines.push(serialized);
      }
    }
  }

  // Serialize else clauses
  for (const elseClause of node.elseClauses) {
    let elseLine = 'else';

    // Add else clause styling
    const elseStyleStr = serializeElseStyle(elseClause.style);
    if (elseStyleStr) {
      elseLine += ' ' + elseStyleStr;
    }

    // Add else condition
    if (elseClause.condition) {
      elseLine += ' ' + elseClause.condition;
    }
    lines.push(prefix + elseLine);

    for (const entryId of elseClause.entries) {
      const entry = nodeById.get(entryId);
      if (entry) {
        const serialized = serializeNode(entry, nodeById, indent + 1);
        if (serialized !== null) {
          lines.push(serialized);
        }
      }
    }
  }

  // Closing line
  lines.push(prefix + 'end');

  return lines.join('\n');
}

/**
 * Serialize a participant group
 * Syntax: participantgroup [#color] [Label]
 * @param {Object} node - ParticipantGroup AST node
 * @param {Map} nodeById - Node lookup map
 * @param {number} indent - Current indentation level
 * @returns {string} Serialized participant group
 */
function serializeParticipantGroup(node, nodeById, indent) {
  const lines = [];
  const prefix = indentStr(indent);

  // Opening line
  let opening = 'participantgroup';
  if (node.color) {
    opening += ' ' + node.color;
  }
  if (node.label) {
    opening += ' ' + node.label;
  }
  lines.push(prefix + opening);

  // Serialize participants in the group
  // We need to find the participant nodes by their aliases
  for (const alias of node.participants) {
    // Find the participant node in the ast by alias
    for (const [id, astNode] of nodeById.entries()) {
      if (astNode.type === 'participant' && astNode.alias === alias) {
        const serialized = serializeNode(astNode, nodeById, indent + 1);
        if (serialized !== null) {
          lines.push(serialized);
        }
        break;
      }
    }
  }

  // Serialize nested groups
  for (const nestedGroupId of node.nestedGroups) {
    const nestedGroup = nodeById.get(nestedGroupId);
    if (nestedGroup) {
      const serialized = serializeParticipantGroup(nestedGroup, nodeById, indent + 1);
      lines.push(serialized);
    }
  }

  // Closing line
  lines.push(prefix + 'end');

  return lines.join('\n');
}

/**
 * Serialize a note node
 * Syntax: noteType position participant(s) [#style]:text
 * @param {Object} node - Note AST node
 * @returns {string} Serialized note
 */
function serializeNote(node) {
  let output = node.noteType;

  // Add position
  output += ' ' + node.position;

  // Add participants
  if (node.participants && node.participants.length > 0) {
    output += ' ' + node.participants.join(',');
  }

  // Add styling if present
  const styleStr = serializeNoteStyle(node.style);
  if (styleStr) {
    output += ' ' + styleStr;
  }

  // Add text
  output += ':' + node.text;

  return output;
}

/**
 * Serialize a divider node
 * Syntax: ==text==[#style]
 * @param {Object} node - Divider AST node
 * @returns {string} Serialized divider
 */
function serializeDivider(node) {
  let output = '==' + node.text + '==';

  // Add styling if present
  const styleStr = serializeNoteStyle(node.style);
  if (styleStr) {
    output += styleStr;
  }

  return output;
}

/**
 * Serialize note/divider style object to string
 * @param {Object} style - Style object
 * @returns {string} Style string or empty string
 */
function serializeNoteStyle(style) {
  if (!style || Object.keys(style).length === 0) {
    return '';
  }

  let parts = [];

  // Add fill color
  if (style.fill) {
    parts.push(style.fill);
  }

  // Add border styling
  const hasBorderColor = style.border !== undefined;
  const hasBorderWidth = style.borderWidth !== undefined;
  const hasBorderStyle = style.borderStyle !== undefined;

  if (hasBorderColor || hasBorderWidth || hasBorderStyle) {
    let borderPart = '';
    if (hasBorderColor) {
      borderPart += style.border;
    }
    if (hasBorderWidth || hasBorderStyle) {
      borderPart += ';';
      if (hasBorderWidth) {
        borderPart += style.borderWidth;
      }
      if (hasBorderStyle) {
        borderPart += ';' + style.borderStyle;
      }
    }
    parts.push(borderPart);
  }

  return parts.join(' ');
}
