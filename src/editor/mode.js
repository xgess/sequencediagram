// CodeMirror syntax highlighting mode for sequence diagrams
// Uses the simple mode addon for straightforward tokenization

/**
 * Define the sequence diagram syntax highlighting mode
 * @param {CodeMirror} CodeMirror - The CodeMirror instance
 */
export function defineMode(CodeMirror) {
  CodeMirror.defineSimpleMode('sequence-diagram', {
    // Initial state
    start: [
      // Comments (// or #)
      { regex: /\/\/.*/, token: 'comment' },
      { regex: /#.*/, token: 'comment' },

      // Title directive
      { regex: /\btitle\b/, token: 'keyword', next: 'title' },

      // Participant declarations
      { regex: /\b(participant|actor|database|rparticipant|boundary|control|entity)\b/, token: 'keyword' },

      // Fragment keywords
      { regex: /\b(alt|else|end|loop|opt|par|break|critical|ref|seq|strict|neg|ignore|consider|assert|region|group|expandable)\b/, token: 'keyword' },

      // Lifecycle keywords
      { regex: /\b(activate|deactivate|destroy|destroyafter|destroysilent|create)\b/, token: 'keyword' },

      // Activation and spacing directives
      { regex: /\b(autoactivation|activecolor|space|participantspacing|entryspacing|lifelinestyle|autonumber|linear|parallel|frame|participantgroup|bottomparticipants|fontfamily)\b/, token: 'keyword' },

      // Style keywords
      { regex: /\b(style|participantstyle|notestyle|messagestyle|dividerstyle|boxstyle|aboxstyle|rboxstyle)\b/, token: 'keyword' },

      // Note and box types
      { regex: /\b(note|box|abox|rbox|state|divider|ref)\b/, token: 'keyword' },

      // Position keywords
      { regex: /\b(over|left|right|of|as)\b/, token: 'keyword' },

      // Boolean keywords
      { regex: /\b(on|off|true|false|equal)\b/, token: 'atom' },

      // Arrow operators (message lines)
      { regex: /-->>|-->|->>/,  token: 'operator' },
      { regex: /->/,  token: 'operator' },
      { regex: /<--|<-|<->/,  token: 'operator' },
      { regex: /-x/,  token: 'operator' },

      // Divider syntax ==text==
      { regex: /==.*==/, token: 'string-2' },

      // Quoted strings
      { regex: /"(?:[^"\\]|\\.)*"/, token: 'string' },

      // Color values (#hex or named colors)
      { regex: /#[a-fA-F0-9]{3,6}\b/, token: 'number' },
      { regex: /#[a-zA-Z]+\b/, token: 'number' },

      // Numbers
      { regex: /\b\d+\b/, token: 'number' },

      // Semicolon in styling (border;width;style)
      { regex: /;/, token: 'punctuation' },

      // Colon for message labels
      { regex: /:/, token: 'punctuation' },

      // Identifiers (participant aliases, etc.)
      { regex: /[a-zA-Z_][a-zA-Z0-9_]*/, token: 'variable' },
    ],

    // Title state - everything after 'title' is the title text
    title: [
      { regex: /.*/, token: 'string', next: 'start' },
    ],

    // Meta information
    meta: {
      lineComment: '//'
    }
  });

  // Register MIME type
  CodeMirror.defineMIME('text/x-sequence-diagram', 'sequence-diagram');
}
