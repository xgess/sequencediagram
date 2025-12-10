// Markup parser tests
// See DESIGN.md for markup syntax

import { describe, it, expect } from 'vitest';
import { parseMarkup, serializeMarkup, hasMarkup } from '../src/markup/parser.js';
import { renderMarkupText, isMultiline, getLineCount } from '../src/markup/renderer.js';

describe('Markup Parser (BACKLOG-045)', () => {
  describe('parseMarkup', () => {
    it('should return empty array for empty input', () => {
      expect(parseMarkup('')).toEqual([]);
      expect(parseMarkup(null)).toEqual([]);
      expect(parseMarkup(undefined)).toEqual([]);
    });

    it('should parse plain text', () => {
      const result = parseMarkup('Hello world');
      expect(result).toEqual([{ type: 'text', content: 'Hello world' }]);
    });

    it('should parse **bold** text', () => {
      const result = parseMarkup('**bold**');
      expect(result).toEqual([{ type: 'bold', content: 'bold' }]);
    });

    it('should parse //italic// text', () => {
      const result = parseMarkup('//italic//');
      expect(result).toEqual([{ type: 'italic', content: 'italic' }]);
    });

    it('should parse \\n linebreak', () => {
      const result = parseMarkup('line1\\nline2');
      expect(result).toEqual([
        { type: 'text', content: 'line1' },
        { type: 'linebreak' },
        { type: 'text', content: 'line2' }
      ]);
    });

    it('should parse mixed markup', () => {
      const result = parseMarkup('Hello **bold** and //italic// world');
      expect(result).toEqual([
        { type: 'text', content: 'Hello ' },
        { type: 'bold', content: 'bold' },
        { type: 'text', content: ' and ' },
        { type: 'italic', content: 'italic' },
        { type: 'text', content: ' world' }
      ]);
    });

    it('should parse multiple bold segments', () => {
      const result = parseMarkup('**one** and **two**');
      expect(result).toEqual([
        { type: 'bold', content: 'one' },
        { type: 'text', content: ' and ' },
        { type: 'bold', content: 'two' }
      ]);
    });

    it('should parse multiple linebreaks', () => {
      const result = parseMarkup('a\\nb\\nc');
      expect(result).toEqual([
        { type: 'text', content: 'a' },
        { type: 'linebreak' },
        { type: 'text', content: 'b' },
        { type: 'linebreak' },
        { type: 'text', content: 'c' }
      ]);
    });

    it('should handle unclosed bold as plain text', () => {
      const result = parseMarkup('**unclosed');
      // Unclosed markup is treated as plain text
      expect(result).toEqual([
        { type: 'text', content: '*' },
        { type: 'text', content: '*unclosed' }
      ]);
    });

    it('should handle empty bold markers', () => {
      const result = parseMarkup('****');
      // Empty bold content is skipped
      expect(result).toEqual([]);
    });

    it('should parse bold at start and end', () => {
      const result = parseMarkup('**start** middle **end**');
      expect(result).toEqual([
        { type: 'bold', content: 'start' },
        { type: 'text', content: ' middle ' },
        { type: 'bold', content: 'end' }
      ]);
    });
  });

  describe('serializeMarkup', () => {
    it('should return empty string for empty input', () => {
      expect(serializeMarkup([])).toBe('');
      expect(serializeMarkup(null)).toBe('');
      expect(serializeMarkup(undefined)).toBe('');
    });

    it('should serialize plain text', () => {
      const result = serializeMarkup([{ type: 'text', content: 'Hello' }]);
      expect(result).toBe('Hello');
    });

    it('should serialize bold', () => {
      const result = serializeMarkup([{ type: 'bold', content: 'bold' }]);
      expect(result).toBe('**bold**');
    });

    it('should serialize italic', () => {
      const result = serializeMarkup([{ type: 'italic', content: 'italic' }]);
      expect(result).toBe('//italic//');
    });

    it('should serialize linebreak', () => {
      const result = serializeMarkup([
        { type: 'text', content: 'line1' },
        { type: 'linebreak' },
        { type: 'text', content: 'line2' }
      ]);
      expect(result).toBe('line1\\nline2');
    });

    it('should serialize mixed markup', () => {
      const result = serializeMarkup([
        { type: 'text', content: 'Hello ' },
        { type: 'bold', content: 'world' }
      ]);
      expect(result).toBe('Hello **world**');
    });
  });

  describe('hasMarkup', () => {
    it('should return false for empty input', () => {
      expect(hasMarkup('')).toBe(false);
      expect(hasMarkup(null)).toBe(false);
    });

    it('should return false for plain text', () => {
      expect(hasMarkup('Hello world')).toBe(false);
    });

    it('should return true for bold', () => {
      expect(hasMarkup('Hello **bold** world')).toBe(true);
    });

    it('should return true for italic', () => {
      expect(hasMarkup('Hello //italic// world')).toBe(true);
    });

    it('should return true for linebreak', () => {
      expect(hasMarkup('line1\\nline2')).toBe(true);
    });
  });

  describe('round-trip', () => {
    it('should round-trip plain text', () => {
      const input = 'Hello world';
      const parsed = parseMarkup(input);
      const serialized = serializeMarkup(parsed);
      expect(serialized).toBe(input);
    });

    it('should round-trip bold text', () => {
      const input = 'Hello **bold** world';
      const parsed = parseMarkup(input);
      const serialized = serializeMarkup(parsed);
      expect(serialized).toBe(input);
    });

    it('should round-trip complex markup', () => {
      const input = '**Bold** and //italic//\\nNew line';
      const parsed = parseMarkup(input);
      const serialized = serializeMarkup(parsed);
      expect(serialized).toBe(input);
    });
  });
});

