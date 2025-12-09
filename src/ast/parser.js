// Text -> AST parser
// See DESIGN.md for parser strategy and AST structure

import { generateId } from './nodes.js';

/**
 * Parse sequence diagram text into AST
 * @param {string} text - Source text
 * @returns {Array} AST nodes array
 */
export function parse(text) {
  const lines = text.split('\n');
  const ast = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1; // 1-indexed

    const node = parseLine(line, lineNumber);
    if (node) {
      ast.push(node);
    }
  }

  return ast;
}

/**
 * Parse a single line into an AST node
 * @param {string} line - Source line
 * @param {number} lineNumber - 1-indexed line number
 * @returns {Object|null} AST node or null for empty/unrecognized lines
 */
function parseLine(line, lineNumber) {
  const trimmed = line.trim();

  // Skip empty lines for now
  if (!trimmed) {
    return null;
  }

  // Try parsing as participant
  const participant = parseParticipant(trimmed, lineNumber);
  if (participant) {
    return participant;
  }

  // Unrecognized line - skip for now
  // TODO(Phase1): Add error node creation in BACKLOG-048
  return null;
}

/**
 * Parse a participant declaration
 * Syntax: participant Name
 * @param {string} line - Trimmed source line
 * @param {number} lineNumber - 1-indexed line number
 * @returns {Object|null} Participant AST node or null
 */
function parseParticipant(line, lineNumber) {
  // Match: participant Name
  const match = line.match(/^(participant|actor|database)\s+(\S+)$/);
  if (!match) {
    return null;
  }

  const [, participantType, name] = match;

  return {
    id: generateId('participant'),
    type: 'participant',
    participantType,
    alias: name,
    displayName: name,
    style: {},
    sourceLineStart: lineNumber,
    sourceLineEnd: lineNumber
  };
}
