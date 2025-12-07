// AST node type definitions and ID generation
// See DESIGN.md for complete schema documentation

export const NODE_TYPES = {
  PARTICIPANT: 'participant',
  MESSAGE: 'message',
  FRAGMENT: 'fragment',
  COMMENT: 'comment',
  BLANKLINE: 'blankline',
  DIRECTIVE: 'directive',
  ERROR: 'error'
};

export const PARTICIPANT_TYPES = {
  PARTICIPANT: 'participant',
  ACTOR: 'actor',
  DATABASE: 'database'
  // Additional types added in Phase 5
};

export const ARROW_TYPES = {
  SYNC: '->',
  ASYNC: '->>',
  RETURN: '-->',
  ASYNC_RETURN: '-->>'
  // Additional types added in Phase 5
};

export const FRAGMENT_TYPES = {
  ALT: 'alt',
  LOOP: 'loop'
  // Additional types added in Phase 5
};

const TYPE_PREFIXES = {
  participant: 'p',
  message: 'm',
  fragment: 'f',
  comment: 'c',
  blankline: 'bl',
  directive: 'd',
  error: 'e'
};

/**
 * Generate a unique ID for an AST node
 * Format: {type-prefix}_{8-random-chars}
 */
export function generateId(type) {
  const prefix = TYPE_PREFIXES[type] || 'n';
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${random}`;
}
