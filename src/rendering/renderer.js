// AST -> SVG renderer (main entry point)
// See DESIGN.md for SVG structure and rendering strategy

import { renderParticipant } from './participants.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Layout constants (hardcoded for Phase 1)
const PARTICIPANT_WIDTH = 100;
const PARTICIPANT_HEIGHT = 60;
const PARTICIPANT_SPACING = 150;
const PARTICIPANT_START_X = 50;
const PARTICIPANT_START_Y = 50;
const MARGIN = 50;

/**
 * Render AST to SVG element
 * @param {Array} ast - AST nodes array
 * @returns {SVGElement} Rendered SVG
 */
export function render(ast) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('id', 'diagram');

  // Create container groups
  const participantsGroup = document.createElementNS(SVG_NS, 'g');
  participantsGroup.setAttribute('id', 'participants');
  svg.appendChild(participantsGroup);

  // Get participants from AST
  const participants = ast.filter(node => node.type === 'participant');

  // Render each participant
  participants.forEach((participant, index) => {
    const layoutInfo = {
      x: PARTICIPANT_START_X + (index * PARTICIPANT_SPACING),
      y: PARTICIPANT_START_Y,
      width: PARTICIPANT_WIDTH,
      height: PARTICIPANT_HEIGHT
    };

    const participantEl = renderParticipant(participant, layoutInfo);
    participantsGroup.appendChild(participantEl);
  });

  // Set SVG dimensions
  const width = participants.length > 0
    ? PARTICIPANT_START_X + (participants.length * PARTICIPANT_SPACING) + MARGIN
    : 300;
  const height = PARTICIPANT_START_Y + PARTICIPANT_HEIGHT + MARGIN;

  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  return svg;
}
