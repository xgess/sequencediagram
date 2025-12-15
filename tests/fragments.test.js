// Tests for all fragment types (BACKLOG-124)

import { describe, it, expect } from 'vitest';
import { parse } from '../src/ast/parser.js';
import { serialize } from '../src/ast/serializer.js';
import { render } from '../src/rendering/renderer.js';

// All 16 fragment types from REQUIREMENTS.md
const FRAGMENT_TYPES = [
  'alt', 'loop', 'opt', 'par', 'break', 'critical', 'ref', 'seq',
  'strict', 'neg', 'ignore', 'consider', 'assert', 'region', 'group'
];

describe('Fragment Types (BACKLOG-124)', () => {

  describe('Parsing all fragment types', () => {
    for (const type of FRAGMENT_TYPES) {
      it(`should parse ${type} fragment`, () => {
        const input = `participant A
participant B
${type} condition
  A->B:message
end`;
        const ast = parse(input);
        const fragment = ast.find(n => n.type === 'fragment');

        expect(fragment).toBeDefined();
        expect(fragment.fragmentType).toBe(type);
        expect(fragment.condition).toBe('condition');
        expect(fragment.entries.length).toBe(1);
      });
    }
  });

  describe('Serializing all fragment types', () => {
    for (const type of FRAGMENT_TYPES) {
      it(`should serialize ${type} fragment`, () => {
        const input = `participant A
participant B
${type} test condition
  A->B:msg
end`;
        const ast = parse(input);
        const output = serialize(ast);

        expect(output).toContain(`${type} test condition`);
        expect(output).toContain('A->B:msg');
        expect(output).toContain('end');
      });
    }
  });

  describe('Rendering all fragment types', () => {
    for (const type of FRAGMENT_TYPES) {
      it(`should render ${type} fragment`, () => {
        const input = `participant A
participant B
${type} cond
  A->B:test
end`;
        const ast = parse(input);
        const svg = render(ast);

        // Check fragment group exists
        const fragmentGroup = svg.querySelector('.fragment');
        expect(fragmentGroup).toBeDefined();

        // Check fragment has correct data-node-id
        expect(fragmentGroup.getAttribute('data-node-id')).toBeTruthy();

        // Check fragment label shows the type
        const label = svg.querySelector('.fragment-label');
        expect(label).toBeDefined();
        expect(label.textContent).toBe(type);
      });
    }
  });

  describe('Fragment with else clauses', () => {
    for (const type of FRAGMENT_TYPES) {
      it(`should support else in ${type} fragment`, () => {
        const input = `participant A
participant B
${type} main condition
  A->B:first
else other
  B->A:second
end`;
        const ast = parse(input);
        const fragment = ast.find(n => n.type === 'fragment');

        expect(fragment).toBeDefined();
        expect(fragment.fragmentType).toBe(type);
        expect(fragment.elseClauses.length).toBe(1);
        expect(fragment.elseClauses[0].condition).toBe('other');
      });
    }
  });

  describe('Fragment with styling', () => {
    it('should parse fragment with operator color', () => {
      const ast = parse(`participant A
opt#red condition
  A->A:msg
end`);
      const fragment = ast.find(n => n.type === 'fragment');
      expect(fragment.style.operatorColor).toBe('#red');
    });

    it('should parse fragment with fill color', () => {
      const ast = parse(`participant A
opt #lightblue condition
  A->A:msg
end`);
      const fragment = ast.find(n => n.type === 'fragment');
      expect(fragment.style.fill).toBe('#lightblue');
    });
  });

  describe('Nested fragments', () => {
    it('should support nested fragments of different types', () => {
      const input = `participant A
participant B
alt outer
  A->B:first
  loop inner
    B->A:repeat
  end
else other
  A->B:else
end`;
      const ast = parse(input);
      const fragments = ast.filter(n => n.type === 'fragment');

      // Should have 2 fragments (outer alt and nested loop)
      expect(fragments.length).toBe(2);

      const alt = fragments.find(f => f.fragmentType === 'alt');
      const loop = fragments.find(f => f.fragmentType === 'loop');

      expect(alt).toBeDefined();
      expect(loop).toBeDefined();
    });
  });

  describe('Round-trip (parse -> serialize -> parse)', () => {
    for (const type of FRAGMENT_TYPES) {
      it(`should round-trip ${type} fragment`, () => {
        const input = `participant A
${type} condition
  A->A:msg
end`;
        const ast1 = parse(input);
        const output = serialize(ast1);
        const ast2 = parse(output);

        const frag1 = ast1.find(n => n.type === 'fragment');
        const frag2 = ast2.find(n => n.type === 'fragment');

        expect(frag2.fragmentType).toBe(frag1.fragmentType);
        expect(frag2.condition).toBe(frag1.condition);
      });
    }
  });
});

