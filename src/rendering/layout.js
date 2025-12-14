// Layout calculation for AST nodes
// See DESIGN.md for layout algorithm details

// Layout constants
const PARTICIPANT_WIDTH = 100;
const PARTICIPANT_HEIGHT = 60;
const PARTICIPANT_SPACING = 150;
const PARTICIPANT_START_X = 50;
const PARTICIPANT_START_Y = 50;
const TITLE_HEIGHT = 30; // Extra space when title present
const MESSAGE_START_Y = 130; // Below participants
const DEFAULT_MESSAGE_SPACING = 50;
const BLANKLINE_SPACING = 20;
const ERROR_HEIGHT = 40;
const FRAGMENT_PADDING = 30;
const NOTE_HEIGHT = 40;
const NOTE_WIDTH = 100;
const NOTE_MARGIN = 10;
const DIVIDER_HEIGHT = 24;
const MARGIN = 50;

/**
 * Calculate positions for all AST nodes
 * @param {Array} ast - AST nodes array
 * @returns {Object} Layout info: { layout: Map, totalHeight: number, participantLayout: Map }
 */
export function calculateLayout(ast) {
  const layout = new Map();
  const participantMap = buildParticipantMap(ast);

  // Check for title directive
  const titleDirective = ast.find(n => n.type === 'directive' && n.directiveType === 'title');
  const titleOffset = titleDirective ? TITLE_HEIGHT : 0;

  // Check for entryspacing directive
  const entryspacingDirective = ast.find(n => n.type === 'directive' && n.directiveType === 'entryspacing');
  const messageSpacing = entryspacingDirective ? DEFAULT_MESSAGE_SPACING * entryspacingDirective.value : DEFAULT_MESSAGE_SPACING;

  // Calculate participant positions
  const participantLayout = new Map();
  const participants = ast.filter(n => n.type === 'participant');
  participants.forEach((p, index) => {
    const x = PARTICIPANT_START_X + (index * PARTICIPANT_SPACING);
    participantLayout.set(p.alias, {
      x,
      y: PARTICIPANT_START_Y + titleOffset,
      width: PARTICIPANT_WIDTH,
      height: PARTICIPANT_HEIGHT,
      centerX: x + PARTICIPANT_WIDTH / 2
    });
    layout.set(p.id, participantLayout.get(p.alias));
  });

  // Build node lookup by ID
  const nodeById = new Map();
  for (const node of ast) {
    nodeById.set(node.id, node);
  }

  // Track which entries belong to fragments (to avoid double-processing)
  const fragmentEntries = new Set();
  for (const node of ast) {
    if (node.type === 'fragment') {
      for (const entryId of node.entries) {
        fragmentEntries.add(entryId);
      }
      for (const elseClause of node.elseClauses) {
        for (const entryId of elseClause.entries) {
          fragmentEntries.add(entryId);
        }
      }
    }
  }

  // Calculate positions for messages and fragments
  let currentY = MESSAGE_START_Y + titleOffset;

  for (const node of ast) {
    // Skip participants (already handled)
    if (node.type === 'participant') continue;

    // Skip entries that are part of a fragment (they'll be laid out by the fragment)
    if (fragmentEntries.has(node.id)) continue;

    // Skip comments and directives (they don't affect layout)
    if (node.type === 'comment' || node.type === 'directive') continue;

    // Handle blank lines - add spacing
    if (node.type === 'blankline') {
      currentY += BLANKLINE_SPACING;
      continue;
    }

    if (node.type === 'error') {
      // Error nodes get a full-width warning box
      const allParticipants = Array.from(participantLayout.values());
      const minX = allParticipants.length > 0
        ? Math.min(...allParticipants.map(p => p.x)) - 10
        : PARTICIPANT_START_X - 10;
      const maxX = allParticipants.length > 0
        ? Math.max(...allParticipants.map(p => p.x + PARTICIPANT_WIDTH)) + 10
        : PARTICIPANT_START_X + PARTICIPANT_WIDTH + 10;

      layout.set(node.id, {
        x: minX,
        y: currentY,
        width: maxX - minX,
        height: ERROR_HEIGHT
      });
      currentY += ERROR_HEIGHT + 10;
    } else if (node.type === 'message') {
      const fromLayout = participantLayout.get(node.from);
      const toLayout = participantLayout.get(node.to);

      // Delayed messages need extra vertical space for the slope
      const delayHeight = node.delay ? node.delay * 10 : 0;
      const totalHeight = messageSpacing + delayHeight;

      if (fromLayout && toLayout) {
        layout.set(node.id, {
          y: currentY,
          fromX: fromLayout.centerX,
          toX: toLayout.centerX,
          height: totalHeight,
          delay: node.delay || 0
        });
      }
      currentY += totalHeight;
    } else if (node.type === 'note') {
      // Calculate note position based on participants and position
      const noteLayout = calculateNoteLayout(node, participantLayout);
      noteLayout.y = currentY;
      layout.set(node.id, noteLayout);
      currentY += noteLayout.height + NOTE_MARGIN;
    } else if (node.type === 'divider') {
      // Dividers span the full width
      const allParticipants = Array.from(participantLayout.values());
      const minX = allParticipants.length > 0
        ? Math.min(...allParticipants.map(p => p.x)) - 20
        : PARTICIPANT_START_X - 20;
      const maxX = allParticipants.length > 0
        ? Math.max(...allParticipants.map(p => p.x + PARTICIPANT_WIDTH)) + 20
        : PARTICIPANT_START_X + PARTICIPANT_WIDTH + 20;

      layout.set(node.id, {
        x: minX,
        y: currentY,
        width: maxX - minX,
        height: DIVIDER_HEIGHT
      });
      currentY += DIVIDER_HEIGHT + NOTE_MARGIN;
    } else if (node.type === 'fragment') {
      const fragmentStart = currentY;
      currentY += FRAGMENT_PADDING; // Top padding

      // Layout entries in the main section
      for (const entryId of node.entries) {
        currentY = layoutEntry(entryId, nodeById, participantLayout, layout, currentY, messageSpacing);
      }

      // Layout else clauses
      for (const elseClause of node.elseClauses) {
        // Store else clause divider position
        elseClause.dividerY = currentY;

        for (const entryId of elseClause.entries) {
          currentY = layoutEntry(entryId, nodeById, participantLayout, layout, currentY, messageSpacing);
        }
      }

      currentY += FRAGMENT_PADDING; // Bottom padding

      // Calculate fragment horizontal bounds
      const bounds = getFragmentBounds(node, nodeById, participantLayout);

      layout.set(node.id, {
        y: fragmentStart,
        height: currentY - fragmentStart,
        x: bounds.minX,
        width: bounds.maxX - bounds.minX,
        type: 'fragment'
      });
    }
  }

  // Calculate total height
  const totalHeight = currentY + MARGIN;

  return {
    layout,
    totalHeight,
    participantLayout
  };
}

