// Render message arrows between participants
// See DESIGN.md for message rendering details

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Render a message node to SVG
 * @param {Object} node - Message AST node
 * @param {Object} layoutInfo - Position info {y, fromX, toX, delay}
 * @returns {SVGGElement} Rendered message group
 */
export function renderMessage(node, layoutInfo) {
  const { y, fromX, toX, delay } = layoutInfo;
  const arrowType = node.arrowType;

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('data-node-id', node.id);
  group.setAttribute('class', 'message');

  // Determine if this is a reversed arrow (starts with <)
  const isReversed = arrowType.startsWith('<') && !arrowType.startsWith('<->');
  const isBidirectional = arrowType.startsWith('<->') || arrowType.startsWith('<->>');
  const isLost = arrowType.endsWith('x');

  // For reversed arrows, swap the coordinates visually
  // (the message is from A to B syntactically, but arrow points from B to A)
  let lineFromX = fromX;
  let lineToX = toX;
  if (isReversed) {
    lineFromX = toX;
    lineToX = fromX;
  }

  // Calculate Y positions - delayed messages have sloped lines
  const delayOffset = delay ? delay * 10 : 0;
  const startY = y;
  const endY = y + delayOffset;

  // Create the arrow line
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', lineFromX);
  line.setAttribute('y1', startY);
  line.setAttribute('x2', lineToX);
  line.setAttribute('y2', endY);
  line.setAttribute('stroke', 'black');
  line.setAttribute('stroke-width', '1');

  // Apply arrow marker based on arrow type
  if (isLost) {
    // Lost messages end with X
    line.setAttribute('marker-end', 'url(#arrowhead-x)');
  } else if (isBidirectional) {
    // Bidirectional arrows have markers on both ends
    const endMarkerId = getEndMarkerId(arrowType);
    const startMarkerId = getStartMarkerId(arrowType);
    line.setAttribute('marker-end', `url(#${endMarkerId})`);
    line.setAttribute('marker-start', `url(#${startMarkerId})`);
  } else {
    // Normal or reversed arrows
    const markerId = getEndMarkerId(arrowType);
    line.setAttribute('marker-end', `url(#${markerId})`);
  }

  // Apply dashed style for return arrows (contains --)
  if (arrowType.includes('--')) {
    line.setAttribute('stroke-dasharray', '5,5');
  }

  group.appendChild(line);

  // Create label text
  if (node.label) {
    const text = document.createElementNS(SVG_NS, 'text');
    const midX = (fromX + toX) / 2;
    // Position label at midpoint of the line (accounts for slope)
    const midY = (startY + endY) / 2 - 8;
    text.setAttribute('x', midX);
    text.setAttribute('y', midY);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
    text.setAttribute('font-size', '11');
    text.textContent = node.label;
    group.appendChild(text);
  }

  return group;
}

/**
 * Get the end marker ID based on arrow type
 * @param {string} arrowType - Arrow type
 * @returns {string} Marker ID
 */
function getEndMarkerId(arrowType) {
  // >> arrows use open arrowhead
  if (arrowType.endsWith('>>')) {
    return 'arrowhead-open';
  }
  // > arrows use solid arrowhead
  return 'arrowhead-solid';
}

/**
 * Get the start marker ID for bidirectional arrows
 * @param {string} arrowType - Arrow type
 * @returns {string} Marker ID
 */
function getStartMarkerId(arrowType) {
  // <->> uses open arrowhead on both ends
  if (arrowType === '<->>') {
    return 'arrowhead-open-start';
  }
  // <-> uses solid arrowhead on both ends
  return 'arrowhead-solid-start';
}
