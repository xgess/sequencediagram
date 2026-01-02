// Render notes, boxes, and dividers (BACKLOG-126)
// See DESIGN.md for note rendering details

const SVG_NS = 'http://www.w3.org/2000/svg';

// Constants for note dimensions
const NOTE_CORNER_SIZE = 10;
const DIVIDER_HEIGHT = 24;

/**
 * Render a note node to SVG
 * @param {Object} node - Note AST node
 * @param {Object} layoutInfo - Position info {x, y, width, height, connectorX?, connectorSide?}
 * @returns {SVGGElement} Rendered note group
 */
export function renderNote(node, layoutInfo) {
  const { x, y, width, height, connectorX, connectorSide } = layoutInfo;
  const style = node.style || {};
  const noteType = node.noteType || 'note';

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('data-node-id', node.id);
  group.setAttribute('class', `note note-${noteType}`);

  // Draw connector line first (so it's behind the note box)
  if (connectorX !== undefined && connectorSide) {
    const connector = document.createElementNS(SVG_NS, 'line');
    const noteEdgeX = connectorSide === 'left' ? x + width : x;
    const connectorY = y + height / 2;
    connector.setAttribute('x1', connectorX);
    connector.setAttribute('y1', connectorY);
    connector.setAttribute('x2', noteEdgeX);
    connector.setAttribute('y2', connectorY);
    connector.setAttribute('stroke', style.border || '#333');
    connector.setAttribute('stroke-width', '1');
    connector.setAttribute('class', 'note-connector');
    group.appendChild(connector);
  }

  // Choose rendering based on note type
  switch (noteType) {
    case 'note':
      renderNoteShape(group, x, y, width, height, style);
      break;
    case 'box':
      renderBoxShape(group, x, y, width, height, style);
      break;
    case 'abox':
      renderAboxShape(group, x, y, width, height, style);
      break;
    case 'rbox':
      renderRboxShape(group, x, y, width, height, style);
      break;
    case 'ref':
      renderRefShape(group, x, y, width, height, style);
      break;
    case 'state':
      renderStateShape(group, x, y, width, height, style);
      break;
    default:
      renderNoteShape(group, x, y, width, height, style);
  }

  // Add text (handle multiline with \n)
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('class', 'note-text');
  text.setAttribute('x', x + width / 2);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-size', '11');

  const textContent = node.text || '';
  const lines = textContent.split('\\n');
  const lineHeight = 16;

  if (lines.length === 1) {
    // Single line - center vertically
    text.setAttribute('y', y + height / 2);
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = textContent;
  } else {
    // Multiple lines - position each line
    const totalTextHeight = lines.length * lineHeight;
    const startY = y + (height - totalTextHeight) / 2 + lineHeight / 2;

    lines.forEach((line, i) => {
      const tspan = document.createElementNS(SVG_NS, 'tspan');
      tspan.setAttribute('x', x + width / 2);
      tspan.setAttribute('dy', i === 0 ? 0 : lineHeight);
      tspan.textContent = line;
      text.appendChild(tspan);
    });

    text.setAttribute('y', startY);
    text.setAttribute('dominant-baseline', 'middle');
  }

  group.appendChild(text);

  return group;
}

/**
 * Render standard note shape (rectangle with folded corner)
 */
function renderNoteShape(group, x, y, width, height, style) {
  // Main shape with folded corner
  const path = document.createElementNS(SVG_NS, 'path');
  const cornerSize = NOTE_CORNER_SIZE;
  const d = `M ${x} ${y}
             L ${x + width - cornerSize} ${y}
             L ${x + width} ${y + cornerSize}
             L ${x + width} ${y + height}
             L ${x} ${y + height} Z`;
  path.setAttribute('d', d);
  path.setAttribute('fill', style.fill || '#ffffc0');
  path.setAttribute('stroke', style.border || '#333');
  path.setAttribute('stroke-width', style.borderWidth || 1);
  if (style.borderStyle === 'dashed') {
    path.setAttribute('stroke-dasharray', '5,5');
  }
  group.appendChild(path);

  // Folded corner triangle
  const corner = document.createElementNS(SVG_NS, 'path');
  corner.setAttribute('d', `M ${x + width - cornerSize} ${y}
                            L ${x + width - cornerSize} ${y + cornerSize}
                            L ${x + width} ${y + cornerSize}`);
  corner.setAttribute('fill', 'none');
  corner.setAttribute('stroke', style.border || '#333');
  corner.setAttribute('stroke-width', style.borderWidth || 1);
  group.appendChild(corner);
}

/**
 * Render box shape (simple rectangle)
 */
function renderBoxShape(group, x, y, width, height, style) {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', width);
  rect.setAttribute('height', height);
  rect.setAttribute('fill', style.fill || '#f8f8f8');
  rect.setAttribute('stroke', style.border || '#333');
  rect.setAttribute('stroke-width', style.borderWidth || 1);
  if (style.borderStyle === 'dashed') {
    rect.setAttribute('stroke-dasharray', '5,5');
  }
  group.appendChild(rect);
}

/**
 * Render abox shape (angular/hexagonal box)
 */
