// Render fragment boxes (alt, loop, etc.)
// See DESIGN.md for fragment rendering details

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Render a fragment node to SVG
 * @param {Object} fragment - Fragment AST node
 * @param {Map} layout - Layout map (nodeId -> position info)
 * @param {Array} ast - Full AST for entry lookup
 * @returns {SVGGElement} Rendered fragment group
 */
export function renderFragment(fragment, layout, ast) {
  // TODO(Phase1): Implement fragment rendering
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('data-node-id', fragment.id);
  group.setAttribute('class', 'fragment');
  return group;
}