describe('Markup Renderer (BACKLOG-046)', () => {
  describe('renderMarkupText', () => {
    it('should render plain text as text element', () => {
      const textEl = renderMarkupText('Hello world', { x: 10, y: 20 });
      expect(textEl.tagName).toBe('text');
      expect(textEl.textContent).toBe('Hello world');
      expect(textEl.getAttribute('x')).toBe('10');
      expect(textEl.getAttribute('y')).toBe('20');
    });

    it('should render bold text with tspan', () => {
      const textEl = renderMarkupText('Hello **bold** world', { x: 0, y: 0 });
      const tspans = textEl.querySelectorAll('tspan');
      expect(tspans.length).toBe(3);
      expect(tspans[1].textContent).toBe('bold');
      expect(tspans[1].getAttribute('font-weight')).toBe('bold');
    });

    it('should render italic text with tspan', () => {
      const textEl = renderMarkupText('Hello //italic// world', { x: 0, y: 0 });
      const tspans = textEl.querySelectorAll('tspan');
      expect(tspans.length).toBe(3);
      expect(tspans[1].textContent).toBe('italic');
      expect(tspans[1].getAttribute('font-style')).toBe('italic');
    });

    it('should handle linebreaks with dy attribute', () => {
      const textEl = renderMarkupText('line1\\nline2', { x: 10, y: 20 });
      const tspans = textEl.querySelectorAll('tspan');
      expect(tspans.length).toBe(2);
      expect(tspans[0].textContent).toBe('line1');
      expect(tspans[1].textContent).toBe('line2');
      expect(tspans[1].getAttribute('dy')).toBe('16'); // LINE_HEIGHT
      expect(tspans[1].getAttribute('x')).toBe('10');
    });

    it('should set text-anchor', () => {
      const textEl = renderMarkupText('Test', { textAnchor: 'middle' });
      expect(textEl.getAttribute('text-anchor')).toBe('middle');
    });

    it('should set font properties', () => {
      const textEl = renderMarkupText('Test', {
        fontFamily: 'Arial',
        fontSize: '14',
        fontWeight: 'bold'
      });
      expect(textEl.getAttribute('font-family')).toBe('Arial');
      expect(textEl.getAttribute('font-size')).toBe('14');
      expect(textEl.getAttribute('font-weight')).toBe('bold');
    });
  });

  describe('isMultiline', () => {
    it('should return false for single line', () => {
      expect(isMultiline('Hello world')).toBe(false);
    });

    it('should return true for multiline', () => {
      expect(isMultiline('line1\\nline2')).toBe(true);
    });

    it('should return false for empty input', () => {
      expect(isMultiline('')).toBe(false);
      expect(isMultiline(null)).toBe(false);
    });
  });

  describe('getLineCount', () => {
    it('should return 1 for single line', () => {
      expect(getLineCount('Hello world')).toBe(1);
    });

    it('should return 2 for two lines', () => {
      expect(getLineCount('line1\\nline2')).toBe(2);
    });

    it('should return 3 for three lines', () => {
      expect(getLineCount('a\\nb\\nc')).toBe(3);
    });

    it('should return 1 for empty input', () => {
      expect(getLineCount('')).toBe(1);
      expect(getLineCount(null)).toBe(1);
    });
  });
});
