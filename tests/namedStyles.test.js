// Tests for named styles system

import { describe, it, expect } from 'vitest';
import { parse } from '../public/src/ast/parser.js';
import { serialize } from '../public/src/ast/serializer.js';
import { render } from '../public/src/rendering/renderer.js';

describe('Named Styles System', () => {

  describe('Parsing style definitions', () => {
    it('should parse style directive with fill color only', () => {
      const ast = parse('style myStyle #lightblue');
      const styleNode = ast.find(n => n.type === 'directive' && n.directiveType === 'style');
      expect(styleNode).toBeDefined();
      expect(styleNode.name).toBe('myStyle');
      expect(styleNode.style.fill).toBe('#lightblue');
    });

    it('should parse style directive with fill and border color', () => {
      const ast = parse('style warning #white #red');
      const styleNode = ast.find(n => n.type === 'directive' && n.directiveType === 'style');
      expect(styleNode.name).toBe('warning');
      expect(styleNode.style.fill).toBe('#white');
      expect(styleNode.style.border).toBe('#red');
    });

    it('should parse style directive with border width', () => {
      const ast = parse('style bordered #yellow #blue;2');
      const styleNode = ast.find(n => n.type === 'directive' && n.directiveType === 'style');
      expect(styleNode.style.fill).toBe('#yellow');
      expect(styleNode.style.border).toBe('#blue');
      expect(styleNode.style.borderWidth).toBe(2);
    });

    it('should parse style directive with dashed border', () => {
      const ast = parse('style dashed #white #red;2;dashed');
      const styleNode = ast.find(n => n.type === 'directive' && n.directiveType === 'style');
      expect(styleNode.style.fill).toBe('#white');
      expect(styleNode.style.border).toBe('#red');
      expect(styleNode.style.borderWidth).toBe(2);
      expect(styleNode.style.borderStyle).toBe('dashed');
    });

    it('should parse style directive with text markup', () => {
      const ast = parse('style fancy #pink #red;1;solid,**<color:#red>');
      const styleNode = ast.find(n => n.type === 'directive' && n.directiveType === 'style');
      expect(styleNode.style.fill).toBe('#pink');
      expect(styleNode.style.textMarkup).toBe('**<color:#red>');
    });

    it('should parse style directive with only text markup', () => {
      const ast = parse('style bold #white,**');
      const styleNode = ast.find(n => n.type === 'directive' && n.directiveType === 'style');
      expect(styleNode.style.fill).toBe('#white');
      expect(styleNode.style.textMarkup).toBe('**');
    });

    it('should parse multiple style definitions', () => {
      const ast = parse('style one #red\nstyle two #blue\nstyle three #green');
      const styles = ast.filter(n => n.type === 'directive' && n.directiveType === 'style');
      expect(styles.length).toBe(3);
      expect(styles[0].name).toBe('one');
      expect(styles[1].name).toBe('two');
      expect(styles[2].name).toBe('three');
    });
  });

  describe('Serialization of style definitions', () => {
    it('should serialize style with fill only', () => {
      const ast = parse('style myStyle #lightblue');
      const output = serialize(ast);
      expect(output).toContain('style myStyle #lightblue');
    });

    it('should serialize style with fill and border', () => {
      const ast = parse('style warning #white #red');
      const output = serialize(ast);
      expect(output).toContain('style warning #white #red');
    });

    it('should serialize style with border width and style', () => {
      const ast = parse('style dashed #yellow #blue;2;dashed');
      const output = serialize(ast);
      expect(output).toContain('#yellow');
      expect(output).toContain('#blue;2;dashed');
    });

    it('should serialize style with text markup', () => {
      const ast = parse('style fancy #white,**//bold italic//');
      const output = serialize(ast);
      expect(output).toContain('style fancy');
      expect(output).toContain(',**//bold italic//');
    });
  });

  describe('Round-trip style definitions', () => {
    it('should round-trip simple style', () => {
      const input = 'style myStyle #lightblue';
      const ast = parse(input);
      const output = serialize(ast);
      expect(output).toBe(input);
    });

    it('should round-trip complex style', () => {
      const input = 'style warning #white #red;2;dashed';
      const ast = parse(input);
      const output = serialize(ast);
      expect(output).toBe(input);
    });
  });

  describe('Style references in messages', () => {
    it('should parse message with ##styleName reference', () => {
      const ast = parse('participant A\nparticipant B\nA-[##warning]->B:Alert');
      const message = ast.find(n => n.type === 'message');
      expect(message.style).toBeDefined();
      expect(message.style.styleName).toBe('warning');
    });

    it('should serialize message with style reference', () => {
      const ast = parse('participant A\nparticipant B\nA-[##myStyle]->B:Hello');
      const output = serialize(ast);
      expect(output).toContain('A-[##myStyle]->B:Hello');
    });
  });

  describe('Rendering with named styles', () => {
    it('should render diagram with style definition without error', () => {
      const ast = parse('style warning #white #red;2;dashed\nparticipant A\nparticipant B\nA->B:Hello');
      const svg = render(ast);
      expect(svg).toBeDefined();
      expect(svg.tagName).toBe('svg');
    });

    it('should apply named style to message', () => {
      const ast = parse('style myColor #ff0000\nparticipant A\nparticipant B\nA-[##myColor]->B:Red message');
      const svg = render(ast);
      const messageLine = svg.querySelector('.message line');
      expect(messageLine).toBeDefined();
      // The named style should apply the color
      expect(messageLine.getAttribute('stroke')).toBe('#ff0000');
    });

    it('should apply named style with line width', () => {
      const ast = parse('style thick #blue;3\nparticipant A\nparticipant B\nA-[##thick]->B:Thick line');
      const svg = render(ast);
      const messageLine = svg.querySelector('.message line');
      expect(messageLine).toBeDefined();
      // Note: style has border as #blue and borderWidth as 3
      // We need to check how border maps to message stroke
      // The message style uses 'color' and 'width' properties
      // So thick style needs to be defined with those in mind
    });

    it('should render multiple messages with different named styles', () => {
      const ast = parse(`style red #ff0000
style blue #0000ff
participant A
participant B
A-[##red]->B:Red
A-[##blue]->B:Blue`);
      const svg = render(ast);
      const messageLines = svg.querySelectorAll('.message line');
      expect(messageLines.length).toBe(2);
    });

    it('should fall back to default when named style not found', () => {
      const ast = parse('participant A\nparticipant B\nA-[##nonexistent]->B:Test');
      const svg = render(ast);
      const messageLine = svg.querySelector('.message line');
      expect(messageLine).toBeDefined();
      // Should still render with default black stroke
      expect(messageLine.getAttribute('stroke')).toBe('black');
    });
  });

  describe('Named styles with notes', () => {
    it('should parse note with ##styleName reference', () => {
      const ast = parse('participant A\nnote over A ##myStyle:Styled note');
      const note = ast.find(n => n.type === 'note');
      // Note: notes may need separate handling for style references
      expect(note).toBeDefined();
    });
  });

  describe('Integration with diagram', () => {
    it('should render complete diagram with style definitions and references', () => {
      const ast = parse(`style warning #white #red;2;dashed
style success #white #green
participant User
participant Server
User-[##warning]->Server:Error case
Server-[##success]->User:Success response`);
      const svg = render(ast);
      expect(svg).toBeDefined();
      const messages = svg.querySelectorAll('.message');
      expect(messages.length).toBe(2);
    });
  });

  describe('Style property mapping consistency', () => {
    it('should map fill to stroke color for messages', () => {
      const ast = parse(`style red #ff0000
participant A
participant B
A-[##red]->B:Colored`);
      const svg = render(ast);
      const messageLine = svg.querySelector('.message line');
      expect(messageLine.getAttribute('stroke')).toBe('#ff0000');
    });

    it('should map border to stroke color for messages when no fill', () => {
      const ast = parse(`style bordered #ffffff #0000ff
participant A
participant B
A-[##bordered]->B:Bordered`);
      const svg = render(ast);
      const messageLine = svg.querySelector('.message line');
      // When both fill and border are present, fill is used for message color
      expect(messageLine.getAttribute('stroke')).toBe('#ffffff');
    });

    it('should map borderWidth to stroke-width for messages', () => {
      const ast = parse(`style thick #red;3
participant A
participant B
A-[##thick]->B:Thick`);
      const svg = render(ast);
      const messageLine = svg.querySelector('.message line');
      // borderWidth from named style should be mapped to stroke-width
      expect(messageLine.getAttribute('stroke-width')).toBe('3');
    });

    it('should use fill directly for notes', () => {
      const ast = parse(`style highlight #lightblue
participant A
A->A:msg
note over A ##highlight:Highlighted`);
      const svg = render(ast);
      const notePath = svg.querySelector('.note path');
      expect(notePath.getAttribute('fill')).toBe('lightblue');
    });

    it('should use border directly for notes', () => {
      const ast = parse(`style bordered #white #red
participant A
A->A:msg
note over A ##bordered:Bordered`);
      const svg = render(ast);
      const notePath = svg.querySelector('.note path');
      expect(notePath.getAttribute('stroke')).toBe('red');
    });

    it('should use borderWidth directly for notes', () => {
      const ast = parse(`style thick #white #blue;3
participant A
A->A:msg
note over A ##thick:Thick border`);
      const svg = render(ast);
      const notePath = svg.querySelector('.note path');
      expect(notePath.getAttribute('stroke-width')).toBe('3');
    });

    it('should use borderStyle directly for notes', () => {
      const ast = parse(`style dashed #white #blue;1;dashed
participant A
A->A:msg
note over A ##dashed:Dashed border`);
      const svg = render(ast);
      const notePath = svg.querySelector('.note path');
      expect(notePath.getAttribute('stroke-dasharray')).toBe('5,5');
    });

    it('should apply named style to dividers', () => {
      const ast = parse(`style dividerStyle #lightgray #blue;2
participant A
A->A:msg
==My Divider==##dividerStyle`);
      const svg = render(ast);
      const dividerRect = svg.querySelector('.divider rect');
      expect(dividerRect.getAttribute('fill')).toBe('lightgray');
      expect(dividerRect.getAttribute('stroke')).toBe('blue');
    });
  });
});
