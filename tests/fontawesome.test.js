// Tests for Font Awesome 7 participant types (BACKLOG-117)

import { describe, it, expect } from 'vitest';
import { parse } from '../src/ast/parser.js';
import { serialize } from '../src/ast/serializer.js';
import { render } from '../src/rendering/renderer.js';

describe('Font Awesome 7 Participant Types (BACKLOG-117)', () => {

  describe('Parsing', () => {
    it('should parse fontawesome6solid participant', () => {
      const ast = parse('fontawesome6solid f48e Server');
      const participant = ast.find(n => n.type === 'participant');

      expect(participant).toBeDefined();
      expect(participant.participantType).toBe('fontawesome6solid');
      expect(participant.iconCode).toBe('f48e');
      expect(participant.alias).toBe('Server');
      expect(participant.displayName).toBe('Server');
    });

    it('should parse fontawesome6regular participant', () => {
      const ast = parse('fontawesome6regular f004 Heart');
      const participant = ast.find(n => n.type === 'participant');

      expect(participant).toBeDefined();
      expect(participant.participantType).toBe('fontawesome6regular');
      expect(participant.iconCode).toBe('f004');
      expect(participant.alias).toBe('Heart');
    });

    it('should parse fontawesome6brands participant', () => {
      const ast = parse('fontawesome6brands f09b GitHub');
      const participant = ast.find(n => n.type === 'participant');

      expect(participant).toBeDefined();
      expect(participant.participantType).toBe('fontawesome6brands');
      expect(participant.iconCode).toBe('f09b');
      expect(participant.alias).toBe('GitHub');
    });

    it('should parse fontawesome with quoted display name and alias', () => {
      const ast = parse('fontawesome6solid f233 "Web Server" as Server');
      const participant = ast.find(n => n.type === 'participant');

      expect(participant).toBeDefined();
      expect(participant.participantType).toBe('fontawesome6solid');
      expect(participant.iconCode).toBe('f233');
      expect(participant.displayName).toBe('Web Server');
      expect(participant.alias).toBe('Server');
    });

    it('should parse fontawesome with styling', () => {
      const ast = parse('fontawesome6solid f233 Server #blue');
      const participant = ast.find(n => n.type === 'participant');

      expect(participant).toBeDefined();
      expect(participant.participantType).toBe('fontawesome6solid');
      expect(participant.iconCode).toBe('f233');
      expect(participant.style.fill).toBe('#blue');
    });

    it('should parse fontawesome with quoted name and styling', () => {
      const ast = parse('fontawesome6solid f48e "My Server" as Srv #red');
      const participant = ast.find(n => n.type === 'participant');

      expect(participant).toBeDefined();
      expect(participant.displayName).toBe('My Server');
      expect(participant.alias).toBe('Srv');
      expect(participant.style.fill).toBe('#red');
    });

    it('should handle uppercase hex codes', () => {
      const ast = parse('fontawesome6solid F48E Server');
      const participant = ast.find(n => n.type === 'participant');

      expect(participant).toBeDefined();
      expect(participant.iconCode).toBe('F48E');
    });
  });

  describe('Serialization', () => {
    it('should serialize fontawesome6solid participant', () => {
      const input = 'fontawesome6solid f48e Server';
      const ast = parse(input);
      const output = serialize(ast);

      expect(output).toBe('fontawesome6solid f48e Server');
    });

    it('should serialize fontawesome6regular participant', () => {
      const input = 'fontawesome6regular f004 Heart';
      const ast = parse(input);
      const output = serialize(ast);

      expect(output).toBe('fontawesome6regular f004 Heart');
    });

    it('should serialize fontawesome6brands participant', () => {
      const input = 'fontawesome6brands f09b GitHub';
      const ast = parse(input);
      const output = serialize(ast);

      expect(output).toBe('fontawesome6brands f09b GitHub');
    });

    it('should serialize fontawesome with quoted display name', () => {
      const input = 'fontawesome6solid f233 "Web Server" as Server';
      const ast = parse(input);
      const output = serialize(ast);

      expect(output).toBe('fontawesome6solid f233 "Web Server" as Server');
    });

    it('should serialize fontawesome with styling', () => {
      const input = 'fontawesome6solid f233 Server #blue';
      const ast = parse(input);
      const output = serialize(ast);

      expect(output).toBe('fontawesome6solid f233 Server #blue');
    });
  });

  describe('Round-trip', () => {
    it('should round-trip fontawesome6solid', () => {
      const input = 'fontawesome6solid f48e Server';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const p1 = ast1.find(n => n.type === 'participant');
      const p2 = ast2.find(n => n.type === 'participant');

      expect(p2.participantType).toBe(p1.participantType);
      expect(p2.iconCode).toBe(p1.iconCode);
      expect(p2.alias).toBe(p1.alias);
    });

    it('should round-trip fontawesome with quoted name', () => {
      const input = 'fontawesome6solid f233 "Web Server" as WS';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const p1 = ast1.find(n => n.type === 'participant');
      const p2 = ast2.find(n => n.type === 'participant');

      expect(p2.displayName).toBe(p1.displayName);
      expect(p2.alias).toBe(p1.alias);
      expect(p2.iconCode).toBe(p1.iconCode);
    });
  });

  describe('Rendering', () => {
    it('should render fontawesome6solid participant', () => {
      const input = `fontawesome6solid f48e Server
participant Client
Server->Client:msg`;
      const ast = parse(input);
      const svg = render(ast);

      // Check that the participant group is rendered
      const participants = svg.querySelectorAll('.participant');
      expect(participants.length).toBeGreaterThanOrEqual(1);
    });

    it('should render fontawesome6regular participant', () => {
      const input = `fontawesome6regular f004 Heart
participant Client
Heart->Client:msg`;
      const ast = parse(input);
      const svg = render(ast);

      const participants = svg.querySelectorAll('.participant');
      expect(participants.length).toBeGreaterThanOrEqual(1);
    });

    it('should render fontawesome6brands participant', () => {
      const input = `fontawesome6brands f09b GitHub
participant Client
GitHub->Client:msg`;
      const ast = parse(input);
      const svg = render(ast);

      const participants = svg.querySelectorAll('.participant');
      expect(participants.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Messages with fontawesome participants', () => {
    it('should parse messages between fontawesome participants', () => {
      const input = `fontawesome6solid f233 Server
fontawesome6solid f109 Client
Server->Client:request
Client->Server:response`;
      const ast = parse(input);

      const messages = ast.filter(n => n.type === 'message');
      expect(messages.length).toBe(2);
      expect(messages[0].from).toBe('Server');
      expect(messages[0].to).toBe('Client');
      expect(messages[1].from).toBe('Client');
      expect(messages[1].to).toBe('Server');
    });
  });
});
