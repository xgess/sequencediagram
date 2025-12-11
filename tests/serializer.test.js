// Serializer tests
// See DESIGN.md for serialization format

import { describe, it, expect } from 'vitest';
import { serialize } from '../src/ast/serializer.js';
import { parse } from '../src/ast/parser.js';

describe('Serializer', () => {
  describe('empty AST', () => {
    it('should return empty string for empty AST', () => {
      const text = serialize([]);
      expect(text).toBe('');
    });
  });

  describe('participant serialization (BACKLOG-006)', () => {
    it('should serialize basic participant', () => {
      const ast = parse('participant Alice');
      const text = serialize(ast);
      expect(text).toBe('participant Alice');
    });

    it('should serialize actor participant', () => {
      const ast = parse('actor User');
      const text = serialize(ast);
      expect(text).toBe('actor User');
    });

    it('should serialize database participant', () => {
      const ast = parse('database DB');
      const text = serialize(ast);
      expect(text).toBe('database DB');
    });

    it('should serialize multiple participants', () => {
      const ast = parse('participant Alice\nparticipant Bob');
      const text = serialize(ast);
      expect(text).toBe('participant Alice\nparticipant Bob');
    });
  });

  describe('round-trip tests', () => {
    it('should round-trip basic participant', () => {
      const input = 'participant Alice';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);

      expect(ast2).toHaveLength(1);
      expect(ast2[0].type).toBe(ast1[0].type);
      expect(ast2[0].participantType).toBe(ast1[0].participantType);
      expect(ast2[0].alias).toBe(ast1[0].alias);
      expect(ast2[0].displayName).toBe(ast1[0].displayName);
    });

    it('should round-trip multiple participants', () => {
      const input = 'participant Alice\nactor Bob\ndatabase DB';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);

      expect(ast2).toHaveLength(3);
      expect(ast2[0].alias).toBe('Alice');
      expect(ast2[1].alias).toBe('Bob');
      expect(ast2[2].alias).toBe('DB');
    });
  });

  describe('message serialization (BACKLOG-012)', () => {
    it('should serialize sync message (->)', () => {
      const ast = parse('Alice->Bob:Hello');
      const text = serialize(ast);
      expect(text).toBe('Alice->Bob:Hello');
    });

    it('should serialize async message (->>)', () => {
      const ast = parse('Alice->>Bob:Async');
      const text = serialize(ast);
      expect(text).toBe('Alice->>Bob:Async');
    });

    it('should serialize return message (-->)', () => {
      const ast = parse('Bob-->Alice:Response');
      const text = serialize(ast);
      expect(text).toBe('Bob-->Alice:Response');
    });

    it('should serialize async return message (-->>)', () => {
      const ast = parse('Bob-->>Alice:Async Response');
      const text = serialize(ast);
      expect(text).toBe('Bob-->>Alice:Async Response');
    });

    it('should serialize message with empty label', () => {
      const ast = parse('Alice->Bob:');
      const text = serialize(ast);
      expect(text).toBe('Alice->Bob:');
    });
  });

  describe('round-trip tests (messages)', () => {
    it('should round-trip message', () => {
      const input = 'Alice->Bob:Hello World';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);

      expect(ast2).toHaveLength(1);
      expect(ast2[0].from).toBe(ast1[0].from);
      expect(ast2[0].to).toBe(ast1[0].to);
      expect(ast2[0].arrowType).toBe(ast1[0].arrowType);
      expect(ast2[0].label).toBe(ast1[0].label);
    });

    it('should round-trip participants and messages', () => {
      const input = 'participant Alice\nparticipant Bob\nAlice->Bob:Hello\nBob-->Alice:Hi';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);

      expect(ast2).toHaveLength(4);
      expect(ast2[0].alias).toBe('Alice');
      expect(ast2[1].alias).toBe('Bob');
      expect(ast2[2].label).toBe('Hello');
      expect(ast2[3].label).toBe('Hi');
    });
  });

  describe('participant styling serialization (BACKLOG-016)', () => {
    it('should serialize participant with fill color', () => {
      const ast = parse('participant Alice #lightblue');
      const text = serialize(ast);
      expect(text).toBe('participant Alice #lightblue');
    });

    it('should serialize participant with fill and border', () => {
      const ast = parse('participant Alice #lightblue #green');
      const text = serialize(ast);
      expect(text).toBe('participant Alice #lightblue #green');
    });

    it('should serialize participant with full styling', () => {
      const ast = parse('participant Alice #lightblue #green;3;dashed');
      const text = serialize(ast);
      expect(text).toBe('participant Alice #lightblue #green;3;dashed');
    });

    it('should serialize participant with border width only', () => {
      const ast = parse('participant Alice ;2');
      const text = serialize(ast);
      expect(text).toBe('participant Alice ;2');
    });

    it('should round-trip styled participant', () => {
      const input = 'participant Alice #pink #blue;2;dashed';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);

      expect(ast2[0].style.fill).toBe('#pink');
      expect(ast2[0].style.border).toBe('#blue');
      expect(ast2[0].style.borderWidth).toBe(2);
      expect(ast2[0].style.borderStyle).toBe('dashed');
    });
  });

  describe('participant alias serialization (BACKLOG-019)', () => {
    it('should serialize simple participant without alias syntax', () => {
      const ast = parse('participant Alice');
      const text = serialize(ast);
      expect(text).toBe('participant Alice');
    });

    it('should serialize participant with different displayName and alias', () => {
      const ast = parse('participant "Web Server" as WS');
      const text = serialize(ast);
      expect(text).toBe('participant "Web Server" as WS');
    });

    it('should serialize multiline displayName with escaped newlines', () => {
      const ast = parse('participant "Line1\\nLine2" as A');
      const text = serialize(ast);
      expect(text).toBe('participant "Line1\\nLine2" as A');
    });

    it('should serialize escaped quotes in displayName', () => {
      const ast = parse('participant "My \\"DB\\"" as DB');
      const text = serialize(ast);
      expect(text).toBe('participant "My \\"DB\\"" as DB');
    });

    it('should serialize alias with styling', () => {
      const ast = parse('participant "Web Server" as WS #lightblue');
      const text = serialize(ast);
      expect(text).toBe('participant "Web Server" as WS #lightblue');
    });

    it('should serialize alias with full styling', () => {
      const ast = parse('participant "My Service" as MS #pink #blue;2;dashed');
      const text = serialize(ast);
      expect(text).toBe('participant "My Service" as MS #pink #blue;2;dashed');
    });

    it('should round-trip participant with alias', () => {
      const input = 'participant "Web Server" as WS';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);

      expect(ast2[0].displayName).toBe('Web Server');
      expect(ast2[0].alias).toBe('WS');
    });

    it('should round-trip multiline with escaped newlines', () => {
      const input = 'participant "Line1\\nLine2" as A';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);

      expect(ast2[0].displayName).toBe('Line1\nLine2');
      expect(ast2[0].alias).toBe('A');
    });

    it('should serialize actor with alias', () => {
      const ast = parse('actor "External User" as EU');
      const text = serialize(ast);
      expect(text).toBe('actor "External User" as EU');
    });
  });

  describe('fragment serialization (BACKLOG-036)', () => {
    it('should serialize basic alt fragment', () => {
      const ast = parse('alt success\nend');
      const text = serialize(ast);
      expect(text).toBe('alt success\nend');
    });

    it('should serialize alt fragment with message', () => {
      const ast = parse('alt success\nAlice->Bob:OK\nend');
      const text = serialize(ast);
      expect(text).toBe('alt success\n  Alice->Bob:OK\nend');
    });

    it('should serialize alt fragment with else clause', () => {
      const ast = parse('alt success\nAlice->Bob:OK\nelse failure\nAlice->Bob:Error\nend');
      const text = serialize(ast);
      expect(text).toBe('alt success\n  Alice->Bob:OK\nelse failure\n  Alice->Bob:Error\nend');
    });

    it('should serialize loop fragment', () => {
      const ast = parse('loop 10 times\nAlice->Bob:Ping\nend');
      const text = serialize(ast);
      expect(text).toBe('loop 10 times\n  Alice->Bob:Ping\nend');
    });

    it('should serialize nested fragments', () => {
      const ast = parse('alt outer\nloop inner\nAlice->Bob:Hi\nend\nend');
      const text = serialize(ast);
      expect(text).toBe('alt outer\n  loop inner\n    Alice->Bob:Hi\n  end\nend');
    });

    it('should serialize participants before fragments', () => {
      const input = 'participant Alice\nparticipant Bob\nalt success\nAlice->Bob:OK\nend';
      const ast = parse(input);
      const text = serialize(ast);
      expect(text).toBe('participant Alice\nparticipant Bob\nalt success\n  Alice->Bob:OK\nend');
    });

    it('should round-trip fragment with else', () => {
      const input = 'alt success\n  Alice->Bob:OK\nelse failure\n  Alice->Bob:Error\nend';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);

      const fragment1 = ast1.find(n => n.type === 'fragment');
      const fragment2 = ast2.find(n => n.type === 'fragment');

      expect(fragment2.fragmentType).toBe(fragment1.fragmentType);
      expect(fragment2.condition).toBe(fragment1.condition);
      expect(fragment2.entries.length).toBe(fragment1.entries.length);
      expect(fragment2.elseClauses.length).toBe(fragment1.elseClauses.length);
    });
  });

  describe('fragment styling serialization (BACKLOG-037)', () => {
    it('should serialize fragment with operator color', () => {
      const ast = parse('alt#yellow condition\nend');
      const text = serialize(ast);
      expect(text).toBe('alt#yellow condition\nend');
    });

    it('should serialize fragment with operator and fill color', () => {
      const ast = parse('alt#yellow #green condition\nend');
      const text = serialize(ast);
      expect(text).toBe('alt#yellow #green condition\nend');
    });

    it('should serialize fragment with full styling', () => {
      const ast = parse('alt#yellow #green #red;2;dashed condition\nend');
      const text = serialize(ast);
      expect(text).toBe('alt#yellow #green #red;2;dashed condition\nend');
    });

    it('should serialize fragment with fill only', () => {
      const ast = parse('alt #lightblue condition\nend');
      const text = serialize(ast);
      expect(text).toBe('alt #lightblue condition\nend');
    });

    it('should serialize fragment with no styling', () => {
      const ast = parse('alt condition\nend');
      const text = serialize(ast);
      expect(text).toBe('alt condition\nend');
    });

    it('should serialize loop fragment with styling', () => {
      const ast = parse('loop#cyan #pink 10 times\nend');
      const text = serialize(ast);
      expect(text).toBe('loop#cyan #pink 10 times\nend');
    });

    it('should serialize else clause with styling', () => {
      const ast = parse('alt success\nAlice->Bob:OK\nelse #pink #yellow;5;dashed failure\nAlice->Bob:Error\nend');
      const text = serialize(ast);
      expect(text).toBe('alt success\n  Alice->Bob:OK\nelse #pink #yellow;5;dashed failure\n  Alice->Bob:Error\nend');
    });

    it('should serialize else clause with fill only', () => {
      const ast = parse('alt success\nAlice->Bob:OK\nelse #lightblue not success\nAlice->Bob:Error\nend');
      const text = serialize(ast);
      expect(text).toBe('alt success\n  Alice->Bob:OK\nelse #lightblue not success\n  Alice->Bob:Error\nend');
    });

    it('should round-trip fragment with full styling', () => {
      const input = 'alt#yellow #green #red;2;dashed condition\n  Alice->Bob:OK\nend';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);

      const fragment1 = ast1.find(n => n.type === 'fragment');
      const fragment2 = ast2.find(n => n.type === 'fragment');

      expect(fragment2.style.operatorColor).toBe(fragment1.style.operatorColor);
      expect(fragment2.style.fill).toBe(fragment1.style.fill);
      expect(fragment2.style.border).toBe(fragment1.style.border);
      expect(fragment2.style.borderWidth).toBe(fragment1.style.borderWidth);
      expect(fragment2.style.borderStyle).toBe(fragment1.style.borderStyle);
      expect(fragment2.condition).toBe(fragment1.condition);
    });

    it('should round-trip else clause with styling', () => {
      const input = 'alt success\n  Alice->Bob:OK\nelse #pink #yellow;5;dashed failure\n  Alice->Bob:Error\nend';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);

      const fragment1 = ast1.find(n => n.type === 'fragment');
      const fragment2 = ast2.find(n => n.type === 'fragment');

      expect(fragment2.elseClauses[0].style.fill).toBe(fragment1.elseClauses[0].style.fill);
      expect(fragment2.elseClauses[0].style.border).toBe(fragment1.elseClauses[0].style.border);
      expect(fragment2.elseClauses[0].style.borderWidth).toBe(fragment1.elseClauses[0].style.borderWidth);
      expect(fragment2.elseClauses[0].style.borderStyle).toBe(fragment1.elseClauses[0].style.borderStyle);
      expect(fragment2.elseClauses[0].condition).toBe(fragment1.elseClauses[0].condition);
    });
  });

  describe('blank line serialization (BACKLOG-039)', () => {
    it('should serialize blank line as empty line', () => {
      const ast = parse('participant Alice\n\nparticipant Bob');
      const text = serialize(ast);
      expect(text).toBe('participant Alice\n\nparticipant Bob');
    });

    it('should serialize multiple blank lines', () => {
      const ast = parse('participant Alice\n\n\nparticipant Bob');
      const text = serialize(ast);
      expect(text).toBe('participant Alice\n\n\nparticipant Bob');
    });

    it('should serialize blank lines inside fragments', () => {
      const ast = parse('alt success\nAlice->Bob:OK\n\nBob-->Alice:Done\nend');
      const text = serialize(ast);
      expect(text).toBe('alt success\n  Alice->Bob:OK\n\n  Bob-->Alice:Done\nend');
    });

    it('should round-trip blank lines', () => {
      const input = 'participant Alice\n\nparticipant Bob';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);
      expect(ast2.filter(n => n.type === 'blankline').length).toBe(1);
    });
  });

  describe('comment serialization (BACKLOG-038)', () => {
    it('should serialize // comment', () => {
      const ast = parse('// This is a comment');
      const text = serialize(ast);
      expect(text).toBe('// This is a comment');
    });

    it('should serialize # comment', () => {
      const ast = parse('# This is a comment');
      const text = serialize(ast);
      expect(text).toBe('# This is a comment');
    });

    it('should serialize comments interspersed with other nodes', () => {
      const ast = parse('participant Alice\n// Comment\nAlice->Bob:Hello');
      const text = serialize(ast);
      expect(text).toBe('participant Alice\n// Comment\nAlice->Bob:Hello');
    });

    it('should serialize comments inside fragments with indentation', () => {
      const ast = parse('alt success\n// Inside fragment\nAlice->Bob:OK\nend');
      const text = serialize(ast);
      expect(text).toBe('alt success\n  // Inside fragment\n  Alice->Bob:OK\nend');
    });

    it('should round-trip comment', () => {
      const input = '// This is a comment';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);
      expect(ast2[0].type).toBe('comment');
      expect(ast2[0].text).toBe(ast1[0].text);
    });
  });

  describe('title directive serialization (BACKLOG-042, BACKLOG-044)', () => {
    it('should serialize title directive', () => {
      const ast = parse('title My Diagram');
      const text = serialize(ast);
      expect(text).toBe('title My Diagram');
    });

    it('should serialize title with special characters', () => {
      const ast = parse('title My "Special" Diagram!');
      const text = serialize(ast);
      expect(text).toBe('title My "Special" Diagram!');
    });

    it('should serialize title with participants', () => {
      const ast = parse('title My Diagram\nparticipant Alice');
      const text = serialize(ast);
      expect(text).toBe('title My Diagram\nparticipant Alice');
    });

    it('should round-trip title directive', () => {
      const input = 'title My Diagram';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);
      const directive = ast2.find(n => n.type === 'directive');
      expect(directive.directiveType).toBe('title');
      expect(directive.value).toBe('My Diagram');
    });
  });

  describe('entryspacing directive serialization (BACKLOG-086)', () => {
    it('should serialize entryspacing directive', () => {
      const ast = parse('entryspacing 1.5');
      const text = serialize(ast);
      expect(text).toBe('entryspacing 1.5');
    });

    it('should serialize entryspacing with other elements', () => {
      const ast = parse('participant A\nentryspacing 2\nA->B:msg');
      const text = serialize(ast);
      expect(text).toBe('participant A\nentryspacing 2\nA->B:msg');
    });

    it('should round-trip entryspacing directive', () => {
      const input = 'entryspacing 0.8';
      const ast1 = parse(input);
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);
      const directive = ast2.find(n => n.type === 'directive' && n.directiveType === 'entryspacing');
      expect(directive.value).toBe(0.8);
    });
  });

  describe('error node serialization (BACKLOG-051)', () => {
    it('should serialize error node as comment', () => {
      const ast = parse('invalidSyntax!!!');
      const text = serialize(ast);
      expect(text).toContain('// ERROR:');
      expect(text).toContain('invalidSyntax!!!');
    });

    it('should include error message and original text', () => {
      const ast = parse('this is not valid');
      const text = serialize(ast);
      expect(text).toMatch(/\/\/ ERROR: .+ - "this is not valid"/);
    });

    it('should serialize error nodes interspersed with valid nodes', () => {
      const ast = parse('participant Alice\ninvalidLine\nAlice->Bob:Hello');
      const text = serialize(ast);
      expect(text).toContain('participant Alice');
      expect(text).toContain('// ERROR:');
      expect(text).toContain('invalidLine');
      expect(text).toContain('Alice->Bob:Hello');
    });

    it('should serialize multiple error nodes', () => {
      const ast = parse('badLine1\nbadLine2');
      const text = serialize(ast);
      expect(text.match(/\/\/ ERROR:/g).length).toBe(2);
      expect(text).toContain('badLine1');
      expect(text).toContain('badLine2');
    });

    it('should serialize error inside fragment with indentation', () => {
      const ast = parse('alt success\ninvalidInFragment\nend');
      const text = serialize(ast);
      expect(text).toContain('  // ERROR:');
      expect(text).toContain('invalidInFragment');
    });

    it('should produce valid output when re-parsed (creates comment)', () => {
      const ast1 = parse('invalidSyntax');
      const serialized = serialize(ast1);
      const ast2 = parse(serialized);
      // The serialized error becomes a comment when re-parsed
      const comment = ast2.find(n => n.type === 'comment');
      expect(comment).toBeDefined();
      expect(comment.text).toContain('ERROR');
    });
  });

  // TODO(Phase1): Add serializer tests as features are implemented
});
