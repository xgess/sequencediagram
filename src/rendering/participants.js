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
  const style = node.style || {};

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('data-node-id', node.id);
  group.setAttribute('class', 'participant');

  // Create rectangle for participant box
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', width);
  rect.setAttribute('height', height);

  // Apply styling with defaults
  rect.setAttribute('fill', style.fill || 'white');
  rect.setAttribute('stroke', style.border || 'black');
  rect.setAttribute('stroke-width', style.borderWidth !== undefined ? style.borderWidth : 1);

  // Apply dashed border style if specified
  if (style.borderStyle === 'dashed') {
    rect.setAttribute('stroke-dasharray', '5,5');
  }

  group.appendChild(rect);

  // Create text label (handling multiline with \n)
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', x + width / 2);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
  text.setAttribute('font-size', '12');

  const lines = node.displayName.split('\n');
  const lineHeight = 14;
  const totalTextHeight = lines.length * lineHeight;
  const startY = y + (height - totalTextHeight) / 2 + lineHeight / 2;

  if (lines.length === 1) {
    // Single line - use dominant-baseline for centering
    text.setAttribute('y', y + height / 2);
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = node.displayName;
  } else {
    // Multiple lines - use tspans
    lines.forEach((line, index) => {
      const tspan = document.createElementNS(SVG_NS, 'tspan');
      tspan.setAttribute('x', x + width / 2);
      tspan.setAttribute('y', startY + index * lineHeight);
      tspan.textContent = line;
      text.appendChild(tspan);
    });
  }

  group.appendChild(text);

  return group;
}
