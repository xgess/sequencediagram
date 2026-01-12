// Tests for example diagrams (BACKLOG-054)
// Verifies all examples in examples/ directory parse and render without errors

import { describe, it, expect } from 'vitest';
import { parse } from '../public/src/ast/parser.js';
import { render } from '../public/src/rendering/renderer.js';
import { serialize } from '../public/src/ast/serializer.js';
import fs from 'fs';
import path from 'path';

const examplesDir = path.join(import.meta.dirname, '../examples');

describe('Example Diagrams (BACKLOG-054)', () => {
  // Get all .txt files in examples directory
  const exampleFiles = fs.readdirSync(examplesDir)
    .filter(f => f.endsWith('.txt'))
    .sort();

  it('should have at least 5 example files', () => {
    expect(exampleFiles.length).toBeGreaterThanOrEqual(5);
  });

  for (const filename of exampleFiles) {
    describe(filename, () => {
      const content = fs.readFileSync(path.join(examplesDir, filename), 'utf-8');

      it('should parse without errors', () => {
        const ast = parse(content);
        const errors = ast.filter(n => n.type === 'error');
        if (errors.length > 0) {
          console.log('Parse errors:', errors.map(e => e.message));
        }
        expect(errors).toHaveLength(0);
      });

      it('should render to SVG', () => {
        const ast = parse(content);
        const svg = render(ast);
        expect(svg).toBeTruthy();
        expect(svg.tagName).toBe('svg');
      });

      it('should round-trip successfully', () => {
        const ast1 = parse(content);
        const serialized = serialize(ast1);
        const ast2 = parse(serialized);

        // Check no new errors introduced
        const errors = ast2.filter(n => n.type === 'error');
        expect(errors).toHaveLength(0);

        // Check same structure (ignoring IDs)
        expect(ast1.filter(n => n.type === 'participant').length)
          .toBe(ast2.filter(n => n.type === 'participant').length);
        expect(ast1.filter(n => n.type === 'message').length)
          .toBe(ast2.filter(n => n.type === 'message').length);
        expect(ast1.filter(n => n.type === 'fragment').length)
          .toBe(ast2.filter(n => n.type === 'fragment').length);
      });

      it('should have a title', () => {
        const ast = parse(content);
        const title = ast.find(n => n.type === 'directive' && n.directiveType === 'title');
        expect(title).toBeTruthy();
      });

      it('should have at least one participant', () => {
        const ast = parse(content);
        const participants = ast.filter(n => n.type === 'participant');
        expect(participants.length).toBeGreaterThan(0);
      });
    });
  }
});
