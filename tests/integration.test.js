// Integration tests for Phase 1 features
// Tests the complete workflow: text -> AST -> SVG (and back through serialization)

import { describe, it, expect, beforeEach } from 'vitest';
import { parse } from '../public/src/ast/parser.js';
import { serialize } from '../public/src/ast/serializer.js';
import { render } from '../public/src/rendering/renderer.js';
import { calculateLayout } from '../public/src/rendering/layout.js';

describe('Integration Tests (BACKLOG-052)', () => {
  describe('Participant types', () => {
    it('should handle all participant types: participant, actor, database', () => {
      const text = `
participant Alice
actor User
database DB
      `.trim();

      const ast = parse(text);
      const participants = ast.filter(n => n.type === 'participant');

      expect(participants).toHaveLength(3);
      expect(participants[0].participantType).toBe('participant');
      expect(participants[1].participantType).toBe('actor');
      expect(participants[2].participantType).toBe('database');

      // Verify rendering works
      const svg = render(ast);
      expect(svg.querySelectorAll('.participant')).toHaveLength(3);

      // Verify actor has stick figure
      const userGroup = svg.querySelector('[data-node-id]');
      expect(userGroup).toBeTruthy();
    });

    it('should handle participants with aliases and styling', () => {
      const text = `
participant "Web Server" as WS #lightblue #navy;2;dashed
actor "End User" as EU #pink
database "MySQL DB" as DB #yellow #black;3
      `.trim();

      const ast = parse(text);
      const participants = ast.filter(n => n.type === 'participant');

      expect(participants[0].displayName).toBe('Web Server');
      expect(participants[0].alias).toBe('WS');
      expect(participants[0].style.fill).toBe('#lightblue');
      expect(participants[0].style.border).toBe('#navy');
      expect(participants[0].style.borderWidth).toBe(2);
      expect(participants[0].style.borderStyle).toBe('dashed');

      expect(participants[1].displayName).toBe('End User');
      expect(participants[1].alias).toBe('EU');
      expect(participants[1].style.fill).toBe('#pink');

      // Round-trip preserves all properties
      const serialized = serialize(ast);
      const reparsed = parse(serialized);
      const ws = reparsed.find(n => n.alias === 'WS');
      expect(ws.displayName).toBe('Web Server');
      expect(ws.style.borderStyle).toBe('dashed');
    });

    it('should handle multiline participant names', () => {
      const text = 'participant "Line1\\nLine2\\nLine3" as Multi';
      const ast = parse(text);

      expect(ast[0].displayName).toBe('Line1\nLine2\nLine3');

      const svg = render(ast);
      const tspans = svg.querySelectorAll('.participant tspan');
      expect(tspans.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Arrow types', () => {
    it('should handle all four arrow types', () => {
      const text = `
participant A
participant B
A->B:sync solid
A->>B:async solid
A-->B:sync dashed
A-->>B:async dashed
      `.trim();

      const ast = parse(text);
      const messages = ast.filter(n => n.type === 'message');

      expect(messages).toHaveLength(4);
      expect(messages[0].arrowType).toBe('->');
      expect(messages[1].arrowType).toBe('->>');
      expect(messages[2].arrowType).toBe('-->');
      expect(messages[3].arrowType).toBe('-->>');

      // Verify rendering
      const svg = render(ast);
      const messageLines = svg.querySelectorAll('.message line');
      expect(messageLines.length).toBeGreaterThanOrEqual(4);
    });

    it('should handle empty labels', () => {
      const text = 'A->B:';
      const ast = parse(text);
      expect(ast[0].label).toBe('');

      const serialized = serialize(ast);
      expect(serialized).toBe('A->B:');
    });

    it('should handle labels with special characters', () => {
      const text = 'A->B:Hello, World! <special> "quotes"';
      const ast = parse(text);
      expect(ast[0].label).toBe('Hello, World! <special> "quotes"');
    });
  });

  describe('Fragments', () => {
    it('should handle alt fragment with else clauses', () => {
      const text = `
alt success
  A->B:OK
else failure
  A->B:Error
else timeout
  A->B:Retry
end
      `.trim();

      const ast = parse(text);
      const fragment = ast.find(n => n.type === 'fragment');

      expect(fragment.fragmentType).toBe('alt');
      expect(fragment.condition).toBe('success');
      expect(fragment.entries).toHaveLength(1);
      expect(fragment.elseClauses).toHaveLength(2);
      expect(fragment.elseClauses[0].condition).toBe('failure');
      expect(fragment.elseClauses[1].condition).toBe('timeout');

      // Verify rendering
      const svg = render(ast);
      const fragmentEl = svg.querySelector('.fragment');
      expect(fragmentEl).toBeTruthy();
    });

    it('should handle loop fragment', () => {
      const text = `
loop 10 times
  A->B:ping
  B-->A:pong
end
      `.trim();

      const ast = parse(text);
      const fragment = ast.find(n => n.type === 'fragment');

      expect(fragment.fragmentType).toBe('loop');
      expect(fragment.condition).toBe('10 times');
      expect(fragment.entries).toHaveLength(2);
    });

    it('should handle nested fragments', () => {
      const text = `
alt outer
  loop inner
    A->B:message
  end
else other
  A->B:else msg
end
      `.trim();

      const ast = parse(text);
      const outerFragment = ast.find(n => n.type === 'fragment' && n.fragmentType === 'alt');
      const innerFragment = ast.find(n => n.type === 'fragment' && n.fragmentType === 'loop');

      expect(outerFragment).toBeTruthy();
      expect(innerFragment).toBeTruthy();
      expect(outerFragment.entries).toContain(innerFragment.id);
    });

    it('should handle fragment styling', () => {
      const text = `
alt#yellow #lightblue #red;2;dashed success
  A->B:styled message
else #pink failure
  A->B:error
end
      `.trim();

      const ast = parse(text);
      const fragment = ast.find(n => n.type === 'fragment');

      expect(fragment.style.operatorColor).toBe('#yellow');
      expect(fragment.style.fill).toBe('#lightblue');
      expect(fragment.style.border).toBe('#red');
      expect(fragment.style.borderWidth).toBe(2);
      expect(fragment.style.borderStyle).toBe('dashed');
      expect(fragment.elseClauses[0].style.fill).toBe('#pink');
    });
  });

  describe('Comments and blank lines', () => {
    it('should parse and preserve comments', () => {
      const text = `
// Header comment
participant A
# Another comment style
A->B:message
// End comment
      `.trim();

      const ast = parse(text);
      const comments = ast.filter(n => n.type === 'comment');

      expect(comments).toHaveLength(3);
      expect(comments[0].text).toBe('// Header comment');
      expect(comments[1].text).toBe('# Another comment style');

      // Round-trip preserves comments
      const serialized = serialize(ast);
      expect(serialized).toContain('// Header comment');
      expect(serialized).toContain('# Another comment style');
    });

    it('should parse and preserve blank lines', () => {
      const text = 'participant A\n\nparticipant B\n\n\nA->B:message';

      const ast = parse(text);
      const blanklines = ast.filter(n => n.type === 'blankline');

      expect(blanklines.length).toBeGreaterThanOrEqual(2);

      // Round-trip preserves blank lines
      const serialized = serialize(ast);
      expect(serialized).toBe('participant A\n\nparticipant B\n\n\nA->B:message');
    });

    it('should handle comments inside fragments', () => {
      const text = `
alt condition
  // Inside fragment
  A->B:message
end
      `.trim();

      const ast = parse(text);
      const fragment = ast.find(n => n.type === 'fragment');
      const comment = ast.find(n => n.type === 'comment');

      expect(fragment.entries).toContain(comment.id);

      // Serialization indents comments inside fragments
      const serialized = serialize(ast);
      expect(serialized).toContain('  // Inside fragment');
    });
  });

  describe('Title directive', () => {
    it('should parse and render title', () => {
      const text = `
title My Sequence Diagram
participant A
participant B
A->B:Hello
      `.trim();

      const ast = parse(text);
      const title = ast.find(n => n.type === 'directive' && n.directiveType === 'title');

      expect(title).toBeTruthy();
      expect(title.value).toBe('My Sequence Diagram');

      // Verify title is rendered
      const svg = render(ast);
      const titleEl = svg.querySelector('.diagram-title');
      expect(titleEl).toBeTruthy();
      expect(titleEl.textContent).toBe('My Sequence Diagram');
    });

    it('should handle title with special characters', () => {
      const text = 'title API Flow: User -> Server <HTTP>';
      const ast = parse(text);
      const title = ast.find(n => n.type === 'directive');

      expect(title.value).toBe('API Flow: User -> Server <HTTP>');
    });
  });

  describe('Text markup', () => {
    it('should handle bold markup in message labels', () => {
      const text = 'A->B:**important** message';
      const ast = parse(text);

      expect(ast[0].label).toBe('**important** message');
    });

    it('should handle italic markup in message labels', () => {
      const text = 'A->B://emphasized// text';
      const ast = parse(text);

      expect(ast[0].label).toBe('//emphasized// text');
    });

    it('should handle line breaks in message labels', () => {
      const text = 'A->B:line1\\nline2';
      const ast = parse(text);

      expect(ast[0].label).toBe('line1\\nline2');
    });

    it('should handle combined markup', () => {
      const text = 'A->B:**bold** and //italic//\\nnewline';
      const ast = parse(text);

      expect(ast[0].label).toBe('**bold** and //italic//\\nnewline');

      // Round-trip preserves markup
      const serialized = serialize(ast);
      expect(serialized).toBe('A->B:**bold** and //italic//\\nnewline');
    });
  });

  describe('Error handling', () => {
    it('should create error nodes for invalid syntax', () => {
      const text = `
participant A
invalidSyntax!!!
A->B:message
      `.trim();

      const ast = parse(text);
      const error = ast.find(n => n.type === 'error');

      expect(error).toBeTruthy();
      expect(error.text).toBe('invalidSyntax!!!');
      expect(error.message).toBeTruthy();
    });

    it('should render error nodes as warning boxes', () => {
      const text = 'invalidLine';
      const ast = parse(text);

      const svg = render(ast);
      const errorGroup = svg.querySelector('.error');
      expect(errorGroup).toBeTruthy();
      expect(errorGroup.textContent).toContain('invalidLine');
    });

    it('should serialize error nodes as comments', () => {
      const text = 'badSyntax';
      const ast = parse(text);
      const serialized = serialize(ast);

      expect(serialized).toContain('// ERROR:');
      expect(serialized).toContain('badSyntax');
    });

    it('should continue parsing after errors', () => {
      const text = `
participant A
error1
participant B
error2
A->B:message
      `.trim();

      const ast = parse(text);
      const participants = ast.filter(n => n.type === 'participant');
      const messages = ast.filter(n => n.type === 'message');
      const errors = ast.filter(n => n.type === 'error');

      expect(participants).toHaveLength(2);
      expect(messages).toHaveLength(1);
      expect(errors).toHaveLength(2);
    });

    it('should handle errors inside fragments', () => {
      const text = `
alt condition
  A->B:ok
  badLine
  B-->A:response
end
      `.trim();

      const ast = parse(text);
      const fragment = ast.find(n => n.type === 'fragment');
      const error = ast.find(n => n.type === 'error');

      expect(error).toBeTruthy();
      expect(fragment.entries).toContain(error.id);
    });
  });

  describe('Complete workflows', () => {
    it('should handle a realistic diagram', () => {
      const text = `
title User Authentication Flow

participant Browser
actor User
participant "Auth Server" as Auth #lightblue
database "User DB" as DB

// Initial request
User->Browser:Open login page
Browser->Auth:GET /login

// Login flow
alt successful login
  Auth->DB:Query user
  DB-->Auth:User found
  Auth-->Browser:200 OK
  Browser-->User:Show dashboard
else invalid credentials
  Auth->DB:Query user
  DB-->Auth:Not found
  Auth-->Browser:401 Unauthorized
  Browser-->User:Show error
end
      `.trim();

      const ast = parse(text);

      // Verify structure
      const title = ast.find(n => n.type === 'directive');
      const participants = ast.filter(n => n.type === 'participant');
      const messages = ast.filter(n => n.type === 'message');
      const fragments = ast.filter(n => n.type === 'fragment');
      const comments = ast.filter(n => n.type === 'comment');

      expect(title.value).toBe('User Authentication Flow');
      expect(participants).toHaveLength(4);
      expect(messages.length).toBeGreaterThan(5);
      expect(fragments).toHaveLength(1);
      expect(comments).toHaveLength(2);

      // Verify rendering
      const svg = render(ast);
      expect(svg.querySelector('.diagram-title')).toBeTruthy();
      expect(svg.querySelectorAll('.participant').length).toBe(4);
      expect(svg.querySelector('.fragment')).toBeTruthy();

      // Verify round-trip
      const serialized = serialize(ast);
      const reparsed = parse(serialized);
      expect(reparsed.filter(n => n.type === 'participant')).toHaveLength(4);
      expect(reparsed.filter(n => n.type === 'fragment')).toHaveLength(1);
    });

    it('should handle layout calculation correctly', () => {
      const text = `
participant A
participant B
participant C
A->B:First
B->C:Second
C-->A:Return
      `.trim();

      const ast = parse(text);
      const { layout, totalHeight, participantLayout } = calculateLayout(ast);

      // Participants should be horizontally distributed
      const aLayout = participantLayout.get('A');
      const bLayout = participantLayout.get('B');
      const cLayout = participantLayout.get('C');

      expect(aLayout.x).toBeLessThan(bLayout.x);
      expect(bLayout.x).toBeLessThan(cLayout.x);

      // Messages should be vertically stacked
      const messages = ast.filter(n => n.type === 'message');
      const msg1Layout = layout.get(messages[0].id);
      const msg2Layout = layout.get(messages[1].id);
      const msg3Layout = layout.get(messages[2].id);

      expect(msg1Layout.y).toBeLessThan(msg2Layout.y);
      expect(msg2Layout.y).toBeLessThan(msg3Layout.y);
    });

    it('should maintain proper z-order in rendering', () => {
      const text = `
participant A
participant B
alt condition
  A->B:message
end
      `.trim();

      const ast = parse(text);
      const svg = render(ast);

      // Check group order (first groups are behind)
      const children = Array.from(svg.children);
      const defsIndex = children.findIndex(el => el.tagName === 'defs');
      const fragmentsIndex = children.findIndex(el => el.id === 'fragments');
      const lifelinesIndex = children.findIndex(el => el.id === 'lifelines');
      const messagesIndex = children.findIndex(el => el.id === 'messages');
      const participantsIndex = children.findIndex(el => el.id === 'participants');

      // Fragments behind lifelines behind messages behind participants
      expect(fragmentsIndex).toBeLessThan(lifelinesIndex);
      expect(lifelinesIndex).toBeLessThan(messagesIndex);
      expect(messagesIndex).toBeLessThan(participantsIndex);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty input', () => {
      const ast = parse('');
      expect(ast).toHaveLength(1); // blankline
      expect(ast[0].type).toBe('blankline');
    });

    it('should handle whitespace-only input', () => {
      const ast = parse('   \n   \n   ');
      expect(ast.every(n => n.type === 'blankline')).toBe(true);
    });

    it('should handle single participant', () => {
      const ast = parse('participant Solo');
      const svg = render(ast);

      expect(svg.querySelectorAll('.participant')).toHaveLength(1);
      expect(svg.querySelectorAll('.lifeline')).toHaveLength(1);
    });

    it('should handle self-messages', () => {
      const text = 'participant A\nA->A:self message';
      const ast = parse(text);

      const message = ast.find(n => n.type === 'message');
      expect(message.from).toBe('A');
      expect(message.to).toBe('A');
    });

    it('should handle very long labels', () => {
      const longLabel = 'A'.repeat(200);
      const text = `A->B:${longLabel}`;
      const ast = parse(text);

      expect(ast[0].label).toBe(longLabel);
    });

    it('should handle special characters in aliases', () => {
      const text = 'participant A123\nA123->B:message';
      const ast = parse(text);

      expect(ast[0].alias).toBe('A123');
      expect(ast[1].from).toBe('A123');
    });

    it('should handle deeply nested fragments', () => {
      const text = `
alt l1
  loop l2
    alt l3
      A->B:deep
    end
  end
end
      `.trim();

      const ast = parse(text);
      const fragments = ast.filter(n => n.type === 'fragment');

      expect(fragments).toHaveLength(3);
    });
  });
});
