// Layout calculation for AST nodes
// See DESIGN.md for layout algorithm details

// Layout constants
const PARTICIPANT_WIDTH = 100;
const PARTICIPANT_HEIGHT = 60;
const PARTICIPANT_SPACING = 150;
const PARTICIPANT_START_X = 50;
const PARTICIPANT_START_Y = 50;
const MESSAGE_START_Y = 130; // Below participants
const MESSAGE_SPACING = 50;
const MARGIN = 50;

/**
 * Calculate positions for all AST nodes
 * @param {Array} ast - AST nodes array
 * @returns {Object} Layout info: { layout: Map, totalHeight: number, participantLayout: Map }
 */
export function calculateLayout(ast) {
  const layout = new Map();
  const participantMap = buildParticipantMap(ast);

  // Calculate participant positions
  const participantLayout = new Map();
  const participants = ast.filter(n => n.type === 'participant');
  participants.forEach((p, index) => {
    const x = PARTICIPANT_START_X + (index * PARTICIPANT_SPACING);
    participantLayout.set(p.alias, {
      x,
      y: PARTICIPANT_START_Y,
      width: PARTICIPANT_WIDTH,
      height: PARTICIPANT_HEIGHT,
      centerX: x + PARTICIPANT_WIDTH / 2
    });
    layout.set(p.id, participantLayout.get(p.alias));
  });

  // Calculate message positions
  let currentY = MESSAGE_START_Y;
  const messages = ast.filter(n => n.type === 'message');
  messages.forEach(m => {
    const fromLayout = participantLayout.get(m.from);
    const toLayout = participantLayout.get(m.to);

    if (fromLayout && toLayout) {
      layout.set(m.id, {
        y: currentY,
        fromX: fromLayout.centerX,
        toX: toLayout.centerX,
        height: MESSAGE_SPACING
      });
    }
    currentY += MESSAGE_SPACING;
  });

  // Calculate total height
  const totalHeight = currentY + MARGIN;

  return {
    layout,
    totalHeight,
    participantLayout
  };
}

/**
 * Build participant alias to node lookup map
 * @param {Array} ast - AST nodes array
 * @returns {Map} alias -> participant node
 */
export function buildParticipantMap(ast) {
  const map = new Map();
  for (const node of ast) {
    if (node.type === 'participant') {
      map.set(node.alias, node);
    }
  }
  return map;
}
