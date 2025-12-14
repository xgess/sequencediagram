// Tests for notes and dividers (BACKLOG-126)

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
