// Tests for arrow types (BACKLOG-120) and message delays (BACKLOG-121)

import { describe, it, expect } from 'vitest';
import { parse } from '../src/ast/parser.js';
import { serialize } from '../src/ast/serializer.js';
import { render } from '../src/rendering/renderer.js';

describe('Arrow Types (BACKLOG-120)', () => {

  describe('Parsing forward arrows', () => {
    it('should parse -> (synchronous)', () => {
      const ast = parse('participant A\nparticipant B\nA->B:msg');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.arrowType).toBe('->');
      expect(msg.from).toBe('A');
      expect(msg.to).toBe('B');
    });

    it('should parse ->> (asynchronous)', () => {
      const ast = parse('participant A\nparticipant B\nA->>B:msg');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.arrowType).toBe('->>');
    });

    it('should parse --> (return)', () => {
      const ast = parse('participant A\nparticipant B\nA-->B:msg');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.arrowType).toBe('-->');
    });

    it('should parse -->> (async return)', () => {
      const ast = parse('participant A\nparticipant B\nA-->>B:msg');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.arrowType).toBe('-->>');
    });
  });

  describe('Parsing reversed arrows', () => {
    it('should parse <- (reversed synchronous)', () => {
      const ast = parse('participant A\nparticipant B\nA<-B:msg');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.arrowType).toBe('<-');
      expect(msg.from).toBe('A');
      expect(msg.to).toBe('B');
    });

    it('should parse <-- (reversed return)', () => {
      const ast = parse('participant A\nparticipant B\nA<--B:msg');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.arrowType).toBe('<--');
    });

    it('should parse <->> (reversed async)', () => {
      const ast = parse('participant A\nparticipant B\nA<->>B:msg');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.arrowType).toBe('<->>');
    });

    it('should parse <-->> (reversed async return)', () => {
      const ast = parse('participant A\nparticipant B\nA<-->>B:msg');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.arrowType).toBe('<-->>');
    });
  });

  describe('Parsing bidirectional arrows', () => {
    it('should parse <-> (bidirectional)', () => {
      const ast = parse('participant A\nparticipant B\nA<->B:msg');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.arrowType).toBe('<->');
      expect(msg.from).toBe('A');
      expect(msg.to).toBe('B');
    });

    it('should parse <->> (bidirectional async)', () => {
      const ast = parse('participant A\nparticipant B\nA<->>B:msg');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.arrowType).toBe('<->>');
    });
  });

  describe('Parsing lost messages', () => {
    it('should parse -x (lost message)', () => {
      const ast = parse('participant A\nparticipant B\nA-xB:lost');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.arrowType).toBe('-x');
      expect(msg.from).toBe('A');
      expect(msg.to).toBe('B');
      expect(msg.label).toBe('lost');
    });

    it('should parse --x (dashed lost message)', () => {
      const ast = parse('participant A\nparticipant B\nA--xB:lost');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.arrowType).toBe('--x');
    });
  });

  describe('Serialization', () => {
    const arrowTypes = ['->', '->>', '-->', '-->>', '<-', '<--', '<->>', '<-->>'];

    for (const arrow of arrowTypes) {
      it(`should serialize ${arrow} correctly`, () => {
        const input = `participant A\nparticipant B\nA${arrow}B:msg`;
        const ast = parse(input);
        const output = serialize(ast);
        expect(output).toContain(`A${arrow}B:msg`);
      });
    }

    it('should serialize -x correctly', () => {
      const ast = parse('participant A\nparticipant B\nA-xB:lost');
      const output = serialize(ast);
      expect(output).toContain('A-xB:lost');
    });

    it('should serialize --x correctly', () => {
      const ast = parse('participant A\nparticipant B\nA--xB:lost');
      const output = serialize(ast);
      expect(output).toContain('A--xB:lost');
    });
  });

  describe('Rendering', () => {
    it('should render forward arrow with marker-end', () => {
      const ast = parse('participant A\nparticipant B\nA->B:msg');
      const svg = render(ast);
      const message = svg.querySelector('.message line');
      expect(message.getAttribute('marker-end')).toContain('arrowhead');
    });

    it('should render reversed arrow (arrow points opposite direction)', () => {
      const ast = parse('participant A\nparticipant B\nA<-B:msg');
      const svg = render(ast);
      const message = svg.querySelector('.message line');
      // Reversed arrows swap x1/x2 so the visual direction is B->A
      expect(message.getAttribute('marker-end')).toContain('arrowhead');
    });

    it('should render bidirectional arrow with markers on both ends', () => {
      const ast = parse('participant A\nparticipant B\nA<->B:msg');
      const svg = render(ast);
      const message = svg.querySelector('.message line');
      expect(message.getAttribute('marker-end')).toContain('arrowhead');
      expect(message.getAttribute('marker-start')).toContain('arrowhead');
    });

    it('should render lost message with X marker', () => {
      const ast = parse('participant A\nparticipant B\nA-xB:lost');
      const svg = render(ast);
      const message = svg.querySelector('.message line');
      expect(message.getAttribute('marker-end')).toContain('arrowhead-x');
    });

    it('should render dashed line for -- arrows', () => {
      const ast = parse('participant A\nparticipant B\nA-->B:return');
      const svg = render(ast);
      const message = svg.querySelector('.message line');
      expect(message.getAttribute('stroke-dasharray')).toBe('5,5');
    });

    it('should render dashed line for dashed lost message', () => {
      const ast = parse('participant A\nparticipant B\nA--xB:lost');
      const svg = render(ast);
      const message = svg.querySelector('.message line');
      expect(message.getAttribute('stroke-dasharray')).toBe('5,5');
    });

    it('should create all marker definitions in defs', () => {
      const ast = parse('participant A\nparticipant B\nA->B:msg');
      const svg = render(ast);
      const defs = svg.querySelector('defs');

      expect(defs.querySelector('#arrowhead-solid')).toBeDefined();
      expect(defs.querySelector('#arrowhead-open')).toBeDefined();
      expect(defs.querySelector('#arrowhead-solid-start')).toBeDefined();
      expect(defs.querySelector('#arrowhead-open-start')).toBeDefined();
      expect(defs.querySelector('#arrowhead-x')).toBeDefined();
    });
  });

  describe('Round-trip', () => {
    const testCases = [
      { arrow: '->', desc: 'synchronous' },
      { arrow: '->>', desc: 'asynchronous' },
      { arrow: '-->', desc: 'return' },
      { arrow: '-->>', desc: 'async return' },
      { arrow: '<-', desc: 'reversed' },
      { arrow: '<--', desc: 'reversed return' },
      { arrow: '<->>', desc: 'reversed async' },
      { arrow: '<-->>',  desc: 'reversed async return' },
      { arrow: '<->', desc: 'bidirectional' },
      { arrow: '-x', desc: 'lost' },
      { arrow: '--x', desc: 'dashed lost' },
    ];

    for (const { arrow, desc } of testCases) {
      it(`should round-trip ${desc} (${arrow})`, () => {
        const input = `participant A\nparticipant B\nA${arrow}B:test`;
        const ast1 = parse(input);
        const output = serialize(ast1);
        const ast2 = parse(output);

        const msg1 = ast1.find(n => n.type === 'message');
        const msg2 = ast2.find(n => n.type === 'message');

        expect(msg2.arrowType).toBe(msg1.arrowType);
        expect(msg2.from).toBe(msg1.from);
        expect(msg2.to).toBe(msg1.to);
        expect(msg2.label).toBe(msg1.label);
      });
    }
  });
});

