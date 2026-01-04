// Tests for notes and dividers (BACKLOG-126)
// Tests for note and box styling (BACKLOG-127)

import { describe, it, expect } from 'vitest';
import { parse } from '../src/ast/parser.js';
import { serialize } from '../src/ast/serializer.js';
import { render } from '../src/rendering/renderer.js';

describe('Notes and Dividers (BACKLOG-126)', () => {

  describe('Note Parsing', () => {
    it('should parse note over single participant', () => {
      const ast = parse('participant A\nnote over A:Hello');
      const note = ast.find(n => n.type === 'note');
      expect(note).toBeDefined();
      expect(note.noteType).toBe('note');
      expect(note.position).toBe('over');
      expect(note.participants).toEqual(['A']);
      expect(note.text).toBe('Hello');
    });

    it('should parse note over multiple participants', () => {
      const ast = parse('participant A\nparticipant B\nnote over A,B:Spanning note');
      const note = ast.find(n => n.type === 'note');
      expect(note.participants).toEqual(['A', 'B']);
      expect(note.text).toBe('Spanning note');
    });

    it('should parse note left of participant', () => {
      const ast = parse('participant A\nnote left of A:Left note');
      const note = ast.find(n => n.type === 'note');
      expect(note.position).toBe('left of');
      expect(note.participants).toEqual(['A']);
    });

    it('should parse note right of participant', () => {
      const ast = parse('participant A\nnote right of A:Right note');
      const note = ast.find(n => n.type === 'note');
      expect(note.position).toBe('right of');
    });

    it('should parse box type', () => {
      const ast = parse('participant A\nbox over A:Box content');
      const note = ast.find(n => n.type === 'note');
      expect(note.noteType).toBe('box');
    });

    it('should parse abox type', () => {
      const ast = parse('participant A\nabox over A:Angular box');
      const note = ast.find(n => n.type === 'note');
      expect(note.noteType).toBe('abox');
    });

    it('should parse rbox type', () => {
      const ast = parse('participant A\nrbox over A:Rounded box');
      const note = ast.find(n => n.type === 'note');
      expect(note.noteType).toBe('rbox');
    });

    it('should parse ref type', () => {
      const ast = parse('participant A\nref over A:See diagram X');
      const note = ast.find(n => n.type === 'note');
      expect(note.noteType).toBe('ref');
    });

    it('should parse state type', () => {
      const ast = parse('participant A\nstate over A:Idle');
      const note = ast.find(n => n.type === 'note');
      expect(note.noteType).toBe('state');
    });

    it('should parse note with styling', () => {
      const ast = parse('participant A\nnote over A #lightblue:Styled note');
      const note = ast.find(n => n.type === 'note');
      expect(note.style).toBeDefined();
      expect(note.style.fill).toBe('#lightblue');
    });
  });

  describe('Divider Parsing', () => {
    it('should parse simple divider', () => {
      const ast = parse('==Section 1==');
      const divider = ast.find(n => n.type === 'divider');
      expect(divider).toBeDefined();
      expect(divider.text).toBe('Section 1');
    });

    it('should parse divider with styling', () => {
      const ast = parse('==Info==#yellow');
      const divider = ast.find(n => n.type === 'divider');
      expect(divider.style).toBeDefined();
      expect(divider.style.fill).toBe('#yellow');
    });

    it('should parse divider in sequence', () => {
      const ast = parse('participant A\nA->A:Self\n==Break==\nA->A:After');
      const divider = ast.find(n => n.type === 'divider');
      expect(divider.text).toBe('Break');
    });
  });

  describe('Note Serialization', () => {
    it('should serialize note over single participant', () => {
      const ast = parse('participant A\nnote over A:Hello');
      const text = serialize(ast);
      expect(text).toContain('note over A:Hello');
    });

    it('should serialize note over multiple participants', () => {
      const ast = parse('participant A\nparticipant B\nnote over A,B:Span');
      const text = serialize(ast);
      expect(text).toContain('note over A,B:Span');
    });

    it('should serialize note positions', () => {
      const leftAst = parse('participant A\nnote left of A:Left');
      expect(serialize(leftAst)).toContain('note left of A:Left');

      const rightAst = parse('participant A\nnote right of A:Right');
      expect(serialize(rightAst)).toContain('note right of A:Right');
    });

    it('should serialize different note types', () => {
      expect(serialize(parse('participant A\nbox over A:Box'))).toContain('box over A:Box');
      expect(serialize(parse('participant A\nabox over A:Abox'))).toContain('abox over A:Abox');
      expect(serialize(parse('participant A\nrbox over A:Rbox'))).toContain('rbox over A:Rbox');
      expect(serialize(parse('participant A\nref over A:Ref'))).toContain('ref over A:Ref');
      expect(serialize(parse('participant A\nstate over A:State'))).toContain('state over A:State');
    });
  });

  describe('Divider Serialization', () => {
    it('should serialize simple divider', () => {
      const ast = parse('==Section==');
      expect(serialize(ast)).toBe('==Section==');
    });

    it('should preserve divider in sequence', () => {
      const input = 'participant A\nA->A:Before\n==Break==\nA->A:After';
      const ast = parse(input);
      const output = serialize(ast);
      expect(output).toContain('==Break==');
    });
  });

  describe('Note Rendering', () => {
    it('should render note element', () => {
      const ast = parse('participant A\nnote over A:Test note');
      const svg = render(ast);
      const noteGroup = svg.querySelector('.note');
      expect(noteGroup).toBeDefined();
    });

    it('should render different note shapes', () => {
      // Test that each shape type renders without error
      const types = ['note', 'box', 'abox', 'rbox', 'ref', 'state'];
      for (const type of types) {
        const ast = parse(`participant A\n${type} over A:Content`);
        const svg = render(ast);
        const noteGroup = svg.querySelector(`.note-${type}`);
        expect(noteGroup).toBeDefined();
      }
    });

    it('should render note text', () => {
      const ast = parse('participant A\nnote over A:Hello World');
      const svg = render(ast);
      const text = svg.querySelector('.note-text');
      expect(text).toBeDefined();
      expect(text.textContent).toBe('Hello World');
    });
  });

  describe('Divider Rendering', () => {
    it('should render divider element', () => {
      const ast = parse('participant A\n==Section==');
      const svg = render(ast);
      const dividerGroup = svg.querySelector('.divider');
      expect(dividerGroup).toBeDefined();
    });

    it('should render divider text', () => {
      const ast = parse('participant A\n==Important==');
      const svg = render(ast);
      const text = svg.querySelector('.divider-text');
      expect(text).toBeDefined();
      expect(text.textContent).toBe('Important');
    });
  });

  describe('Round-trip (parse -> serialize -> parse)', () => {
    it('should round-trip note correctly', () => {
      const input = 'participant A\nnote over A:Test';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const note1 = ast1.find(n => n.type === 'note');
      const note2 = ast2.find(n => n.type === 'note');

      expect(note2.noteType).toBe(note1.noteType);
      expect(note2.position).toBe(note1.position);
      expect(note2.participants).toEqual(note1.participants);
      expect(note2.text).toBe(note1.text);
    });

    it('should round-trip divider correctly', () => {
      const input = '==Section==';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const div1 = ast1.find(n => n.type === 'divider');
      const div2 = ast2.find(n => n.type === 'divider');

      expect(div2.text).toBe(div1.text);
    });
  });
});

