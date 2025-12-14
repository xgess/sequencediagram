// Tests for activations (BACKLOG-130)

import { describe, it, expect } from 'vitest';
import { parse } from '../src/ast/parser.js';
import { serialize } from '../src/ast/serializer.js';
import { render } from '../src/rendering/renderer.js';

describe('Activations (BACKLOG-130)', () => {

  describe('Parsing activate directive', () => {
    it('should parse basic activate directive', () => {
      const ast = parse('activate A');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive).toBeDefined();
      expect(directive.directiveType).toBe('activate');
      expect(directive.participant).toBe('A');
      expect(directive.color).toBeNull();
    });

    it('should parse activate with color', () => {
      const ast = parse('activate A #lightblue');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.directiveType).toBe('activate');
      expect(directive.participant).toBe('A');
      expect(directive.color).toBe('#lightblue');
    });

    it('should parse activate with hex color', () => {
      const ast = parse('activate B #ff0000');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.color).toBe('#ff0000');
    });
  });

  describe('Parsing deactivate directives', () => {
    it('should parse deactivate directive', () => {
      const ast = parse('deactivate A');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive).toBeDefined();
      expect(directive.directiveType).toBe('deactivate');
      expect(directive.participant).toBe('A');
    });

    it('should parse deactivateafter directive', () => {
      const ast = parse('deactivateafter B');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.directiveType).toBe('deactivateafter');
      expect(directive.participant).toBe('B');
    });
  });

  describe('Parsing autoactivation directive', () => {
    it('should parse autoactivation on', () => {
      const ast = parse('autoactivation on');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive).toBeDefined();
      expect(directive.directiveType).toBe('autoactivation');
      expect(directive.value).toBe(true);
    });

    it('should parse autoactivation off', () => {
      const ast = parse('autoactivation off');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.directiveType).toBe('autoactivation');
      expect(directive.value).toBe(false);
    });
  });

  describe('Parsing activecolor directive', () => {
    it('should parse global activecolor', () => {
      const ast = parse('activecolor #yellow');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive).toBeDefined();
      expect(directive.directiveType).toBe('activecolor');
      expect(directive.participant).toBeNull();
      expect(directive.color).toBe('#yellow');
    });

    it('should parse per-participant activecolor', () => {
      const ast = parse('activecolor Server #lightgreen');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive.directiveType).toBe('activecolor');
      expect(directive.participant).toBe('Server');
      expect(directive.color).toBe('#lightgreen');
    });
  });

  describe('Serialization', () => {
    it('should serialize activate directive', () => {
      const ast = parse('activate A');
      const output = serialize(ast);
      expect(output).toBe('activate A');
    });

    it('should serialize activate with color', () => {
      const ast = parse('activate A #lightblue');
      const output = serialize(ast);
      expect(output).toBe('activate A #lightblue');
    });

    it('should serialize deactivate directive', () => {
      const ast = parse('deactivate A');
      const output = serialize(ast);
      expect(output).toBe('deactivate A');
    });

    it('should serialize deactivateafter directive', () => {
      const ast = parse('deactivateafter B');
      const output = serialize(ast);
      expect(output).toBe('deactivateafter B');
    });

    it('should serialize autoactivation on', () => {
      const ast = parse('autoactivation on');
      const output = serialize(ast);
      expect(output).toBe('autoactivation on');
    });

    it('should serialize autoactivation off', () => {
      const ast = parse('autoactivation off');
      const output = serialize(ast);
      expect(output).toBe('autoactivation off');
    });

    it('should serialize global activecolor', () => {
      const ast = parse('activecolor #yellow');
      const output = serialize(ast);
      expect(output).toBe('activecolor #yellow');
    });

    it('should serialize per-participant activecolor', () => {
      const ast = parse('activecolor Server #lightgreen');
      const output = serialize(ast);
      expect(output).toBe('activecolor Server #lightgreen');
    });
  });

  describe('Rendering activation bars', () => {
    it('should render activation bar for activate/deactivate pair', () => {
      const input = `participant A
participant B
A->B:request
activate B
B->B:process
deactivate B
B->A:response`;
      const ast = parse(input);
      const svg = render(ast);

      const activationBars = svg.querySelectorAll('.activation-bar');
      expect(activationBars.length).toBeGreaterThan(0);
    });

    it('should apply color to activation bar', () => {
      const input = `participant A
participant B
activate B #lightblue
B->B:work
deactivate B`;
      const ast = parse(input);
      const svg = render(ast);

      const activationBar = svg.querySelector('.activation-bar');
      expect(activationBar).not.toBeNull();
      expect(activationBar.getAttribute('fill')).toBe('#lightblue');
    });

    it('should use activecolor directive for default color', () => {
      const input = `activecolor #yellow
participant A
participant B
activate B
B->B:work
deactivate B`;
      const ast = parse(input);
      const svg = render(ast);

      const activationBar = svg.querySelector('.activation-bar');
      expect(activationBar).not.toBeNull();
      expect(activationBar.getAttribute('fill')).toBe('#yellow');
    });

    it('should use per-participant activecolor', () => {
      const input = `activecolor A #red
activecolor B #green
participant A
participant B
activate B
B->B:work
deactivate B`;
      const ast = parse(input);
      const svg = render(ast);

      const activationBar = svg.querySelector('.activation-bar[data-participant="B"]');
      expect(activationBar).not.toBeNull();
      expect(activationBar.getAttribute('fill')).toBe('#green');
    });

    it('should render multiple activation bars', () => {
      const input = `participant A
participant B
activate A
A->B:msg1
activate B
B->B:work
deactivate B
A->B:msg2
deactivate A`;
      const ast = parse(input);
      const svg = render(ast);

      const activationBars = svg.querySelectorAll('.activation-bar');
      expect(activationBars.length).toBe(2);
    });
  });

  describe('Autoactivation', () => {
    it('should auto-activate target on request message', () => {
      const input = `autoactivation on
participant Client
participant Server
Client->Server:request
Server->Client:response`;
      const ast = parse(input);
      const svg = render(ast);

      // With autoactivation, Server should be activated on request and deactivated on response
      const activationBars = svg.querySelectorAll('.activation-bar[data-participant="Server"]');
      expect(activationBars.length).toBeGreaterThan(0);
    });

    it('should not auto-activate when autoactivation is off', () => {
      const input = `autoactivation off
participant Client
participant Server
Client->Server:request
Server->Client:response`;
      const ast = parse(input);
      const svg = render(ast);

      // Without autoactivation, no bars should be created automatically
      const activationBars = svg.querySelectorAll('.activation-bar');
      expect(activationBars.length).toBe(0);
    });
  });

  describe('Round-trip', () => {
    it('should round-trip activate directive', () => {
      const input = 'activate A';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.directiveType).toBe(d1.directiveType);
      expect(d2.participant).toBe(d1.participant);
    });

    it('should round-trip activate with color', () => {
      const input = 'activate B #lightblue';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.color).toBe(d1.color);
    });

    it('should round-trip autoactivation', () => {
      const input = 'autoactivation on';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.value).toBe(d1.value);
    });

    it('should round-trip activecolor directive', () => {
      const input = 'activecolor Server #lightgreen';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.participant).toBe(d1.participant);
      expect(d2.color).toBe(d1.color);
    });
  });

  describe('Full activation scenario', () => {
    it('should handle complex activation flow', () => {
      const input = `activecolor #lightyellow
participant Client
participant API
participant DB
Client->API:request
activate API #lightblue
API->DB:query
activate DB
DB->DB:process
deactivate DB
API->Client:response
deactivate API`;
      const ast = parse(input);
      const svg = render(ast);

      // Should have activation bars for API and DB
      const apiBars = svg.querySelectorAll('.activation-bar[data-participant="API"]');
      const dbBars = svg.querySelectorAll('.activation-bar[data-participant="DB"]');

      expect(apiBars.length).toBe(1);
      expect(dbBars.length).toBe(1);

      // API bar should use its specified color
      expect(apiBars[0].getAttribute('fill')).toBe('#lightblue');
      // DB bar should use the global activecolor
      expect(dbBars[0].getAttribute('fill')).toBe('#lightyellow');
    });
  });

  describe('Integration with other features', () => {
    it('should work with fragments', () => {
      const input = `participant A
participant B
activate A
alt success
  A->B:msg
  activate B
  B->A:response
  deactivate B
end
deactivate A`;
      const ast = parse(input);
      const svg = render(ast);

      const activationBars = svg.querySelectorAll('.activation-bar');
      expect(activationBars.length).toBeGreaterThan(0);
    });

    it('should work with lifecycle commands', () => {
      const input = `participant A
participant B
A->*B:<<create>>
activate B
B->B:work
deactivate B
destroy B`;
      const ast = parse(input);
      const svg = render(ast);

      // Should have activation bar and destroy marker
      const activationBars = svg.querySelectorAll('.activation-bar');
      const destroyMarker = svg.querySelector('.destroy-marker');

      expect(activationBars.length).toBeGreaterThan(0);
      expect(destroyMarker).not.toBeNull();
    });

    it('should serialize full diagram correctly', () => {
      const input = `activecolor #yellow
participant A
participant B
activate A
A->B:msg
activate B #lightblue
B->A:response
deactivate B
deactivate A`;
      const ast = parse(input);
      const output = serialize(ast);

      expect(output).toContain('activecolor #yellow');
      expect(output).toContain('activate A');
      expect(output).toContain('activate B #lightblue');
      expect(output).toContain('deactivate B');
      expect(output).toContain('deactivate A');
    });
  });
});