describe('Message Styling (BACKLOG-123)', () => {

  describe('Parsing styled messages', () => {
    it('should parse message with color', () => {
      const ast = parse('participant A\nparticipant B\nA-[#red]>B:styled');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.style).toBeDefined();
      expect(msg.style.color).toBe('#red');
    });

    it('should parse message with width', () => {
      const ast = parse('participant A\nparticipant B\nA-[;3]>B:thick');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.style).toBeDefined();
      expect(msg.style.width).toBe(3);
    });

    it('should parse message with color and width', () => {
      const ast = parse('participant A\nparticipant B\nA-[#blue;4]>B:styled');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.style.color).toBe('#blue');
      expect(msg.style.width).toBe(4);
    });

    it('should parse message with named style', () => {
      const ast = parse('participant A\nparticipant B\nA-[##myStyle]>B:styled');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.style.styleName).toBe('myStyle');
    });

    it('should parse async styled message', () => {
      const ast = parse('participant A\nparticipant B\nA-[#green]>>B:async');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.arrowType).toBe('->>');
      expect(msg.style.color).toBe('#green');
    });

    it('should parse dashed styled message', () => {
      const ast = parse('participant A\nparticipant B\nA--[#yellow;2]>B:return');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.arrowType).toBe('-->');
      expect(msg.style.color).toBe('#yellow');
      expect(msg.style.width).toBe(2);
    });
  });

  describe('Serialization', () => {
    it('should serialize styled message with color', () => {
      const ast = parse('participant A\nparticipant B\nA-[#red]>B:test');
      const output = serialize(ast);
      expect(output).toContain('A-[#red]->B:test');
    });

    it('should serialize styled message with width', () => {
      const ast = parse('participant A\nparticipant B\nA-[;3]>B:test');
      const output = serialize(ast);
      expect(output).toContain('A-[;3]->B:test');
    });

    it('should serialize styled message with color and width', () => {
      const ast = parse('participant A\nparticipant B\nA-[#blue;4]>B:test');
      const output = serialize(ast);
      expect(output).toContain('A-[#blue;4]->B:test');
    });

    it('should serialize named style reference', () => {
      const ast = parse('participant A\nparticipant B\nA-[##myStyle]>B:test');
      const output = serialize(ast);
      expect(output).toContain('A-[##myStyle]->B:test');
    });
  });

  describe('Rendering', () => {
    it('should render message with custom color', () => {
      const ast = parse('participant A\nparticipant B\nA-[#red]>B:test');
      const svg = render(ast);
      const line = svg.querySelector('.message line');
      expect(line.getAttribute('stroke')).toBe('#red');
    });

    it('should render message with custom width', () => {
      const ast = parse('participant A\nparticipant B\nA-[;4]>B:test');
      const svg = render(ast);
      const line = svg.querySelector('.message line');
      expect(line.getAttribute('stroke-width')).toBe('4');
    });

    it('should render message with color and width', () => {
      const ast = parse('participant A\nparticipant B\nA-[#green;3]>B:test');
      const svg = render(ast);
      const line = svg.querySelector('.message line');
      expect(line.getAttribute('stroke')).toBe('#green');
      expect(line.getAttribute('stroke-width')).toBe('3');
    });
  });

  describe('Round-trip', () => {
    it('should round-trip styled message', () => {
      const input = 'participant A\nparticipant B\nA-[#red;3]>B:styled';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const msg1 = ast1.find(n => n.type === 'message');
      const msg2 = ast2.find(n => n.type === 'message');

      expect(msg2.style.color).toBe(msg1.style.color);
      expect(msg2.style.width).toBe(msg1.style.width);
    });
  });
});

