// Render error nodes as warning boxes
// See DESIGN.md for error rendering details

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Render an error node as a warning box
 * @param {Object} node - Error AST node
 * @param {Object} layoutInfo - Position info {x, y, width, height}
 * @returns {SVGGElement} Rendered error group
 */
export function renderError(node, layoutInfo) {
  const { x, y, width, height } = layoutInfo;

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('data-node-id', node.id);
  group.setAttribute('class', 'error');

  // Draw error box (red border, light red background)
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('class', 'error-box');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', width);
  rect.setAttribute('height', height);
  rect.setAttribute('fill', '#fee');
  rect.setAttribute('stroke', '#c00');
  rect.setAttribute('stroke-width', '2');
  rect.setAttribute('rx', '4');
  rect.setAttribute('ry', '4');
  group.appendChild(rect);

  // Draw warning icon (⚠)
  const icon = document.createElementNS(SVG_NS, 'text');
  icon.setAttribute('class', 'error-icon');
  icon.setAttribute('x', x + 10);
  icon.setAttribute('y', y + height / 2 + 5);
  icon.setAttribute('font-size', '16');
  icon.textContent = '⚠';
  group.appendChild(icon);

  // Draw error message
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('class', 'error-message');
  text.setAttribute('x', x + 30);
  text.setAttribute('y', y + height / 2 + 4);
  text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
  text.setAttribute('font-size', '11');
  text.setAttribute('fill', '#c00');
  text.textContent = node.message;
  group.appendChild(text);

  return group;
}
