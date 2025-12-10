// CodeMirror auto-completion (hint) for sequence diagrams
// Provides suggestions for keywords and participant aliases

// Static keywords
const KEYWORDS = [
  // Participant types
  'participant', 'actor', 'database', 'rparticipant', 'boundary', 'control', 'entity',
  // Fragment types
  'alt', 'else', 'end', 'loop', 'opt', 'par', 'break', 'critical', 'ref', 'seq', 'strict',
  'neg', 'ignore', 'consider', 'assert', 'region', 'group', 'expandable',
  // Lifecycle
  'activate', 'deactivate', 'destroy', 'destroyafter', 'destroysilent', 'create',
  // Notes and boxes
  'note', 'box', 'abox', 'rbox', 'state', 'divider',
  // Position keywords
  'over', 'left', 'right', 'of', 'as',
  // Directives
  'title', 'space', 'autoactivation', 'activecolor', 'participantspacing',
  'entryspacing', 'lifelinestyle', 'autonumber', 'linear', 'parallel',
  'frame', 'participantgroup', 'bottomparticipants', 'fontfamily',
  // Style keywords
  'style', 'participantstyle', 'notestyle', 'messagestyle', 'dividerstyle',
  'boxstyle', 'aboxstyle', 'rboxstyle',
  // Boolean
  'on', 'off', 'true', 'false', 'equal'
];

// Arrow types for message completion
const ARROWS = ['->', '->>', '-->', '-->>'];

/**
 * Extract participant aliases from editor content
 * @param {string} text - Editor text
 * @returns {string[]} Array of participant aliases
 */
function extractParticipants(text) {
  const participants = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Match: participant/actor/database "Name" as Alias
    const aliasMatch = trimmed.match(/^(?:participant|actor|database|rparticipant|boundary|control|entity)\s+(?:"[^"]*"\s+as\s+)?(\w+)/i);
    if (aliasMatch) {
      participants.push(aliasMatch[1]);
    }
  }

  return [...new Set(participants)]; // Deduplicate
}

/**
 * Get completions for current cursor position
 * @param {CodeMirror} cm - CodeMirror instance
 * @returns {Object} Hint result object
 */
function getHints(cm) {
  const cursor = cm.getCursor();
  const line = cm.getLine(cursor.line);
  const end = cursor.ch;

  // Find the start of the current word
  let start = end;
  while (start > 0 && /[\w-]/.test(line.charAt(start - 1))) {
    start--;
  }

  const prefix = line.slice(start, end).toLowerCase();
  const fullText = cm.getValue();
  const participants = extractParticipants(fullText);

  // Build completion list
  let completions = [];

  // Check context
  const beforeCursor = line.slice(0, start).trim();

  // After arrow operator, suggest participants
  if (/->?>?$|-->?>?$/.test(beforeCursor)) {
    completions = participants.map(p => ({ text: p, displayText: p, className: 'cm-hint-participant' }));
  }
  // At start of line or after participant type, suggest keywords
  else if (beforeCursor === '' || /^(participant|actor|database)$/i.test(beforeCursor)) {
    // Keywords
    completions = KEYWORDS
      .filter(kw => kw.toLowerCase().startsWith(prefix))
      .map(kw => ({ text: kw, displayText: kw, className: 'cm-hint-keyword' }));

    // Add participants if we have any
    if (participants.length > 0) {
      const participantCompletions = participants
        .filter(p => p.toLowerCase().startsWith(prefix))
        .map(p => ({ text: p, displayText: p + ' (participant)', className: 'cm-hint-participant' }));
      completions = completions.concat(participantCompletions);
    }
  }
  // After a participant name, might be typing arrow
  else if (/^\w+$/.test(beforeCursor)) {
    // Check if beforeCursor is a known participant
    const possibleParticipant = participants.find(p => p.toLowerCase() === beforeCursor.toLowerCase());
    if (possibleParticipant) {
      // Suggest arrows
      completions = ARROWS.map(arr => ({
        text: arr,
        displayText: arr,
        className: 'cm-hint-operator'
      }));
    }
  }

  // If no prefix, show all suggestions
  if (!prefix && completions.length === 0) {
    completions = [
      ...KEYWORDS.slice(0, 10).map(kw => ({ text: kw, displayText: kw, className: 'cm-hint-keyword' })),
      ...participants.map(p => ({ text: p, displayText: p + ' (participant)', className: 'cm-hint-participant' }))
    ];
  }

  return {
    list: completions,
    from: { line: cursor.line, ch: start },
    to: { line: cursor.line, ch: end }
  };
}

/**
 * Register the sequence diagram hint provider
 * @param {CodeMirror} CodeMirror - CodeMirror constructor
 */
export function registerHint(CodeMirror) {
  CodeMirror.registerHelper('hint', 'sequence-diagram', getHints);
}

/**
 * Setup auto-completion on the editor
 * @param {CodeMirror} editor - CodeMirror instance
 */
export function setupAutoComplete(editor) {
  // Ctrl-Space or Cmd-Space triggers completion
  editor.setOption('extraKeys', {
    'Ctrl-Space': function(cm) {
      cm.showHint({
        hint: CodeMirror.hint['sequence-diagram'],
        completeSingle: false
      });
    },
    'Cmd-Space': function(cm) {
      cm.showHint({
        hint: CodeMirror.hint['sequence-diagram'],
        completeSingle: false
      });
    }
  });
}
