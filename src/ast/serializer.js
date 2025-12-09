// AST -> Text serializer
// See DESIGN.md for serialization format and escaping rules

/**
 * Serialize AST back to text format
 * @param {Array} ast - AST nodes array
 * @returns {string} Serialized text
 */
export function serialize(ast) {
  const lines = [];

  for (const node of ast) {
    const line = serializeNode(node);
    if (line !== null) {
      lines.push(line);
    }
  }

  return lines.join('\n');
}

/**
 * Serialize a single AST node to text
 * @param {Object} node - AST node
 * @returns {string|null} Serialized line or null
 */
function serializeNode(node) {
  switch (node.type) {
    case 'participant':
      return serializeParticipant(node);
    case 'message':
      return serializeMessage(node);
    default:
      return null;
  }
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
 * Serialize a message node
 * @param {Object} node - Message AST node
 * @returns {string} Serialized message
 */
function serializeMessage(node) {
  return `${node.from}${node.arrowType}${node.to}:${node.label}`;
}
