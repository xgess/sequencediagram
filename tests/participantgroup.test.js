// Tests for participant groups

import { describe, it, expect } from 'vitest';
import { parse } from '../public/src/ast/parser.js';
import { serialize } from '../public/src/ast/serializer.js';
import { render } from '../public/src/rendering/renderer.js';

describe('Participant Groups', () => {

  describe('Parsing participant groups', () => {
    it('should parse simple participant group', () => {
      const input = `participantgroup Internal
participant A
participant B
end`;
      const ast = parse(input);
      const group = ast.find(n => n.type === 'participantgroup');
      expect(group).toBeDefined();
      expect(group.label).toBe('Internal');
      expect(group.participants).toEqual(['A', 'B']);
    });

    it('should parse participant group with color', () => {
      const input = `participantgroup #lightblue Internal
participant A
end`;
      const ast = parse(input);
      const group = ast.find(n => n.type === 'participantgroup');
      expect(group.color).toBe('#lightblue');
      expect(group.label).toBe('Internal');
    });

    it('should parse participant group without label', () => {
      const input = `participantgroup #red
participant A
end`;
      const ast = parse(input);
      const group = ast.find(n => n.type === 'participantgroup');
      expect(group.color).toBe('#red');
      expect(group.label).toBe('');
    });

    it('should parse empty participant group', () => {
      const input = `participantgroup
end`;
      const ast = parse(input);
      const group = ast.find(n => n.type === 'participantgroup');
      expect(group).toBeDefined();
      expect(group.participants).toEqual([]);
    });

    it('should parse nested participant groups', () => {
      const input = `participantgroup Outer
participant A
participantgroup Inner
participant B
end
participant C
end`;
      const ast = parse(input);
      const groups = ast.filter(n => n.type === 'participantgroup');
      expect(groups.length).toBe(2);

      const outer = groups.find(g => g.label === 'Outer');
      const inner = groups.find(g => g.label === 'Inner');

      expect(outer.participants).toContain('A');
      expect(outer.participants).toContain('C');
      expect(outer.nestedGroups).toContain(inner.id);

      expect(inner.participants).toContain('B');
    });
  });

  describe('Serialization', () => {
    it('should serialize simple participant group', () => {
      const input = `participantgroup Internal
participant A
end`;
      const ast = parse(input);
      const output = serialize(ast);
      expect(output).toContain('participantgroup Internal');
      expect(output).toContain('participant A');
      expect(output).toContain('end');
    });

    it('should serialize participant group with color', () => {
      const input = `participantgroup #lightblue Internal
participant A
end`;
      const ast = parse(input);
      const output = serialize(ast);
      expect(output).toContain('participantgroup #lightblue Internal');
    });

    it('should preserve indentation in serialization', () => {
      const input = `participantgroup Test
participant A
end`;
      const ast = parse(input);
      const output = serialize(ast);
      const lines = output.split('\n');
      expect(lines[0]).toBe('participantgroup Test');
      expect(lines[1]).toMatch(/^\s+participant A$/);
      expect(lines[2]).toBe('end');
    });
  });

  describe('Rendering participant groups', () => {
    it('should render participant group background', () => {
      const input = `participantgroup Internal
participant A
participant B
end
A->B:msg`;
      const ast = parse(input);
      const svg = render(ast);

      const group = svg.querySelector('.participant-group');
      expect(group).toBeDefined();

      const rect = group.querySelector('rect');
      expect(rect).toBeDefined();
    });

    it('should render participant group with label', () => {
      const input = `participantgroup Internal
participant A
end
A->A:msg`;
      const ast = parse(input);
      const svg = render(ast);

      const group = svg.querySelector('.participant-group');
      const text = group.querySelector('text');
      expect(text).toBeDefined();
      expect(text.textContent).toBe('Internal');
    });

    it('should apply color to participant group', () => {
      const input = `participantgroup #lightblue Internal
participant A
end
A->A:msg`;
      const ast = parse(input);
      const svg = render(ast);

      const group = svg.querySelector('.participant-group');
      const rect = group.querySelector('rect');
      // Named colors are rendered without the # prefix for SVG
      expect(rect.getAttribute('fill')).toBe('lightblue');
    });

    it('should render empty group (no rect)', () => {
      const input = `participantgroup Empty
end
participant A
A->A:msg`;
      const ast = parse(input);
      const svg = render(ast);

      // The empty group should not render a visible element
      // since there are no participants in it
      const groups = svg.querySelectorAll('.participant-group');
      // Either no groups or the empty one returns null
      expect(groups.length).toBe(0);
    });
  });

  describe('Round-trip', () => {
    it('should round-trip simple participant group', () => {
      const input = `participantgroup Internal
participant A
end`;
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const g1 = ast1.find(n => n.type === 'participantgroup');
      const g2 = ast2.find(n => n.type === 'participantgroup');

      expect(g2.label).toBe(g1.label);
      expect(g2.participants).toEqual(g1.participants);
    });

    it('should round-trip participant group with color', () => {
      const input = `participantgroup #lightblue Test
participant A
end`;
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const g1 = ast1.find(n => n.type === 'participantgroup');
      const g2 = ast2.find(n => n.type === 'participantgroup');

      expect(g2.color).toBe(g1.color);
    });
  });

  describe('Integration with other features', () => {
    it('should work with messages between grouped participants', () => {
      const input = `participantgroup Internal
participant A
participant B
end
participant C
A->B:internal
A->C:external`;
      const ast = parse(input);
      const svg = render(ast);

      // Should have participant group rendered
      expect(svg.querySelector('.participant-group')).toBeDefined();

      // Should have messages rendered
      const messages = svg.querySelectorAll('.message');
      expect(messages.length).toBe(2);
    });
  });
});