describe('Boundary Messages (BACKLOG-122)', () => {

  describe('Parsing boundary messages', () => {
    it('should parse incoming from left [->A', () => {
      const ast = parse('participant A\n[->A:incoming');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.from).toBe('[');
      expect(msg.to).toBe('A');
      expect(msg.arrowType).toBe('->');
      expect(msg.label).toBe('incoming');
    });

    it('should parse outgoing to right A->]', () => {
      const ast = parse('participant A\nA->]:outgoing');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.from).toBe('A');
      expect(msg.to).toBe(']');
      expect(msg.label).toBe('outgoing');
    });

    it('should parse incoming with reversed arrow [<-A', () => {
      const ast = parse('participant A\n[<-A:reversed incoming');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.from).toBe('[');
      expect(msg.to).toBe('A');
      expect(msg.arrowType).toBe('<-');
    });

    it('should parse outgoing with reversed arrow A<-]', () => {
      const ast = parse('participant A\nA<-]:reversed outgoing');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.from).toBe('A');
      expect(msg.to).toBe(']');
      expect(msg.arrowType).toBe('<-');
    });

    it('should parse boundary with return arrow', () => {
      const ast = parse('participant A\n[-->A:dashed incoming');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.from).toBe('[');
      expect(msg.arrowType).toBe('-->');
    });
  });

  describe('Serialization', () => {
    it('should serialize [->A correctly', () => {
      const ast = parse('participant A\n[->A:incoming');
      const output = serialize(ast);
      expect(output).toContain('[->A:incoming');
    });

    it('should serialize A->] correctly', () => {
      const ast = parse('participant A\nA->]:outgoing');
      const output = serialize(ast);
      expect(output).toContain('A->]:outgoing');
    });
  });

  describe('Rendering', () => {
    it('should render incoming message from diagram edge', () => {
      const ast = parse('participant A\n[->A:incoming');
      const svg = render(ast);
      const line = svg.querySelector('.message line');
      // fromX should be less than toX (coming from left)
      const x1 = parseFloat(line.getAttribute('x1'));
      const x2 = parseFloat(line.getAttribute('x2'));
      expect(x1).toBeLessThan(x2);
    });

    it('should render outgoing message to diagram edge', () => {
      const ast = parse('participant A\nA->]:outgoing');
      const svg = render(ast);
      const line = svg.querySelector('.message line');
      // toX should be greater than fromX (going to right)
      const x1 = parseFloat(line.getAttribute('x1'));
      const x2 = parseFloat(line.getAttribute('x2'));
      expect(x2).toBeGreaterThan(x1);
    });
  });

  describe('Round-trip', () => {
    it('should round-trip [->A', () => {
      const input = 'participant A\n[->A:test';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const msg1 = ast1.find(n => n.type === 'message');
      const msg2 = ast2.find(n => n.type === 'message');

      expect(msg2.from).toBe(msg1.from);
      expect(msg2.to).toBe(msg1.to);
    });

    it('should round-trip A->]', () => {
      const input = 'participant A\nA->]:test';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const msg1 = ast1.find(n => n.type === 'message');
      const msg2 = ast2.find(n => n.type === 'message');

      expect(msg2.from).toBe(msg1.from);
      expect(msg2.to).toBe(msg1.to);
    });
  });
});

