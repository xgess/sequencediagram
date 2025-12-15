// Markup parser tests
// See DESIGN.md for markup syntax
// Tests for advanced text markup (BACKLOG-139)

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

describe('Advanced Text Markup (BACKLOG-139)', () => {

  describe('Parse __underline__', () => {
    it('should parse underline text', () => {
      const result = parseMarkup('__underline__');
      expect(result).toEqual([{ type: 'underline', content: 'underline' }]);
    });

    it('should parse mixed with underline', () => {
      const result = parseMarkup('normal __underlined__ text');
      expect(result).toEqual([
        { type: 'text', content: 'normal ' },
        { type: 'underline', content: 'underlined' },
        { type: 'text', content: ' text' }
      ]);
    });
  });

  describe('Parse --small--', () => {
    it('should parse small text', () => {
      const result = parseMarkup('--small--');
      expect(result).toEqual([{ type: 'small', content: 'small' }]);
    });

    it('should parse mixed with small', () => {
      const result = parseMarkup('normal --tiny-- text');
      expect(result).toEqual([
        { type: 'text', content: 'normal ' },
        { type: 'small', content: 'tiny' },
        { type: 'text', content: ' text' }
      ]);
    });
  });

  describe('Parse ++big++', () => {
    it('should parse big text', () => {
      const result = parseMarkup('++big++');
      expect(result).toEqual([{ type: 'big', content: 'big' }]);
    });

    it('should parse mixed with big', () => {
      const result = parseMarkup('normal ++large++ text');
      expect(result).toEqual([
        { type: 'text', content: 'normal ' },
        { type: 'big', content: 'large' },
        { type: 'text', content: ' text' }
      ]);
    });
  });

  describe('Parse ""mono""', () => {
    it('should parse mono text', () => {
      const result = parseMarkup('""code""');
      expect(result).toEqual([{ type: 'mono', content: 'code' }]);
    });

    it('should parse mixed with mono', () => {
      const result = parseMarkup('use ""monospace"" font');
      expect(result).toEqual([
        { type: 'text', content: 'use ' },
        { type: 'mono', content: 'monospace' },
        { type: 'text', content: ' font' }
      ]);
    });
  });

  describe('Parse ~~strike~~', () => {
    it('should parse strikethrough text', () => {
      const result = parseMarkup('~~deleted~~');
      expect(result).toEqual([{ type: 'strike', content: 'deleted' }]);
    });

    it('should parse mixed with strikethrough', () => {
      const result = parseMarkup('not ~~crossed out~~ text');
      expect(result).toEqual([
        { type: 'text', content: 'not ' },
        { type: 'strike', content: 'crossed out' },
        { type: 'text', content: ' text' }
      ]);
    });
  });

  describe('Parse <color:...>...</color>', () => {
    it('should parse color with hex', () => {
      const result = parseMarkup('<color:#ff0000>red text</color>');
      expect(result).toEqual([{ type: 'color', value: '#ff0000', content: 'red text' }]);
    });

    it('should parse color with named color', () => {
      const result = parseMarkup('<color:blue>blue text</color>');
      expect(result).toEqual([{ type: 'color', value: 'blue', content: 'blue text' }]);
    });

    it('should parse mixed with color', () => {
      const result = parseMarkup('normal <color:#green>green</color> text');
      expect(result).toEqual([
        { type: 'text', content: 'normal ' },
        { type: 'color', value: '#green', content: 'green' },
        { type: 'text', content: ' text' }
      ]);
    });
  });

  describe('Parse <size:N>...</size>', () => {
    it('should parse size', () => {
      const result = parseMarkup('<size:20>big text</size>');
      expect(result).toEqual([{ type: 'size', value: 20, content: 'big text' }]);
    });

    it('should parse mixed with size', () => {
      const result = parseMarkup('normal <size:8>tiny</size> text');
      expect(result).toEqual([
        { type: 'text', content: 'normal ' },
        { type: 'size', value: 8, content: 'tiny' },
        { type: 'text', content: ' text' }
      ]);
    });
  });

  describe('Parse <sub>...</sub>', () => {
    it('should parse subscript', () => {
      const result = parseMarkup('H<sub>2</sub>O');
      expect(result).toEqual([
        { type: 'text', content: 'H' },
        { type: 'sub', content: '2' },
        { type: 'text', content: 'O' }
      ]);
    });
  });

  describe('Parse <sup>...</sup>', () => {
    it('should parse superscript', () => {
      const result = parseMarkup('x<sup>2</sup>');
      expect(result).toEqual([
        { type: 'text', content: 'x' },
        { type: 'sup', content: '2' }
      ]);
    });
  });

  describe('Parse <link:URL>...</link>', () => {
    it('should parse link', () => {
      const result = parseMarkup('<link:https://example.com>Click here</link>');
      expect(result).toEqual([{ type: 'link', value: 'https://example.com', content: 'Click here' }]);
    });

    it('should parse link in text', () => {
      const result = parseMarkup('Visit <link:https://example.com>this site</link> now');
      expect(result).toEqual([
        { type: 'text', content: 'Visit ' },
        { type: 'link', value: 'https://example.com', content: 'this site' },
        { type: 'text', content: ' now' }
      ]);
    });
  });

  describe('Parse <stroke:N:color>...</stroke>', () => {
    it('should parse stroke', () => {
      const result = parseMarkup('<stroke:2:#000000>outlined</stroke>');
      expect(result).toEqual([{
        type: 'stroke',
        strokeWidth: 2,
        strokeColor: '#000000',
        content: 'outlined'
      }]);
    });

    it('should parse stroke with named color', () => {
      const result = parseMarkup('<stroke:1:black>text</stroke>');
      expect(result).toEqual([{
        type: 'stroke',
        strokeWidth: 1,
        strokeColor: 'black',
        content: 'text'
      }]);
    });
  });

  describe('Parse <background:color>...</background>', () => {
    it('should parse background', () => {
      const result = parseMarkup('<background:#yellow>highlighted</background>');
      expect(result).toEqual([{ type: 'background', value: '#yellow', content: 'highlighted' }]);
    });

    it('should parse background with named color', () => {
      const result = parseMarkup('<background:lightblue>text</background>');
      expect(result).toEqual([{ type: 'background', value: 'lightblue', content: 'text' }]);
    });
  });

  describe('hasMarkup with advanced markup', () => {
    it('should detect underline', () => {
      expect(hasMarkup('__underline__')).toBe(true);
    });

    it('should detect small', () => {
      expect(hasMarkup('--small--')).toBe(true);
    });

    it('should detect big', () => {
      expect(hasMarkup('++big++')).toBe(true);
    });

    it('should detect mono', () => {
      expect(hasMarkup('""mono""')).toBe(true);
    });

    it('should detect strike', () => {
      expect(hasMarkup('~~strike~~')).toBe(true);
    });

    it('should detect color', () => {
      expect(hasMarkup('<color:#red>text</color>')).toBe(true);
    });

    it('should detect size', () => {
      expect(hasMarkup('<size:20>text</size>')).toBe(true);
    });

    it('should detect sub', () => {
      expect(hasMarkup('<sub>text</sub>')).toBe(true);
    });

    it('should detect sup', () => {
      expect(hasMarkup('<sup>text</sup>')).toBe(true);
    });

    it('should detect link', () => {
      expect(hasMarkup('<link:url>text</link>')).toBe(true);
    });

    it('should detect stroke', () => {
      expect(hasMarkup('<stroke:1:#red>text</stroke>')).toBe(true);
    });

    it('should detect background', () => {
      expect(hasMarkup('<background:#yellow>text</background>')).toBe(true);
    });
  });

  describe('Serialization of advanced markup', () => {
    it('should serialize underline', () => {
      const result = serializeMarkup([{ type: 'underline', content: 'text' }]);
      expect(result).toBe('__text__');
    });

    it('should serialize small', () => {
      const result = serializeMarkup([{ type: 'small', content: 'text' }]);
      expect(result).toBe('--text--');
    });

    it('should serialize big', () => {
      const result = serializeMarkup([{ type: 'big', content: 'text' }]);
      expect(result).toBe('++text++');
    });

    it('should serialize mono', () => {
      const result = serializeMarkup([{ type: 'mono', content: 'text' }]);
      expect(result).toBe('""text""');
    });

    it('should serialize strike', () => {
      const result = serializeMarkup([{ type: 'strike', content: 'text' }]);
      expect(result).toBe('~~text~~');
    });

    it('should serialize color', () => {
      const result = serializeMarkup([{ type: 'color', value: '#red', content: 'text' }]);
      expect(result).toBe('<color:#red>text</color>');
    });

    it('should serialize size', () => {
      const result = serializeMarkup([{ type: 'size', value: 20, content: 'text' }]);
      expect(result).toBe('<size:20>text</size>');
    });

    it('should serialize sub', () => {
      const result = serializeMarkup([{ type: 'sub', content: '2' }]);
      expect(result).toBe('<sub>2</sub>');
    });

    it('should serialize sup', () => {
      const result = serializeMarkup([{ type: 'sup', content: '2' }]);
      expect(result).toBe('<sup>2</sup>');
    });

    it('should serialize link', () => {
      const result = serializeMarkup([{ type: 'link', value: 'https://example.com', content: 'click' }]);
      expect(result).toBe('<link:https://example.com>click</link>');
    });

    it('should serialize stroke', () => {
      const result = serializeMarkup([{ type: 'stroke', strokeWidth: 2, strokeColor: '#000', content: 'text' }]);
      expect(result).toBe('<stroke:2:#000>text</stroke>');
    });

    it('should serialize background', () => {
      const result = serializeMarkup([{ type: 'background', value: '#yellow', content: 'text' }]);
      expect(result).toBe('<background:#yellow>text</background>');
    });
  });

  describe('Round-trip advanced markup', () => {
    it('should round-trip underline', () => {
      const input = '__underlined__';
      expect(serializeMarkup(parseMarkup(input))).toBe(input);
    });

    it('should round-trip small', () => {
      const input = '--small--';
      expect(serializeMarkup(parseMarkup(input))).toBe(input);
    });

    it('should round-trip big', () => {
      const input = '++big++';
      expect(serializeMarkup(parseMarkup(input))).toBe(input);
    });

    it('should round-trip mono', () => {
      const input = '""monospace""';
      expect(serializeMarkup(parseMarkup(input))).toBe(input);
    });

    it('should round-trip strike', () => {
      const input = '~~strikethrough~~';
      expect(serializeMarkup(parseMarkup(input))).toBe(input);
    });

    it('should round-trip color', () => {
      const input = '<color:#ff0000>red</color>';
      expect(serializeMarkup(parseMarkup(input))).toBe(input);
    });

    it('should round-trip size', () => {
      const input = '<size:24>large</size>';
      expect(serializeMarkup(parseMarkup(input))).toBe(input);
    });

    it('should round-trip sub', () => {
      const input = 'H<sub>2</sub>O';
      expect(serializeMarkup(parseMarkup(input))).toBe(input);
    });

    it('should round-trip sup', () => {
      const input = 'x<sup>2</sup>';
      expect(serializeMarkup(parseMarkup(input))).toBe(input);
    });

    it('should round-trip link', () => {
      const input = '<link:https://example.com>click</link>';
      expect(serializeMarkup(parseMarkup(input))).toBe(input);
    });

    it('should round-trip stroke', () => {
      const input = '<stroke:2:#000000>outlined</stroke>';
      expect(serializeMarkup(parseMarkup(input))).toBe(input);
    });

    it('should round-trip background', () => {
      const input = '<background:#ffff00>highlighted</background>';
      expect(serializeMarkup(parseMarkup(input))).toBe(input);
    });

    it('should round-trip complex mixed markup', () => {
      const input = '**Bold** and --small-- with <color:#red>color</color>';
      expect(serializeMarkup(parseMarkup(input))).toBe(input);
    });
  });

  describe('Rendering advanced markup', () => {
    it('should render underline with text-decoration', () => {
      const el = renderMarkupText('__underline__', { x: 0, y: 0 });
      const tspan = el.querySelector('tspan');
      expect(tspan.getAttribute('text-decoration')).toBe('underline');
    });

    it('should render small with smaller font-size', () => {
      const el = renderMarkupText('--small--', { x: 0, y: 0, fontSize: '12' });
      const tspan = el.querySelector('tspan');
      expect(parseInt(tspan.getAttribute('font-size'))).toBeLessThan(12);
    });

    it('should render big with larger font-size', () => {
      const el = renderMarkupText('++big++', { x: 0, y: 0, fontSize: '12' });
      const tspan = el.querySelector('tspan');
      expect(parseInt(tspan.getAttribute('font-size'))).toBeGreaterThan(12);
    });

    it('should render mono with monospace font', () => {
      const el = renderMarkupText('""code""', { x: 0, y: 0 });
      const tspan = el.querySelector('tspan');
      expect(tspan.getAttribute('font-family')).toBe('monospace');
    });

    it('should render strike with line-through decoration', () => {
      const el = renderMarkupText('~~deleted~~', { x: 0, y: 0 });
      const tspan = el.querySelector('tspan');
      expect(tspan.getAttribute('text-decoration')).toBe('line-through');
    });

    it('should render color with fill attribute', () => {
      const el = renderMarkupText('<color:#ff0000>red</color>', { x: 0, y: 0 });
      const tspan = el.querySelector('tspan');
      expect(tspan.getAttribute('fill')).toBe('#ff0000');
    });

    it('should render size with font-size attribute', () => {
      const el = renderMarkupText('<size:24>large</size>', { x: 0, y: 0 });
      const tspan = el.querySelector('tspan');
      expect(tspan.getAttribute('font-size')).toBe('24');
    });

    it('should render sub with baseline-shift', () => {
      const el = renderMarkupText('H<sub>2</sub>O', { x: 0, y: 0 });
      const tspans = el.querySelectorAll('tspan');
      const subTspan = Array.from(tspans).find(t => t.textContent === '2');
      expect(subTspan.getAttribute('baseline-shift')).toBe('sub');
    });

    it('should render sup with baseline-shift', () => {
      const el = renderMarkupText('x<sup>2</sup>', { x: 0, y: 0 });
      const tspans = el.querySelectorAll('tspan');
      const supTspan = Array.from(tspans).find(t => t.textContent === '2');
      expect(supTspan.getAttribute('baseline-shift')).toBe('super');
    });

    it('should render link as anchor element', () => {
      const el = renderMarkupText('<link:https://example.com>click</link>', { x: 0, y: 0 });
      const anchor = el.querySelector('a');
      expect(anchor).toBeDefined();
      expect(anchor.getAttribute('href')).toBe('https://example.com');
      const tspan = anchor.querySelector('tspan');
      expect(tspan.textContent).toBe('click');
    });

    it('should render stroke with stroke attributes', () => {
      const el = renderMarkupText('<stroke:2:#000000>outlined</stroke>', { x: 0, y: 0 });
      const tspan = el.querySelector('tspan');
      expect(tspan.getAttribute('stroke')).toBe('#000000');
      expect(tspan.getAttribute('stroke-width')).toBe('2');
    });

    it('should render background with data attribute', () => {
      const el = renderMarkupText('<background:#yellow>highlight</background>', { x: 0, y: 0 });
      const tspan = el.querySelector('tspan');
      expect(tspan.getAttribute('data-background')).toBe('#yellow');
    });
  });
});
