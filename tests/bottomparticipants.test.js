// Tests for bottom participants

import { describe, it, expect } from 'vitest';
import { parse } from '../public/src/ast/parser.js';
import { serialize } from '../public/src/ast/serializer.js';
import { render } from '../public/src/rendering/renderer.js';

describe('Bottom Participants', () => {

  describe('Parsing bottomparticipants directive', () => {
    it('should parse bottomparticipants directive', () => {
      const ast = parse('bottomparticipants');
      const directive = ast.find(n => n.type === 'directive');
      expect(directive).toBeDefined();
      expect(directive.directiveType).toBe('bottomparticipants');
      expect(directive.value).toBe(true);
    });
  });

  describe('Serialization', () => {
    it('should serialize bottomparticipants directive', () => {
      const ast = parse('bottomparticipants');
      const output = serialize(ast);
      expect(output).toBe('bottomparticipants');
    });
  });

  describe('Rendering with bottomparticipants', () => {
    it('should render participants at top', () => {
      const input = `participant A
participant B
A->B:msg`;
      const ast = parse(input);
      const svg = render(ast);

      const participants = svg.querySelectorAll('#participants g');
      expect(participants.length).toBe(2);
    });

    it('should render additional participants at bottom when directive present', () => {
      const input = `bottomparticipants
participant A
participant B
A->B:msg`;
      const ast = parse(input);
      const svg = render(ast);

      // Should have 4 participant boxes (2 top + 2 bottom)
      const participants = svg.querySelectorAll('#participants g');
      expect(participants.length).toBe(4);
    });

    it('should add bottom-participant class to bottom participant elements', () => {
      const input = `bottomparticipants
participant A
A->A:msg`;
      const ast = parse(input);
      const svg = render(ast);

      const bottomParticipants = svg.querySelectorAll('.bottom-participant');
      expect(bottomParticipants.length).toBe(1);
    });

    it('should render lifelines that connect to bottom participants', () => {
      const input = `bottomparticipants
participant A
A->A:msg`;
      const ast = parse(input);
      const svg = render(ast);

      // Get lifeline and bottom participant Y positions
      const lifeline = svg.querySelector('.lifeline');
      const lifelineY2 = parseFloat(lifeline.getAttribute('y2'));

      // The lifeline should end above the bottom participant
      // This is a simple sanity check that the lifeline was rendered
      expect(lifelineY2).toBeGreaterThan(0);
    });

    it('should render lifelines that end above the bottom participant boxes', () => {
      const input = `bottomparticipants
participant A
A->A:msg`;

      const ast = parse(input);
      const svg = render(ast);

      // Get lifeline end Y position
      const lifeline = svg.querySelector('.lifeline');
      const lifelineY2 = parseFloat(lifeline.getAttribute('y2'));

      // Get bottom participant Y position
      const bottomParticipant = svg.querySelector('.bottom-participant rect');
      const bottomParticipantY = parseFloat(bottomParticipant.getAttribute('y'));

      // Lifeline should end above the bottom participant (with some margin)
      expect(lifelineY2).toBeLessThan(bottomParticipantY);
    });
  });

  describe('Round-trip', () => {
    it('should round-trip bottomparticipants directive', () => {
      const input = 'bottomparticipants';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const d1 = ast1.find(n => n.type === 'directive');
      const d2 = ast2.find(n => n.type === 'directive');

      expect(d2.directiveType).toBe(d1.directiveType);
      expect(d2.value).toBe(d1.value);
    });
  });

  describe('Integration', () => {
    it('should work with multiple participants', () => {
      const input = `bottomparticipants
participant A
participant B
participant C
A->B:first
B->C:second
C->A:third`;
      const ast = parse(input);
      const svg = render(ast);

      // Should have 6 participant boxes (3 top + 3 bottom)
      const participants = svg.querySelectorAll('#participants g');
      expect(participants.length).toBe(6);

      // Should have 3 messages
      const messages = svg.querySelectorAll('.message');
      expect(messages.length).toBe(3);
    });

    it('should work with participant groups', () => {
      const input = `bottomparticipants
participantgroup Internal
participant A
participant B
end
participant C
A->C:msg`;
      const ast = parse(input);
      const svg = render(ast);

      // Should have participant group rendered
      expect(svg.querySelector('.participant-group')).toBeDefined();

      // Should have 6 participant boxes (3 top + 3 bottom)
      const participants = svg.querySelectorAll('#participants g');
      expect(participants.length).toBe(6);
    });
  });
});
