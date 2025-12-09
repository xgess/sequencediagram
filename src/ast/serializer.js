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
  // For now, just output: participantType name
  // alias syntax and styling will be added in later backlog items
  return `${node.participantType} ${node.alias}`;
}
