import { describe, it, expect } from 'vitest';
import { parse } from '../public/src/ast/parser.js';
import { render } from '../public/src/rendering/renderer.js';
import { calculateLayout } from '../public/src/rendering/layout.js';

describe('Activation positioning with notes', () => {
  it('should start activation at message Y, not at note Y', () => {
    const input = `participant Customer
participant App
Customer->App: Proceed to checkout
activate App
note right of App: Validate cart
App-->Customer: Response
deactivate App`;

    const ast = parse(input);
    const { layout } = calculateLayout(ast);
    const svg = render(ast);

    // Find the first message
    const msg1 = ast.find(n => n.type === 'message' && n.label === 'Proceed to checkout');
    const msg1Layout = layout.get(msg1.id);

    // Find the note
    const note = ast.find(n => n.type === 'note');
    const noteLayout = layout.get(note.id);

    // Get the activation bar
    const activationBar = svg.querySelector('.activation-bar[data-participant="App"]');
    expect(activationBar).not.toBeNull();

    const barY = parseFloat(activationBar.getAttribute('y'));

    // The activation bar should start at the message Y, NOT at the note Y
    expect(barY).toBe(msg1Layout.y);
    expect(barY).not.toBe(noteLayout.y);
  });

  it('should end activation at deactivate message Y', () => {
    const input = `participant User
participant DB
User->DB: Connect
activate DB
DB-->User: Connection OK
deactivate DB`;

    const ast = parse(input);
    const { layout } = calculateLayout(ast);
    const svg = render(ast);

    // Find the second message (the one before deactivate)
    const msg2 = ast.find(n => n.type === 'message' && n.label === 'Connection OK');
    const msg2Layout = layout.get(msg2.id);

    // Get the activation bar
    const activationBar = svg.querySelector('.activation-bar[data-participant="DB"]');
    expect(activationBar).not.toBeNull();

    const barY = parseFloat(activationBar.getAttribute('y'));
    const barHeight = parseFloat(activationBar.getAttribute('height'));
    const barEndY = barY + barHeight;

    // The activation bar should end at the second message Y
    expect(barEndY).toBe(msg2Layout.y);
  });
});
