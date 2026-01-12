// Tests for participant types (BACKLOG-115, BACKLOG-116)

import { describe, it, expect } from 'vitest';
import { parse } from '../public/src/ast/parser.js';
import { serialize } from '../public/src/ast/serializer.js';
import { render } from '../public/src/rendering/renderer.js';

describe('Participant Types (BACKLOG-115, BACKLOG-116)', () => {

  describe('Parsing participant types', () => {
    it('should parse participant (default)', () => {
      const ast = parse('participant Alice');
      const p = ast.find(n => n.type === 'participant');
      expect(p.participantType).toBe('participant');
      expect(p.alias).toBe('Alice');
    });

    it('should parse rparticipant (rounded)', () => {
      const ast = parse('rparticipant Bob');
      const p = ast.find(n => n.type === 'participant');
      expect(p.participantType).toBe('rparticipant');
      expect(p.alias).toBe('Bob');
    });

    it('should parse actor', () => {
      const ast = parse('actor User');
      const p = ast.find(n => n.type === 'participant');
      expect(p.participantType).toBe('actor');
    });

    it('should parse database', () => {
      const ast = parse('database DB');
      const p = ast.find(n => n.type === 'participant');
      expect(p.participantType).toBe('database');
    });

    it('should parse boundary', () => {
      const ast = parse('boundary API');
      const p = ast.find(n => n.type === 'participant');
      expect(p.participantType).toBe('boundary');
      expect(p.alias).toBe('API');
    });

    it('should parse control', () => {
      const ast = parse('control Controller');
      const p = ast.find(n => n.type === 'participant');
      expect(p.participantType).toBe('control');
    });

    it('should parse entity', () => {
      const ast = parse('entity Model');
      const p = ast.find(n => n.type === 'participant');
      expect(p.participantType).toBe('entity');
    });
  });

  describe('Parsing with display name and alias', () => {
    it('should parse rparticipant with quoted name', () => {
      const ast = parse('rparticipant "User Service" as US');
      const p = ast.find(n => n.type === 'participant');
      expect(p.participantType).toBe('rparticipant');
      expect(p.displayName).toBe('User Service');
      expect(p.alias).toBe('US');
    });

    it('should parse boundary with quoted name', () => {
      const ast = parse('boundary "REST API" as API');
      const p = ast.find(n => n.type === 'participant');
      expect(p.participantType).toBe('boundary');
      expect(p.displayName).toBe('REST API');
      expect(p.alias).toBe('API');
    });

    it('should parse control with quoted name', () => {
      const ast = parse('control "Request Handler" as RH');
      const p = ast.find(n => n.type === 'participant');
      expect(p.participantType).toBe('control');
      expect(p.displayName).toBe('Request Handler');
      expect(p.alias).toBe('RH');
    });

    it('should parse entity with quoted name', () => {
      const ast = parse('entity "User Model" as UM');
      const p = ast.find(n => n.type === 'participant');
      expect(p.participantType).toBe('entity');
      expect(p.displayName).toBe('User Model');
      expect(p.alias).toBe('UM');
    });
  });

  describe('Parsing with styling', () => {
    it('should parse rparticipant with fill color', () => {
      const ast = parse('rparticipant Service #lightblue');
      const p = ast.find(n => n.type === 'participant');
      expect(p.participantType).toBe('rparticipant');
      expect(p.style.fill).toBe('#lightblue');
    });

    it('should parse boundary with styling', () => {
      const ast = parse('boundary API #yellow #green;2;dashed');
      const p = ast.find(n => n.type === 'participant');
      expect(p.style.fill).toBe('#yellow');
      expect(p.style.border).toBe('#green');
      expect(p.style.borderWidth).toBe(2);
      expect(p.style.borderStyle).toBe('dashed');
    });
  });

  describe('Serialization', () => {
    const types = ['participant', 'rparticipant', 'actor', 'database', 'boundary', 'control', 'entity'];

    for (const type of types) {
      it(`should serialize ${type} correctly`, () => {
        const input = `${type} Test`;
        const ast = parse(input);
        const output = serialize(ast);
        expect(output).toBe(`${type} Test`);
      });
    }

    it('should serialize rparticipant with display name', () => {
      const ast = parse('rparticipant "Service Name" as SN');
      const output = serialize(ast);
      expect(output).toBe('rparticipant "Service Name" as SN');
    });
  });

  describe('Rendering rparticipant', () => {
    it('should render rparticipant with rounded corners', () => {
      const ast = parse('rparticipant Service');
      const svg = render(ast);
      const rect = svg.querySelector('.participant rect');
      expect(rect).toBeDefined();
      expect(rect.getAttribute('rx')).toBe('10');
      expect(rect.getAttribute('ry')).toBe('10');
    });

    it('should render rparticipant with label', () => {
      const ast = parse('rparticipant Service');
      const svg = render(ast);
      const text = svg.querySelector('.participant text');
      expect(text.textContent).toBe('Service');
    });
  });

  describe('Rendering boundary', () => {
    it('should render boundary with circle and lines', () => {
      const ast = parse('boundary API');
      const svg = render(ast);
      const group = svg.querySelector('.participant');
      expect(group).toBeDefined();
      // Boundary has circle and lines
      expect(group.querySelector('circle')).toBeDefined();
      expect(group.querySelectorAll('line').length).toBeGreaterThan(0);
    });

    it('should render boundary with label', () => {
      const ast = parse('boundary API');
      const svg = render(ast);
      const text = svg.querySelector('.participant text');
      expect(text.textContent).toBe('API');
    });
  });

  describe('Rendering control', () => {
    it('should render control with circle and arrow', () => {
      const ast = parse('control Handler');
      const svg = render(ast);
      const group = svg.querySelector('.participant');
      expect(group).toBeDefined();
      // Control has circle and path (arrow)
      expect(group.querySelector('circle')).toBeDefined();
      expect(group.querySelector('path')).toBeDefined();
    });

    it('should render control with label', () => {
      const ast = parse('control Handler');
      const svg = render(ast);
      const text = svg.querySelector('.participant text');
      expect(text.textContent).toBe('Handler');
    });
  });

  describe('Rendering entity', () => {
    it('should render entity with circle and underline', () => {
      const ast = parse('entity Model');
      const svg = render(ast);
      const group = svg.querySelector('.participant');
      expect(group).toBeDefined();
      // Entity has circle and line (underline)
      expect(group.querySelector('circle')).toBeDefined();
      expect(group.querySelector('line')).toBeDefined();
    });

    it('should render entity with label', () => {
      const ast = parse('entity Model');
      const svg = render(ast);
      const text = svg.querySelector('.participant text');
      expect(text.textContent).toBe('Model');
    });
  });

  describe('Round-trip', () => {
    const types = ['participant', 'rparticipant', 'actor', 'database', 'boundary', 'control', 'entity'];

    for (const type of types) {
      it(`should round-trip ${type}`, () => {
        const input = `${type} Test`;
        const ast1 = parse(input);
        const output = serialize(ast1);
        const ast2 = parse(output);

        const p1 = ast1.find(n => n.type === 'participant');
        const p2 = ast2.find(n => n.type === 'participant');

        expect(p2.participantType).toBe(p1.participantType);
        expect(p2.alias).toBe(p1.alias);
        expect(p2.displayName).toBe(p1.displayName);
      });
    }
  });

  describe('Messages between different participant types', () => {
    it('should render messages between different participant types', () => {
      const input = `boundary API
control Handler
entity Model
database DB
API->Handler:request
Handler->Model:query
Model->DB:fetch`;
      const ast = parse(input);
      const svg = render(ast);

      // Should have 4 participants
      expect(svg.querySelectorAll('.participant').length).toBe(4);
      // Should have 3 messages
      expect(svg.querySelectorAll('.message').length).toBe(3);
    });
  });

  describe('Participant styling with named colors', () => {
    it('should apply named color to participant fill', () => {
      const ast = parse('participant Alice #lightblue\nAlice->Alice:test');
      const svg = render(ast);
      const rect = svg.querySelector('.participant rect');
      // Named colors are resolved without the # prefix
      expect(rect.getAttribute('fill')).toBe('lightblue');
    });

    it('should apply named color to participant border', () => {
      const ast = parse('participant Alice #white #darkblue\nAlice->Alice:test');
      const svg = render(ast);
      const rect = svg.querySelector('.participant rect');
      expect(rect.getAttribute('fill')).toBe('white');
      expect(rect.getAttribute('stroke')).toBe('darkblue');
    });

    it('should apply hex color to participant fill', () => {
      const ast = parse('participant Alice #ff0000\nAlice->Alice:test');
      const svg = render(ast);
      const rect = svg.querySelector('.participant rect');
      expect(rect.getAttribute('fill')).toBe('#ff0000');
    });

    it('should apply named color to actor', () => {
      const ast = parse('actor User #lightgreen\nUser->User:test');
      const svg = render(ast);
      const circle = svg.querySelector('.participant circle');
      expect(circle.getAttribute('fill')).toBe('lightgreen');
    });

    it('should apply named color to database', () => {
      const ast = parse('database DB #lightyellow\nDB->DB:test');
      const svg = render(ast);
      const ellipse = svg.querySelector('.participant ellipse');
      expect(ellipse.getAttribute('fill')).toBe('lightyellow');
    });
  });

  describe('Participant display name with markup', () => {
    it('should render monospace text with ""mono"" markup', () => {
      // Use escaped quotes: \"\" represents "" in the display name
      const ast = parse('participant "Server \\"\\"API\\"\\""  as API\nAPI->API:test');
      const svg = render(ast);
      // Find the tspan with monospace font (there may be multiple tspans)
      const tspans = svg.querySelectorAll('.participant tspan');
      const monoTspan = Array.from(tspans).find(t => t.getAttribute('font-family') === 'monospace');
      expect(monoTspan).toBeDefined();
      expect(monoTspan.textContent).toBe('API');
    });

    it('should render bold text with **bold** markup', () => {
      const ast = parse('participant "**Important**" as A\nA->A:test');
      const svg = render(ast);
      const tspan = svg.querySelector('.participant tspan');
      expect(tspan.getAttribute('font-weight')).toBe('bold');
    });

    it('should render colored text with <color:#red>text</color> markup', () => {
      const ast = parse('participant "<color:#ff0000>Red</color>" as R\nR->R:test');
      const svg = render(ast);
      const tspan = svg.querySelector('.participant tspan');
      expect(tspan.getAttribute('fill')).toBe('#ff0000');
    });
  });
});