/**
 * Layout a single entry (message or nested fragment) and return the new Y position
 * @param {string|Object} entryId - Entry ID or entry object
 * @param {Map} nodeById - Node lookup map
 * @param {Map} participantLayout - Participant positions
 * @param {Map} layout - Layout result map
 * @param {number} currentY - Current Y position
 * @param {number} messageSpacing - Spacing between messages
 * @returns {number} New Y position
 */
function layoutEntry(entryId, nodeById, participantLayout, layout, currentY, messageSpacing) {
  const entry = typeof entryId === 'object' ? entryId : nodeById.get(entryId);
  if (!entry) return currentY;

  // Skip comments (they don't affect layout)
  if (entry.type === 'comment') return currentY;

  // Handle blank lines - add spacing
  if (entry.type === 'blankline') {
    return currentY + BLANKLINE_SPACING;
  }

  // Handle error nodes inside fragments
  if (entry.type === 'error') {
    const allParticipants = Array.from(participantLayout.values());
    const minX = allParticipants.length > 0
      ? Math.min(...allParticipants.map(p => p.x)) - 10
      : PARTICIPANT_START_X - 10;
    const maxX = allParticipants.length > 0
      ? Math.max(...allParticipants.map(p => p.x + PARTICIPANT_WIDTH)) + 10
      : PARTICIPANT_START_X + PARTICIPANT_WIDTH + 10;

    layout.set(entry.id, {
      x: minX,
      y: currentY,
      width: maxX - minX,
      height: ERROR_HEIGHT
    });
    return currentY + ERROR_HEIGHT + 10;
  }

  if (entry.type === 'message') {
    const fromLayout = participantLayout.get(entry.from);
    const toLayout = participantLayout.get(entry.to);

    // Delayed messages need extra vertical space for the slope
    const delayHeight = entry.delay ? entry.delay * 10 : 0;
    const totalHeight = messageSpacing + delayHeight;

    if (fromLayout && toLayout) {
      layout.set(entry.id, {
        y: currentY,
        fromX: fromLayout.centerX,
        toX: toLayout.centerX,
        height: totalHeight,
        delay: entry.delay || 0
      });
    }
    return currentY + totalHeight;
  }

  if (entry.type === 'fragment') {
    // Nested fragment
    const fragmentStart = currentY;
    currentY += FRAGMENT_PADDING;

    for (const nestedEntryId of entry.entries) {
      currentY = layoutEntry(nestedEntryId, nodeById, participantLayout, layout, currentY, messageSpacing);
    }

    for (const elseClause of entry.elseClauses) {
      elseClause.dividerY = currentY;
      for (const nestedEntryId of elseClause.entries) {
        currentY = layoutEntry(nestedEntryId, nodeById, participantLayout, layout, currentY, messageSpacing);
      }
    }

    currentY += FRAGMENT_PADDING;

    const bounds = getFragmentBounds(entry, nodeById, participantLayout);

    layout.set(entry.id, {
      y: fragmentStart,
      height: currentY - fragmentStart,
      x: bounds.minX,
      width: bounds.maxX - bounds.minX,
      type: 'fragment'
    });
  }

  return currentY;
}

