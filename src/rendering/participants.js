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
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('data-node-id', node.id);
  group.setAttribute('class', 'participant');

  switch (node.participantType) {
    case 'actor':
      renderActor(group, node, layoutInfo);
      break;
    case 'database':
      renderDatabase(group, node, layoutInfo);
      break;
    default:
      renderBox(group, node, layoutInfo);
  }

  return group;
}

/**
 * Render a standard participant box
 */
function renderBox(group, node, layoutInfo) {
  const { x, y, width, height } = layoutInfo;
  const style = node.style || {};

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

  // Add text label
  addTextLabel(group, node.displayName, x + width / 2, y, height);
}

/**
 * Render an actor as stick figure
 */
function renderActor(group, node, layoutInfo) {
  const { x, y, width, height } = layoutInfo;
  const style = node.style || {};
  const stroke = style.border || 'black';
  const strokeWidth = style.borderWidth !== undefined ? style.borderWidth : 1;

  const centerX = x + width / 2;
  const figureHeight = height - 20; // Leave space for label
  const headRadius = 8;
  const bodyStart = y + headRadius * 2 + 4;

  // Head (circle)
  const head = document.createElementNS(SVG_NS, 'circle');
  head.setAttribute('cx', centerX);
  head.setAttribute('cy', y + headRadius + 2);
  head.setAttribute('r', headRadius);
  head.setAttribute('fill', style.fill || 'white');
  head.setAttribute('stroke', stroke);
  head.setAttribute('stroke-width', strokeWidth);
  group.appendChild(head);

  // Body (vertical line)
  const body = document.createElementNS(SVG_NS, 'line');
  body.setAttribute('x1', centerX);
  body.setAttribute('y1', bodyStart);
  body.setAttribute('x2', centerX);
  body.setAttribute('y2', bodyStart + 20);
  body.setAttribute('stroke', stroke);
  body.setAttribute('stroke-width', strokeWidth);
  group.appendChild(body);

  // Arms (horizontal line)
  const arms = document.createElementNS(SVG_NS, 'line');
  arms.setAttribute('x1', centerX - 12);
  arms.setAttribute('y1', bodyStart + 8);
  arms.setAttribute('x2', centerX + 12);
  arms.setAttribute('y2', bodyStart + 8);
  arms.setAttribute('stroke', stroke);
  arms.setAttribute('stroke-width', strokeWidth);
  group.appendChild(arms);

  // Left leg
  const leftLeg = document.createElementNS(SVG_NS, 'line');
  leftLeg.setAttribute('x1', centerX);
  leftLeg.setAttribute('y1', bodyStart + 20);
  leftLeg.setAttribute('x2', centerX - 10);
  leftLeg.setAttribute('y2', bodyStart + 35);
  leftLeg.setAttribute('stroke', stroke);
  leftLeg.setAttribute('stroke-width', strokeWidth);
  group.appendChild(leftLeg);

  // Right leg
  const rightLeg = document.createElementNS(SVG_NS, 'line');
  rightLeg.setAttribute('x1', centerX);
  rightLeg.setAttribute('y1', bodyStart + 20);
  rightLeg.setAttribute('x2', centerX + 10);
  rightLeg.setAttribute('y2', bodyStart + 35);
  rightLeg.setAttribute('stroke', stroke);
  rightLeg.setAttribute('stroke-width', strokeWidth);
  group.appendChild(rightLeg);

  // Add text label below figure
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', centerX);
  text.setAttribute('y', y + height - 4);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
  text.setAttribute('font-size', '12');
  text.textContent = node.displayName;
  group.appendChild(text);
}

/**
 * Render a database as cylinder
 */
function renderDatabase(group, node, layoutInfo) {
  const { x, y, width, height } = layoutInfo;
  const style = node.style || {};
  const fill = style.fill || 'white';
  const stroke = style.border || 'black';
  const strokeWidth = style.borderWidth !== undefined ? style.borderWidth : 1;

  const ellipseRx = width / 2;
  const ellipseRy = 8;
  const centerX = x + width / 2;
  const bodyHeight = height - ellipseRy * 2;

  // Background rectangle (body of cylinder)
  const body = document.createElementNS(SVG_NS, 'rect');
  body.setAttribute('x', x);
  body.setAttribute('y', y + ellipseRy);
  body.setAttribute('width', width);
  body.setAttribute('height', bodyHeight);
  body.setAttribute('fill', fill);
  body.setAttribute('stroke', 'none');
  group.appendChild(body);

  // Left edge
  const leftEdge = document.createElementNS(SVG_NS, 'line');
  leftEdge.setAttribute('x1', x);
  leftEdge.setAttribute('y1', y + ellipseRy);
  leftEdge.setAttribute('x2', x);
  leftEdge.setAttribute('y2', y + ellipseRy + bodyHeight);
  leftEdge.setAttribute('stroke', stroke);
  leftEdge.setAttribute('stroke-width', strokeWidth);
  group.appendChild(leftEdge);

  // Right edge
  const rightEdge = document.createElementNS(SVG_NS, 'line');
  rightEdge.setAttribute('x1', x + width);
  rightEdge.setAttribute('y1', y + ellipseRy);
  rightEdge.setAttribute('x2', x + width);
  rightEdge.setAttribute('y2', y + ellipseRy + bodyHeight);
  rightEdge.setAttribute('stroke', stroke);
  rightEdge.setAttribute('stroke-width', strokeWidth);
  group.appendChild(rightEdge);

  // Top ellipse
  const topEllipse = document.createElementNS(SVG_NS, 'ellipse');
  topEllipse.setAttribute('cx', centerX);
  topEllipse.setAttribute('cy', y + ellipseRy);
  topEllipse.setAttribute('rx', ellipseRx);
  topEllipse.setAttribute('ry', ellipseRy);
  topEllipse.setAttribute('fill', fill);
  topEllipse.setAttribute('stroke', stroke);
  topEllipse.setAttribute('stroke-width', strokeWidth);
  group.appendChild(topEllipse);

  // Bottom ellipse (half visible)
  const bottomEllipse = document.createElementNS(SVG_NS, 'path');
  const bottomY = y + height - ellipseRy;
  // Draw only the bottom half of the ellipse
  bottomEllipse.setAttribute('d', `M ${x} ${bottomY} A ${ellipseRx} ${ellipseRy} 0 0 0 ${x + width} ${bottomY}`);
  bottomEllipse.setAttribute('fill', 'none');
  bottomEllipse.setAttribute('stroke', stroke);
  bottomEllipse.setAttribute('stroke-width', strokeWidth);
  group.appendChild(bottomEllipse);

  // Add text label in center
  addTextLabel(group, node.displayName, centerX, y, height);
}

/**
 * Add text label to participant group
 */
function addTextLabel(group, displayName, centerX, y, height) {
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', centerX);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
  text.setAttribute('font-size', '12');

  const lines = displayName.split('\n');
  const lineHeight = 14;
  const totalTextHeight = lines.length * lineHeight;
  const startY = y + (height - totalTextHeight) / 2 + lineHeight / 2;

  if (lines.length === 1) {
    // Single line - use dominant-baseline for centering
    text.setAttribute('y', y + height / 2);
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = displayName;
  } else {
    // Multiple lines - use tspans
    lines.forEach((line, index) => {
      const tspan = document.createElementNS(SVG_NS, 'tspan');
      tspan.setAttribute('x', centerX);
      tspan.setAttribute('y', startY + index * lineHeight);
      tspan.textContent = line;
      text.appendChild(tspan);
    });
  }

  group.appendChild(text);
}
