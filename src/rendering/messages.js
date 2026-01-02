// Render message arrows between participants
// See DESIGN.md for message rendering details

import { renderMarkupText, getLineCount } from '../markup/renderer.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Render a message node to SVG
 * @param {Object} node - Message AST node
 * @param {Object} layoutInfo - Position info {y, fromX, toX, delay}
 * @param {number|null} messageNumber - Autonumber value or null
 * @param {Object|null} resolvedStyle - Resolved style (named style looked up)
 * @returns {SVGGElement} Rendered message group
 */
export function renderMessage(node, layoutInfo, messageNumber = null, resolvedStyle = null) {
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

  // Apply styling (color and width) - use resolved style if provided
  const style = resolvedStyle || node.style || {};
  line.setAttribute('stroke', style.color || 'black');
  line.setAttribute('stroke-width', style.width !== undefined ? style.width : 1);

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
  if (node.label || messageNumber !== null) {
    const midX = (fromX + toX) / 2;

    // Build label with optional number prefix
    let labelText = '';
    if (messageNumber !== null) {
      labelText = `${messageNumber}. `;
    }
    labelText += node.label || '';

    // Calculate line count and offset so ALL lines are above the arrow
    // Each line is 16px (LINE_HEIGHT), and we want bottom of text clearly above arrow
    const lineCount = getLineCount(labelText);
    const lineHeight = 16;
    const baseOffset = 12; // Distance from arrow to bottom line of text
    // Position first line, then subsequent lines go down with dy
    // Total text height = (lineCount - 1) * lineHeight
    // We want the LAST line's baseline to be baseOffset above the arrow
    const midY = (startY + endY) / 2 - baseOffset - (lineCount - 1) * lineHeight;

    // Use markup renderer to handle \n and other formatting
    const textEl = renderMarkupText(labelText, {
      x: midX,
      y: midY,
      textAnchor: 'middle',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '11'
    });
    group.appendChild(textEl);
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
