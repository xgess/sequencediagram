// Layout calculation for AST nodes
// See DESIGN.md for layout algorithm details

import { getLineCount } from '../markup/renderer.js';

// Layout constants
const LINE_HEIGHT = 16; // Height per line of text
const CHAR_WIDTH = 5.5; // Approximate width per character for note sizing (11px font)
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
const NOTE_HEIGHT = 28; // Reduced for tighter fit
const NOTE_WIDTH = 50; // Reduced for tighter fit
const NOTE_PADDING_H = 8; // Horizontal padding around text
const NOTE_PADDING_V = 6; // Vertical padding around text
const NOTE_MARGIN = 35; // Extra margin to account for message labels above arrows
const NOTE_CONNECTOR_GAP = 8; // Gap between note and lifeline connector
const DIVIDER_HEIGHT = 24;
const MARGIN = 50;
const BOUNDARY_OFFSET = 30; // How far outside diagram bounds for boundary messages

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

  // Check for participantspacing directive
  const participantSpacingDirective = ast.find(n => n.type === 'directive' && n.directiveType === 'participantspacing');
  let participantSpacing = PARTICIPANT_SPACING;
  if (participantSpacingDirective) {
    if (participantSpacingDirective.value === 'equal') {
      // Equal spacing will be calculated after we know how many participants there are
      participantSpacing = 'equal';
    } else {
      participantSpacing = participantSpacingDirective.value;
    }
  }

  // Calculate participant positions with adjustments for notes
  const participantLayout = new Map();
  const participants = ast.filter(n => n.type === 'participant');
  const participantOrder = participants.map(p => p.alias);

  // Pre-calculate note widths to determine extra spacing needed between participants
  // This handles "left of" and "right of" notes that need space between lifelines
  const notes = ast.filter(n => n.type === 'note');
  const extraSpacingNeeded = new Map(); // participantIndex -> extra pixels needed before it

  for (const note of notes) {
    if (!note.participants || note.participants.length === 0) continue;
    const targetAlias = note.participants[0];
    const targetIndex = participantOrder.indexOf(targetAlias);
    if (targetIndex < 0) continue;

    // Calculate note dimensions
    const text = note.text || '';
    const lines = text.split('\\n');
    const maxLineLength = Math.max(...lines.map(l => l.length), 1);
    const noteWidth = Math.max(NOTE_WIDTH, maxLineLength * CHAR_WIDTH + NOTE_PADDING_H * 2);

    if (note.position === 'left of' && targetIndex > 0) {
      // Note needs space between previous participant and this one
      const spaceNeeded = noteWidth + NOTE_CONNECTOR_GAP * 2;
      const current = extraSpacingNeeded.get(targetIndex) || 0;
      extraSpacingNeeded.set(targetIndex, Math.max(current, spaceNeeded));
    } else if (note.position === 'right of' && targetIndex < participantOrder.length - 1) {
      // Note needs space between this participant and next one
      const spaceNeeded = noteWidth + NOTE_CONNECTOR_GAP * 2;
      const current = extraSpacingNeeded.get(targetIndex + 1) || 0;
      extraSpacingNeeded.set(targetIndex + 1, Math.max(current, spaceNeeded));
    }
  }

  // Handle equal spacing - calculate based on number of participants
  let baseSpacing = participantSpacing;
  if (participantSpacing === 'equal' && participants.length > 1) {
    const totalWidth = (participants.length - 1) * PARTICIPANT_SPACING;
    baseSpacing = totalWidth / (participants.length - 1);
  } else if (participantSpacing === 'equal') {
    baseSpacing = PARTICIPANT_SPACING;
  }

  // Position participants with adjusted spacing
  let currentX = PARTICIPANT_START_X;
  participants.forEach((p, index) => {
    // Add any extra spacing needed before this participant
    if (index > 0) {
      const extraSpace = extraSpacingNeeded.get(index) || 0;
      const spacing = Math.max(baseSpacing, extraSpace);
      currentX += spacing;
    }

    participantLayout.set(p.alias, {
      x: currentX,
      y: PARTICIPANT_START_Y + titleOffset,
      width: PARTICIPANT_WIDTH,
      height: PARTICIPANT_HEIGHT,
      centerX: currentX + PARTICIPANT_WIDTH / 2
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

  // Track linear/parallel mode state
  let linearMode = false;
  let parallelMode = false;
  let parallelStartY = null; // Y position where parallel section starts
  let parallelMaxHeight = 0; // Track max height in parallel section

  for (const node of ast) {
    // Skip participants (already handled)
    if (node.type === 'participant') continue;

    // Skip entries that are part of a fragment (they'll be laid out by the fragment)
    if (fragmentEntries.has(node.id)) continue;

    // Skip comments (they don't affect layout)
    if (node.type === 'comment') continue;

    // Handle space directive - add or subtract vertical space
    if (node.type === 'directive' && node.directiveType === 'space') {
      currentY += node.value * BLANKLINE_SPACING;
      continue;
    }

    // Handle linear directive
    if (node.type === 'directive' && node.directiveType === 'linear') {
      linearMode = node.value;
      continue;
    }

    // Handle parallel directive
    if (node.type === 'directive' && node.directiveType === 'parallel') {
      if (node.value) {
        // Starting parallel mode
        parallelMode = true;
        parallelStartY = currentY;
        parallelMaxHeight = 0;
      } else {
        // Ending parallel mode - move currentY past the tallest element
        parallelMode = false;
        if (parallelMaxHeight > 0) {
          currentY = parallelStartY + parallelMaxHeight;
        }
        parallelStartY = null;
        parallelMaxHeight = 0;
      }
      continue;
    }

    // Handle destroy directives - record position for lifeline termination
    if (node.type === 'directive' &&
        (node.directiveType === 'destroy' ||
         node.directiveType === 'destroyafter' ||
         node.directiveType === 'destroysilent')) {
      // Store the Y position where the destroy occurs
      layout.set(node.id, {
        y: currentY,
        type: 'destroy'
      });
      // destroyafter adds extra space after the destroy marker
      if (node.directiveType === 'destroyafter') {
        currentY += DEFAULT_MESSAGE_SPACING;
      }
      continue;
    }

    // Handle activate/deactivate directives - record Y position
    if (node.type === 'directive' &&
        (node.directiveType === 'activate' ||
         node.directiveType === 'deactivate' ||
         node.directiveType === 'deactivateafter')) {
      layout.set(node.id, {
        y: currentY,
        type: node.directiveType
      });
      // deactivateafter adds extra space
      if (node.directiveType === 'deactivateafter') {
        currentY += DEFAULT_MESSAGE_SPACING;
      }
      continue;
    }

    // Skip other directives (they don't affect layout)
    if (node.type === 'directive') continue;

    // Skip blank lines - they don't add visual space (use 'space' directive for that)
    if (node.type === 'blankline') {
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
      // Calculate boundary positions
      const allParticipants = Array.from(participantLayout.values());
      const leftBoundary = allParticipants.length > 0
        ? Math.min(...allParticipants.map(p => p.x)) - BOUNDARY_OFFSET
        : PARTICIPANT_START_X - BOUNDARY_OFFSET;
      const rightBoundary = allParticipants.length > 0
        ? Math.max(...allParticipants.map(p => p.x + PARTICIPANT_WIDTH)) + BOUNDARY_OFFSET
        : PARTICIPANT_START_X + PARTICIPANT_WIDTH + BOUNDARY_OFFSET;

      // Get from/to positions (handle boundary markers)
      let fromX, toX;
      if (node.from === '[') {
        fromX = leftBoundary;
      } else {
        const fromLayout = participantLayout.get(node.from);
        fromX = fromLayout ? fromLayout.centerX : leftBoundary;
      }

      if (node.to === ']') {
        toX = rightBoundary;
      } else {
        const toLayout = participantLayout.get(node.to);
        toX = toLayout ? toLayout.centerX : rightBoundary;
      }

      // Delayed messages need extra vertical space for the slope
      const delayHeight = node.delay ? node.delay * 10 : 0;
      // Multiline labels need extra vertical space above the arrow
      const lineCount = node.label ? getLineCount(node.label) : 1;
      const labelHeight = lineCount > 1 ? (lineCount - 1) * LINE_HEIGHT : 0;
      const totalHeight = messageSpacing + delayHeight + labelHeight;

      // In parallel mode, all messages are at the same Y position
      // Offset Y by labelHeight so multiline labels don't overlap previous element
      const messageY = parallelMode ? parallelStartY + labelHeight : currentY + labelHeight;

      layout.set(node.id, {
        y: messageY,
        fromX,
        toX,
        height: totalHeight,
        delay: node.delay || 0,
        isBoundary: node.from === '[' || node.to === ']'
      });

      if (parallelMode) {
        // Track the max height in the parallel section
        parallelMaxHeight = Math.max(parallelMaxHeight, totalHeight);
      } else {
        currentY += totalHeight;
      }
    } else if (node.type === 'note') {
      // Calculate note position based on participants and position
      const noteLayout = calculateNoteLayout(node, participantLayout, participantOrder);
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

      // For collapsed expandable fragments, only show header
      if (node.fragmentType === 'expandable' && node.collapsed) {
        // Collapsed: just add minimal padding for the header
        currentY += 10; // Minimal content area
      } else {
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
      }

      currentY += FRAGMENT_PADDING; // Bottom padding

      // Calculate fragment horizontal bounds
      const bounds = getFragmentBounds(node, nodeById, participantLayout);

      layout.set(node.id, {
        y: fragmentStart,
        height: currentY - fragmentStart,
        x: bounds.minX,
        width: bounds.maxX - bounds.minX,
        type: 'fragment',
        collapsed: node.collapsed || false
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

  // Skip blank lines - they don't add visual space (use 'space' directive for that)
  if (entry.type === 'blankline') {
    return currentY;
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
    // Calculate boundary positions
    const allParticipants = Array.from(participantLayout.values());
    const leftBoundary = allParticipants.length > 0
      ? Math.min(...allParticipants.map(p => p.x)) - BOUNDARY_OFFSET
      : PARTICIPANT_START_X - BOUNDARY_OFFSET;
    const rightBoundary = allParticipants.length > 0
      ? Math.max(...allParticipants.map(p => p.x + PARTICIPANT_WIDTH)) + BOUNDARY_OFFSET
      : PARTICIPANT_START_X + PARTICIPANT_WIDTH + BOUNDARY_OFFSET;

    // Get from/to positions (handle boundary markers)
    let fromX, toX;
    if (entry.from === '[') {
      fromX = leftBoundary;
    } else {
      const fromLayout = participantLayout.get(entry.from);
      fromX = fromLayout ? fromLayout.centerX : leftBoundary;
    }

    if (entry.to === ']') {
      toX = rightBoundary;
    } else {
      const toLayout = participantLayout.get(entry.to);
      toX = toLayout ? toLayout.centerX : rightBoundary;
    }

    // Delayed messages need extra vertical space for the slope
    const delayHeight = entry.delay ? entry.delay * 10 : 0;
    // Multiline labels need extra vertical space
    const lineCount = entry.label ? getLineCount(entry.label) : 1;
    const labelHeight = lineCount > 1 ? (lineCount - 1) * LINE_HEIGHT : 0;
    const totalHeight = messageSpacing + delayHeight + labelHeight;

    layout.set(entry.id, {
      y: currentY,
      fromX,
      toX,
      height: totalHeight,
      delay: entry.delay || 0,
      isBoundary: entry.from === '[' || entry.to === ']'
    });

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
function calculateNoteLayout(node, participantLayout, participantOrder = []) {
  const participants = node.participants || [];
  const position = node.position || 'over';
  const text = node.text || '';

  // Calculate dimensions based on text content
  // Handle \n as line breaks
  const lines = text.split('\\n');
  const lineCount = lines.length;
  const maxLineLength = Math.max(...lines.map(l => l.length), 1);

  // Calculate width based on longest line (with tighter padding)
  const textWidth = maxLineLength * CHAR_WIDTH + NOTE_PADDING_H * 2;
  let width = Math.max(NOTE_WIDTH, textWidth);

  // Calculate height based on number of lines (with tighter padding)
  const textHeight = lineCount * LINE_HEIGHT + NOTE_PADDING_V * 2;
  const height = Math.max(NOTE_HEIGHT, textHeight);

  // Default X position
  let x = PARTICIPANT_START_X;

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
      // Over single participant - center the note
      x = pLayouts[0].centerX - width / 2;
    } else {
      // Over multiple participants - span between them
      const minX = Math.min(...pLayouts.map(p => p.centerX));
      const maxX = Math.max(...pLayouts.map(p => p.centerX));
      x = minX - width / 4;
      width = Math.max(width, maxX - minX + width / 2);
    }
  } else if (position === 'left of') {
    // Place to the left of the participant's lifeline
    const lifelineX = pLayouts[0].centerX;

    // Position note to the left of the lifeline with a gap
    // Allow negative X - the viewBox will expand to accommodate
    x = lifelineX - width - NOTE_CONNECTOR_GAP;

    return { x, width, height, connectorX: lifelineX, connectorSide: 'left' };
  } else if (position === 'right of') {
    // Place to the right of the participant's lifeline
    const targetAlias = participants[0];
    const lifelineX = pLayouts[0].centerX;

    // Find the participant to the right (if any)
    const targetIndex = participantOrder.indexOf(targetAlias);
    let rightBoundary = Infinity; // Default: no limit

    if (targetIndex >= 0 && targetIndex < participantOrder.length - 1) {
      const rightParticipant = participantOrder[targetIndex + 1];
      const rightLayout = participantLayout.get(rightParticipant);
      if (rightLayout) {
        // Don't overlap the next participant
        rightBoundary = rightLayout.centerX - NOTE_CONNECTOR_GAP;
      }
    }

    x = lifelineX + NOTE_CONNECTOR_GAP;
    // Note: we allow the note to extend past rightBoundary if needed
    // The diagram will expand to accommodate

    return { x, width, height, connectorX: lifelineX, connectorSide: 'right' };
  }

  return { x, width, height };
}
