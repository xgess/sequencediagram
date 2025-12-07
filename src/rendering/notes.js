// Render notes and boxes (Phase 5)
// See DESIGN.md for notes rendering details

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Render a note node to SVG
 * @param {Object} node - Note AST node
 * @param {Object} layoutInfo - Position info
 * @returns {SVGGElement} Rendered note group
 */
export function renderNote(node, layoutInfo) {
  // TODO(Phase5): Implement note rendering
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('data-node-id', node.id);
  group.setAttribute('class', 'note');
  return group;
}