describe('Expandable Fragments (BACKLOG-125)', () => {

  describe('Parsing expandable+ (expanded)', () => {
    it('should parse expandable+ with condition', () => {
      const input = `participant A
participant B
expandable+ Details
  A->B:message
end`;
      const ast = parse(input);
      const fragment = ast.find(n => n.type === 'fragment');

      expect(fragment).toBeDefined();
      expect(fragment.fragmentType).toBe('expandable');
      expect(fragment.condition).toBe('Details');
      expect(fragment.collapsed).toBe(false);
      expect(fragment.entries.length).toBe(1);
    });

    it('should parse expandable+ without condition', () => {
      const input = `participant A
expandable+
  A->A:msg
end`;
      const ast = parse(input);
      const fragment = ast.find(n => n.type === 'fragment');

      expect(fragment.fragmentType).toBe('expandable');
      expect(fragment.collapsed).toBe(false);
      expect(fragment.condition).toBe('');
    });
  });

  describe('Parsing expandable- (collapsed)', () => {
    it('should parse expandable- with condition', () => {
      const input = `participant A
participant B
expandable- Hidden
  A->B:message
end`;
      const ast = parse(input);
      const fragment = ast.find(n => n.type === 'fragment');

      expect(fragment).toBeDefined();
      expect(fragment.fragmentType).toBe('expandable');
      expect(fragment.condition).toBe('Hidden');
      expect(fragment.collapsed).toBe(true);
    });

    it('should parse expandable- without condition', () => {
      const input = `participant A
expandable-
  A->A:msg
end`;
      const ast = parse(input);
      const fragment = ast.find(n => n.type === 'fragment');

      expect(fragment.fragmentType).toBe('expandable');
      expect(fragment.collapsed).toBe(true);
    });
  });

  describe('Serialization', () => {
    it('should serialize expanded fragment as expandable+', () => {
      const input = `participant A
expandable+ Details
  A->A:msg
end`;
      const ast = parse(input);
      const output = serialize(ast);

      expect(output).toContain('expandable+ Details');
    });

    it('should serialize collapsed fragment as expandable-', () => {
      const input = `participant A
expandable- Hidden
  A->A:msg
end`;
      const ast = parse(input);
      const output = serialize(ast);

      expect(output).toContain('expandable- Hidden');
    });
  });

  describe('Round-trip', () => {
    it('should round-trip expandable+ fragment', () => {
      const input = `participant A
expandable+ Details
  A->A:msg
end`;
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const frag1 = ast1.find(n => n.type === 'fragment');
      const frag2 = ast2.find(n => n.type === 'fragment');

      expect(frag2.fragmentType).toBe('expandable');
      expect(frag2.collapsed).toBe(false);
      expect(frag2.condition).toBe('Details');
    });

    it('should round-trip expandable- fragment', () => {
      const input = `participant A
expandable- Hidden
  A->A:msg
end`;
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const frag1 = ast1.find(n => n.type === 'fragment');
      const frag2 = ast2.find(n => n.type === 'fragment');

      expect(frag2.fragmentType).toBe('expandable');
      expect(frag2.collapsed).toBe(true);
      expect(frag2.condition).toBe('Hidden');
    });
  });

  describe('Rendering', () => {
    it('should render expandable+ with expand/collapse icon', () => {
      const input = `participant A
participant B
expandable+ Details
  A->B:msg
end`;
      const ast = parse(input);
      const svg = render(ast);

      // Check for expandable toggle elements
      const toggleIcon = svg.querySelector('.expandable-toggle-icon');
      expect(toggleIcon).toBeDefined();
      // Expanded shows minus sign
      expect(toggleIcon.textContent).toBe('−');
    });

    it('should render expandable- with collapsed icon', () => {
      const input = `participant A
participant B
expandable- Hidden
  A->B:msg
end`;
      const ast = parse(input);
      const svg = render(ast);

      const toggleIcon = svg.querySelector('.expandable-toggle-icon');
      expect(toggleIcon).toBeDefined();
      // Collapsed shows plus sign
      expect(toggleIcon.textContent).toBe('+');
    });
  });
});