describe('Message Delays (BACKLOG-121)', () => {

  describe('Parsing delays', () => {
    it('should parse message with delay', () => {
      const ast = parse('participant A\nparticipant B\nA->(5)B:delayed');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.delay).toBe(5);
      expect(msg.from).toBe('A');
      expect(msg.to).toBe('B');
      expect(msg.label).toBe('delayed');
    });

    it('should parse message without delay as null', () => {
      const ast = parse('participant A\nparticipant B\nA->B:normal');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.delay).toBeNull();
    });

    it('should parse delay with different arrow types', () => {
      const ast = parse('participant A\nparticipant B\nA->>(3)B:async delayed');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.arrowType).toBe('->>');
      expect(msg.delay).toBe(3);
    });

    it('should parse delay with return arrow', () => {
      const ast = parse('participant A\nparticipant B\nA-->(2)B:return delayed');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.arrowType).toBe('-->');
      expect(msg.delay).toBe(2);
    });

    it('should parse large delay values', () => {
      const ast = parse('participant A\nparticipant B\nA->(10)B:big delay');
      const msg = ast.find(n => n.type === 'message');
      expect(msg.delay).toBe(10);
    });
  });

  describe('Serialization', () => {
    it('should serialize message with delay', () => {
      const ast = parse('participant A\nparticipant B\nA->(5)B:delayed');
      const output = serialize(ast);
      expect(output).toContain('A->(5)B:delayed');
    });

    it('should serialize message without delay (no parentheses)', () => {
      const ast = parse('participant A\nparticipant B\nA->B:normal');
      const output = serialize(ast);
      expect(output).toContain('A->B:normal');
      expect(output).not.toContain('()');
    });
  });

  describe('Rendering', () => {
    it('should render delayed message with sloped line', () => {
      const ast = parse('participant A\nparticipant B\nA->(3)B:delayed');
      const svg = render(ast);
      const line = svg.querySelector('.message line');

      // y1 and y2 should be different for sloped line
      const y1 = parseFloat(line.getAttribute('y1'));
      const y2 = parseFloat(line.getAttribute('y2'));
      expect(y2).toBeGreaterThan(y1);
    });

    it('should render non-delayed message with horizontal line', () => {
      const ast = parse('participant A\nparticipant B\nA->B:normal');
      const svg = render(ast);
      const line = svg.querySelector('.message line');

      const y1 = parseFloat(line.getAttribute('y1'));
      const y2 = parseFloat(line.getAttribute('y2'));
      expect(y2).toBe(y1);
    });
  });

  describe('Round-trip', () => {
    it('should round-trip message with delay', () => {
      const input = 'participant A\nparticipant B\nA->(5)B:delayed';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const msg1 = ast1.find(n => n.type === 'message');
      const msg2 = ast2.find(n => n.type === 'message');

      expect(msg2.delay).toBe(msg1.delay);
      expect(msg2.arrowType).toBe(msg1.arrowType);
      expect(msg2.label).toBe(msg1.label);
    });

    it('should round-trip message without delay', () => {
      const input = 'participant A\nparticipant B\nA->B:normal';
      const ast1 = parse(input);
      const output = serialize(ast1);
      const ast2 = parse(output);

      const msg1 = ast1.find(n => n.type === 'message');
      const msg2 = ast2.find(n => n.type === 'message');

      expect(msg2.delay).toBe(msg1.delay);
    });
  });
});
