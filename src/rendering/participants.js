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
  const { x, y, width, height } = layoutInfo;

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('data-node-id', node.id);
  group.setAttribute('class', 'participant');

  // Create rectangle for participant box
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', width);
  rect.setAttribute('height', height);
  rect.setAttribute('fill', 'white');
  rect.setAttribute('stroke', 'black');
  rect.setAttribute('stroke-width', '1');
  group.appendChild(rect);

  // Create text label
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', x + width / 2);
  text.setAttribute('y', y + height / 2);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
  text.setAttribute('font-size', '12');
  text.textContent = node.displayName;
  group.appendChild(text);

  return group;
}
