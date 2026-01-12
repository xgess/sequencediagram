// Performance baseline tests (BACKLOG-055)
// Measures parse and render time for diagrams of varying sizes

import { describe, it, expect } from 'vitest';
import { parse } from '../public/src/ast/parser.js';
import { render } from '../public/src/rendering/renderer.js';
import { serialize } from '../public/src/ast/serializer.js';

/**
 * Generate a diagram with specified number of entries
 * Mix of messages and fragments to be realistic
 */
function generateDiagram(entryCount) {
  const lines = [
    'title Performance Test Diagram',
    '',
    'participant A #lightblue',
    'participant B',
    'participant C',
    'database D',
    '',
  ];

  let entriesAdded = 0;
  let inFragment = false;
  const participants = ['A', 'B', 'C', 'D'];

  while (entriesAdded < entryCount) {
    // Every 10 entries, add a fragment
    if (entriesAdded % 10 === 0 && entriesAdded > 0 && !inFragment) {
      lines.push('alt condition ' + entriesAdded);
      inFragment = true;
      entriesAdded++;
    } else if (inFragment && entriesAdded % 10 === 5) {
      lines.push('else other case');
      entriesAdded++;
    } else if (inFragment && entriesAdded % 10 === 9) {
      lines.push('end');
      inFragment = false;
      entriesAdded++;
    } else {
      // Add a message
      const from = participants[entriesAdded % participants.length];
      const to = participants[(entriesAdded + 1) % participants.length];
      const arrows = ['->', '->>', '-->', '-->>'];
      const arrow = arrows[entriesAdded % arrows.length];
      const indent = inFragment ? '  ' : '';
      lines.push(`${indent}${from}${arrow}${to}:Message ${entriesAdded}`);
      entriesAdded++;
    }
  }

  // Close any open fragment
  if (inFragment) {
    lines.push('end');
  }

  return lines.join('\n');
}

/**
 * Measure execution time of a function
 */
function measureTime(fn, iterations = 1) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  return (end - start) / iterations;
}

describe('Performance Baseline (BACKLOG-055)', () => {
  const sizes = [10, 25, 50, 100];

  for (const size of sizes) {
    describe(`${size}-entry diagram`, () => {
      const diagram = generateDiagram(size);
      let ast;

      it('should parse efficiently', () => {
        const parseTime = measureTime(() => {
          ast = parse(diagram);
        }, 5);

        console.log(`Parse time for ${size} entries: ${parseTime.toFixed(2)}ms`);
        expect(parseTime).toBeLessThan(100); // Should be well under 100ms
      });

      it('should render efficiently', () => {
        ast = parse(diagram);
        const renderTime = measureTime(() => {
          render(ast);
        }, 5);

        console.log(`Render time for ${size} entries: ${renderTime.toFixed(2)}ms`);
        expect(renderTime).toBeLessThan(100); // Should be well under 100ms
      });

      it('should serialize efficiently', () => {
        ast = parse(diagram);
        const serializeTime = measureTime(() => {
          serialize(ast);
        }, 5);

        console.log(`Serialize time for ${size} entries: ${serializeTime.toFixed(2)}ms`);
        expect(serializeTime).toBeLessThan(50); // Should be well under 50ms
      });

      it('should complete full round-trip efficiently', () => {
        const roundTripTime = measureTime(() => {
          const parsed = parse(diagram);
          const svg = render(parsed);
          serialize(parsed);
        }, 5);

        console.log(`Full round-trip for ${size} entries: ${roundTripTime.toFixed(2)}ms`);
        expect(roundTripTime).toBeLessThan(150); // Combined should be under 150ms
      });
    });
  }

  // Critical performance requirement from BACKLOG-055
  it('should render 50-entry diagram in under 50ms', () => {
    const diagram = generateDiagram(50);
    const ast = parse(diagram);

    const renderTime = measureTime(() => {
      render(ast);
    }, 10);

    console.log(`50-entry render (10 iterations avg): ${renderTime.toFixed(2)}ms`);
    expect(renderTime).toBeLessThan(50);
  });

  describe('Scaling characteristics', () => {
    it('should show linear-ish scaling', () => {
      const times = [];

      for (const size of sizes) {
        const diagram = generateDiagram(size);
        const time = measureTime(() => {
          const ast = parse(diagram);
          render(ast);
        }, 3);
        times.push({ size, time });
        console.log(`Total time for ${size} entries: ${time.toFixed(2)}ms`);
      }

      // Check that doubling entries doesn't more than triple time
      // (allowing for setup overhead)
      const ratio10to50 = times.find(t => t.size === 50).time / times.find(t => t.size === 10).time;
      const ratio50to100 = times.find(t => t.size === 100).time / times.find(t => t.size === 50).time;

      console.log(`10->50 entries ratio: ${ratio10to50.toFixed(2)}x`);
      console.log(`50->100 entries ratio: ${ratio50to100.toFixed(2)}x`);

      // Should not be super-linear (e.g., O(n^2) would give 25x for 5x entries)
      expect(ratio10to50).toBeLessThan(10);
      expect(ratio50to100).toBeLessThan(5);
    });
  });

  describe('Memory and structure', () => {
    it('should produce correctly sized AST', () => {
      const diagram = generateDiagram(50);
      const ast = parse(diagram);

      // Should have participants + entries + directives + blanklines
      const participants = ast.filter(n => n.type === 'participant');
      const messages = ast.filter(n => n.type === 'message');
      const fragments = ast.filter(n => n.type === 'fragment');

      console.log(`AST structure for 50 entries:`);
      console.log(`  - Participants: ${participants.length}`);
      console.log(`  - Messages: ${messages.length}`);
      console.log(`  - Fragments: ${fragments.length}`);

      expect(participants).toHaveLength(4);
      expect(messages.length).toBeGreaterThan(30);
    });

    it('should produce correctly sized SVG', () => {
      const diagram = generateDiagram(50);
      const ast = parse(diagram);
      const svg = render(ast);

      const participantGroups = svg.querySelectorAll('.participant');
      const messageGroups = svg.querySelectorAll('.message');
      const fragmentGroups = svg.querySelectorAll('.fragment');

      console.log(`SVG structure for 50 entries:`);
      console.log(`  - Participant groups: ${participantGroups.length}`);
      console.log(`  - Message groups: ${messageGroups.length}`);
      console.log(`  - Fragment groups: ${fragmentGroups.length}`);

      expect(participantGroups.length).toBe(4);
      expect(messageGroups.length).toBeGreaterThan(30);
    });
  });
});
