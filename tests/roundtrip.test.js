// Round-trip property tests
// Verifies parse → serialize → parse produces identical AST

import { describe, it, expect } from 'vitest';
import { parse } from '../public/src/ast/parser.js';
import { serialize } from '../public/src/ast/serializer.js';

/**
 * Compare two AST nodes for semantic equality (ignoring IDs)
 */
function astEqual(ast1, ast2) {
  if (ast1.length !== ast2.length) return false;

  for (let i = 0; i < ast1.length; i++) {
    const n1 = ast1[i];
    const n2 = ast2[i];

    if (n1.type !== n2.type) return false;

    switch (n1.type) {
      case 'participant':
        if (n1.participantType !== n2.participantType) return false;
        if (n1.alias !== n2.alias) return false;
        if (n1.displayName !== n2.displayName) return false;
        if (!styleEqual(n1.style, n2.style)) return false;
        break;

      case 'message':
        if (n1.from !== n2.from) return false;
        if (n1.to !== n2.to) return false;
        if (n1.arrowType !== n2.arrowType) return false;
        if (n1.label !== n2.label) return false;
        break;

      case 'fragment':
        if (n1.fragmentType !== n2.fragmentType) return false;
        if (n1.condition !== n2.condition) return false;
        if (!styleEqual(n1.style, n2.style)) return false;
        if (n1.entries.length !== n2.entries.length) return false;
        if (n1.elseClauses.length !== n2.elseClauses.length) return false;
        // Note: We check entry/else count, but IDs will differ
        for (let j = 0; j < n1.elseClauses.length; j++) {
          if (n1.elseClauses[j].condition !== n2.elseClauses[j].condition) return false;
          if (!styleEqual(n1.elseClauses[j].style, n2.elseClauses[j].style)) return false;
          if (n1.elseClauses[j].entries.length !== n2.elseClauses[j].entries.length) return false;
        }
        break;

      case 'comment':
        if (n1.text !== n2.text) return false;
        break;

      case 'blankline':
        // Just need same type
        break;

      case 'directive':
        if (n1.directiveType !== n2.directiveType) return false;
        if (n1.value !== n2.value) return false;
        break;

      case 'error':
        // Error nodes become comments after serialization, skip comparison
        break;
    }
  }

  return true;
}

/**
 * Compare two style objects
 */
function styleEqual(s1, s2) {
  s1 = s1 || {};
  s2 = s2 || {};

  const keys = new Set([...Object.keys(s1), ...Object.keys(s2)]);
  for (const key of keys) {
    if (s1[key] !== s2[key]) return false;
  }
  return true;
}

/**
 * Perform round-trip test: parse -> serialize -> parse
 * Returns { original, serialized, reparsed, match }
 */
function roundTrip(input) {
  const original = parse(input);
  const serialized = serialize(original);
  const reparsed = parse(serialized);
  const match = astEqual(original, reparsed);
  return { original, serialized, reparsed, match };
}

