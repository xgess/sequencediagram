// Tests for type-based styles system (BACKLOG-141)

import { describe, it, expect } from 'vitest';
import { parse } from '../src/ast/parser.js';
import { serialize } from '../src/ast/serializer.js';
import { render } from '../src/rendering/renderer.js';

describe('Type-Based Styles System (BACKLOG-141)', () => {

  describe('Parsing type style directives', () => {
    it('should parse participantstyle directive', () => {
      const ast = parse('participantstyle #green #red;3;dashed');
      const styleNode = ast.find(n => n.type === 'directive' && n.directiveType === 'participantstyle');
      expect(styleNode).toBeDefined();
      expect(styleNode.style.fill).toBe('#green');
      expect(styleNode.style.border).toBe('#red');
      expect(styleNode.style.borderWidth).toBe(3);
      expect(styleNode.style.borderStyle).toBe('dashed');
    });

    it('should parse notestyle directive with text markup', () => {
      const ast = parse('notestyle <color:#blue>//**');
      const styleNode = ast.find(n => n.type === 'directive' && n.directiveType === 'notestyle');
      expect(styleNode).toBeDefined();
      expect(styleNode.style.textMarkup).toBe('<color:#blue>//**');
    });

    it('should parse messagestyle directive with color and text markup', () => {
      const ast = parse('messagestyle #lightblue;2,**//');
      const styleNode = ast.find(n => n.type === 'directive' && n.directiveType === 'messagestyle');
      expect(styleNode).toBeDefined();
      expect(styleNode.style.fill).toBe('#lightblue');
      expect(styleNode.style.borderWidth).toBe(2);
      expect(styleNode.style.textMarkup).toBe('**//');
    });

    it('should parse dividerstyle directive', () => {
      const ast = parse('dividerstyle <color:#yellow>**//');
      const styleNode = ast.find(n => n.type === 'directive' && n.directiveType === 'dividerstyle');
      expect(styleNode).toBeDefined();
      expect(styleNode.style.textMarkup).toBe('<color:#yellow>**//');
    });

    it('should parse boxstyle directive', () => {
      const ast = parse('boxstyle <color:#red>');
      const styleNode = ast.find(n => n.type === 'directive' && n.directiveType === 'boxstyle');
      expect(styleNode).toBeDefined();
      expect(styleNode.style.textMarkup).toBe('<color:#red>');
    });

    it('should parse aboxstyle directive', () => {
      const ast = parse('aboxstyle ++<color:#gray>');
      const styleNode = ast.find(n => n.type === 'directive' && n.directiveType === 'aboxstyle');
      expect(styleNode).toBeDefined();
      expect(styleNode.style.textMarkup).toBe('++<color:#gray>');
    });

    it('should parse rboxstyle directive', () => {
      const ast = parse('rboxstyle ;3,<color:#purple>');
      const styleNode = ast.find(n => n.type === 'directive' && n.directiveType === 'rboxstyle');
      expect(styleNode).toBeDefined();
      expect(styleNode.style.borderWidth).toBe(3);
      expect(styleNode.style.textMarkup).toBe('<color:#purple>');
    });

    it('should parse aboxrightstyle directive', () => {
      const ast = parse('aboxrightstyle <color:#pink>');
      const styleNode = ast.find(n => n.type === 'directive' && n.directiveType === 'aboxrightstyle');
      expect(styleNode).toBeDefined();
      expect(styleNode.style.textMarkup).toBe('<color:#pink>');
    });

    it('should parse aboxleftstyle directive', () => {
      const ast = parse('aboxleftstyle <color:#brown>--');
      const styleNode = ast.find(n => n.type === 'directive' && n.directiveType === 'aboxleftstyle');
      expect(styleNode).toBeDefined();
      expect(styleNode.style.textMarkup).toBe('<color:#brown>--');
    });

    it('should parse multiple type style directives', () => {
      const ast = parse('participantstyle #green\nnotestyle #yellow\nmessagestyle #blue');
      const styles = ast.filter(n => n.type === 'directive' &&
        ['participantstyle', 'notestyle', 'messagestyle'].includes(n.directiveType));
      expect(styles.length).toBe(3);
    });
  });

  describe('Serialization of type style directives', () => {
    it('should serialize participantstyle with fill and border', () => {
      const ast = parse('participantstyle #green #red;3;dashed');
      const output = serialize(ast);
      expect(output).toContain('participantstyle');
      expect(output).toContain('#green');
      expect(output).toContain('#red;3;dashed');
    });

    it('should serialize notestyle with text markup only', () => {
      const ast = parse('notestyle <color:#blue>//**');
      const output = serialize(ast);
      expect(output).toBe('notestyle <color:#blue>//**');
    });

    it('should serialize messagestyle with color and text markup', () => {
      const ast = parse('messagestyle #lightblue;2,**//');
      const output = serialize(ast);
      expect(output).toContain('messagestyle');
      expect(output).toContain('#lightblue');
    });

    it('should serialize boxstyle with text markup', () => {
      const ast = parse('boxstyle <color:#red>');
      const output = serialize(ast);
      expect(output).toBe('boxstyle <color:#red>');
    });

    it('should serialize rboxstyle with width and text markup', () => {
      const ast = parse('rboxstyle ;3,<color:#purple>');
      const output = serialize(ast);
      expect(output).toContain('rboxstyle');
      expect(output).toContain(';3');
      expect(output).toContain('<color:#purple>');
    });
  });

  describe('Round-trip type style directives', () => {
    it('should round-trip participantstyle', () => {
      const input = 'participantstyle #green #red;3;dashed';
      const ast = parse(input);
      const output = serialize(ast);
      expect(output).toBe(input);
    });

    it('should round-trip notestyle with text markup', () => {
      const input = 'notestyle <color:#blue>//**';
      const ast = parse(input);
      const output = serialize(ast);
      expect(output).toBe(input);
    });

    it('should round-trip messagestyle', () => {
      const input = 'messagestyle #blue;2,**//';
      const ast = parse(input);
      const output = serialize(ast);
      expect(output).toBe(input);
    });
  });

  describe('Rendering with type styles', () => {
    it('should render diagram with type style definitions without error', () => {
      const ast = parse('participantstyle #green\nparticipant A\nparticipant B\nA->B:Hello');
      const svg = render(ast);
      expect(svg).toBeDefined();
      expect(svg.tagName).toBe('svg');
    });

    it('should apply messagestyle to messages without explicit style', () => {
      const ast = parse('messagestyle #red\nparticipant A\nparticipant B\nA->B:Test');
      const svg = render(ast);
      const messageLine = svg.querySelector('.message line');
      expect(messageLine).toBeDefined();
      // Named colors are rendered without the # prefix for SVG
      expect(messageLine.getAttribute('stroke')).toBe('red');
    });

    it('should apply messagestyle with line width', () => {
      const ast = parse('messagestyle #blue;3\nparticipant A\nparticipant B\nA->B:Thick line');
      const svg = render(ast);
      const messageLine = svg.querySelector('.message line');
      expect(messageLine).toBeDefined();
      // Named colors are rendered without the # prefix for SVG
      expect(messageLine.getAttribute('stroke')).toBe('blue');
      expect(messageLine.getAttribute('stroke-width')).toBe('3');
    });

    it('should not override explicit message style with type style', () => {
      const ast = parse('messagestyle #blue\nparticipant A\nparticipant B\nA-[#green]->B:Green message');
      const svg = render(ast);
      const messageLine = svg.querySelector('.message line');
      expect(messageLine).toBeDefined();
      // Explicit #green should override messagestyle #blue
      // Named colors are rendered without the # prefix for SVG
      expect(messageLine.getAttribute('stroke')).toBe('green');
    });

    it('should apply type styles to multiple messages', () => {
      const ast = parse(`messagestyle #red
participant A
participant B
A->B:First
B->A:Second`);
      const svg = render(ast);
      const messageLines = svg.querySelectorAll('.message line');
      expect(messageLines.length).toBe(2);
      // Named colors are rendered without the # prefix for SVG
      expect(messageLines[0].getAttribute('stroke')).toBe('red');
      expect(messageLines[1].getAttribute('stroke')).toBe('red');
    });
  });

  describe('Integration with named styles', () => {
    it('should render diagram with both type styles and named styles', () => {
      const ast = parse(`messagestyle #blue
style warning #red
participant A
participant B
A->B:Normal message
A-[##warning]->B:Warning message`);
      const svg = render(ast);
      const messageLines = svg.querySelectorAll('.message line');
      expect(messageLines.length).toBe(2);
      // First message should use type style
      // Named colors are rendered without the # prefix for SVG
      expect(messageLines[0].getAttribute('stroke')).toBe('blue');
      // Second message should use named style
      expect(messageLines[1].getAttribute('stroke')).toBe('red');
    });
  });

  describe('Complete diagram with type styles', () => {
    it('should render complete diagram with multiple type style definitions', () => {
      const ast = parse(`participantstyle #lightgreen
notestyle #lightyellow
messagestyle #darkblue
dividerstyle <color:#gray>
participant User
participant Server
User->Server:Request
note over Server:Processing
Server->User:Response
==End of Transaction==`);
      const svg = render(ast);
      expect(svg).toBeDefined();
      const messages = svg.querySelectorAll('.message');
      expect(messages.length).toBe(2);
    });
  });
});
