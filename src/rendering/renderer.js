// AST -> SVG renderer (main entry point)
// See DESIGN.md for SVG structure and rendering strategy

import { renderParticipant } from './participants.js';
import { renderMessage } from './messages.js';
import { renderFragment } from './fragments.js';
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
  // Fragments go first (behind everything else but after lifelines)
  const fragmentsGroup = document.createElementNS(SVG_NS, 'g');
  fragmentsGroup.setAttribute('id', 'fragments');
  svg.appendChild(fragmentsGroup);

  // Lifelines next
  const lifelinesGroup = document.createElementNS(SVG_NS, 'g');
  lifelinesGroup.setAttribute('id', 'lifelines');
  svg.appendChild(lifelinesGroup);

  const messagesGroup = document.createElementNS(SVG_NS, 'g');
  messagesGroup.setAttribute('id', 'messages');
  svg.appendChild(messagesGroup);

  const participantsGroup = document.createElementNS(SVG_NS, 'g');
  participantsGroup.setAttribute('id', 'participants');
  svg.appendChild(participantsGroup);

  // Title group (at the top)
  const titleGroup = document.createElementNS(SVG_NS, 'g');
  titleGroup.setAttribute('id', 'title');
  svg.appendChild(titleGroup);

  // Get elements from AST
  const participants = ast.filter(node => node.type === 'participant');
  const messages = ast.filter(node => node.type === 'message');
  const fragments = ast.filter(node => node.type === 'fragment');
  const titleDirective = ast.find(node => node.type === 'directive' && node.directiveType === 'title');

  // Calculate final height for lifelines
  const height = Math.max(totalHeight, 160);

  // Render fragments first (as background boxes)
  fragments.forEach(fragment => {
    const layoutInfo = layout.get(fragment.id);
    if (layoutInfo) {
      const fragmentEl = renderFragment(fragment, layoutInfo);
      fragmentsGroup.appendChild(fragmentEl);
    }
  });

  // Render lifelines (behind messages but above fragments)
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

  // Set SVG dimensions (account for fragments that might extend the width)
  let width = participants.length > 0
    ? Math.max(...Array.from(participantLayout.values()).map(p => p.x + p.width)) + MARGIN
    : 300;

  // Include fragment widths
  fragments.forEach(fragment => {
    const layoutInfo = layout.get(fragment.id);
    if (layoutInfo) {
      width = Math.max(width, layoutInfo.x + layoutInfo.width + MARGIN);
    }
  });

  // Render title if present
  if (titleDirective) {
    const titleEl = renderTitle(titleDirective, width);
    titleGroup.appendChild(titleEl);
  }

  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  return svg;
}

/**
 * Render a title at the top of the diagram
 * @param {Object} directive - Title directive node
 * @param {number} diagramWidth - Total diagram width
 * @returns {SVGTextElement} Title text element
 */
function renderTitle(directive, diagramWidth) {
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('class', 'diagram-title');
  text.setAttribute('data-node-id', directive.id);
  text.setAttribute('x', diagramWidth / 2);
  text.setAttribute('y', 25);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
  text.setAttribute('font-size', '18');
  text.setAttribute('font-weight', 'bold');
  text.textContent = directive.value;
  return text;
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
