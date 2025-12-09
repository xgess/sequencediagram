// AST -> SVG renderer (main entry point)
// See DESIGN.md for SVG structure and rendering strategy

import { renderParticipant } from './participants.js';
import { renderMessage } from './messages.js';
import { calculateLayout } from './layout.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const MARGIN = 50;

/**
 * Render AST to SVG element
 * @param {Array} ast - AST nodes array
 * @returns {SVGElement} Rendered SVG
 */
export function render(ast) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('id', 'diagram');

  // Calculate layout for all elements
  const { layout, totalHeight, participantLayout } = calculateLayout(ast);

  // Create defs for arrow markers
  const defs = createDefs();
  svg.appendChild(defs);

  // Create container groups (order matters for z-index)
  // Lifelines go first (behind everything)
  const lifelinesGroup = document.createElementNS(SVG_NS, 'g');
  lifelinesGroup.setAttribute('id', 'lifelines');
  svg.appendChild(lifelinesGroup);

  const messagesGroup = document.createElementNS(SVG_NS, 'g');
  messagesGroup.setAttribute('id', 'messages');
  svg.appendChild(messagesGroup);

  const participantsGroup = document.createElementNS(SVG_NS, 'g');
  participantsGroup.setAttribute('id', 'participants');
  svg.appendChild(participantsGroup);

  // Get elements from AST
  const participants = ast.filter(node => node.type === 'participant');
  const messages = ast.filter(node => node.type === 'message');

  // Calculate final height for lifelines
  const height = Math.max(totalHeight, 160);

  // Render lifelines (behind everything)
  participants.forEach(participant => {
    const layoutInfo = layout.get(participant.id);
    if (layoutInfo) {
      const lifeline = renderLifeline(participant, layoutInfo, height);
      lifelinesGroup.appendChild(lifeline);
    }
  });

  // Render participants
  participants.forEach(participant => {
    const layoutInfo = layout.get(participant.id);
    if (layoutInfo) {
      const participantEl = renderParticipant(participant, layoutInfo);
      participantsGroup.appendChild(participantEl);
    }
  });

  // Render messages
  messages.forEach(message => {
    const layoutInfo = layout.get(message.id);
    if (layoutInfo) {
      const messageEl = renderMessage(message, layoutInfo);
      messagesGroup.appendChild(messageEl);
    }
  });

  // Set SVG dimensions
  const width = participants.length > 0
    ? Math.max(...Array.from(participantLayout.values()).map(p => p.x + p.width)) + MARGIN
    : 300;

  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  return svg;
}

/**
 * Render a lifeline for a participant
 * @param {Object} participant - Participant AST node
 * @param {Object} layoutInfo - Layout info {x, y, width, height, centerX}
 * @param {number} totalHeight - Total diagram height
 * @returns {SVGLineElement} Lifeline element
 */
function renderLifeline(participant, layoutInfo, totalHeight) {
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('class', 'lifeline');
  line.setAttribute('data-participant', participant.alias);
  line.setAttribute('x1', layoutInfo.centerX);
  line.setAttribute('y1', layoutInfo.y + layoutInfo.height);
  line.setAttribute('x2', layoutInfo.centerX);
  line.setAttribute('y2', totalHeight - 20);
  line.setAttribute('stroke', '#ccc');
  line.setAttribute('stroke-width', '1');
  line.setAttribute('stroke-dasharray', '5,5');
  return line;
}

/**
 * Create SVG defs element with arrow markers
 * @returns {SVGDefsElement}
 */
function createDefs() {
  const defs = document.createElementNS(SVG_NS, 'defs');

  // Solid arrowhead (for -> and -->)
  const solidArrow = document.createElementNS(SVG_NS, 'marker');
  solidArrow.setAttribute('id', 'arrowhead-solid');
  solidArrow.setAttribute('markerWidth', '10');
  solidArrow.setAttribute('markerHeight', '7');
  solidArrow.setAttribute('refX', '9');
  solidArrow.setAttribute('refY', '3.5');
  solidArrow.setAttribute('orient', 'auto');

  const solidPath = document.createElementNS(SVG_NS, 'polygon');
  solidPath.setAttribute('points', '0 0, 10 3.5, 0 7');
  solidPath.setAttribute('fill', 'black');
  solidArrow.appendChild(solidPath);
  defs.appendChild(solidArrow);

  // Open arrowhead (for ->> and -->>)
  const openArrow = document.createElementNS(SVG_NS, 'marker');
  openArrow.setAttribute('id', 'arrowhead-open');
  openArrow.setAttribute('markerWidth', '10');
  openArrow.setAttribute('markerHeight', '7');
  openArrow.setAttribute('refX', '9');
  openArrow.setAttribute('refY', '3.5');
  openArrow.setAttribute('orient', 'auto');

  const openPath = document.createElementNS(SVG_NS, 'polyline');
  openPath.setAttribute('points', '0 0, 10 3.5, 0 7');
  openPath.setAttribute('fill', 'none');
  openPath.setAttribute('stroke', 'black');
  openPath.setAttribute('stroke-width', '1');
  openArrow.appendChild(openPath);
  defs.appendChild(openArrow);

  return defs;
}
