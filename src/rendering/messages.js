// Render message arrows between participants
// See DESIGN.md for message rendering details

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Render a message node to SVG
 * @param {Object} node - Message AST node
 * @param {Object} layoutInfo - Position info {y, fromX, toX}
 * @returns {SVGGElement} Rendered message group
 */
export function renderMessage(node, layoutInfo) {
  const { y, fromX, toX } = layoutInfo;

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('data-node-id', node.id);
  group.setAttribute('class', 'message');

  // Create the arrow line
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', fromX);
  line.setAttribute('y1', y);
  line.setAttribute('x2', toX);
  line.setAttribute('y2', y);
  line.setAttribute('stroke', 'black');
  line.setAttribute('stroke-width', '1');

  // Apply arrow marker based on arrow type
  const markerId = getMarkerId(node.arrowType);
  line.setAttribute('marker-end', `url(#${markerId})`);

  // Apply dashed style for return arrows (-- prefix)
  if (node.arrowType.startsWith('--')) {
    line.setAttribute('stroke-dasharray', '5,5');
  }

  group.appendChild(line);

  // Create label text
  if (node.label) {
    const text = document.createElementNS(SVG_NS, 'text');
    const midX = (fromX + toX) / 2;
    text.setAttribute('x', midX);
    text.setAttribute('y', y - 8);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
    text.setAttribute('font-size', '11');
    text.textContent = node.label;
    group.appendChild(text);
  }

  return group;
}

/**
 * Get the marker ID based on arrow type
 * @param {string} arrowType - Arrow type (-> ->> --> -->>)
 * @returns {string} Marker ID
 */
function getMarkerId(arrowType) {
  // >> arrows use open arrowhead
  if (arrowType.endsWith('>>')) {
    return 'arrowhead-open';
  }
  // > arrows use solid arrowhead
  return 'arrowhead-solid';
}
