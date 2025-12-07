// Render message arrows between participants
// See DESIGN.md for message rendering details

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Render a message node to SVG
 * @param {Object} node - Message AST node
 * @param {Object} layoutInfo - Position info
 * @param {Map} participantMap - Alias to participant node map
 * @returns {SVGGElement} Rendered message group
 */
export function renderMessage(node, layoutInfo, participantMap) {
  // TODO(Phase1): Implement message rendering
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('data-node-id', node.id);
  group.setAttribute('class', 'message');
  return group;
}
