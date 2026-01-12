// Tests for lifecycle - create, destroy (BACKLOG-129)

import { describe, it, expect } from 'vitest';
import { parse } from '../public/src/ast/parser.js';
import { serialize } from '../public/src/ast/serializer.js';
import { render } from '../public/src/rendering/renderer.js';

describe('Lifecycle - Create and Destroy (BACKLOG-129)', () => {

  describe('Parsing destroy directives', () => {
    it('should parse destroy directive', () => {
      const ast = parse('destroy A');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive).toBeDefined();
      expect(directive.directiveType).toBe('destroy');
      expect(directive.participant).toBe('A');
    });

    it('should parse destroyafter directive', () => {
      const ast = parse('destroyafter B');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive).toBeDefined();
      expect(directive.directiveType).toBe('destroyafter');
      expect(directive.participant).toBe('B');
    });

    it('should parse destroysilent directive', () => {
      const ast = parse('destroysilent C');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive).toBeDefined();
      expect(directive.directiveType).toBe('destroysilent');
      expect(directive.participant).toBe('C');
    });
  });

  describe('Parsing create messages', () => {
    it('should parse create message with * prefix', () => {
      const ast = parse('A->*B:<<create>>');
      const message = ast.find(n => n.type === 'message');
      expect(message).toBeDefined();
      expect(message.from).toBe('A');
      expect(message.to).toBe('B');
      expect(message.isCreate).toBe(true);
      expect(message.label).toBe('<<create>>');
    });

    it('should parse create message with just * prefix', () => {
      const ast = parse('A->*B:create instance');
      const message = ast.find(n => n.type === 'message');
      expect(message.isCreate).toBe(true);
      expect(message.to).toBe('B');
    });

    it('should parse create message with <<create>> in label only', () => {
      const ast = parse('A->B:<<create>>');
      const message = ast.find(n => n.type === 'message');
      expect(message.isCreate).toBe(true);
    });

    it('should detect create with <<create>> embedded in label', () => {
      const ast = parse('A->B:do something <<create>>');
      const message = ast.find(n => n.type === 'message');
      expect(message.isCreate).toBe(true);
    });

    it('should not mark regular messages as create', () => {
      const ast = parse('A->B:hello');
      const message = ast.find(n => n.type === 'message');
      expect(message.isCreate).toBeNull();
    });

    it('should parse create message with different arrow types', () => {
      const inputs = [
        'A->>*B:<<create>>',
        'A-->*B:<<create>>',
        'A-->>*B:<<create>>'
      ];
      for (const input of inputs) {
        const ast = parse(input);
        const message = ast.find(n => n.type === 'message');
        expect(message.isCreate).toBe(true);
      }
    });
  });

  describe('Serialization', () => {
    it('should serialize destroy directive', () => {
      const ast = parse('destroy A');
      const output = serialize(ast);
      expect(output).toBe('destroy A');
    });

    it('should serialize destroyafter directive', () => {
      const ast = parse('destroyafter B');
      const output = serialize(ast);
      expect(output).toBe('destroyafter B');
    });

    it('should serialize destroysilent directive', () => {
      const ast = parse('destroysilent C');
      const output = serialize(ast);
      expect(output).toBe('destroysilent C');
    });

    it('should serialize create message with * prefix', () => {
      const ast = parse('A->*B:<<create>>');
      const output = serialize(ast);
      expect(output).toBe('A->*B:<<create>>');
    });

    it('should serialize create message preserving label', () => {
      const ast = parse('A->*B:create instance');
      const output = serialize(ast);
      expect(output).toBe('A->*B:create instance');
    });
  });

  describe('Rendering destroy', () => {
    it('should render destroy X marker', () => {
      const input = `participant A
participant B
A->B:msg
destroy B`;
      const ast = parse(input);
      const svg = render(ast);

      const destroyMarker = svg.querySelector('.destroy-marker');
      expect(destroyMarker).not.toBeNull();
      expect(destroyMarker.getAttribute('data-participant')).toBe('B');

      // Check it has two lines forming an X
      const lines = destroyMarker.querySelectorAll('line');
      expect(lines.length).toBe(2);
    });

    it('should not render X marker for destroysilent', () => {
      const input = `participant A
participant B
A->B:msg
destroysilent B`;
      const ast = parse(input);
      const svg = render(ast);

      const destroyMarker = svg.querySelector('.destroy-marker');
      expect(destroyMarker).toBeNull();
    });

    it('should render X marker for destroyafter', () => {
      const input = `participant A
participant B
A->B:msg
destroyafter B`;
      const ast = parse(input);
      const svg = render(ast);

      const destroyMarker = svg.querySelector('.destroy-marker');
      expect(destroyMarker).not.toBeNull();
    });
  });

  describe('Rendering create', () => {
    it('should position created participant at message Y', () => {
      const input = `participant A
participant B
participant C
A->B:msg1
A->*C:<<create>>
A->C:msg2`;
      const ast = parse(input);
      const svg = render(ast);

      // Get all participant boxes
      const participantBoxes = svg.querySelectorAll('.participant');
      expect(participantBoxes.length).toBe(3);

      // Created participant C should have class created-participant
      const createdParticipant = svg.querySelector('.created-participant');
      expect(createdParticipant).not.toBeNull();
    });

    it('should render message to created participant', () => {
      const input = `participant A
participant B
A->*B:<<create>>`;
      const ast = parse(input);
      const svg = render(ast);

      const messages = svg.querySelectorAll('.message');
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('Round-trip', () => {
    it('should round-trip destroy directive', () => {
      const input = 'destroy A';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.directiveType).toBe(d1.directiveType);
      expect(d2.participant).toBe(d1.participant);
    });

    it('should round-trip destroyafter directive', () => {
      const input = 'destroyafter B';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.directiveType).toBe(d1.directiveType);
      expect(d2.participant).toBe(d1.participant);
    });

    it('should round-trip destroysilent directive', () => {
      const input = 'destroysilent C';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.directiveType).toBe(d1.directiveType);
      expect(d2.participant).toBe(d1.participant);
    });

    it('should round-trip create message', () => {
      const input = 'A->*B:<<create>>';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const m1 = ast1.find(n => n.type === 'message');
      const m2 = ast2.find(n => n.type === 'message');

      expect(m2.isCreate).toBe(m1.isCreate);
      expect(m2.from).toBe(m1.from);
      expect(m2.to).toBe(m1.to);
      expect(m2.label).toBe(m1.label);
    });
  });

  describe('Full lifecycle scenario', () => {
    it('should handle complete create/destroy flow', () => {
      const input = `participant Client
participant Server
participant DB
Client->*DB:<<create>>
Client->DB:connect
Server->DB:query
destroy DB`;
      const ast = parse(input);
      const svg = render(ast);

      // Should have 3 participants
      const participants = ast.filter(n => n.type === 'participant');
      expect(participants.length).toBe(3);

      // Should have create message
      const createMsg = ast.find(n => n.type === 'message' && n.isCreate);
      expect(createMsg).toBeDefined();
      expect(createMsg.to).toBe('DB');

      // Should have destroy directive
      const destroyDir = ast.find(n => n.type === 'directive' && n.directiveType === 'destroy');
      expect(destroyDir).toBeDefined();
      expect(destroyDir.participant).toBe('DB');

      // Should render destroy marker
      const destroyMarker = svg.querySelector('.destroy-marker[data-participant="DB"]');
      expect(destroyMarker).not.toBeNull();
    });
  });

  describe('Integration with other features', () => {
    it('should work with autonumbering', () => {
      const input = `autonumber 1
participant A
participant B
A->*B:<<create>>
A->B:msg1
destroy B`;
      const ast = parse(input);
      const svg = render(ast);

      // Should have numbered messages
      const messages = svg.querySelectorAll('.message');
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should work with fragments', () => {
      const input = `participant A
participant B
alt success
  A->*B:<<create>>
  A->B:msg
else failure
  A->A:retry
end
destroy B`;
      const ast = parse(input);
      const svg = render(ast);

      // Should render fragment
      const fragments = svg.querySelectorAll('#fragments g');
      expect(fragments.length).toBeGreaterThan(0);
    });

    it('should serialize full diagram correctly', () => {
      const input = `participant A
participant B
A->*B:<<create>>
A->B:hello
destroy B`;
      const ast = parse(input);
      const output = serialize(ast);

      expect(output).toContain('participant A');
      expect(output).toContain('participant B');
      expect(output).toContain('A->*B:<<create>>');
      expect(output).toContain('A->B:hello');
      expect(output).toContain('destroy B');
    });
  });
});
