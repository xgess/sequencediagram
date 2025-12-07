// Render participant boxes (participant, actor, database)
// See DESIGN.md for participant rendering details

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Render a participant node to SVG
 * @param {Object} node - Participant AST node
 * @param {Object} layoutInfo - Position info {x, y, width, height}
 * @returns {SVGGElement} Rendered participant group
 */
export function renderParticipant(node, layoutInfo) {
  // TODO(Phase1): Implement participant rendering
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('data-node-id', node.id);
  group.setAttribute('class', 'participant');
  return group;
}