function renderAboxShape(group, x, y, width, height, style) {
  const inset = 8;
  const path = document.createElementNS(SVG_NS, 'path');
  const d = `M ${x + inset} ${y}
             L ${x + width - inset} ${y}
             L ${x + width} ${y + height / 2}
             L ${x + width - inset} ${y + height}
             L ${x + inset} ${y + height}
             L ${x} ${y + height / 2} Z`;
  path.setAttribute('d', d);
  path.setAttribute('fill', style.fill || '#f8f8f8');
  path.setAttribute('stroke', style.border || '#333');
  path.setAttribute('stroke-width', style.borderWidth || 1);
  if (style.borderStyle === 'dashed') {
    path.setAttribute('stroke-dasharray', '5,5');
  }
  group.appendChild(path);
}

/**
 * Render rbox shape (rounded rectangle)
 */
function renderRboxShape(group, x, y, width, height, style) {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', width);
  rect.setAttribute('height', height);
  rect.setAttribute('rx', 8);
  rect.setAttribute('ry', 8);
  rect.setAttribute('fill', style.fill || '#f8f8f8');
  rect.setAttribute('stroke', style.border || '#333');
  rect.setAttribute('stroke-width', style.borderWidth || 1);
  if (style.borderStyle === 'dashed') {
    rect.setAttribute('stroke-dasharray', '5,5');
  }
  group.appendChild(rect);
}

/**
 * Render ref shape (reference box with "ref" label)
 */
function renderRefShape(group, x, y, width, height, style) {
  // Main rectangle
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', width);
  rect.setAttribute('height', height);
  rect.setAttribute('fill', style.fill || '#f0f0f0');
  rect.setAttribute('stroke', style.border || '#333');
  rect.setAttribute('stroke-width', style.borderWidth || 1);
  group.appendChild(rect);

  // "ref" label in corner
  const labelBox = document.createElementNS(SVG_NS, 'rect');
  labelBox.setAttribute('x', x);
  labelBox.setAttribute('y', y);
  labelBox.setAttribute('width', 25);
  labelBox.setAttribute('height', 16);
  labelBox.setAttribute('fill', style.fill || '#e8e8e8');
  labelBox.setAttribute('stroke', style.border || '#333');
  group.appendChild(labelBox);

  const label = document.createElementNS(SVG_NS, 'text');
  label.setAttribute('x', x + 4);
  label.setAttribute('y', y + 12);
  label.setAttribute('font-size', '10');
  label.setAttribute('font-weight', 'bold');
  label.textContent = 'ref';
  group.appendChild(label);
}

/**
 * Render state shape (rounded box for state info)
 */
function renderStateShape(group, x, y, width, height, style) {
  // Same as rbox but with different default styling
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', width);
  rect.setAttribute('height', height);
  rect.setAttribute('rx', 6);
  rect.setAttribute('ry', 6);
  rect.setAttribute('fill', style.fill || '#e8f4e8');
  rect.setAttribute('stroke', style.border || '#333');
  rect.setAttribute('stroke-width', style.borderWidth || 1);
  if (style.borderStyle === 'dashed') {
    rect.setAttribute('stroke-dasharray', '5,5');
  }
  group.appendChild(rect);
}

/**
 * Render a divider to SVG
 * @param {Object} node - Divider AST node
 * @param {Object} layoutInfo - Position info {x, y, width}
 * @returns {SVGGElement} Rendered divider group
 */
export function renderDivider(node, layoutInfo) {
  const { x, y, width } = layoutInfo;
  const style = node.style || {};

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('data-node-id', node.id);
  group.setAttribute('class', 'divider');

  // Draw horizontal lines
  const lineY = y + DIVIDER_HEIGHT / 2;

  // Left line
  const leftLine = document.createElementNS(SVG_NS, 'line');
  leftLine.setAttribute('x1', x);
  leftLine.setAttribute('y1', lineY);
  leftLine.setAttribute('x2', x + width / 2 - 40);
  leftLine.setAttribute('y2', lineY);
  leftLine.setAttribute('stroke', style.border || '#666');
  leftLine.setAttribute('stroke-width', style.borderWidth || 1);
  leftLine.setAttribute('stroke-dasharray', '4,4');
  group.appendChild(leftLine);

  // Right line
  const rightLine = document.createElementNS(SVG_NS, 'line');
  rightLine.setAttribute('x1', x + width / 2 + 40);
  rightLine.setAttribute('y1', lineY);
  rightLine.setAttribute('x2', x + width);
  rightLine.setAttribute('y2', lineY);
  rightLine.setAttribute('stroke', style.border || '#666');
  rightLine.setAttribute('stroke-width', style.borderWidth || 1);
  rightLine.setAttribute('stroke-dasharray', '4,4');
  group.appendChild(rightLine);

  // Text box in center
  const textBox = document.createElementNS(SVG_NS, 'rect');
  textBox.setAttribute('x', x + width / 2 - 38);
  textBox.setAttribute('y', y + 2);
  textBox.setAttribute('width', 76);
  textBox.setAttribute('height', DIVIDER_HEIGHT - 4);
  textBox.setAttribute('fill', style.fill || '#f8f8f8');
  textBox.setAttribute('stroke', style.border || '#666');
  textBox.setAttribute('rx', 3);
  textBox.setAttribute('ry', 3);
  group.appendChild(textBox);

  // Divider text
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('class', 'divider-text');
  text.setAttribute('x', x + width / 2);
  text.setAttribute('y', y + DIVIDER_HEIGHT / 2);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('font-size', '11');
  text.setAttribute('font-weight', 'bold');
  text.textContent = node.text || '';
  group.appendChild(text);

  return group;
}
