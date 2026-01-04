// Renderer integration tests
// See DESIGN.md for SVG structure

import { describe, it, expect } from 'vitest';
import { render } from '../src/rendering/renderer.js';
import { parse } from '../src/ast/parser.js';

describe('Renderer', () => {
  describe('empty AST', () => {
    it('should return SVG element for empty AST', () => {
      const svg = render([]);
      expect(svg.tagName).toBe('svg');
      expect(svg.id).toBe('diagram');
    });

    it('should have participants group', () => {
      const svg = render([]);
      const participantsGroup = svg.querySelector('#participants');
      expect(participantsGroup).not.toBeNull();
    });
  });

  describe('participant rendering (BACKLOG-005)', () => {
    it('should render single participant with rect and text', () => {
      const ast = parse('participant Alice');
      const svg = render(ast);

      const participant = svg.querySelector('[data-node-id^="p_"]');
      expect(participant).not.toBeNull();
      expect(participant.classList.contains('participant')).toBe(true);

      const rect = participant.querySelector('rect');
      expect(rect).not.toBeNull();
      expect(rect.getAttribute('fill')).toBe('white');
      expect(rect.getAttribute('stroke')).toBe('black');

      const text = participant.querySelector('text');
      expect(text).not.toBeNull();
      expect(text.textContent).toBe('Alice');
    });

    it('should set data-node-id on participant group', () => {
      const ast = parse('participant Alice');
      const svg = render(ast);

      const participant = svg.querySelector('.participant');
      expect(participant.getAttribute('data-node-id')).toMatch(/^p_[a-z0-9]{8}$/);
    });

    it('should render multiple participants', () => {
      const ast = parse('participant Alice\nparticipant Bob');
      const svg = render(ast);

      const participants = svg.querySelectorAll('.participant');
      expect(participants).toHaveLength(2);

      const texts = svg.querySelectorAll('.participant text');
      expect(texts[0].textContent).toBe('Alice');
      expect(texts[1].textContent).toBe('Bob');
    });

    it('should position participants horizontally', () => {
      const ast = parse('participant Alice\nparticipant Bob');
      const svg = render(ast);

      const rects = svg.querySelectorAll('.participant rect');
      const x1 = parseInt(rects[0].getAttribute('x'));
      const x2 = parseInt(rects[1].getAttribute('x'));

      expect(x2).toBeGreaterThan(x1);
    });

    it('should set SVG dimensions based on participants', () => {
      const ast = parse('participant Alice\nparticipant Bob');
      const svg = render(ast);

      const width = parseInt(svg.getAttribute('width'));
      expect(width).toBeGreaterThan(200);
    });
  });

  describe('message rendering (BACKLOG-010)', () => {
    it('should render message with line and label', () => {
      const ast = parse('participant Alice\nparticipant Bob\nAlice->Bob:Hello');
      const svg = render(ast);

      const message = svg.querySelector('.message');
      expect(message).not.toBeNull();
      expect(message.getAttribute('data-node-id')).toMatch(/^m_[a-z0-9]{8}$/);

      const line = message.querySelector('line');
      expect(line).not.toBeNull();

      const text = message.querySelector('text');
      expect(text).not.toBeNull();
      expect(text.textContent).toBe('Hello');
    });

    it('should render message with arrow marker', () => {
      const ast = parse('participant Alice\nparticipant Bob\nAlice->Bob:Hello');
      const svg = render(ast);

      const line = svg.querySelector('.message line');
      expect(line.getAttribute('marker-end')).toContain('arrowhead');
    });

    it('should render multiple messages', () => {
      const ast = parse('participant Alice\nparticipant Bob\nAlice->Bob:Hello\nBob-->Alice:Hi');
      const svg = render(ast);

      const messages = svg.querySelectorAll('.message');
      expect(messages).toHaveLength(2);
    });

    it('should render dashed line for return messages', () => {
      const ast = parse('participant Alice\nparticipant Bob\nBob-->Alice:Response');
      const svg = render(ast);

      const line = svg.querySelector('.message line');
      expect(line.getAttribute('stroke-dasharray')).toBe('5,5');
    });

    it('should have defs with arrow markers', () => {
      const ast = parse('participant Alice\nparticipant Bob\nAlice->Bob:Hello');
      const svg = render(ast);

      const defs = svg.querySelector('defs');
      expect(defs).not.toBeNull();

      const solidMarker = svg.querySelector('#arrowhead-solid');
      expect(solidMarker).not.toBeNull();

      const openMarker = svg.querySelector('#arrowhead-open');
      expect(openMarker).not.toBeNull();
    });
  });

  describe('lifelines (BACKLOG-011)', () => {
    it('should render lifeline for each participant', () => {
      const ast = parse('participant Alice\nparticipant Bob');
      const svg = render(ast);

      const lifelines = svg.querySelectorAll('.lifeline');
      expect(lifelines).toHaveLength(2);
    });

    it('should have lifelines group before participants (for z-order)', () => {
      const ast = parse('participant Alice\nAlice->Alice:Self');
      const svg = render(ast);

      const groups = Array.from(svg.querySelectorAll('g[id]'));
      const lifelinesIndex = groups.findIndex(g => g.id === 'lifelines');
      const participantsIndex = groups.findIndex(g => g.id === 'participants');

      expect(lifelinesIndex).toBeLessThan(participantsIndex);
    });

    it('should have dashed stroke on lifelines', () => {
      const ast = parse('participant Alice');
      const svg = render(ast);

      const lifeline = svg.querySelector('.lifeline');
      expect(lifeline.getAttribute('stroke-dasharray')).toBe('5,5');
    });

    it('should set data-participant attribute', () => {
      const ast = parse('participant Alice');
      const svg = render(ast);

      const lifeline = svg.querySelector('.lifeline');
      expect(lifeline.getAttribute('data-participant')).toBe('Alice');
    });
  });

  describe('SVG dimensions (BACKLOG-013)', () => {
    it('should set viewBox with width and height matching SVG dimensions', () => {
      const ast = parse('participant Alice\nparticipant Bob\nAlice->Bob:Hello');
      const svg = render(ast);

      const width = svg.getAttribute('width');
      const height = svg.getAttribute('height');
      const viewBox = svg.getAttribute('viewBox');
      const [, , vbWidth, vbHeight] = viewBox.split(' ');

      expect(vbWidth).toBe(width);
      expect(vbHeight).toBe(height);
    });

    it('should increase height with more messages', () => {
      const ast1 = parse('participant Alice\nparticipant Bob\nAlice->Bob:One');
      const ast2 = parse('participant Alice\nparticipant Bob\nAlice->Bob:One\nBob->Alice:Two\nAlice->Bob:Three');

      const svg1 = render(ast1);
      const svg2 = render(ast2);

      const height1 = parseInt(svg1.getAttribute('height'));
      const height2 = parseInt(svg2.getAttribute('height'));

      expect(height2).toBeGreaterThan(height1);
    });

    it('should increase width with more participants', () => {
      const ast1 = parse('participant Alice\nparticipant Bob');
      const ast2 = parse('participant Alice\nparticipant Bob\nparticipant Carol\nparticipant Dave');

      const svg1 = render(ast1);
      const svg2 = render(ast2);

      const width1 = parseInt(svg1.getAttribute('width'));
      const width2 = parseInt(svg2.getAttribute('width'));

      expect(width2).toBeGreaterThan(width1);
    });
  });

  describe('participant styling (BACKLOG-015)', () => {
    it('should apply fill color to participant rect', () => {
      const ast = parse('participant Alice #lightblue');
      const svg = render(ast);

      const rect = svg.querySelector('.participant rect');
      // Named colors are resolved without the # prefix for SVG
      expect(rect.getAttribute('fill')).toBe('lightblue');
    });

    it('should apply border color to participant rect', () => {
      const ast = parse('participant Alice #white #red');
      const svg = render(ast);

      const rect = svg.querySelector('.participant rect');
      // Named colors are resolved without the # prefix for SVG
      expect(rect.getAttribute('stroke')).toBe('red');
    });

    it('should apply border width to participant rect', () => {
      const ast = parse('participant Alice #white #black;3');
      const svg = render(ast);

      const rect = svg.querySelector('.participant rect');
      expect(rect.getAttribute('stroke-width')).toBe('3');
    });

    it('should apply dashed border style', () => {
      const ast = parse('participant Alice #white #black;1;dashed');
      const svg = render(ast);

      const rect = svg.querySelector('.participant rect');
      expect(rect.getAttribute('stroke-dasharray')).toBe('5,5');
    });

    it('should use defaults when no styling specified', () => {
      const ast = parse('participant Alice');
      const svg = render(ast);

      const rect = svg.querySelector('.participant rect');
      expect(rect.getAttribute('fill')).toBe('white');
      expect(rect.getAttribute('stroke')).toBe('black');
      expect(rect.getAttribute('stroke-width')).toBe('1');
    });

    it('should handle zero border width', () => {
      const ast = parse('participant Alice #yellow ;0');
      const svg = render(ast);

      const rect = svg.querySelector('.participant rect');
      expect(rect.getAttribute('stroke-width')).toBe('0');
    });
  });

  describe('multiline participant names (BACKLOG-018)', () => {
    it('should render single line name as text content', () => {
      const ast = parse('participant Alice');
      const svg = render(ast);

      const text = svg.querySelector('.participant text');
      expect(text.textContent).toBe('Alice');
      expect(text.querySelectorAll('tspan')).toHaveLength(0);
    });

    it('should render multiline name with tspans', () => {
      const ast = parse('participant "Line1\\nLine2" as A');
      const svg = render(ast);

      const text = svg.querySelector('.participant text');
      const tspans = text.querySelectorAll('tspan');
      expect(tspans).toHaveLength(2);
      expect(tspans[0].textContent).toBe('Line1');
      expect(tspans[1].textContent).toBe('Line2');
    });

    it('should render three-line name with three tspans', () => {
      const ast = parse('participant "A\\nB\\nC" as ABC');
      const svg = render(ast);

      const tspans = svg.querySelectorAll('.participant text tspan');
      expect(tspans).toHaveLength(3);
      expect(tspans[0].textContent).toBe('A');
      expect(tspans[1].textContent).toBe('B');
      expect(tspans[2].textContent).toBe('C');
    });

    it('should center multiline text horizontally', () => {
      const ast = parse('participant "Web\\nServer" as WS');
      const svg = render(ast);

      const tspans = svg.querySelectorAll('.participant text tspan');
      // All tspans should have the same x (centered)
      const x1 = tspans[0].getAttribute('x');
      const x2 = tspans[1].getAttribute('x');
      expect(x1).toBe(x2);
    });
  });

  describe('actor rendering (BACKLOG-027)', () => {
    it('should render actor with stick figure elements', () => {
      const ast = parse('actor User');
      const svg = render(ast);

      const participant = svg.querySelector('.participant');
      expect(participant).not.toBeNull();

      // Should have circle (head)
      const circle = participant.querySelector('circle');
      expect(circle).not.toBeNull();

      // Should have lines (body, arms, legs)
      const lines = participant.querySelectorAll('line');
      expect(lines.length).toBeGreaterThanOrEqual(4);

      // Should have text label
      const text = participant.querySelector('text');
      expect(text).not.toBeNull();
      expect(text.textContent).toBe('User');
    });

    it('should render actor with styling', () => {
      const ast = parse('actor User #lightblue #red');
      const svg = render(ast);

      const circle = svg.querySelector('.participant circle');
      // Named colors are resolved without the # prefix for SVG
      expect(circle.getAttribute('fill')).toBe('lightblue');
      expect(circle.getAttribute('stroke')).toBe('red');
    });
  });

  describe('database rendering (BACKLOG-029)', () => {
    it('should render database with cylinder elements', () => {
      const ast = parse('database DB');
      const svg = render(ast);

      const participant = svg.querySelector('.participant');
      expect(participant).not.toBeNull();

      // Should have ellipse (top of cylinder)
      const ellipse = participant.querySelector('ellipse');
      expect(ellipse).not.toBeNull();

      // Should have path (bottom curve)
      const path = participant.querySelector('path');
      expect(path).not.toBeNull();

      // Should have text label
      const text = participant.querySelector('text');
      expect(text).not.toBeNull();
      expect(text.textContent).toBe('DB');
    });

    it('should render database with styling', () => {
      const ast = parse('database DB #yellow #blue');
      const svg = render(ast);

      // Get all ellipses - there's a bottom fill ellipse and a top styled ellipse
      const ellipses = svg.querySelectorAll('.participant ellipse');
      // The top ellipse (last one) should have the stroke
      const topEllipse = ellipses[ellipses.length - 1];
      // Named colors are resolved without the # prefix for SVG
      expect(topEllipse.getAttribute('fill')).toBe('yellow');
      expect(topEllipse.getAttribute('stroke')).toBe('blue');
    });

    it('should render database with dashed border style', () => {
      const ast = parse('database DB #white #black;2;dashed');
      const svg = render(ast);

      // Check that the top ellipse has dashed stroke
      const ellipses = svg.querySelectorAll('.participant ellipse');
      const topEllipse = ellipses[ellipses.length - 1];
      expect(topEllipse.getAttribute('stroke-dasharray')).toBe('5,5');

      // Check that edge lines also have dashed stroke
      const lines = svg.querySelectorAll('.participant line');
      expect(lines.length).toBeGreaterThan(0);
      expect(lines[0].getAttribute('stroke-dasharray')).toBe('5,5');
    });

    it('should render database with label below icon', () => {
      const ast = parse('database MyDB');
      const svg = render(ast);

      const participant = svg.querySelector('.participant');
      const text = participant.querySelector('text');
      const topEllipse = participant.querySelectorAll('ellipse')[1]; // top ellipse

      // Label Y should be below the database icon
      const textY = parseFloat(text.getAttribute('y'));
      const ellipseY = parseFloat(topEllipse.getAttribute('cy'));
      expect(textY).toBeGreaterThan(ellipseY);
    });

    it('should render compact database icon', () => {
      const ast = parse('database DB');
      const svg = render(ast);

      const topEllipse = svg.querySelectorAll('.participant ellipse')[1];
      const rx = parseFloat(topEllipse.getAttribute('rx'));
      // Database should be compact (rx = 20, not 50 which was half of 100px width)
      expect(rx).toBeLessThanOrEqual(25);
    });
  });

  describe('unknown participant errors (BUG-032)', () => {
    it('should render error indicator for unknown source participant', () => {
      const ast = parse('participant Alice\nUnknown->Alice:Hello');
      const svg = render(ast);

      // Should have message-error class
      const errorMessage = svg.querySelector('.message-error');
      expect(errorMessage).not.toBeNull();

      // Should contain error text mentioning the unknown participant
      const text = errorMessage.querySelector('text');
      expect(text).not.toBeNull();
      expect(text.textContent).toContain('Unknown');
    });

    it('should render error indicator for unknown target participant', () => {
      const ast = parse('participant Alice\nAlice->Unknown:Hello');
      const svg = render(ast);

      const errorMessage = svg.querySelector('.message-error');
      expect(errorMessage).not.toBeNull();

      const text = errorMessage.querySelector('text');
      expect(text.textContent).toContain('Unknown');
    });

    it('should render error indicator for both unknown participants', () => {
      const ast = parse('participant Alice\nUnknownA->UnknownB:Hello');
      const svg = render(ast);

      const errorMessage = svg.querySelector('.message-error');
      expect(errorMessage).not.toBeNull();

      const text = errorMessage.querySelector('text');
      expect(text.textContent).toContain('UnknownA');
      expect(text.textContent).toContain('UnknownB');
    });

    it('should render normal message when participants exist', () => {
      const ast = parse('participant Alice\nparticipant Bob\nAlice->Bob:Hello');
      const svg = render(ast);

      // Should not have message-error class
      const errorMessage = svg.querySelector('.message-error');
      expect(errorMessage).toBeNull();

      // Should have normal message
      const message = svg.querySelector('.message');
      expect(message).not.toBeNull();
    });
  });

  describe('fragment rendering (BACKLOG-033)', () => {
    it('should render fragment with box and label', () => {
      const ast = parse('participant Alice\nparticipant Bob\nalt success\nAlice->Bob:OK\nend');
      const svg = render(ast);

      const fragment = svg.querySelector('.fragment');
      expect(fragment).not.toBeNull();
      expect(fragment.getAttribute('data-node-id')).toMatch(/^f_[a-z0-9]{8}$/);

      // Should have main box
      const box = fragment.querySelector('.fragment-box');
      expect(box).not.toBeNull();

      // Should have label box
      const labelBox = fragment.querySelector('.fragment-label-box');
      expect(labelBox).not.toBeNull();

      // Should have fragment type label
      const label = fragment.querySelector('.fragment-label');
      expect(label).not.toBeNull();
      expect(label.textContent).toBe('alt');
    });

    it('should render fragment condition', () => {
      const ast = parse('participant Alice\nparticipant Bob\nalt my condition\nAlice->Bob:OK\nend');
      const svg = render(ast);

      const condition = svg.querySelector('.fragment-condition');
      expect(condition).not.toBeNull();
      expect(condition.textContent).toBe('[my condition]');
    });

    it('should render else clause divider', () => {
      const ast = parse('participant Alice\nparticipant Bob\nalt success\nAlice->Bob:OK\nelse failure\nAlice->Bob:Error\nend');
      const svg = render(ast);

      const divider = svg.querySelector('.fragment-divider');
      expect(divider).not.toBeNull();

      const elseLabel = svg.querySelector('.fragment-else-label');
      expect(elseLabel).not.toBeNull();
      expect(elseLabel.textContent).toContain('else');
    });

    it('should render loop fragment', () => {
      const ast = parse('participant Alice\nparticipant Bob\nloop 10 times\nAlice->Bob:Ping\nend');
      const svg = render(ast);

      const label = svg.querySelector('.fragment-label');
      expect(label.textContent).toBe('loop');

      const condition = svg.querySelector('.fragment-condition');
      expect(condition.textContent).toBe('[10 times]');
    });

    it('should have fragments group before lifelines (for z-order)', () => {
      const ast = parse('participant Alice\nparticipant Bob\nalt test\nAlice->Bob:Hi\nend');
      const svg = render(ast);

      const groups = Array.from(svg.querySelectorAll('g[id]'));
      const fragmentsIndex = groups.findIndex(g => g.id === 'fragments');
      const lifelinesIndex = groups.findIndex(g => g.id === 'lifelines');

      expect(fragmentsIndex).toBeLessThan(lifelinesIndex);
    });
  });

  describe('blank line layout (BACKLOG-041)', () => {
    it('should NOT add extra spacing for blank lines (BUG-010)', () => {
      // Without blank line
      const ast1 = parse('participant Alice\nparticipant Bob\nAlice->Bob:First\nBob-->Alice:Second');
      const svg1 = render(ast1);
      const messages1 = svg1.querySelectorAll('.message');
      const y1First = parseFloat(messages1[0].querySelector('line').getAttribute('y1'));
      const y1Second = parseFloat(messages1[1].querySelector('line').getAttribute('y1'));
      const spacing1 = y1Second - y1First;

      // With blank line
      const ast2 = parse('participant Alice\nparticipant Bob\nAlice->Bob:First\n\nBob-->Alice:Second');
      const svg2 = render(ast2);
      const messages2 = svg2.querySelectorAll('.message');
      const y2First = parseFloat(messages2[0].querySelector('line').getAttribute('y1'));
      const y2Second = parseFloat(messages2[1].querySelector('line').getAttribute('y1'));
      const spacing2 = y2Second - y2First;

      // Blank lines should NOT affect spacing (use 'space' directive for that)
      expect(spacing2).toBe(spacing1);
    });

    it('should NOT add spacing for blank lines inside fragments (BUG-010)', () => {
      // Without blank line
      const ast1 = parse('participant Alice\nparticipant Bob\nalt test\nAlice->Bob:First\nBob-->Alice:Second\nend');
      const svg1 = render(ast1);
      const fragment1 = svg1.querySelector('.fragment-box');
      const height1 = parseFloat(fragment1.getAttribute('height'));

      // With blank line
      const ast2 = parse('participant Alice\nparticipant Bob\nalt test\nAlice->Bob:First\n\nBob-->Alice:Second\nend');
      const svg2 = render(ast2);
      const fragment2 = svg2.querySelector('.fragment-box');
      const height2 = parseFloat(fragment2.getAttribute('height'));

      // Blank lines should NOT affect fragment height (use 'space' directive for that)
      expect(height2).toBe(height1);
    });
  });

  describe('title rendering (BACKLOG-043)', () => {
    it('should render title text', () => {
      const ast = parse('title My Diagram\nparticipant Alice');
      const svg = render(ast);

      const title = svg.querySelector('.diagram-title');
      expect(title).not.toBeNull();
      expect(title.textContent).toBe('My Diagram');
    });

    it('should set data-node-id on title', () => {
      const ast = parse('title Test\nparticipant Alice');
      const svg = render(ast);

      const title = svg.querySelector('.diagram-title');
      expect(title.getAttribute('data-node-id')).toMatch(/^d_[a-z0-9]{8}$/);
    });

    it('should center title horizontally', () => {
      const ast = parse('title Centered\nparticipant Alice');
      const svg = render(ast);

      const title = svg.querySelector('.diagram-title');
      expect(title.getAttribute('text-anchor')).toBe('middle');
    });

    it('should have title group in SVG', () => {
      const ast = parse('title Test\nparticipant Alice');
      const svg = render(ast);

      const titleGroup = svg.querySelector('#title');
      expect(titleGroup).not.toBeNull();
    });

    it('should push participants down when title present', () => {
      // Without title
      const ast1 = parse('participant Alice');
      const svg1 = render(ast1);
      const rect1 = svg1.querySelector('.participant rect');
      const y1 = parseFloat(rect1.getAttribute('y'));

      // With title
      const ast2 = parse('title Test\nparticipant Alice');
      const svg2 = render(ast2);
      const rect2 = svg2.querySelector('.participant rect');
      const y2 = parseFloat(rect2.getAttribute('y'));

      // With title should be lower
      expect(y2).toBeGreaterThan(y1);
    });
  });

  describe('error rendering (BACKLOG-049)', () => {
    it('should render error box for parse errors', () => {
      const ast = parse('participant Alice\ninvalid syntax here\nAlice->Alice:Test');
      const svg = render(ast);

      const errorBox = svg.querySelector('.error-box');
      expect(errorBox).not.toBeNull();
      expect(errorBox.getAttribute('stroke')).toBe('#c00');
      expect(errorBox.getAttribute('fill')).toBe('#fee');
    });

    it('should render warning icon', () => {
      const ast = parse('invalid syntax');
      const svg = render(ast);

      const icon = svg.querySelector('.error-icon');
      expect(icon).not.toBeNull();
      expect(icon.textContent).toBe('⚠');
    });

    it('should render error message', () => {
      const ast = parse('invalid syntax');
      const svg = render(ast);

      const message = svg.querySelector('.error-message');
      expect(message).not.toBeNull();
      expect(message.textContent).toContain('Unrecognized syntax');
    });

    it('should set data-node-id on error group', () => {
      const ast = parse('invalid syntax');
      const svg = render(ast);

      const errorGroup = svg.querySelector('.error');
      expect(errorGroup.getAttribute('data-node-id')).toMatch(/^e_[a-z0-9]{8}$/);
    });

    it('should have errors group in SVG', () => {
      const ast = parse('invalid syntax');
      const svg = render(ast);

      const errorsGroup = svg.querySelector('#errors');
      expect(errorsGroup).not.toBeNull();
    });

    it('should render multiple errors', () => {
      const ast = parse('invalid1\ninvalid2');
      const svg = render(ast);

      const errors = svg.querySelectorAll('.error');
      expect(errors.length).toBe(2);
    });
  });

  // TODO(Phase1): Add renderer tests as features are implemented
});