/**
 * Calculate the horizontal bounds of a fragment based on participants referenced in its entries
 */
function getFragmentBounds(fragment, nodeById, participantLayout) {
  const participantXPositions = [];

  // Collect all participants referenced in fragment's messages
  const allEntries = [
    ...fragment.entries,
    ...fragment.elseClauses.flatMap(c => c.entries)
  ];

  for (const entryId of allEntries) {
    const entry = nodeById.get(entryId);
    if (!entry) continue;

    if (entry.type === 'message') {
      const fromLayout = participantLayout.get(entry.from);
      const toLayout = participantLayout.get(entry.to);
      if (fromLayout) participantXPositions.push(fromLayout.x, fromLayout.x + PARTICIPANT_WIDTH);
      if (toLayout) participantXPositions.push(toLayout.x, toLayout.x + PARTICIPANT_WIDTH);
    } else if (entry.type === 'fragment') {
      // For nested fragments, include their bounds
      const nestedBounds = getFragmentBounds(entry, nodeById, participantLayout);
      participantXPositions.push(nestedBounds.minX, nestedBounds.maxX);
    }
  }

  // If no participants found, use default bounds (full width)
  if (participantXPositions.length === 0) {
    const allParticipants = Array.from(participantLayout.values());
    if (allParticipants.length > 0) {
      const minX = Math.min(...allParticipants.map(p => p.x));
      const maxX = Math.max(...allParticipants.map(p => p.x + PARTICIPANT_WIDTH));
      return { minX: minX - 20, maxX: maxX + 20 };
    }
    return { minX: PARTICIPANT_START_X - 20, maxX: PARTICIPANT_START_X + PARTICIPANT_WIDTH + 20 };
  }

  return {
    minX: Math.min(...participantXPositions) - 20,
    maxX: Math.max(...participantXPositions) + 20
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

/**
 * Calculate note layout based on participants and position
 * @param {Object} node - Note AST node
 * @param {Map} participantLayout - Participant positions
 * @returns {Object} Layout info {x, width, height}
 */
function calculateNoteLayout(node, participantLayout) {
  const participants = node.participants || [];
  const position = node.position || 'over';

  // Default dimensions
  let x = PARTICIPANT_START_X;
  let width = NOTE_WIDTH;
  const height = NOTE_HEIGHT;

  if (participants.length === 0) {
    // No participants specified, place at left
    return { x, width, height };
  }

  // Get positions of referenced participants
  const pLayouts = participants.map(p => participantLayout.get(p)).filter(Boolean);

  if (pLayouts.length === 0) {
    // Participants not found, use default
    return { x, width, height };
  }

  if (position === 'over') {
    // Center over participant(s)
    if (pLayouts.length === 1) {
      // Over single participant
      x = pLayouts[0].centerX - NOTE_WIDTH / 2;
    } else {
      // Over multiple participants - span between them
      const minX = Math.min(...pLayouts.map(p => p.centerX));
      const maxX = Math.max(...pLayouts.map(p => p.centerX));
      x = minX - NOTE_WIDTH / 4;
      width = maxX - minX + NOTE_WIDTH / 2;
    }
  } else if (position === 'left of') {
    // Place to the left of the participant
    x = pLayouts[0].x - NOTE_WIDTH - NOTE_MARGIN;
  } else if (position === 'right of') {
    // Place to the right of the participant
    x = pLayouts[0].x + PARTICIPANT_WIDTH + NOTE_MARGIN;
  }

  return { x, width, height };
}
