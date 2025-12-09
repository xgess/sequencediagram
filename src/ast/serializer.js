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

  const lines = [];

  for (const node of ast) {
    // Skip entries that are inside fragments (they'll be serialized by the fragment)
    if (fragmentEntries.has(node.id)) continue;

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
    case 'comment':
      return indentStr(indent) + node.text;
    case 'blankline':
      return '';
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
 * Serialize a message node
 * @param {Object} node - Message AST node
 * @returns {string} Serialized message
 */
function serializeMessage(node) {
  return `${node.from}${node.arrowType}${node.to}:${node.label}`;
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
