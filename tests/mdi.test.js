// Tests for Material Design Icons participant types (BACKLOG-118)

import { describe, it, expect } from 'vitest';
import { parse } from '../src/ast/parser.js';
import { serialize } from '../src/ast/serializer.js';
import { render } from '../src/rendering/renderer.js';

describe('Material Design Icons Participant Types (BACKLOG-118)', () => {

  describe('Parsing', () => {
    it('should parse materialdesignicons participant with hex code', () => {
      const ast = parse('materialdesignicons F01C9 Testing');
      const participant = ast.find(n => n.type === 'participant');

      expect(participant).toBeDefined();
      expect(participant.participantType).toBe('materialdesignicons');
      expect(participant.iconCode).toBe('F01C9');
      expect(participant.alias).toBe('Testing');
      expect(participant.displayName).toBe('Testing');
    });

    it('should parse materialdesignicons participant with lowercase hex code', () => {
      const ast = parse('materialdesignicons f01c9 Testing');
      const participant = ast.find(n => n.type === 'participant');

      expect(participant).toBeDefined();
      expect(participant.participantType).toBe('materialdesignicons');
      expect(participant.iconCode).toBe('f01c9');
    });

    it('should parse materialdesignicons with quoted display name and alias', () => {
      const ast = parse('materialdesignicons F0544 "Database Server" as DB');
      const participant = ast.find(n => n.type === 'participant');

      expect(participant).toBeDefined();
      expect(participant.participantType).toBe('materialdesignicons');
      expect(participant.iconCode).toBe('F0544');
      expect(participant.displayName).toBe('Database Server');
      expect(participant.alias).toBe('DB');
    });

    it('should parse mdi with styling', () => {
      const ast = parse('materialdesignicons F0544 Database #blue');
      const participant = ast.find(n => n.type === 'participant');

      expect(participant).toBeDefined();
      expect(participant.participantType).toBe('materialdesignicons');
      expect(participant.iconCode).toBe('F0544');
      expect(participant.style.fill).toBe('#blue');
    });

    it('should parse mdi with quoted name and styling', () => {
      const ast = parse('materialdesignicons F0544 "My DB" as DB #red');
      const participant = ast.find(n => n.type === 'participant');

      expect(participant).toBeDefined();
      expect(participant.displayName).toBe('My DB');
      expect(participant.alias).toBe('DB');
      expect(participant.style.fill).toBe('#red');
    });
  });

  describe('Serialization', () => {
    it('should serialize mdi participant', () => {
      const input = 'materialdesignicons F01C9 Testing';
      const ast = parse(input);
      const output = serialize(ast);

      expect(output).toBe('materialdesignicons F01C9 Testing');
    });

    it('should serialize mdi with quoted display name', () => {
      const input = 'materialdesignicons F0544 "Database Server" as DB';
      const ast = parse(input);
      const output = serialize(ast);

      expect(output).toBe('materialdesignicons F0544 "Database Server" as DB');
    });

    it('should serialize mdi with styling', () => {
      const input = 'materialdesignicons F0544 Database #blue';
      const ast = parse(input);
      const output = serialize(ast);

      expect(output).toBe('materialdesignicons F0544 Database #blue');
    });
  });

  describe('Round-trip', () => {
    it('should round-trip mdi participant', () => {
      const input = 'materialdesignicons F01C9 Testing';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const p1 = ast1.find(n => n.type === 'participant');
      const p2 = ast2.find(n => n.type === 'participant');

      expect(p2.participantType).toBe(p1.participantType);
      expect(p2.iconCode).toBe(p1.iconCode);
      expect(p2.alias).toBe(p1.alias);
    });

    it('should round-trip mdi with quoted name', () => {
      const input = 'materialdesignicons F0544 "Database Server" as DB';
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
    it('should render mdi participant', () => {
      const input = `materialdesignicons F01C9 Testing
participant Client
Testing->Client:msg`;
      const ast = parse(input);
      const svg = render(ast);

      // Check that the participant group is rendered
      const participants = svg.querySelectorAll('.participant');
      expect(participants.length).toBeGreaterThanOrEqual(1);
    });

    it('should render mdi participant with styling', () => {
      const input = `materialdesignicons F0544 Database #blue
participant Client
Database->Client:query`;
      const ast = parse(input);
      const svg = render(ast);

      const participants = svg.querySelectorAll('.participant');
      expect(participants.length).toBeGreaterThanOrEqual(1);
    });

    it('should render mdi icon with correct font-family', () => {
      const input = `materialdesignicons F01C9 Testing
Testing->Testing:msg`;
      const ast = parse(input);
      const svg = render(ast);

      // Find the icon text element with MDI font (uses SVG-specific font name)
      const textElements = svg.querySelectorAll('.participant text');
      const mdiText = Array.from(textElements).find(
        t => t.getAttribute('font-family') === 'MDI-SVG'
      );
      expect(mdiText).toBeDefined();
      // Verify the icon character is set (F01C9 = \uDB40\uDDC9 in UTF-16)
      expect(mdiText.textContent.length).toBeGreaterThan(0);
    });

    it('should normalize 4-char codepoint starting with F', () => {
      // F1FF should become F01FF (escalator icon)
      const input = `materialdesignicons F1FF Escalator
Escalator->Escalator:msg`;
      const ast = parse(input);
      const svg = render(ast);

      const textElements = svg.querySelectorAll('.participant text');
      const mdiText = Array.from(textElements).find(
        t => t.getAttribute('font-family') === 'MDI-SVG'
      );
      expect(mdiText).toBeDefined();
      // F01FF = 983551 in decimal, which is \uDB40\uDDFF in UTF-16
      const expectedChar = String.fromCodePoint(0xF01FF);
      expect(mdiText.textContent).toBe(expectedChar);
    });
  });

  describe('Messages with mdi participants', () => {
    it('should parse messages between mdi participants', () => {
      const input = `materialdesignicons F0544 Database
materialdesignicons F109 Client
Database->Client:data
Client->Database:query`;
      const ast = parse(input);

      const messages = ast.filter(n => n.type === 'message');
      expect(messages.length).toBe(2);
      expect(messages[0].from).toBe('Database');
      expect(messages[0].to).toBe('Client');
      expect(messages[1].from).toBe('Client');
      expect(messages[1].to).toBe('Database');
    });

    it('should work with mixed participant types', () => {
      const input = `participant User
materialdesignicons F0544 Database
fontawesome6solid f233 Server
User->Server:request
Server->Database:query
Database->Server:result
Server->User:response`;
      const ast = parse(input);

      const participants = ast.filter(n => n.type === 'participant');
      expect(participants.length).toBe(3);

      const messages = ast.filter(n => n.type === 'message');
      expect(messages.length).toBe(4);
    });
  });
});
