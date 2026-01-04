// Render message arrows between participants
// See DESIGN.md for message rendering details

import { renderMarkupText, getLineCount } from '../markup/renderer.js';
import { resolveColor } from './colors.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Cache for dynamically created colored markers
const coloredMarkers = new Map();

/**
 * Render a message node to SVG
 * @param {Object} node - Message AST node
 * @param {Object} layoutInfo - Position info {y, fromX, toX, delay}
 * @param {number|null} messageNumber - Autonumber value or null
 * @param {Object|null} resolvedStyle - Resolved style (named style looked up)
 * @param {SVGDefsElement|null} defs - The SVG defs element for adding markers
 * @returns {SVGGElement} Rendered message group
 */
export function renderMessage(node, layoutInfo, messageNumber = null, resolvedStyle = null, defs = null) {
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
  const strokeColor = resolveColor(style.color) || 'black';
  line.setAttribute('stroke', strokeColor);
  line.setAttribute('stroke-width', style.width !== undefined ? style.width : 1);

  // Apply arrow marker based on arrow type
  // For colored arrows, create/use color-specific markers for browser compatibility
  if (isLost) {
    // Lost messages end with X
    const markerId = getOrCreateColoredMarker('x', strokeColor, defs);
    line.setAttribute('marker-end', `url(#${markerId})`);
  } else if (isBidirectional) {
    // Bidirectional arrows have markers on both ends
    const endType = arrowType.endsWith('>>') ? 'open' : 'solid';
    const startType = arrowType === '<->>' ? 'open' : 'solid';
    const endMarkerId = getOrCreateColoredMarker(endType, strokeColor, defs);
    const startMarkerId = getOrCreateColoredMarker(startType + '-start', strokeColor, defs);
    line.setAttribute('marker-end', `url(#${endMarkerId})`);
    line.setAttribute('marker-start', `url(#${startMarkerId})`);
  } else {
    // Normal or reversed arrows
    const markerType = arrowType.endsWith('>>') ? 'open' : 'solid';
    const markerId = getOrCreateColoredMarker(markerType, strokeColor, defs);
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
 * Get or create a colored marker for the given type and color
 * Creates markers dynamically to support colored arrows in browsers
 * that don't support context-stroke (like Brave)
 * @param {string} type - Marker type: 'solid', 'open', 'solid-start', 'open-start', 'x'
 * @param {string} color - The color for the marker
 * @param {SVGDefsElement} defs - The SVG defs element to add markers to
 * @returns {string} The marker ID to use
 */
function getOrCreateColoredMarker(type, color, defs) {
  // For black, use the default markers (they use context-stroke which works in most browsers)
  if (color === 'black') {
    if (type === 'solid') return 'arrowhead-solid';
    if (type === 'open') return 'arrowhead-open';
    if (type === 'solid-start') return 'arrowhead-solid-start';
    if (type === 'open-start') return 'arrowhead-open-start';
    if (type === 'x') return 'arrowhead-x';
  }

  // Create a unique ID for this color/type combination
  const markerId = `arrowhead-${type}-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  // Check if we already created this marker
  if (coloredMarkers.has(markerId)) {
    return markerId;
  }

  // If no defs provided, fall back to default marker
  if (!defs) {
    if (type === 'solid') return 'arrowhead-solid';
    if (type === 'open') return 'arrowhead-open';
    if (type === 'solid-start') return 'arrowhead-solid-start';
    if (type === 'open-start') return 'arrowhead-open-start';
    if (type === 'x') return 'arrowhead-x';
  }

  // Create the marker based on type
  const marker = document.createElementNS(SVG_NS, 'marker');
  marker.setAttribute('id', markerId);
  marker.setAttribute('markerWidth', '10');
  marker.setAttribute('markerHeight', type === 'x' ? '10' : '7');
  marker.setAttribute('refX', type.includes('start') ? '1' : (type === 'x' ? '5' : '9'));
  marker.setAttribute('refY', type === 'x' ? '5' : '3.5');
  marker.setAttribute('orient', 'auto');

  if (type === 'solid') {
    const path = document.createElementNS(SVG_NS, 'polygon');
    path.setAttribute('points', '0 0, 10 3.5, 0 7');
    path.setAttribute('fill', color);
    marker.appendChild(path);
  } else if (type === 'open') {
    const path = document.createElementNS(SVG_NS, 'polyline');
    path.setAttribute('points', '0 0, 10 3.5, 0 7');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '1');
    marker.appendChild(path);
  } else if (type === 'solid-start') {
    const path = document.createElementNS(SVG_NS, 'polygon');
    path.setAttribute('points', '10 0, 0 3.5, 10 7');
    path.setAttribute('fill', color);
    marker.appendChild(path);
  } else if (type === 'open-start') {
    const path = document.createElementNS(SVG_NS, 'polyline');
    path.setAttribute('points', '10 0, 0 3.5, 10 7');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '1');
    marker.appendChild(path);
  } else if (type === 'x') {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M 0 0 L 10 10 M 10 0 L 0 10');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '2');
    marker.appendChild(path);
  }

  defs.appendChild(marker);
  coloredMarkers.set(markerId, true);

  return markerId;
}

/**
 * Clear the colored markers cache (call when re-rendering)
 */
export function clearColoredMarkersCache() {
  coloredMarkers.clear();
}