describe('Round-Trip Property Tests', () => {
  describe('Basic elements', () => {
    it('should round-trip basic participant', () => {
      const { match } = roundTrip('participant Alice');
      expect(match).toBe(true);
    });

    it('should round-trip actor', () => {
      const { match } = roundTrip('actor User');
      expect(match).toBe(true);
    });

    it('should round-trip database', () => {
      const { match } = roundTrip('database DB');
      expect(match).toBe(true);
    });

    it('should round-trip multiple participants', () => {
      const { match } = roundTrip('participant A\nactor B\ndatabase C');
      expect(match).toBe(true);
    });

    it('should round-trip basic message', () => {
      const { match } = roundTrip('A->B:Hello');
      expect(match).toBe(true);
    });
  });

  describe('Participant variations', () => {
    it('should round-trip participant with alias', () => {
      const { match } = roundTrip('participant "Web Server" as WS');
      expect(match).toBe(true);
    });

    it('should round-trip participant with fill color', () => {
      const { match } = roundTrip('participant Alice #lightblue');
      expect(match).toBe(true);
    });

    it('should round-trip participant with fill and border', () => {
      const { match } = roundTrip('participant Alice #lightblue #navy');
      expect(match).toBe(true);
    });

    it('should round-trip participant with full styling', () => {
      const { match } = roundTrip('participant Alice #lightblue #navy;3;dashed');
      expect(match).toBe(true);
    });

    it('should round-trip participant with alias and styling', () => {
      const { match } = roundTrip('participant "My Service" as MS #pink #blue;2;dashed');
      expect(match).toBe(true);
    });

    it('should round-trip multiline participant name', () => {
      const { match } = roundTrip('participant "Line1\\nLine2" as Multi');
      expect(match).toBe(true);
    });

    it('should round-trip participant with escaped quotes', () => {
      const { match } = roundTrip('participant "Say \\"Hello\\"" as Q');
      expect(match).toBe(true);
    });

    it('should round-trip actor with styling', () => {
      const { match } = roundTrip('actor "End User" as EU #yellow');
      expect(match).toBe(true);
    });

    it('should round-trip database with styling', () => {
      const { match } = roundTrip('database "MySQL DB" as DB #lightgreen #darkgreen;2');
      expect(match).toBe(true);
    });
  });

  describe('Message variations', () => {
    it('should round-trip sync message (->)', () => {
      const { match } = roundTrip('A->B:sync message');
      expect(match).toBe(true);
    });

    it('should round-trip async message (->>)', () => {
      const { match } = roundTrip('A->>B:async message');
      expect(match).toBe(true);
    });

    it('should round-trip return message (-->)', () => {
      const { match } = roundTrip('A-->B:return message');
      expect(match).toBe(true);
    });

    it('should round-trip async return message (-->>)', () => {
      const { match } = roundTrip('A-->>B:async return');
      expect(match).toBe(true);
    });

    it('should round-trip message with empty label', () => {
      const { match } = roundTrip('A->B:');
      expect(match).toBe(true);
    });

    it('should round-trip message with special characters', () => {
      const { match } = roundTrip('A->B:Hello, World! <test> "quoted"');
      expect(match).toBe(true);
    });

    it('should round-trip message with colon in label', () => {
      const { match } = roundTrip('A->B:key:value');
      expect(match).toBe(true);
    });

    it('should round-trip multiple messages', () => {
      const { match } = roundTrip('A->B:first\nB-->A:second\nA->>B:third');
      expect(match).toBe(true);
    });
  });

  describe('Fragment variations', () => {
    it('should round-trip empty alt fragment', () => {
      const { match } = roundTrip('alt condition\nend');
      expect(match).toBe(true);
    });

    it('should round-trip alt with entries', () => {
      const { match } = roundTrip('alt condition\n  A->B:message\nend');
      expect(match).toBe(true);
    });

    it('should round-trip alt with else', () => {
      const { match } = roundTrip('alt success\n  A->B:ok\nelse failure\n  A->B:error\nend');
      expect(match).toBe(true);
    });

    it('should round-trip alt with multiple else clauses', () => {
      const { match } = roundTrip('alt case1\n  A->B:1\nelse case2\n  A->B:2\nelse case3\n  A->B:3\nend');
      expect(match).toBe(true);
    });

    it('should round-trip loop fragment', () => {
      const { match } = roundTrip('loop 10 times\n  A->B:ping\nend');
      expect(match).toBe(true);
    });

    it('should round-trip nested fragments', () => {
      const { match } = roundTrip('alt outer\n  loop inner\n    A->B:deep\n  end\nend');
      expect(match).toBe(true);
    });

    it('should round-trip fragment with operator color', () => {
      const { match } = roundTrip('alt#yellow condition\nend');
      expect(match).toBe(true);
    });

    it('should round-trip fragment with fill', () => {
      const { match } = roundTrip('alt #lightblue condition\nend');
      expect(match).toBe(true);
    });

    it('should round-trip fragment with full styling', () => {
      const { match } = roundTrip('alt#yellow #lightblue #red;2;dashed condition\nend');
      expect(match).toBe(true);
    });

    it('should round-trip else with styling', () => {
      const { match } = roundTrip('alt success\n  A->B:ok\nelse #pink failure\n  A->B:fail\nend');
      expect(match).toBe(true);
    });

    it('should round-trip else with full styling', () => {
      const { match } = roundTrip('alt success\n  A->B:ok\nelse #pink #red;2;dashed failure\n  A->B:fail\nend');
      expect(match).toBe(true);
    });
  });

  describe('Comments and blank lines', () => {
    it('should round-trip // comment', () => {
      const { match } = roundTrip('// This is a comment');
      expect(match).toBe(true);
    });

    it('should round-trip # comment', () => {
      const { match } = roundTrip('# Another comment');
      expect(match).toBe(true);
    });

    it('should round-trip comment with special characters', () => {
      const { match } = roundTrip('// Comment with <html> and "quotes"');
      expect(match).toBe(true);
    });

    it('should round-trip blank line', () => {
      const { match } = roundTrip('participant A\n\nparticipant B');
      expect(match).toBe(true);
    });

    it('should round-trip multiple blank lines', () => {
      const { match } = roundTrip('A->B:1\n\n\nA->B:2');
      expect(match).toBe(true);
    });

    it('should round-trip comments inside fragments', () => {
      const { match } = roundTrip('alt condition\n  // Inside\n  A->B:msg\nend');
      expect(match).toBe(true);
    });

    it('should round-trip interspersed comments', () => {
      const { match } = roundTrip('// Header\nparticipant A\n// Middle\nA->B:msg\n// Footer');
      expect(match).toBe(true);
    });
  });

  describe('Title directive', () => {
    it('should round-trip basic title', () => {
      const { match } = roundTrip('title My Diagram');
      expect(match).toBe(true);
    });

    it('should round-trip title with special characters', () => {
      const { match } = roundTrip('title API Flow: A -> B');
      expect(match).toBe(true);
    });

    it('should round-trip title with diagram content', () => {
      const { match } = roundTrip('title Test\nparticipant A\nA->B:Hello');
      expect(match).toBe(true);
    });
  });

  describe('Text markup preservation', () => {
    it('should round-trip bold markup', () => {
      const { match } = roundTrip('A->B:**bold**');
      expect(match).toBe(true);
    });

    it('should round-trip italic markup', () => {
      const { match } = roundTrip('A->B://italic//');
      expect(match).toBe(true);
    });

    it('should round-trip line break markup', () => {
      const { match } = roundTrip('A->B:line1\\nline2');
      expect(match).toBe(true);
    });

    it('should round-trip combined markup', () => {
      const { match } = roundTrip('A->B:**bold** and //italic//\\nnewline');
      expect(match).toBe(true);
    });

    it('should round-trip markup in participant names', () => {
      const { match } = roundTrip('participant "**Bold**\\nLine2" as B');
      expect(match).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should round-trip single character alias', () => {
      const { match } = roundTrip('participant A');
      expect(match).toBe(true);
    });

    it('should round-trip numeric alias', () => {
      const { match } = roundTrip('participant A123');
      expect(match).toBe(true);
    });

    it('should round-trip self-message', () => {
      const { match } = roundTrip('A->A:self');
      expect(match).toBe(true);
    });

    it('should round-trip long label', () => {
      const longLabel = 'x'.repeat(100);
      const { match } = roundTrip(`A->B:${longLabel}`);
      expect(match).toBe(true);
    });

    it('should round-trip fragment with only blank lines', () => {
      const { match } = roundTrip('alt condition\n\n\nend');
      expect(match).toBe(true);
    });

    it('should round-trip complex nested structure', () => {
      const input = `
title Complex Test
// Setup
participant A #lightblue
participant B #pink

// Main flow
alt success
  loop 3 times
    A->B:ping
    B-->A:pong
  end
else failure
  // Error handling
  A->B:error
end
      `.trim();
      const { match } = roundTrip(input);
      expect(match).toBe(true);
    });
  });

  describe('Canonical formatting', () => {
    it('should produce stable output on multiple round-trips', () => {
      const input = 'participant Alice\nAlice->Bob:Hello';
      const { serialized } = roundTrip(input);
      const { serialized: serialized2 } = roundTrip(serialized);
      const { serialized: serialized3 } = roundTrip(serialized2);

      expect(serialized).toBe(serialized2);
      expect(serialized2).toBe(serialized3);
    });

    it('should normalize fragment indentation', () => {
      // Input with inconsistent indentation
      const input = 'alt condition\nA->B:msg\nend';
      const { serialized } = roundTrip(input);

      // Should be normalized to 2-space indent
      expect(serialized).toBe('alt condition\n  A->B:msg\nend');
    });

    it('should preserve user whitespace in labels', () => {
      const input = 'A->B:hello   world';
      const { serialized } = roundTrip(input);
      expect(serialized).toBe('A->B:hello   world');
    });

    it('should preserve whitespace in display names', () => {
      const { original, reparsed } = roundTrip('participant "  Spaced  " as T');
      // Parser preserves display names exactly as typed
      expect(original[0].displayName).toBe('  Spaced  ');
      expect(reparsed[0].displayName).toBe('  Spaced  ');
    });
  });

  describe('Serialized output validity', () => {
    it('should produce parseable output for all valid inputs', () => {
      const inputs = [
        'participant A',
        'actor B',
        'database C',
        'A->B:msg',
        'alt cond\nend',
        'loop 5\n  A->B:x\nend',
        '// comment',
        '# comment',
        '',
        'title Test',
        'participant "Name" as N #blue',
      ];

      for (const input of inputs) {
        const { serialized, reparsed } = roundTrip(input);
        // Should not produce any error nodes for valid input
        const errors = reparsed.filter(n => n.type === 'error');
        expect(errors).toHaveLength(0);
      }
    });
  });
});