describe('Note and Box Styling (BACKLOG-127)', () => {

  describe('Parsing Note Fill Color', () => {
    it('should parse note with fill color', () => {
      const ast = parse('participant A\nnote over A #lightblue:Styled');
      const note = ast.find(n => n.type === 'note');
      expect(note.style).toBeDefined();
      expect(note.style.fill).toBe('#lightblue');
    });

    it('should parse note with hex color', () => {
      const ast = parse('participant A\nnote over A #ff5500:Orange note');
      const note = ast.find(n => n.type === 'note');
      expect(note.style.fill).toBe('#ff5500');
    });

    it('should parse box with fill color', () => {
      const ast = parse('participant A\nbox over A #yellow:Yellow box');
      const note = ast.find(n => n.type === 'note');
      expect(note.noteType).toBe('box');
      expect(note.style.fill).toBe('#yellow');
    });

    it('should parse abox with fill color', () => {
      const ast = parse('participant A\nabox over A #e0e0e0:Gray angular');
      const note = ast.find(n => n.type === 'note');
      expect(note.noteType).toBe('abox');
      expect(note.style.fill).toBe('#e0e0e0');
    });

    it('should parse rbox with fill color', () => {
      const ast = parse('participant A\nrbox over A #ffd700:Gold rounded');
      const note = ast.find(n => n.type === 'note');
      expect(note.noteType).toBe('rbox');
      expect(note.style.fill).toBe('#ffd700');
    });

    it('should parse ref with fill color', () => {
      const ast = parse('participant A\nref over A #f0f0f0:Reference');
      const note = ast.find(n => n.type === 'note');
      expect(note.noteType).toBe('ref');
      expect(note.style.fill).toBe('#f0f0f0');
    });

    it('should parse state with fill color', () => {
      const ast = parse('participant A\nstate over A #90ee90:Active state');
      const note = ast.find(n => n.type === 'note');
      expect(note.noteType).toBe('state');
      expect(note.style.fill).toBe('#90ee90');
    });
  });

  describe('Parsing Border Styling', () => {
    it('should parse note with border color', () => {
      const ast = parse('participant A\nnote over A #white #red:Red bordered');
      const note = ast.find(n => n.type === 'note');
      expect(note.style.fill).toBe('#white');
      expect(note.style.border).toBe('#red');
    });

    it('should parse note with border width', () => {
      const ast = parse('participant A\nnote over A #yellow #blue;2:Thick border');
      const note = ast.find(n => n.type === 'note');
      expect(note.style.fill).toBe('#yellow');
      expect(note.style.border).toBe('#blue');
      expect(note.style.borderWidth).toBe(2);
    });

    it('should parse note with dashed border style', () => {
      const ast = parse('participant A\nnote over A #white #333;1;dashed:Dashed note');
      const note = ast.find(n => n.type === 'note');
      expect(note.style.fill).toBe('#white');
      expect(note.style.border).toBe('#333');
      expect(note.style.borderWidth).toBe(1);
      expect(note.style.borderStyle).toBe('dashed');
    });

    it('should parse box with complete border styling', () => {
      const ast = parse('participant A\nbox over A #f8f8f8 #000;3;solid:Styled box');
      const note = ast.find(n => n.type === 'note');
      expect(note.noteType).toBe('box');
      expect(note.style.fill).toBe('#f8f8f8');
      expect(note.style.border).toBe('#000');
      expect(note.style.borderWidth).toBe(3);
      expect(note.style.borderStyle).toBe('solid');
    });
  });

  describe('Styling with Multiple Participants', () => {
    it('should parse styled note spanning two participants', () => {
      const ast = parse('participant A\nparticipant B\nnote over A,B #pink:Spanning note');
      const note = ast.find(n => n.type === 'note');
      expect(note.participants).toEqual(['A', 'B']);
      expect(note.style.fill).toBe('#pink');
    });

    it('should parse styled note spanning three participants', () => {
      const ast = parse('participant A\nparticipant B\nparticipant C\nnote over A,B,C #lightgray:Wide note');
      const note = ast.find(n => n.type === 'note');
      expect(note.participants).toEqual(['A', 'B', 'C']);
      expect(note.style.fill).toBe('#lightgray');
    });
  });

  describe('Styling Left/Right Notes', () => {
    it('should parse styled note left of participant', () => {
      const ast = parse('participant A\nnote left of A #cyan:Left note');
      const note = ast.find(n => n.type === 'note');
      expect(note.position).toBe('left of');
      expect(note.style.fill).toBe('#cyan');
    });

    it('should parse styled note right of participant', () => {
      const ast = parse('participant A\nnote right of A #magenta:Right note');
      const note = ast.find(n => n.type === 'note');
      expect(note.position).toBe('right of');
      expect(note.style.fill).toBe('#magenta');
    });
  });

  describe('Divider Styling', () => {
    it('should parse divider with fill color', () => {
      const ast = parse('==Important==#yellow');
      const divider = ast.find(n => n.type === 'divider');
      expect(divider.style).toBeDefined();
      expect(divider.style.fill).toBe('#yellow');
    });

    it('should parse divider with border color', () => {
      const ast = parse('==Section==#white #blue');
      const divider = ast.find(n => n.type === 'divider');
      expect(divider.style.fill).toBe('#white');
      expect(divider.style.border).toBe('#blue');
    });
  });

  describe('Serialization with Styling', () => {
    it('should serialize note with fill color', () => {
      const ast = parse('participant A\nnote over A #lightblue:Styled');
      const output = serialize(ast);
      expect(output).toContain('note over A #lightblue:Styled');
    });

    it('should serialize note with border styling', () => {
      const ast = parse('participant A\nnote over A #yellow #red;2;dashed:Complex');
      const output = serialize(ast);
      expect(output).toContain('#yellow');
      expect(output).toContain('#red');
      expect(output).toContain(':Complex');
    });

    it('should serialize styled box', () => {
      const ast = parse('participant A\nbox over A #f0f0f0:Gray box');
      const output = serialize(ast);
      expect(output).toContain('box over A #f0f0f0:Gray box');
    });

    it('should serialize styled divider', () => {
      const ast = parse('==Section==#yellow');
      const output = serialize(ast);
      expect(output).toContain('==Section==#yellow');
    });
  });

  describe('Round-trip with Styling', () => {
    it('should round-trip note with fill color', () => {
      const input = 'participant A\nnote over A #lightblue:Styled note';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const note1 = ast1.find(n => n.type === 'note');
      const note2 = ast2.find(n => n.type === 'note');

      expect(note2.style.fill).toBe(note1.style.fill);
      expect(note2.text).toBe(note1.text);
    });

    it('should round-trip note with full border styling', () => {
      const input = 'participant A\nnote over A #white #333;2;dashed:Bordered';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const note1 = ast1.find(n => n.type === 'note');
      const note2 = ast2.find(n => n.type === 'note');

      expect(note2.style.fill).toBe(note1.style.fill);
      expect(note2.style.border).toBe(note1.style.border);
      expect(note2.style.borderWidth).toBe(note1.style.borderWidth);
      expect(note2.style.borderStyle).toBe(note1.style.borderStyle);
    });

    it('should round-trip styled divider', () => {
      const input = '==Section==#orange #black';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const div1 = ast1.find(n => n.type === 'divider');
      const div2 = ast2.find(n => n.type === 'divider');

      expect(div2.style.fill).toBe(div1.style.fill);
      expect(div2.style.border).toBe(div1.style.border);
    });
  });

  describe('Rendering with Styling', () => {
    it('should apply fill color to note background', () => {
      const ast = parse('participant A\nnote over A #ff0000:Red note');
      const svg = render(ast);
      const noteShape = svg.querySelector('.note path, .note rect');
      expect(noteShape).toBeDefined();
      expect(noteShape.getAttribute('fill')).toBe('#ff0000');
    });

    it('should apply border color to note', () => {
      const ast = parse('participant A\nnote over A #white #0000ff:Blue border');
      const svg = render(ast);
      const noteShape = svg.querySelector('.note path, .note rect');
      expect(noteShape).toBeDefined();
      expect(noteShape.getAttribute('stroke')).toBe('#0000ff');
    });

    it('should apply border width to note', () => {
      const ast = parse('participant A\nnote over A #white #333;3:Thick border');
      const svg = render(ast);
      const noteShape = svg.querySelector('.note path, .note rect');
      expect(noteShape.getAttribute('stroke-width')).toBe('3');
    });

    it('should apply dashed border style to note', () => {
      const ast = parse('participant A\nnote over A #white #333;1;dashed:Dashed');
      const svg = render(ast);
      const noteShape = svg.querySelector('.note path, .note rect');
      expect(noteShape.getAttribute('stroke-dasharray')).toBe('5,5');
    });

    it('should apply fill color to box', () => {
      const ast = parse('participant A\nbox over A #00ff00:Green box');
      const svg = render(ast);
      const boxShape = svg.querySelector('.note-box rect');
      expect(boxShape.getAttribute('fill')).toBe('#00ff00');
    });

    it('should apply fill color to abox', () => {
      const ast = parse('participant A\nabox over A #ffff00:Yellow angular');
      const svg = render(ast);
      const aboxShape = svg.querySelector('.note-abox path');
      expect(aboxShape.getAttribute('fill')).toBe('#ffff00');
    });

    it('should apply fill color to rbox', () => {
      const ast = parse('participant A\nrbox over A #ff00ff:Magenta rounded');
      const svg = render(ast);
      const rboxShape = svg.querySelector('.note-rbox rect');
      expect(rboxShape.getAttribute('fill')).toBe('#ff00ff');
    });

    it('should apply fill color to ref', () => {
      const ast = parse('participant A\nref over A #00ffff:Cyan ref');
      const svg = render(ast);
      const refShape = svg.querySelector('.note-ref rect');
      expect(refShape.getAttribute('fill')).toBe('#00ffff');
    });

    it('should apply fill color to state', () => {
      const ast = parse('participant A\nstate over A #ffa500:Orange state');
      const svg = render(ast);
      const stateShape = svg.querySelector('.note-state rect');
      expect(stateShape.getAttribute('fill')).toBe('#ffa500');
    });

    it('should apply fill color to divider', () => {
      const ast = parse('participant A\n==Break==#lightgreen');
      const svg = render(ast);
      const dividerBox = svg.querySelector('.divider rect');
      // Named colors are rendered without the # prefix for SVG
      expect(dividerBox.getAttribute('fill')).toBe('lightgreen');
    });
  });

  describe('Default Styles', () => {
    it('should use default yellow fill for unstyled note', () => {
      const ast = parse('participant A\nnote over A:Default note');
      const svg = render(ast);
      const noteShape = svg.querySelector('.note path');
      expect(noteShape.getAttribute('fill')).toBe('#ffffc0');
    });

    it('should use default gray fill for unstyled box', () => {
      const ast = parse('participant A\nbox over A:Default box');
      const svg = render(ast);
      const boxShape = svg.querySelector('.note-box rect');
      expect(boxShape.getAttribute('fill')).toBe('#f8f8f8');
    });

    it('should use default green fill for unstyled state', () => {
      const ast = parse('participant A\nstate over A:Default state');
      const svg = render(ast);
      const stateShape = svg.querySelector('.note-state rect');
      expect(stateShape.getAttribute('fill')).toBe('#e8f4e8');
    });
  });

  describe('Named style references (##styleName)', () => {
    it('should parse note with named style reference', () => {
      const ast = parse('style warning #yellow #red\nparticipant A\nnote over A ##warning:Alert!');
      const note = ast.find(n => n.type === 'note');
      expect(note.style).toBeDefined();
      expect(note.style.styleName).toBe('warning');
      expect(note.style.fill).toBeUndefined();
    });

    it('should parse divider with named style reference', () => {
      const ast = parse('style warning #yellow #red\nparticipant A\n==Break==##warning');
      const divider = ast.find(n => n.type === 'divider');
      expect(divider.style).toBeDefined();
      expect(divider.style.styleName).toBe('warning');
    });

    it('should render note with resolved named style', () => {
      const ast = parse('style highlight #ff0000 #0000ff\nparticipant A\nnote over A ##highlight:Important');
      const svg = render(ast);
      const noteShape = svg.querySelector('.note path');
      // Named style should resolve to the defined colors
      expect(noteShape.getAttribute('fill')).toBe('#ff0000');
      expect(noteShape.getAttribute('stroke')).toBe('#0000ff');
    });

    it('should render divider with resolved named style', () => {
      const ast = parse('style info #00ff00\nparticipant A\n==Info==##info');
      const svg = render(ast);
      const dividerBox = svg.querySelector('.divider rect');
      expect(dividerBox.getAttribute('fill')).toBe('#00ff00');
    });

    it('should use defaults when named style not found', () => {
      const ast = parse('participant A\nnote over A ##nonexistent:Test');
      const svg = render(ast);
      const noteShape = svg.querySelector('.note path');
      // Should fall back to default note styling
      expect(noteShape.getAttribute('fill')).toBe('#ffffc0');
    });
  });

  describe('Note positioning edge cases', () => {
    it('should expand viewBox for note left of leftmost participant', () => {
      const ast = parse('participant Alice\nnote left of Alice:This is a note that should be visible');
      const svg = render(ast);

      const viewBox = svg.getAttribute('viewBox');
      const [viewBoxX] = viewBox.split(' ').map(Number);

      // viewBox should have negative X to accommodate the note
      expect(viewBoxX).toBeLessThan(0);

      // Note should be visible (not squished)
      const noteGroup = svg.querySelector('.note');
      expect(noteGroup).toBeDefined();
    });

    it('should keep viewBox at 0 when no notes extend left', () => {
      const ast = parse('participant Alice\nparticipant Bob\nnote right of Alice:Right note');
      const svg = render(ast);

      const viewBox = svg.getAttribute('viewBox');
      const [viewBoxX] = viewBox.split(' ').map(Number);

      // viewBox should start at negative margin (standard layout)
      expect(viewBoxX).toBeLessThanOrEqual(0);
    });
  });
});
