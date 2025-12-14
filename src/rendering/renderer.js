// AST -> SVG renderer (main entry point)
// See DESIGN.md for SVG structure and rendering strategy

import { renderParticipant } from './participants.js';
import { renderMessage } from './messages.js';
import { renderFragment } from './fragments.js';
import { renderNote, renderDivider } from './notes.js';
import { renderError } from './errors.js';
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

  // Notes and dividers group (between lifelines and messages)
  const notesGroup = document.createElementNS(SVG_NS, 'g');
  notesGroup.setAttribute('id', 'notes');
  svg.appendChild(notesGroup);

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

  // Errors group
  const errorsGroup = document.createElementNS(SVG_NS, 'g');
  errorsGroup.setAttribute('id', 'errors');
  svg.appendChild(errorsGroup);

  // Get elements from AST
  const participants = ast.filter(node => node.type === 'participant');
  const messages = ast.filter(node => node.type === 'message');
  const fragments = ast.filter(node => node.type === 'fragment');
  const notes = ast.filter(node => node.type === 'note');
  const dividers = ast.filter(node => node.type === 'divider');
  const errors = ast.filter(node => node.type === 'error');
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

  // Calculate autonumber for each message based on directives
  const messageNumbers = calculateMessageNumbers(ast);

  // Render messages
  messages.forEach(message => {
    const layoutInfo = layout.get(message.id);
    if (layoutInfo) {
      const messageNumber = messageNumbers.get(message.id);
      const messageEl = renderMessage(message, layoutInfo, messageNumber);
      messagesGroup.appendChild(messageEl);
    }
  });

  // Render notes
  notes.forEach(note => {
    const layoutInfo = layout.get(note.id);
    if (layoutInfo) {
      const noteEl = renderNote(note, layoutInfo);
      notesGroup.appendChild(noteEl);
    }
  });

  // Render dividers
  dividers.forEach(divider => {
    const layoutInfo = layout.get(divider.id);
    if (layoutInfo) {
      const dividerEl = renderDivider(divider, layoutInfo);
      notesGroup.appendChild(dividerEl);
    }
  });

  // Render errors
  errors.forEach(error => {
    const layoutInfo = layout.get(error.id);
    if (layoutInfo) {
      const errorEl = renderError(error, layoutInfo);
      errorsGroup.appendChild(errorEl);
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
 * Calculate autonumber for each message based on directives
 * @param {Array} ast - AST nodes
 * @returns {Map} message ID -> number (or null if not numbered)
 */
function calculateMessageNumbers(ast) {
  const messageNumbers = new Map();
  let currentNumber = null; // null means autonumber is off

  // Process nodes in order to track autonumber state
  for (const node of ast) {
    if (node.type === 'directive' && node.directiveType === 'autonumber') {
      currentNumber = node.value; // null for off, number for starting value
    } else if (node.type === 'message' && currentNumber !== null) {
      messageNumbers.set(node.id, currentNumber);
      currentNumber++;
    } else if (node.type === 'fragment') {
      // Process messages inside fragments
      processFragmentNumbers(node, ast, messageNumbers, { current: currentNumber });
      // Update currentNumber based on what was used
      const lastEntry = getLastFragmentMessage(node, ast);
      if (lastEntry && messageNumbers.has(lastEntry)) {
        currentNumber = messageNumbers.get(lastEntry) + 1;
      }
    }
  }

  return messageNumbers;
}

/**
 * Process autonumbers for messages inside a fragment
 */
function processFragmentNumbers(fragment, ast, messageNumbers, state) {
  const nodeById = new Map();
  for (const n of ast) nodeById.set(n.id, n);

  const processEntries = (entries) => {
    for (const entryId of entries) {
      const entry = nodeById.get(entryId);
      if (!entry) continue;

      if (entry.type === 'message' && state.current !== null) {
        messageNumbers.set(entry.id, state.current);
        state.current++;
      } else if (entry.type === 'fragment') {
        processFragmentNumbers(entry, ast, messageNumbers, state);
      }
    }
  };

  processEntries(fragment.entries);
  for (const elseClause of fragment.elseClauses) {
    processEntries(elseClause.entries);
  }
}

/**
 * Get the last message ID in a fragment
 */
function getLastFragmentMessage(fragment, ast) {
  const nodeById = new Map();
  for (const n of ast) nodeById.set(n.id, n);

  let lastMessage = null;

  const processEntries = (entries) => {
    for (const entryId of entries) {
      const entry = nodeById.get(entryId);
      if (!entry) continue;
      if (entry.type === 'message') {
        lastMessage = entry.id;
      } else if (entry.type === 'fragment') {
        const nested = getLastFragmentMessage(entry, ast);
        if (nested) lastMessage = nested;
      }
    }
  };

  processEntries(fragment.entries);
  for (const elseClause of fragment.elseClauses) {
    processEntries(elseClause.entries);
  }

  return lastMessage;
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

  // Solid arrowhead start (for bidirectional <->)
  const solidArrowStart = document.createElementNS(SVG_NS, 'marker');
  solidArrowStart.setAttribute('id', 'arrowhead-solid-start');
  solidArrowStart.setAttribute('markerWidth', '10');
  solidArrowStart.setAttribute('markerHeight', '7');
  solidArrowStart.setAttribute('refX', '1');
  solidArrowStart.setAttribute('refY', '3.5');
  solidArrowStart.setAttribute('orient', 'auto');

  const solidStartPath = document.createElementNS(SVG_NS, 'polygon');
  solidStartPath.setAttribute('points', '10 0, 0 3.5, 10 7');
  solidStartPath.setAttribute('fill', 'black');
  solidArrowStart.appendChild(solidStartPath);
  defs.appendChild(solidArrowStart);

  // Open arrowhead start (for bidirectional <->>)
  const openArrowStart = document.createElementNS(SVG_NS, 'marker');
  openArrowStart.setAttribute('id', 'arrowhead-open-start');
  openArrowStart.setAttribute('markerWidth', '10');
  openArrowStart.setAttribute('markerHeight', '7');
  openArrowStart.setAttribute('refX', '1');
  openArrowStart.setAttribute('refY', '3.5');
  openArrowStart.setAttribute('orient', 'auto');

  const openStartPath = document.createElementNS(SVG_NS, 'polyline');
  openStartPath.setAttribute('points', '10 0, 0 3.5, 10 7');
  openStartPath.setAttribute('fill', 'none');
  openStartPath.setAttribute('stroke', 'black');
  openStartPath.setAttribute('stroke-width', '1');
  openArrowStart.appendChild(openStartPath);
  defs.appendChild(openArrowStart);

  // X terminator for lost messages (-x)
  const xMarker = document.createElementNS(SVG_NS, 'marker');
  xMarker.setAttribute('id', 'arrowhead-x');
  xMarker.setAttribute('markerWidth', '10');
  xMarker.setAttribute('markerHeight', '10');
  xMarker.setAttribute('refX', '5');
  xMarker.setAttribute('refY', '5');
  xMarker.setAttribute('orient', 'auto');

  const xPath = document.createElementNS(SVG_NS, 'path');
  xPath.setAttribute('d', 'M 0 0 L 10 10 M 10 0 L 0 10');
  xPath.setAttribute('stroke', 'black');
  xPath.setAttribute('stroke-width', '2');
  xMarker.appendChild(xPath);
  defs.appendChild(xMarker);

  return defs;
}
