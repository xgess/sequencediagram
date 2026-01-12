// Tests for Command pattern implementation (BACKLOG-066, BACKLOG-067, BACKLOG-071, BACKLOG-074, BACKLOG-075)

import { describe, it, expect, beforeEach } from 'vitest';
import { Command, CommandHistory } from '../public/src/commands/Command.js';
import { ReplaceASTCommand } from '../public/src/commands/ReplaceASTCommand.js';
import { RemoveNodeCommand } from '../public/src/commands/RemoveNodeCommand.js';
import { ReorderNodeCommand } from '../public/src/commands/ReorderNodeCommand.js';
import { MoveMessageTargetCommand } from '../public/src/commands/MoveMessageTargetCommand.js';
import { MoveMessageSourceCommand } from '../public/src/commands/MoveMessageSourceCommand.js';
import { EditMessageLabelCommand } from '../public/src/commands/EditMessageLabelCommand.js';
import { AddMessageCommand } from '../public/src/commands/AddMessageCommand.js';
import { ReorderParticipantCommand } from '../public/src/commands/ReorderParticipantCommand.js';
import { EditParticipantCommand } from '../public/src/commands/EditParticipantCommand.js';
import { AdjustFragmentBoundaryCommand } from '../public/src/commands/AdjustFragmentBoundaryCommand.js';
import { MoveEntryBetweenClausesCommand } from '../public/src/commands/MoveEntryBetweenClausesCommand.js';
import { EditFragmentConditionCommand } from '../public/src/commands/EditFragmentConditionCommand.js';
import { EditElseConditionCommand } from '../public/src/commands/EditElseConditionCommand.js';
import { ChangeEntrySpacingCommand } from '../public/src/commands/ChangeEntrySpacingCommand.js';
import { AddParticipantCommand } from '../public/src/commands/AddParticipantCommand.js';
import { AddFragmentCommand } from '../public/src/commands/AddFragmentCommand.js';
import { EditNoteTextCommand } from '../public/src/commands/EditNoteTextCommand.js';
import { ToggleExpandableCommand } from '../public/src/commands/ToggleExpandableCommand.js';
import { MoveNoteToParticipantCommand } from '../public/src/commands/MoveNoteToParticipantCommand.js';

// Test command that adds an item to AST
class AddItemCommand extends Command {
  constructor(item) {
    super(`Add item: ${item.id}`);
    this.item = item;
  }

  do(ast) {
    return [...ast, this.item];
  }

  undo(ast) {
    return ast.filter(node => node.id !== this.item.id);
  }
}

// Test command that removes an item from AST
class RemoveItemCommand extends Command {
  constructor(itemId) {
    super(`Remove item: ${itemId}`);
    this.itemId = itemId;
    this.removedItem = null;
    this.removedIndex = -1;
  }

  do(ast) {
    this.removedIndex = ast.findIndex(node => node.id === this.itemId);
    if (this.removedIndex === -1) return ast;
    this.removedItem = ast[this.removedIndex];
    return ast.filter(node => node.id !== this.itemId);
  }

  undo(ast) {
    if (!this.removedItem) return ast;
    const result = [...ast];
    result.splice(this.removedIndex, 0, this.removedItem);
    return result;
  }
}

// Test command that modifies an item
class ModifyItemCommand extends Command {
  constructor(itemId, property, newValue) {
    super(`Modify ${property} of ${itemId}`);
    this.itemId = itemId;
    this.property = property;
    this.newValue = newValue;
    this.oldValue = null;
  }

  do(ast) {
    return ast.map(node => {
      if (node.id === this.itemId) {
        this.oldValue = node[this.property];
        return { ...node, [this.property]: this.newValue };
      }
      return node;
    });
  }

  undo(ast) {
    return ast.map(node => {
      if (node.id === this.itemId) {
        return { ...node, [this.property]: this.oldValue };
      }
      return node;
    });
  }
}

describe('Command Base Class (BACKLOG-066)', () => {
  it('should throw if do() not implemented', () => {
    const cmd = new Command('test');
    expect(() => cmd.do([])).toThrow('must be implemented');
  });

  it('should throw if undo() not implemented', () => {
    const cmd = new Command('test');
    expect(() => cmd.undo([])).toThrow('must be implemented');
  });

  it('should store description', () => {
    const cmd = new Command('Test description');
    expect(cmd.description).toBe('Test description');
  });
});

describe('CommandHistory (BACKLOG-066)', () => {
  let history;
  let initialAst;

  beforeEach(() => {
    history = new CommandHistory();
    initialAst = [
      { id: 'p_1', type: 'participant', alias: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob' }
    ];
  });

  describe('basic operations', () => {
    it('should initialize with empty stacks', () => {
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
    });

    it('should execute command and add to undo stack', () => {
      const newItem = { id: 'p_3', type: 'participant', alias: 'Charlie' };
      const cmd = new AddItemCommand(newItem);

      const newAst = history.execute(cmd, initialAst);

      expect(newAst).toHaveLength(3);
      expect(newAst[2].alias).toBe('Charlie');
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });

    it('should undo command', () => {
      const newItem = { id: 'p_3', type: 'participant', alias: 'Charlie' };
      const cmd = new AddItemCommand(newItem);

      let ast = history.execute(cmd, initialAst);
      expect(ast).toHaveLength(3);

      ast = history.undo(ast);
      expect(ast).toHaveLength(2);
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(true);
    });

    it('should redo undone command', () => {
      const newItem = { id: 'p_3', type: 'participant', alias: 'Charlie' };
      const cmd = new AddItemCommand(newItem);

      let ast = history.execute(cmd, initialAst);
      ast = history.undo(ast);
      expect(ast).toHaveLength(2);

      ast = history.redo(ast);
      expect(ast).toHaveLength(3);
      expect(ast[2].alias).toBe('Charlie');
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });
  });

  describe('redo stack clearing', () => {
    it('should clear redo stack when new command executed', () => {
      const item1 = { id: 'p_3', type: 'participant', alias: 'Charlie' };
      const item2 = { id: 'p_4', type: 'participant', alias: 'David' };

      let ast = history.execute(new AddItemCommand(item1), initialAst);
      ast = history.undo(ast);
      expect(history.canRedo()).toBe(true);

      ast = history.execute(new AddItemCommand(item2), ast);
      expect(history.canRedo()).toBe(false);
    });
  });

  describe('multiple commands', () => {
    it('should handle multiple execute/undo/redo', () => {
      const item1 = { id: 'p_3', type: 'participant', alias: 'Charlie' };
      const item2 = { id: 'p_4', type: 'participant', alias: 'David' };

      let ast = history.execute(new AddItemCommand(item1), initialAst);
      ast = history.execute(new AddItemCommand(item2), ast);

      expect(ast).toHaveLength(4);
      expect(history.getInfo().undoCount).toBe(2);

      ast = history.undo(ast);
      expect(ast).toHaveLength(3);

      ast = history.undo(ast);
      expect(ast).toHaveLength(2);

      ast = history.redo(ast);
      expect(ast).toHaveLength(3);

      ast = history.redo(ast);
      expect(ast).toHaveLength(4);
    });
  });

  describe('history cap at 100 levels', () => {
    it('should enforce maximum history size', () => {
      const smallHistory = new CommandHistory(5);
      let ast = [];

      for (let i = 0; i < 10; i++) {
        const item = { id: `item_${i}`, type: 'test' };
        ast = smallHistory.execute(new AddItemCommand(item), ast);
      }

      expect(smallHistory.getInfo().undoCount).toBe(5);
    });

    it('should remove oldest command when limit exceeded', () => {
      const smallHistory = new CommandHistory(3);
      let ast = [];

      for (let i = 0; i < 5; i++) {
        const item = { id: `item_${i}`, type: 'test' };
        ast = smallHistory.execute(new AddItemCommand(item), ast);
      }

      // Should have items 0-4 in AST but only commands 2,3,4 in history
      expect(ast).toHaveLength(5);
      expect(smallHistory.getInfo().undoCount).toBe(3);

      // Undo should only go back 3 levels
      ast = smallHistory.undo(ast);
      ast = smallHistory.undo(ast);
      ast = smallHistory.undo(ast);
      ast = smallHistory.undo(ast); // Should have no effect

      expect(ast).toHaveLength(2); // Only removed 3 items
    });

    it('should default to 100 max size', () => {
      const defaultHistory = new CommandHistory();
      expect(defaultHistory.maxSize).toBe(100);
    });
  });

  describe('info and descriptions', () => {
    it('should provide accurate history info', () => {
      const item = { id: 'p_3', type: 'participant', alias: 'Charlie' };
      let ast = history.execute(new AddItemCommand(item), initialAst);

      const info = history.getInfo();
      expect(info.undoCount).toBe(1);
      expect(info.redoCount).toBe(0);
      expect(info.canUndo).toBe(true);
      expect(info.canRedo).toBe(false);
    });

    it('should return command descriptions', () => {
      const item = { id: 'p_3', type: 'participant', alias: 'Charlie' };
      let ast = history.execute(new AddItemCommand(item), initialAst);

      expect(history.getLastUndoDescription()).toBe('Add item: p_3');
      expect(history.getLastRedoDescription()).toBeNull();

      ast = history.undo(ast);

      expect(history.getLastUndoDescription()).toBeNull();
      expect(history.getLastRedoDescription()).toBe('Add item: p_3');
    });
  });

  describe('clear history', () => {
    it('should clear all history', () => {
      const item = { id: 'p_3', type: 'participant', alias: 'Charlie' };
      let ast = history.execute(new AddItemCommand(item), initialAst);
      history.undo(ast);

      history.clear();

      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
      expect(history.getInfo().undoCount).toBe(0);
      expect(history.getInfo().redoCount).toBe(0);
    });
  });

  describe('no-op when stacks empty', () => {
    it('should return same AST when undo stack empty', () => {
      const result = history.undo(initialAst);
      expect(result).toBe(initialAst);
    });

    it('should return same AST when redo stack empty', () => {
      const result = history.redo(initialAst);
      expect(result).toBe(initialAst);
    });
  });
});

describe('Example Commands', () => {
  let history;
  let initialAst;

  beforeEach(() => {
    history = new CommandHistory();
    initialAst = [
      { id: 'p_1', type: 'participant', alias: 'Alice', displayName: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob', displayName: 'Bob' },
      { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' }
    ];
  });

  describe('AddItemCommand', () => {
    it('should add item with do() and remove with undo()', () => {
      const newItem = { id: 'p_3', type: 'participant', alias: 'Charlie' };
      const cmd = new AddItemCommand(newItem);

      const afterDo = cmd.do(initialAst);
      expect(afterDo).toHaveLength(4);
      expect(afterDo.find(n => n.id === 'p_3')).toBeDefined();

      const afterUndo = cmd.undo(afterDo);
      expect(afterUndo).toHaveLength(3);
      expect(afterUndo.find(n => n.id === 'p_3')).toBeUndefined();
    });
  });

  describe('RemoveItemCommand', () => {
    it('should remove item with do() and restore with undo()', () => {
      const cmd = new RemoveItemCommand('p_2');

      const afterDo = cmd.do(initialAst);
      expect(afterDo).toHaveLength(2);
      expect(afterDo.find(n => n.id === 'p_2')).toBeUndefined();

      const afterUndo = cmd.undo(afterDo);
      expect(afterUndo).toHaveLength(3);
      expect(afterUndo.find(n => n.id === 'p_2')).toBeDefined();
    });

    it('should restore item at original index', () => {
      const cmd = new RemoveItemCommand('p_2');

      const afterDo = cmd.do(initialAst);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo[1].id).toBe('p_2');
    });
  });

  describe('ModifyItemCommand', () => {
    it('should modify property with do() and restore with undo()', () => {
      const cmd = new ModifyItemCommand('m_1', 'label', 'Goodbye');

      const afterDo = cmd.do(initialAst);
      const message = afterDo.find(n => n.id === 'm_1');
      expect(message.label).toBe('Goodbye');

      const afterUndo = cmd.undo(afterDo);
      const restoredMessage = afterUndo.find(n => n.id === 'm_1');
      expect(restoredMessage.label).toBe('Hello');
    });
  });

  describe('complex command sequences', () => {
    it('should handle interleaved add/remove/modify', () => {
      const addCmd = new AddItemCommand({ id: 'p_3', type: 'participant', alias: 'Charlie' });
      const modifyCmd = new ModifyItemCommand('m_1', 'label', 'Hi');
      const removeCmd = new RemoveItemCommand('p_1');

      let ast = history.execute(addCmd, initialAst);
      expect(ast).toHaveLength(4);

      ast = history.execute(modifyCmd, ast);
      expect(ast.find(n => n.id === 'm_1').label).toBe('Hi');

      ast = history.execute(removeCmd, ast);
      expect(ast).toHaveLength(3);
      expect(ast.find(n => n.id === 'p_1')).toBeUndefined();

      // Undo all
      ast = history.undo(ast);
      expect(ast.find(n => n.id === 'p_1')).toBeDefined();

      ast = history.undo(ast);
      expect(ast.find(n => n.id === 'm_1').label).toBe('Hello');

      ast = history.undo(ast);
      expect(ast).toHaveLength(3);
      expect(ast.find(n => n.id === 'p_3')).toBeUndefined();
    });
  });
});

describe('ReplaceASTCommand (BACKLOG-067)', () => {
  let history;

  beforeEach(() => {
    history = new CommandHistory();
  });

  it('should replace entire AST with do()', () => {
    const oldAst = [
      { id: 'p_1', type: 'participant', alias: 'Alice' }
    ];
    const newAst = [
      { id: 'p_1', type: 'participant', alias: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob' }
    ];

    const cmd = new ReplaceASTCommand(oldAst, newAst);
    const result = cmd.do(oldAst);

    expect(result).toHaveLength(2);
    expect(result).toBe(newAst);
  });

  it('should restore old AST with undo()', () => {
    const oldAst = [
      { id: 'p_1', type: 'participant', alias: 'Alice' }
    ];
    const newAst = [
      { id: 'p_1', type: 'participant', alias: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob' }
    ];

    const cmd = new ReplaceASTCommand(oldAst, newAst);
    const afterDo = cmd.do(oldAst);
    const afterUndo = cmd.undo(afterDo);

    expect(afterUndo).toHaveLength(1);
    expect(afterUndo).toBe(oldAst);
  });

  it('should store source text', () => {
    const oldAst = [];
    const newAst = [{ id: 'p_1', type: 'participant', alias: 'Alice' }];
    const oldText = '';
    const newText = 'participant Alice';

    const cmd = new ReplaceASTCommand(oldAst, newAst, oldText, newText);

    expect(cmd.getOldText()).toBe(oldText);
    expect(cmd.getNewText()).toBe(newText);
  });

  it('should have description "Text edit"', () => {
    const cmd = new ReplaceASTCommand([], []);
    expect(cmd.description).toBe('Text edit');
  });

  it('should work with CommandHistory', () => {
    const ast1 = [{ id: 'p_1', type: 'participant', alias: 'Alice' }];
    const ast2 = [
      { id: 'p_1', type: 'participant', alias: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob' }
    ];
    const ast3 = [
      { id: 'p_1', type: 'participant', alias: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob' },
      { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hi' }
    ];

    let current = ast1;
    current = history.execute(new ReplaceASTCommand(ast1, ast2), current);
    expect(current).toHaveLength(2);

    current = history.execute(new ReplaceASTCommand(ast2, ast3), current);
    expect(current).toHaveLength(3);

    // Undo back to ast2
    current = history.undo(current);
    expect(current).toHaveLength(2);

    // Undo back to ast1
    current = history.undo(current);
    expect(current).toHaveLength(1);

    // Redo to ast2
    current = history.redo(current);
    expect(current).toHaveLength(2);

    // Redo to ast3
    current = history.redo(current);
    expect(current).toHaveLength(3);
  });

  it('should handle type->parse->undo->redo cycle simulation', () => {
    // Simulates the workflow: user types, system parses, user undoes
    const emptyAst = [];
    const text1 = 'participant Alice';
    const ast1 = [{ id: 'p_1', type: 'participant', alias: 'Alice' }];

    const text2 = 'participant Alice\nparticipant Bob';
    const ast2 = [
      { id: 'p_1', type: 'participant', alias: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob' }
    ];

    const text3 = 'participant Alice\nparticipant Bob\nAlice->Bob:Hello';
    const ast3 = [
      { id: 'p_1', type: 'participant', alias: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob' },
      { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' }
    ];

    // Step 1: User types first line, system parses
    let current = history.execute(
      new ReplaceASTCommand(emptyAst, ast1, '', text1),
      emptyAst
    );
    expect(current).toHaveLength(1);

    // Step 2: User types second line
    current = history.execute(
      new ReplaceASTCommand(ast1, ast2, text1, text2),
      current
    );
    expect(current).toHaveLength(2);

    // Step 3: User types message
    current = history.execute(
      new ReplaceASTCommand(ast2, ast3, text2, text3),
      current
    );
    expect(current).toHaveLength(3);

    // User hits undo - should go back to ast2
    current = history.undo(current);
    expect(current).toHaveLength(2);
    expect(history.getLastUndoDescription()).toBe('Text edit');
    expect(history.getLastRedoDescription()).toBe('Text edit');

    // User hits redo - should go forward to ast3
    current = history.redo(current);
    expect(current).toHaveLength(3);
    expect(current[2].label).toBe('Hello');
  });
});

describe('RemoveNodeCommand (BACKLOG-071)', () => {
  let history;
  let initialAst;

  beforeEach(() => {
    history = new CommandHistory();
    initialAst = [
      { id: 'p_1', type: 'participant', alias: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob' },
      { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' }
    ];
  });

  it('should remove node from AST with do()', () => {
    const node = initialAst[1];
    const cmd = new RemoveNodeCommand('p_2', node, 1);

    const result = cmd.do(initialAst);

    expect(result).toHaveLength(2);
    expect(result.find(n => n.id === 'p_2')).toBeUndefined();
  });

  it('should restore node with undo()', () => {
    const node = initialAst[1];
    const cmd = new RemoveNodeCommand('p_2', node, 1);

    const afterDo = cmd.do(initialAst);
    const afterUndo = cmd.undo(afterDo);

    expect(afterUndo).toHaveLength(3);
    expect(afterUndo[1].id).toBe('p_2');
    expect(afterUndo[1].alias).toBe('Bob');
  });

  it('should restore node at original index', () => {
    const node = initialAst[0];
    const cmd = new RemoveNodeCommand('p_1', node, 0);

    const afterDo = cmd.do(initialAst);
    expect(afterDo[0].id).toBe('p_2');

    const afterUndo = cmd.undo(afterDo);
    expect(afterUndo[0].id).toBe('p_1');
    expect(afterUndo[1].id).toBe('p_2');
  });

  it('should have descriptive description', () => {
    const node = initialAst[1];
    const cmd = new RemoveNodeCommand('p_2', node, 1);

    expect(cmd.description).toBe('Remove participant: Bob');
  });

  it('should work with CommandHistory', () => {
    const node = initialAst[2];
    const cmd = new RemoveNodeCommand('m_1', node, 2);

    let current = history.execute(cmd, initialAst);
    expect(current).toHaveLength(2);
    expect(current.find(n => n.id === 'm_1')).toBeUndefined();

    current = history.undo(current);
    expect(current).toHaveLength(3);
    expect(current[2].id).toBe('m_1');

    current = history.redo(current);
    expect(current).toHaveLength(2);
    expect(current.find(n => n.id === 'm_1')).toBeUndefined();
  });

  describe('fragment entries', () => {
    let fragmentAst;

    beforeEach(() => {
      fragmentAst = [
        { id: 'p_1', type: 'participant', alias: 'Alice' },
        { id: 'p_2', type: 'participant', alias: 'Bob' },
        {
          id: 'f_1',
          type: 'fragment',
          fragmentType: 'alt',
          condition: 'cond',
          entries: [
            { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' },
            { id: 'm_2', type: 'message', from: 'Bob', to: 'Alice', label: 'Hi' }
          ],
          elseClauses: [
            {
              condition: 'else',
              entries: [
                { id: 'm_3', type: 'message', from: 'Alice', to: 'Bob', label: 'Bye' }
              ]
            }
          ]
        }
      ];
    });

    it('should remove node from fragment entries', () => {
      const node = fragmentAst[2].entries[0];
      const cmd = new RemoveNodeCommand('m_1', node, 0, 'f_1', 'entries');

      const result = cmd.do(fragmentAst);

      expect(result[2].entries).toHaveLength(1);
      expect(result[2].entries[0].id).toBe('m_2');
    });

    it('should restore node to fragment entries', () => {
      const node = fragmentAst[2].entries[0];
      const cmd = new RemoveNodeCommand('m_1', node, 0, 'f_1', 'entries');

      const afterDo = cmd.do(fragmentAst);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo[2].entries).toHaveLength(2);
      expect(afterUndo[2].entries[0].id).toBe('m_1');
    });

    it('should remove node from else clause entries', () => {
      const node = fragmentAst[2].elseClauses[0].entries[0];
      const cmd = new RemoveNodeCommand('m_3', node, 0, 'f_1', 'elseClauses', 0);

      const result = cmd.do(fragmentAst);

      expect(result[2].elseClauses[0].entries).toHaveLength(0);
    });

    it('should restore node to else clause entries', () => {
      const node = fragmentAst[2].elseClauses[0].entries[0];
      const cmd = new RemoveNodeCommand('m_3', node, 0, 'f_1', 'elseClauses', 0);

      const afterDo = cmd.do(fragmentAst);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo[2].elseClauses[0].entries).toHaveLength(1);
      expect(afterUndo[2].elseClauses[0].entries[0].id).toBe('m_3');
    });
  });
});

describe('ReorderNodeCommand (BACKLOG-073)', () => {
  let history;
  let initialAst;

  beforeEach(() => {
    history = new CommandHistory();
    initialAst = [
      { id: 'p_1', type: 'participant', alias: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob' },
      { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'First' },
      { id: 'm_2', type: 'message', from: 'Bob', to: 'Alice', label: 'Second' },
      { id: 'm_3', type: 'message', from: 'Alice', to: 'Bob', label: 'Third' }
    ];
  });

  it('should move node forward in AST with do()', () => {
    const cmd = new ReorderNodeCommand('m_1', 2, 4);

    const result = cmd.do(initialAst);

    expect(result[2].id).toBe('m_2');
    expect(result[3].id).toBe('m_3');
    expect(result[4].id).toBe('m_1');
  });

  it('should move node backward in AST with do()', () => {
    const cmd = new ReorderNodeCommand('m_3', 4, 2);

    const result = cmd.do(initialAst);

    expect(result[2].id).toBe('m_3');
    expect(result[3].id).toBe('m_1');
    expect(result[4].id).toBe('m_2');
  });

  it('should restore original order with undo()', () => {
    const cmd = new ReorderNodeCommand('m_1', 2, 4);

    const afterDo = cmd.do(initialAst);
    expect(afterDo[4].id).toBe('m_1');

    const afterUndo = cmd.undo(afterDo);
    expect(afterUndo[2].id).toBe('m_1');
    expect(afterUndo[3].id).toBe('m_2');
    expect(afterUndo[4].id).toBe('m_3');
  });

  it('should work with CommandHistory', () => {
    const cmd = new ReorderNodeCommand('m_1', 2, 4);

    let current = history.execute(cmd, initialAst);
    expect(current[4].id).toBe('m_1');

    current = history.undo(current);
    expect(current[2].id).toBe('m_1');

    current = history.redo(current);
    expect(current[4].id).toBe('m_1');
  });

  describe('fragment entries', () => {
    let fragmentAst;

    beforeEach(() => {
      fragmentAst = [
        { id: 'p_1', type: 'participant', alias: 'Alice' },
        { id: 'p_2', type: 'participant', alias: 'Bob' },
        {
          id: 'f_1',
          type: 'fragment',
          fragmentType: 'alt',
          condition: 'cond',
          entries: [
            { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'First' },
            { id: 'm_2', type: 'message', from: 'Bob', to: 'Alice', label: 'Second' },
            { id: 'm_3', type: 'message', from: 'Alice', to: 'Bob', label: 'Third' }
          ],
          elseClauses: []
        }
      ];
    });

    it('should reorder within fragment entries', () => {
      const cmd = new ReorderNodeCommand('m_1', 0, 2, 'f_1', 'entries');

      const result = cmd.do(fragmentAst);

      expect(result[2].entries[0].id).toBe('m_2');
      expect(result[2].entries[1].id).toBe('m_3');
      expect(result[2].entries[2].id).toBe('m_1');
    });

    it('should undo reorder within fragment entries', () => {
      const cmd = new ReorderNodeCommand('m_1', 0, 2, 'f_1', 'entries');

      const afterDo = cmd.do(fragmentAst);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo[2].entries[0].id).toBe('m_1');
      expect(afterUndo[2].entries[1].id).toBe('m_2');
      expect(afterUndo[2].entries[2].id).toBe('m_3');
    });
  });

  describe('edge cases', () => {
    it('should handle moving to same position (no-op)', () => {
      const cmd = new ReorderNodeCommand('m_1', 2, 2);

      const result = cmd.do(initialAst);

      expect(result[2].id).toBe('m_1');
      expect(result[3].id).toBe('m_2');
      expect(result[4].id).toBe('m_3');
    });

    it('should handle moving to position 0', () => {
      const cmd = new ReorderNodeCommand('m_3', 4, 0);

      const result = cmd.do(initialAst);

      expect(result[0].id).toBe('m_3');
      expect(result[1].id).toBe('p_1');
    });

    it('should handle moving to last position', () => {
      const cmd = new ReorderNodeCommand('p_1', 0, 4);

      const result = cmd.do(initialAst);

      expect(result[0].id).toBe('p_2');
      expect(result[4].id).toBe('p_1');
    });
  });

  describe('Divider reordering (BACKLOG-087)', () => {
    let dividerAst;

    beforeEach(() => {
      dividerAst = [
        { id: 'p_1', type: 'participant', alias: 'Alice' },
        { id: 'p_2', type: 'participant', alias: 'Bob' },
        { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'First' },
        { id: 'd_1', type: 'divider', text: 'Section 1' },
        { id: 'm_2', type: 'message', from: 'Bob', to: 'Alice', label: 'Second' },
        { id: 'd_2', type: 'divider', text: 'Section 2' },
        { id: 'm_3', type: 'message', from: 'Alice', to: 'Bob', label: 'Third' }
      ];
    });

    it('should move divider forward in AST', () => {
      const cmd = new ReorderNodeCommand('d_1', 3, 5);

      const result = cmd.do(dividerAst);

      expect(result[3].id).toBe('m_2');
      expect(result[4].id).toBe('d_2');
      expect(result[5].id).toBe('d_1');
    });

    it('should move divider backward in AST', () => {
      const cmd = new ReorderNodeCommand('d_2', 5, 3);

      const result = cmd.do(dividerAst);

      expect(result[3].id).toBe('d_2');
      expect(result[4].id).toBe('d_1');
      expect(result[5].id).toBe('m_2');
    });

    it('should undo divider move', () => {
      const cmd = new ReorderNodeCommand('d_1', 3, 5);

      const afterDo = cmd.do(dividerAst);
      expect(afterDo[5].id).toBe('d_1');

      const afterUndo = cmd.undo(afterDo);
      expect(afterUndo[3].id).toBe('d_1');
      expect(afterUndo[4].id).toBe('m_2');
      expect(afterUndo[5].id).toBe('d_2');
    });

    it('should move divider before first message', () => {
      const cmd = new ReorderNodeCommand('d_1', 3, 2);

      const result = cmd.do(dividerAst);

      expect(result[2].id).toBe('d_1');
      expect(result[3].id).toBe('m_1');
    });

    it('should move divider to end', () => {
      const cmd = new ReorderNodeCommand('d_1', 3, 6);

      const result = cmd.do(dividerAst);

      expect(result[6].id).toBe('d_1');
      expect(result[3].id).toBe('m_2');
    });
  });
});

describe('MoveMessageTargetCommand (BACKLOG-074)', () => {
  let history;
  let initialAst;

  beforeEach(() => {
    history = new CommandHistory();
    initialAst = [
      { id: 'p_1', type: 'participant', alias: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob' },
      { id: 'p_3', type: 'participant', alias: 'Charlie' },
      { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' }
    ];
  });

  it('should change message target with do()', () => {
    const cmd = new MoveMessageTargetCommand('m_1', 'Bob', 'Charlie');

    const result = cmd.do(initialAst);
    const message = result.find(n => n.id === 'm_1');

    expect(message.to).toBe('Charlie');
    expect(message.from).toBe('Alice'); // from unchanged
  });

  it('should restore original target with undo()', () => {
    const cmd = new MoveMessageTargetCommand('m_1', 'Bob', 'Charlie');

    const afterDo = cmd.do(initialAst);
    expect(afterDo.find(n => n.id === 'm_1').to).toBe('Charlie');

    const afterUndo = cmd.undo(afterDo);
    expect(afterUndo.find(n => n.id === 'm_1').to).toBe('Bob');
  });

  it('should have descriptive description', () => {
    const cmd = new MoveMessageTargetCommand('m_1', 'Bob', 'Charlie');
    expect(cmd.description).toBe('Move message target from Bob to Charlie');
  });

  it('should work with CommandHistory', () => {
    const cmd = new MoveMessageTargetCommand('m_1', 'Bob', 'Charlie');

    let current = history.execute(cmd, initialAst);
    expect(current.find(n => n.id === 'm_1').to).toBe('Charlie');

    current = history.undo(current);
    expect(current.find(n => n.id === 'm_1').to).toBe('Bob');

    current = history.redo(current);
    expect(current.find(n => n.id === 'm_1').to).toBe('Charlie');
  });

  describe('fragment entries', () => {
    let fragmentAst;

    beforeEach(() => {
      fragmentAst = [
        { id: 'p_1', type: 'participant', alias: 'Alice' },
        { id: 'p_2', type: 'participant', alias: 'Bob' },
        { id: 'p_3', type: 'participant', alias: 'Charlie' },
        {
          id: 'f_1',
          type: 'fragment',
          fragmentType: 'alt',
          condition: 'cond',
          entries: [
            { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' }
          ],
          elseClauses: [
            {
              condition: 'else',
              entries: [
                { id: 'm_2', type: 'message', from: 'Bob', to: 'Alice', label: 'Bye' }
              ]
            }
          ]
        }
      ];
    });

    it('should change target of message in fragment entries', () => {
      const cmd = new MoveMessageTargetCommand('m_1', 'Bob', 'Charlie');

      const result = cmd.do(fragmentAst);

      expect(result[3].entries[0].to).toBe('Charlie');
    });

    it('should change target of message in else clause', () => {
      const cmd = new MoveMessageTargetCommand('m_2', 'Alice', 'Charlie');

      const result = cmd.do(fragmentAst);

      expect(result[3].elseClauses[0].entries[0].to).toBe('Charlie');
    });

    it('should restore message in fragment on undo', () => {
      const cmd = new MoveMessageTargetCommand('m_1', 'Bob', 'Charlie');

      const afterDo = cmd.do(fragmentAst);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo[3].entries[0].to).toBe('Bob');
    });
  });
});

describe('MoveMessageSourceCommand (BACKLOG-075)', () => {
  let history;
  let initialAst;

  beforeEach(() => {
    history = new CommandHistory();
    initialAst = [
      { id: 'p_1', type: 'participant', alias: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob' },
      { id: 'p_3', type: 'participant', alias: 'Charlie' },
      { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' }
    ];
  });

  it('should change message source with do()', () => {
    const cmd = new MoveMessageSourceCommand('m_1', 'Alice', 'Charlie');

    const result = cmd.do(initialAst);
    const message = result.find(n => n.id === 'm_1');

    expect(message.from).toBe('Charlie');
    expect(message.to).toBe('Bob'); // to unchanged
  });

  it('should restore original source with undo()', () => {
    const cmd = new MoveMessageSourceCommand('m_1', 'Alice', 'Charlie');

    const afterDo = cmd.do(initialAst);
    expect(afterDo.find(n => n.id === 'm_1').from).toBe('Charlie');

    const afterUndo = cmd.undo(afterDo);
    expect(afterUndo.find(n => n.id === 'm_1').from).toBe('Alice');
  });

  it('should have descriptive description', () => {
    const cmd = new MoveMessageSourceCommand('m_1', 'Alice', 'Charlie');
    expect(cmd.description).toBe('Move message source from Alice to Charlie');
  });

  it('should work with CommandHistory', () => {
    const cmd = new MoveMessageSourceCommand('m_1', 'Alice', 'Charlie');

    let current = history.execute(cmd, initialAst);
    expect(current.find(n => n.id === 'm_1').from).toBe('Charlie');

    current = history.undo(current);
    expect(current.find(n => n.id === 'm_1').from).toBe('Alice');

    current = history.redo(current);
    expect(current.find(n => n.id === 'm_1').from).toBe('Charlie');
  });

  describe('fragment entries', () => {
    let fragmentAst;

    beforeEach(() => {
      fragmentAst = [
        { id: 'p_1', type: 'participant', alias: 'Alice' },
        { id: 'p_2', type: 'participant', alias: 'Bob' },
        { id: 'p_3', type: 'participant', alias: 'Charlie' },
        {
          id: 'f_1',
          type: 'fragment',
          fragmentType: 'alt',
          condition: 'cond',
          entries: [
            { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' }
          ],
          elseClauses: [
            {
              condition: 'else',
              entries: [
                { id: 'm_2', type: 'message', from: 'Bob', to: 'Alice', label: 'Bye' }
              ]
            }
          ]
        }
      ];
    });

    it('should change source of message in fragment entries', () => {
      const cmd = new MoveMessageSourceCommand('m_1', 'Alice', 'Charlie');

      const result = cmd.do(fragmentAst);

      expect(result[3].entries[0].from).toBe('Charlie');
    });

    it('should change source of message in else clause', () => {
      const cmd = new MoveMessageSourceCommand('m_2', 'Bob', 'Charlie');

      const result = cmd.do(fragmentAst);

      expect(result[3].elseClauses[0].entries[0].from).toBe('Charlie');
    });

    it('should restore message in fragment on undo', () => {
      const cmd = new MoveMessageSourceCommand('m_1', 'Alice', 'Charlie');

      const afterDo = cmd.do(fragmentAst);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo[3].entries[0].from).toBe('Alice');
    });
  });
});

describe('EditMessageLabelCommand (BACKLOG-076)', () => {
  let history;
  let initialAst;

  beforeEach(() => {
    history = new CommandHistory();
    initialAst = [
      { id: 'p_1', type: 'participant', alias: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob' },
      { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' }
    ];
  });

  it('should change message label with do()', () => {
    const cmd = new EditMessageLabelCommand('m_1', 'Hello', 'Goodbye');

    const result = cmd.do(initialAst);
    const message = result.find(n => n.id === 'm_1');

    expect(message.label).toBe('Goodbye');
    expect(message.from).toBe('Alice'); // from unchanged
    expect(message.to).toBe('Bob'); // to unchanged
  });

  it('should restore original label with undo()', () => {
    const cmd = new EditMessageLabelCommand('m_1', 'Hello', 'Goodbye');

    const afterDo = cmd.do(initialAst);
    expect(afterDo.find(n => n.id === 'm_1').label).toBe('Goodbye');

    const afterUndo = cmd.undo(afterDo);
    expect(afterUndo.find(n => n.id === 'm_1').label).toBe('Hello');
  });

  it('should have descriptive description', () => {
    const cmd = new EditMessageLabelCommand('m_1', 'Hello', 'Goodbye');
    expect(cmd.description).toBe('Edit message label');
  });

  it('should work with CommandHistory', () => {
    const cmd = new EditMessageLabelCommand('m_1', 'Hello', 'Goodbye');

    let current = history.execute(cmd, initialAst);
    expect(current.find(n => n.id === 'm_1').label).toBe('Goodbye');

    current = history.undo(current);
    expect(current.find(n => n.id === 'm_1').label).toBe('Hello');

    current = history.redo(current);
    expect(current.find(n => n.id === 'm_1').label).toBe('Goodbye');
  });

  it('should handle empty labels', () => {
    const cmd = new EditMessageLabelCommand('m_1', 'Hello', '');

    const result = cmd.do(initialAst);
    expect(result.find(n => n.id === 'm_1').label).toBe('');
  });

  it('should handle labels with special characters', () => {
    const cmd = new EditMessageLabelCommand('m_1', 'Hello', '**bold** //italic//');

    const result = cmd.do(initialAst);
    expect(result.find(n => n.id === 'm_1').label).toBe('**bold** //italic//');
  });

  describe('fragment entries', () => {
    let fragmentAst;

    beforeEach(() => {
      fragmentAst = [
        { id: 'p_1', type: 'participant', alias: 'Alice' },
        { id: 'p_2', type: 'participant', alias: 'Bob' },
        {
          id: 'f_1',
          type: 'fragment',
          fragmentType: 'alt',
          condition: 'cond',
          entries: [
            { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' }
          ],
          elseClauses: [
            {
              condition: 'else',
              entries: [
                { id: 'm_2', type: 'message', from: 'Bob', to: 'Alice', label: 'Bye' }
              ]
            }
          ]
        }
      ];
    });

    it('should change label of message in fragment entries', () => {
      const cmd = new EditMessageLabelCommand('m_1', 'Hello', 'New message');

      const result = cmd.do(fragmentAst);

      expect(result[2].entries[0].label).toBe('New message');
    });

    it('should change label of message in else clause', () => {
      const cmd = new EditMessageLabelCommand('m_2', 'Bye', 'See you later');

      const result = cmd.do(fragmentAst);

      expect(result[2].elseClauses[0].entries[0].label).toBe('See you later');
    });

    it('should restore message in fragment on undo', () => {
      const cmd = new EditMessageLabelCommand('m_1', 'Hello', 'New message');

      const afterDo = cmd.do(fragmentAst);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo[2].entries[0].label).toBe('Hello');
    });
  });
});

describe('EditNoteTextCommand (BACKLOG-128)', () => {
  let history;
  let initialAst;

  beforeEach(() => {
    history = new CommandHistory();
    initialAst = [
      { id: 'p_1', type: 'participant', alias: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob' },
      { id: 'n_1', type: 'note', noteType: 'note', text: 'Original note', participants: ['Alice'] }
    ];
  });

  it('should change note text with do()', () => {
    const cmd = new EditNoteTextCommand('n_1', 'Original note', 'Updated note');

    const result = cmd.do(initialAst);
    const note = result.find(n => n.id === 'n_1');

    expect(note.text).toBe('Updated note');
    expect(note.noteType).toBe('note'); // type unchanged
  });

  it('should restore original text with undo()', () => {
    const cmd = new EditNoteTextCommand('n_1', 'Original note', 'Updated note');

    const afterDo = cmd.do(initialAst);
    expect(afterDo.find(n => n.id === 'n_1').text).toBe('Updated note');

    const afterUndo = cmd.undo(afterDo);
    expect(afterUndo.find(n => n.id === 'n_1').text).toBe('Original note');
  });

  it('should have descriptive description', () => {
    const cmd = new EditNoteTextCommand('n_1', 'Original note', 'Updated note');
    expect(cmd.description).toBe('Edit note text');
  });

  it('should work with CommandHistory', () => {
    const cmd = new EditNoteTextCommand('n_1', 'Original note', 'Updated note');

    let current = history.execute(cmd, initialAst);
    expect(current.find(n => n.id === 'n_1').text).toBe('Updated note');

    current = history.undo(current);
    expect(current.find(n => n.id === 'n_1').text).toBe('Original note');

    current = history.redo(current);
    expect(current.find(n => n.id === 'n_1').text).toBe('Updated note');
  });

  it('should handle empty text', () => {
    const cmd = new EditNoteTextCommand('n_1', 'Original note', '');

    const result = cmd.do(initialAst);
    expect(result.find(n => n.id === 'n_1').text).toBe('');
  });

  describe('fragment entries', () => {
    let fragmentAst;

    beforeEach(() => {
      fragmentAst = [
        { id: 'p_1', type: 'participant', alias: 'Alice' },
        { id: 'p_2', type: 'participant', alias: 'Bob' },
        {
          id: 'f_1',
          type: 'fragment',
          fragmentType: 'alt',
          condition: 'cond',
          entries: [
            { id: 'n_1', type: 'note', noteType: 'note', text: 'Note in fragment', participants: ['Alice'] }
          ],
          elseClauses: [
            {
              condition: 'else',
              entries: [
                { id: 'n_2', type: 'note', noteType: 'box', text: 'Note in else', participants: ['Bob'] }
              ]
            }
          ]
        }
      ];
    });

    it('should change text of note in fragment entries', () => {
      const cmd = new EditNoteTextCommand('n_1', 'Note in fragment', 'New text');

      const result = cmd.do(fragmentAst);

      expect(result[2].entries[0].text).toBe('New text');
    });

    it('should change text of note in else clause', () => {
      const cmd = new EditNoteTextCommand('n_2', 'Note in else', 'Updated else note');

      const result = cmd.do(fragmentAst);

      expect(result[2].elseClauses[0].entries[0].text).toBe('Updated else note');
    });

    it('should restore note in fragment on undo', () => {
      const cmd = new EditNoteTextCommand('n_1', 'Note in fragment', 'New text');

      const afterDo = cmd.do(fragmentAst);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo[2].entries[0].text).toBe('Note in fragment');
    });
  });
});

describe('ToggleExpandableCommand (BACKLOG-125)', () => {
  let history;
  let initialAst;

  beforeEach(() => {
    history = new CommandHistory();
    initialAst = [
      { id: 'p_1', type: 'participant', alias: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob' },
      {
        id: 'f_1',
        type: 'fragment',
        fragmentType: 'expandable',
        condition: 'Details',
        collapsed: false,
        entries: ['m_1']
      },
      { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hidden message' }
    ];
  });

  it('should toggle collapsed state from false to true with do()', () => {
    const cmd = new ToggleExpandableCommand('f_1', false);

    const result = cmd.do(initialAst);
    const fragment = result.find(n => n.id === 'f_1');

    expect(fragment.collapsed).toBe(true);
    expect(fragment.fragmentType).toBe('expandable');
  });

  it('should toggle collapsed state from true to false with do()', () => {
    // First collapse it
    initialAst[2].collapsed = true;
    const cmd = new ToggleExpandableCommand('f_1', true);

    const result = cmd.do(initialAst);
    const fragment = result.find(n => n.id === 'f_1');

    expect(fragment.collapsed).toBe(false);
  });

  it('should restore original state with undo()', () => {
    const cmd = new ToggleExpandableCommand('f_1', false);

    const afterDo = cmd.do(initialAst);
    expect(afterDo.find(n => n.id === 'f_1').collapsed).toBe(true);

    const afterUndo = cmd.undo(afterDo);
    expect(afterUndo.find(n => n.id === 'f_1').collapsed).toBe(false);
  });

  it('should have descriptive description', () => {
    const cmd = new ToggleExpandableCommand('f_1', false);
    expect(cmd.description).toBe('Toggle expandable fragment');
  });

  it('should work with CommandHistory', () => {
    const cmd = new ToggleExpandableCommand('f_1', false);

    let current = history.execute(cmd, initialAst);
    expect(current.find(n => n.id === 'f_1').collapsed).toBe(true);

    current = history.undo(current);
    expect(current.find(n => n.id === 'f_1').collapsed).toBe(false);

    current = history.redo(current);
    expect(current.find(n => n.id === 'f_1').collapsed).toBe(true);
  });

  it('should only affect expandable fragments', () => {
    // Add a non-expandable fragment
    initialAst.push({
      id: 'f_2',
      type: 'fragment',
      fragmentType: 'alt',
      condition: 'cond',
      entries: []
    });

    const cmd = new ToggleExpandableCommand('f_2', false);
    const result = cmd.do(initialAst);

    // Non-expandable fragment should be unchanged
    const altFragment = result.find(n => n.id === 'f_2');
    expect(altFragment.collapsed).toBeUndefined();
  });
});

describe('AddMessageCommand (BACKLOG-077)', () => {
  let history;
  let initialAst;

  beforeEach(() => {
    history = new CommandHistory();
    initialAst = [
      { id: 'p_1', type: 'participant', alias: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob' },
      { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' }
    ];
  });

  it('should add message at end with do()', () => {
    const cmd = new AddMessageCommand('Bob', 'Alice', 'Response', '-->');

    const result = cmd.do(initialAst);

    expect(result).toHaveLength(4);
    const newMsg = result[3];
    expect(newMsg.type).toBe('message');
    expect(newMsg.from).toBe('Bob');
    expect(newMsg.to).toBe('Alice');
    expect(newMsg.label).toBe('Response');
    expect(newMsg.arrowType).toBe('-->');
  });

  it('should add message at specific index', () => {
    const cmd = new AddMessageCommand('Bob', 'Alice', 'Response', '->', 2);

    const result = cmd.do(initialAst);

    expect(result).toHaveLength(4);
    expect(result[2].from).toBe('Bob');
    expect(result[3].id).toBe('m_1'); // Original message moved
  });

  it('should remove message with undo()', () => {
    const cmd = new AddMessageCommand('Bob', 'Alice', 'Response', '-->');

    const afterDo = cmd.do(initialAst);
    expect(afterDo).toHaveLength(4);

    const afterUndo = cmd.undo(afterDo);
    expect(afterUndo).toHaveLength(3);
    expect(afterUndo.find(n => n.label === 'Response')).toBeUndefined();
  });

  it('should default to -> arrow type', () => {
    const cmd = new AddMessageCommand('Alice', 'Bob', 'Test');

    const result = cmd.do(initialAst);
    const newMsg = result[result.length - 1];

    expect(newMsg.arrowType).toBe('->');
  });

  it('should generate unique message ID', () => {
    const cmd1 = new AddMessageCommand('Alice', 'Bob', 'Test1');
    const cmd2 = new AddMessageCommand('Alice', 'Bob', 'Test2');

    expect(cmd1.getMessageId()).not.toBe(cmd2.getMessageId());
  });

  it('should work with CommandHistory', () => {
    const cmd = new AddMessageCommand('Bob', 'Alice', 'Response', '-->');

    let current = history.execute(cmd, initialAst);
    expect(current).toHaveLength(4);

    current = history.undo(current);
    expect(current).toHaveLength(3);

    current = history.redo(current);
    expect(current).toHaveLength(4);
    expect(current[3].label).toBe('Response');
  });

  it('should handle all arrow types', () => {
    const types = ['->', '->>', '-->', '-->>'];

    for (const arrowType of types) {
      const cmd = new AddMessageCommand('Alice', 'Bob', 'Test', arrowType);
      const result = cmd.do(initialAst);
      expect(result[result.length - 1].arrowType).toBe(arrowType);
    }
  });

  describe('fragment entries', () => {
    let fragmentAst;

    beforeEach(() => {
      fragmentAst = [
        { id: 'p_1', type: 'participant', alias: 'Alice' },
        { id: 'p_2', type: 'participant', alias: 'Bob' },
        {
          id: 'f_1',
          type: 'fragment',
          fragmentType: 'alt',
          condition: 'cond',
          entries: [
            { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' }
          ],
          elseClauses: [
            {
              condition: 'else',
              entries: []
            }
          ]
        }
      ];
    });

    it('should add message to fragment entries', () => {
      const cmd = new AddMessageCommand('Bob', 'Alice', 'Response', '-->', -1, 'f_1', 'entries');

      const result = cmd.do(fragmentAst);

      expect(result[2].entries).toHaveLength(2);
      expect(result[2].entries[1].label).toBe('Response');
    });

    it('should add message at specific index in fragment', () => {
      const cmd = new AddMessageCommand('Bob', 'Alice', 'First', '->', 0, 'f_1', 'entries');

      const result = cmd.do(fragmentAst);

      expect(result[2].entries).toHaveLength(2);
      expect(result[2].entries[0].label).toBe('First');
      expect(result[2].entries[1].label).toBe('Hello');
    });

    it('should add message to else clause', () => {
      const cmd = new AddMessageCommand('Alice', 'Bob', 'Else msg', '->', -1, 'f_1', 'elseClauses', 0);

      const result = cmd.do(fragmentAst);

      expect(result[2].elseClauses[0].entries).toHaveLength(1);
      expect(result[2].elseClauses[0].entries[0].label).toBe('Else msg');
    });

    it('should remove message from fragment on undo', () => {
      const cmd = new AddMessageCommand('Bob', 'Alice', 'Response', '-->', -1, 'f_1', 'entries');

      const afterDo = cmd.do(fragmentAst);
      expect(afterDo[2].entries).toHaveLength(2);

      const afterUndo = cmd.undo(afterDo);
      expect(afterUndo[2].entries).toHaveLength(1);
    });

    it('should remove message from else clause on undo', () => {
      const cmd = new AddMessageCommand('Alice', 'Bob', 'Else msg', '->', -1, 'f_1', 'elseClauses', 0);

      const afterDo = cmd.do(fragmentAst);
      expect(afterDo[2].elseClauses[0].entries).toHaveLength(1);

      const afterUndo = cmd.undo(afterDo);
      expect(afterUndo[2].elseClauses[0].entries).toHaveLength(0);
    });
  });
});

describe('ReorderParticipantCommand (BACKLOG-078)', () => {
  let history;
  let initialAst;

  beforeEach(() => {
    history = new CommandHistory();
    initialAst = [
      { id: 'p_1', type: 'participant', alias: 'Alice' },
      { id: 'p_2', type: 'participant', alias: 'Bob' },
      { id: 'p_3', type: 'participant', alias: 'Charlie' },
      { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' }
    ];
  });

  it('should move participant forward with do()', () => {
    const cmd = new ReorderParticipantCommand('p_1', 0, 2);

    const result = cmd.do(initialAst);

    expect(result[0].alias).toBe('Bob');
    expect(result[1].alias).toBe('Charlie');
    expect(result[2].alias).toBe('Alice');
    expect(result[3].type).toBe('message'); // Message unchanged
  });

  it('should move participant backward with do()', () => {
    const cmd = new ReorderParticipantCommand('p_3', 2, 0);

    const result = cmd.do(initialAst);

    expect(result[0].alias).toBe('Charlie');
    expect(result[1].alias).toBe('Alice');
    expect(result[2].alias).toBe('Bob');
  });

  it('should restore original order with undo()', () => {
    const cmd = new ReorderParticipantCommand('p_1', 0, 2);

    const afterDo = cmd.do(initialAst);
    expect(afterDo[2].alias).toBe('Alice');

    const afterUndo = cmd.undo(afterDo);
    expect(afterUndo[0].alias).toBe('Alice');
    expect(afterUndo[1].alias).toBe('Bob');
    expect(afterUndo[2].alias).toBe('Charlie');
  });

  it('should work with CommandHistory', () => {
    const cmd = new ReorderParticipantCommand('p_1', 0, 2);

    let current = history.execute(cmd, initialAst);
    expect(current[0].alias).toBe('Bob');
    expect(current[2].alias).toBe('Alice');

    current = history.undo(current);
    expect(current[0].alias).toBe('Alice');

    current = history.redo(current);
    expect(current[0].alias).toBe('Bob');
    expect(current[2].alias).toBe('Alice');
  });

  it('should handle swap between adjacent participants', () => {
    const cmd = new ReorderParticipantCommand('p_1', 0, 1);

    const result = cmd.do(initialAst);

    expect(result[0].alias).toBe('Bob');
    expect(result[1].alias).toBe('Alice');
    expect(result[2].alias).toBe('Charlie');
  });

  it('should not change anything if same index', () => {
    const cmd = new ReorderParticipantCommand('p_2', 1, 1);

    const result = cmd.do(initialAst);

    expect(result[0].alias).toBe('Alice');
    expect(result[1].alias).toBe('Bob');
    expect(result[2].alias).toBe('Charlie');
  });

  it('should preserve messages after reorder', () => {
    const cmd = new ReorderParticipantCommand('p_1', 0, 2);

    const result = cmd.do(initialAst);

    // Message should still be at index 3
    expect(result[3].type).toBe('message');
    expect(result[3].from).toBe('Alice');
    expect(result[3].to).toBe('Bob');
  });
});

describe('EditParticipantCommand (BACKLOG-079)', () => {
  let history;
  let initialAst;

  beforeEach(() => {
    history = new CommandHistory();
    initialAst = [
      { id: 'p_1', type: 'participant', alias: 'Alice', displayName: 'Alice User' },
      { id: 'p_2', type: 'participant', alias: 'Bob', displayName: 'Bob User' },
      { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' },
      { id: 'm_2', type: 'message', from: 'Bob', to: 'Alice', label: 'Hi' }
    ];
  });

  it('should change display name with do()', () => {
    const cmd = new EditParticipantCommand('p_1', 'Alice User', 'Alice New', 'Alice', 'Alice');

    const result = cmd.do(initialAst);
    const participant = result.find(n => n.id === 'p_1');

    expect(participant.displayName).toBe('Alice New');
    expect(participant.alias).toBe('Alice');
  });

  it('should change alias and update message references', () => {
    const cmd = new EditParticipantCommand('p_1', 'Alice User', 'Alice User', 'Alice', 'AliceNew');

    const result = cmd.do(initialAst);
    const participant = result.find(n => n.id === 'p_1');

    expect(participant.alias).toBe('AliceNew');
    expect(result[2].from).toBe('AliceNew'); // m_1
    expect(result[3].to).toBe('AliceNew');   // m_2
  });

  it('should restore original values with undo()', () => {
    const cmd = new EditParticipantCommand('p_1', 'Alice User', 'Alice New', 'Alice', 'AliceNew');

    const afterDo = cmd.do(initialAst);
    expect(afterDo.find(n => n.id === 'p_1').alias).toBe('AliceNew');
    expect(afterDo[2].from).toBe('AliceNew');

    const afterUndo = cmd.undo(afterDo);
    expect(afterUndo.find(n => n.id === 'p_1').alias).toBe('Alice');
    expect(afterUndo.find(n => n.id === 'p_1').displayName).toBe('Alice User');
    expect(afterUndo[2].from).toBe('Alice');
  });

  it('should work with CommandHistory', () => {
    const cmd = new EditParticipantCommand('p_1', 'Alice User', 'Alice New', 'Alice', 'AliceNew');

    let current = history.execute(cmd, initialAst);
    expect(current.find(n => n.id === 'p_1').alias).toBe('AliceNew');

    current = history.undo(current);
    expect(current.find(n => n.id === 'p_1').alias).toBe('Alice');

    current = history.redo(current);
    expect(current.find(n => n.id === 'p_1').alias).toBe('AliceNew');
  });

  it('should not change messages if alias unchanged', () => {
    const cmd = new EditParticipantCommand('p_1', 'Alice User', 'Alice New Name', 'Alice', 'Alice');

    const result = cmd.do(initialAst);

    // Messages should be unchanged (same reference)
    expect(result[2]).toBe(initialAst[2]);
    expect(result[3]).toBe(initialAst[3]);
  });

  describe('fragment entries', () => {
    let fragmentAst;

    beforeEach(() => {
      fragmentAst = [
        { id: 'p_1', type: 'participant', alias: 'Alice', displayName: 'Alice' },
        { id: 'p_2', type: 'participant', alias: 'Bob', displayName: 'Bob' },
        {
          id: 'f_1',
          type: 'fragment',
          fragmentType: 'alt',
          condition: 'cond',
          entries: [
            { id: 'm_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' }
          ],
          elseClauses: [
            {
              condition: 'else',
              entries: [
                { id: 'm_2', type: 'message', from: 'Bob', to: 'Alice', label: 'Bye' }
              ]
            }
          ]
        }
      ];
    });

    it('should update message references in fragment entries', () => {
      const cmd = new EditParticipantCommand('p_1', 'Alice', 'Alice', 'Alice', 'AliceNew');

      const result = cmd.do(fragmentAst);

      expect(result[2].entries[0].from).toBe('AliceNew');
    });

    it('should update message references in else clauses', () => {
      const cmd = new EditParticipantCommand('p_1', 'Alice', 'Alice', 'Alice', 'AliceNew');

      const result = cmd.do(fragmentAst);

      expect(result[2].elseClauses[0].entries[0].to).toBe('AliceNew');
    });

    it('should restore fragment messages on undo', () => {
      const cmd = new EditParticipantCommand('p_1', 'Alice', 'Alice', 'Alice', 'AliceNew');

      const afterDo = cmd.do(fragmentAst);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo[2].entries[0].from).toBe('Alice');
      expect(afterUndo[2].elseClauses[0].entries[0].to).toBe('Alice');
    });
  });
});

describe('AdjustFragmentBoundaryCommand (BACKLOG-081, BACKLOG-082)', () => {
  let ast;

  beforeEach(() => {
    // AST: msg1, msg2, fragment(msg3, msg4), msg5, msg6
    ast = [
      { id: 'msg_1', type: 'message', from: 'A', to: 'B', label: 'msg1' },
      { id: 'msg_2', type: 'message', from: 'B', to: 'A', label: 'msg2' },
      {
        id: 'frag_1',
        type: 'fragment',
        fragmentType: 'opt',
        condition: 'test',
        entries: [
          { id: 'msg_3', type: 'message', from: 'A', to: 'B', label: 'msg3' },
          { id: 'msg_4', type: 'message', from: 'B', to: 'A', label: 'msg4' }
        ],
        elseClauses: []
      },
      { id: 'msg_5', type: 'message', from: 'A', to: 'B', label: 'msg5' },
      { id: 'msg_6', type: 'message', from: 'B', to: 'A', label: 'msg6' }
    ];
  });

  describe('expand top boundary', () => {
    it('should pull one message into fragment from above', () => {
      const cmd = new AdjustFragmentBoundaryCommand('frag_1', 'top', 1, [], 2);

      const result = cmd.do(ast);

      // msg2 should now be inside fragment
      expect(result.length).toBe(4); // 5 - 1 = 4 top level
      const frag = result.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(3);
      expect(frag.entries[0].id).toBe('msg_2');
      expect(frag.entries[1].id).toBe('msg_3');
    });

    it('should pull multiple messages into fragment from above', () => {
      const cmd = new AdjustFragmentBoundaryCommand('frag_1', 'top', 2, [], 2);

      const result = cmd.do(ast);

      // msg1 and msg2 should now be inside fragment
      expect(result.length).toBe(3);
      const frag = result.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(4);
      expect(frag.entries[0].id).toBe('msg_1');
      expect(frag.entries[1].id).toBe('msg_2');
    });

    it('should undo expanding top boundary', () => {
      const cmd = new AdjustFragmentBoundaryCommand('frag_1', 'top', 1, [], 2);

      const afterDo = cmd.do(ast);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo.length).toBe(5);
      const frag = afterUndo.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(2);
      expect(afterUndo[1].id).toBe('msg_2');
    });
  });

  describe('contract top boundary', () => {
    it('should push one message out of fragment to above', () => {
      const cmd = new AdjustFragmentBoundaryCommand('frag_1', 'top', -1, [], 2);

      const result = cmd.do(ast);

      // msg3 should now be before fragment
      expect(result.length).toBe(6);
      const frag = result.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(1);
      expect(frag.entries[0].id).toBe('msg_4');
      // msg3 should be before fragment
      const fragIdx = result.findIndex(n => n.id === 'frag_1');
      expect(result[fragIdx - 1].id).toBe('msg_3');
    });

    it('should undo contracting top boundary', () => {
      const cmd = new AdjustFragmentBoundaryCommand('frag_1', 'top', -1, [], 2);

      const afterDo = cmd.do(ast);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo.length).toBe(5);
      const frag = afterUndo.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(2);
    });
  });

  describe('expand bottom boundary', () => {
    it('should pull one message into fragment from below', () => {
      const cmd = new AdjustFragmentBoundaryCommand('frag_1', 'bottom', 1, [], 2);

      const result = cmd.do(ast);

      // msg5 should now be inside fragment
      expect(result.length).toBe(4);
      const frag = result.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(3);
      expect(frag.entries[2].id).toBe('msg_5');
    });

    it('should pull multiple messages into fragment from below', () => {
      const cmd = new AdjustFragmentBoundaryCommand('frag_1', 'bottom', 2, [], 2);

      const result = cmd.do(ast);

      // msg5 and msg6 should now be inside fragment
      expect(result.length).toBe(3);
      const frag = result.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(4);
      expect(frag.entries[2].id).toBe('msg_5');
      expect(frag.entries[3].id).toBe('msg_6');
    });

    it('should undo expanding bottom boundary', () => {
      const cmd = new AdjustFragmentBoundaryCommand('frag_1', 'bottom', 1, [], 2);

      const afterDo = cmd.do(ast);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo.length).toBe(5);
      const frag = afterUndo.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(2);
    });
  });

  describe('contract bottom boundary', () => {
    it('should push one message out of fragment to below', () => {
      const cmd = new AdjustFragmentBoundaryCommand('frag_1', 'bottom', -1, [], 2);

      const result = cmd.do(ast);

      // msg4 should now be after fragment
      expect(result.length).toBe(6);
      const frag = result.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(1);
      expect(frag.entries[0].id).toBe('msg_3');
      // msg4 should be after fragment
      const fragIdx = result.findIndex(n => n.id === 'frag_1');
      expect(result[fragIdx + 1].id).toBe('msg_4');
    });

    it('should undo contracting bottom boundary', () => {
      const cmd = new AdjustFragmentBoundaryCommand('frag_1', 'bottom', -1, [], 2);

      const afterDo = cmd.do(ast);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo.length).toBe(5);
      const frag = afterUndo.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should return unchanged AST if fragment not found', () => {
      const cmd = new AdjustFragmentBoundaryCommand('nonexistent', 'top', 1, [], 2);

      const result = cmd.do(ast);

      expect(result).toEqual(ast);
    });

    it('should not expand beyond available messages', () => {
      // Try to expand by 10 but only 2 messages above
      const cmd = new AdjustFragmentBoundaryCommand('frag_1', 'top', 10, [], 2);

      const result = cmd.do(ast);

      // Should only pull in the 2 available messages
      const frag = result.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(4); // original 2 + 2 from above
    });

    it('should not contract beyond available entries', () => {
      // Try to contract by 10 but only 2 entries in fragment
      const cmd = new AdjustFragmentBoundaryCommand('frag_1', 'top', -10, [], 2);

      const result = cmd.do(ast);

      // Should only push out the 2 available entries
      const frag = result.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(0);
    });
  });
});

describe('MoveEntryBetweenClausesCommand (BACKLOG-083)', () => {
  let ast;

  beforeEach(() => {
    // AST: fragment with alt/else containing entries in both clauses
    ast = [
      { id: 'p_1', type: 'participant', alias: 'A' },
      { id: 'p_2', type: 'participant', alias: 'B' },
      {
        id: 'frag_1',
        type: 'fragment',
        fragmentType: 'alt',
        condition: 'success',
        entries: [
          { id: 'msg_1', type: 'message', from: 'A', to: 'B', label: 'msg1' },
          { id: 'msg_2', type: 'message', from: 'B', to: 'A', label: 'msg2' }
        ],
        elseClauses: [
          {
            condition: 'failure',
            entries: [
              { id: 'msg_3', type: 'message', from: 'A', to: 'B', label: 'else1' },
              { id: 'msg_4', type: 'message', from: 'B', to: 'A', label: 'else2' }
            ]
          }
        ]
      }
    ];
  });

  describe('move from main to else', () => {
    it('should move one entry from main to else', () => {
      const cmd = new MoveEntryBetweenClausesCommand('frag_1', 0, 1);

      const result = cmd.do(ast);

      const frag = result.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(1);
      expect(frag.entries[0].id).toBe('msg_1');
      expect(frag.elseClauses[0].entries.length).toBe(3);
      expect(frag.elseClauses[0].entries[0].id).toBe('msg_2');
      expect(frag.elseClauses[0].entries[1].id).toBe('msg_3');
    });

    it('should move multiple entries from main to else', () => {
      const cmd = new MoveEntryBetweenClausesCommand('frag_1', 0, 2);

      const result = cmd.do(ast);

      const frag = result.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(0);
      expect(frag.elseClauses[0].entries.length).toBe(4);
      expect(frag.elseClauses[0].entries[0].id).toBe('msg_1');
      expect(frag.elseClauses[0].entries[1].id).toBe('msg_2');
    });

    it('should undo moving from main to else', () => {
      const cmd = new MoveEntryBetweenClausesCommand('frag_1', 0, 1);

      const afterDo = cmd.do(ast);
      const afterUndo = cmd.undo(afterDo);

      const frag = afterUndo.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(2);
      expect(frag.elseClauses[0].entries.length).toBe(2);
    });
  });

  describe('move from else to main', () => {
    it('should move one entry from else to main', () => {
      const cmd = new MoveEntryBetweenClausesCommand('frag_1', 0, -1);

      const result = cmd.do(ast);

      const frag = result.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(3);
      expect(frag.entries[2].id).toBe('msg_3');
      expect(frag.elseClauses[0].entries.length).toBe(1);
      expect(frag.elseClauses[0].entries[0].id).toBe('msg_4');
    });

    it('should move multiple entries from else to main', () => {
      const cmd = new MoveEntryBetweenClausesCommand('frag_1', 0, -2);

      const result = cmd.do(ast);

      const frag = result.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(4);
      expect(frag.entries[2].id).toBe('msg_3');
      expect(frag.entries[3].id).toBe('msg_4');
      expect(frag.elseClauses[0].entries.length).toBe(0);
    });

    it('should undo moving from else to main', () => {
      const cmd = new MoveEntryBetweenClausesCommand('frag_1', 0, -1);

      const afterDo = cmd.do(ast);
      const afterUndo = cmd.undo(afterDo);

      const frag = afterUndo.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(2);
      expect(frag.elseClauses[0].entries.length).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should return unchanged AST if fragment not found', () => {
      const cmd = new MoveEntryBetweenClausesCommand('nonexistent', 0, 1);

      const result = cmd.do(ast);

      expect(result).toEqual(ast);
    });

    it('should return unchanged AST if else clause not found', () => {
      const cmd = new MoveEntryBetweenClausesCommand('frag_1', 5, 1);

      const result = cmd.do(ast);

      expect(result).toEqual(ast);
    });

    it('should not move more than available from main', () => {
      const cmd = new MoveEntryBetweenClausesCommand('frag_1', 0, 10);

      const result = cmd.do(ast);

      const frag = result.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(0);
      expect(frag.elseClauses[0].entries.length).toBe(4);
    });

    it('should not move more than available from else', () => {
      const cmd = new MoveEntryBetweenClausesCommand('frag_1', 0, -10);

      const result = cmd.do(ast);

      const frag = result.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(4);
      expect(frag.elseClauses[0].entries.length).toBe(0);
    });

    it('should do nothing for delta of 0', () => {
      const cmd = new MoveEntryBetweenClausesCommand('frag_1', 0, 0);

      const result = cmd.do(ast);

      const frag = result.find(n => n.id === 'frag_1');
      expect(frag.entries.length).toBe(2);
      expect(frag.elseClauses[0].entries.length).toBe(2);
    });
  });
});

describe('EditFragmentConditionCommand (BACKLOG-084)', () => {
  let ast;

  beforeEach(() => {
    ast = [
      { id: 'p_1', type: 'participant', alias: 'A' },
      { id: 'p_2', type: 'participant', alias: 'B' },
      {
        id: 'frag_1',
        type: 'fragment',
        fragmentType: 'alt',
        condition: 'x > 0',
        entries: [
          { id: 'msg_1', type: 'message', from: 'A', to: 'B', label: 'msg1' }
        ],
        elseClauses: []
      }
    ];
  });

  it('should update fragment condition', () => {
    const cmd = new EditFragmentConditionCommand('frag_1', 'x > 0', 'success');

    const result = cmd.do(ast);

    const frag = result.find(n => n.id === 'frag_1');
    expect(frag.condition).toBe('success');
  });

  it('should undo condition change', () => {
    const cmd = new EditFragmentConditionCommand('frag_1', 'x > 0', 'success');

    const afterDo = cmd.do(ast);
    const afterUndo = cmd.undo(afterDo);

    const frag = afterUndo.find(n => n.id === 'frag_1');
    expect(frag.condition).toBe('x > 0');
  });

  it('should handle empty condition', () => {
    const cmd = new EditFragmentConditionCommand('frag_1', 'x > 0', '');

    const result = cmd.do(ast);

    const frag = result.find(n => n.id === 'frag_1');
    expect(frag.condition).toBe('');
  });

  it('should not modify non-fragment nodes', () => {
    const cmd = new EditFragmentConditionCommand('p_1', 'x > 0', 'success');

    const result = cmd.do(ast);

    // Participant should be unchanged
    const participant = result.find(n => n.id === 'p_1');
    expect(participant.condition).toBeUndefined();
  });

  it('should not modify other fragments', () => {
    const astWithTwoFragments = [
      ...ast,
      {
        id: 'frag_2',
        type: 'fragment',
        fragmentType: 'loop',
        condition: 'i < 10',
        entries: [],
        elseClauses: []
      }
    ];

    const cmd = new EditFragmentConditionCommand('frag_1', 'x > 0', 'success');

    const result = cmd.do(astWithTwoFragments);

    const frag1 = result.find(n => n.id === 'frag_1');
    const frag2 = result.find(n => n.id === 'frag_2');
    expect(frag1.condition).toBe('success');
    expect(frag2.condition).toBe('i < 10');
  });
});

describe('EditElseConditionCommand (BACKLOG-085)', () => {
  let ast;

  beforeEach(() => {
    ast = [
      { id: 'p_1', type: 'participant', alias: 'A' },
      { id: 'p_2', type: 'participant', alias: 'B' },
      {
        id: 'frag_1',
        type: 'fragment',
        fragmentType: 'alt',
        condition: 'success',
        entries: [
          { id: 'msg_1', type: 'message', from: 'A', to: 'B', label: 'msg1' }
        ],
        elseClauses: [
          {
            condition: 'failure',
            entries: [
              { id: 'msg_2', type: 'message', from: 'A', to: 'B', label: 'else msg' }
            ]
          }
        ]
      }
    ];
  });

  it('should update else clause condition', () => {
    const cmd = new EditElseConditionCommand('frag_1', 0, 'failure', 'error');

    const result = cmd.do(ast);

    const frag = result.find(n => n.id === 'frag_1');
    expect(frag.elseClauses[0].condition).toBe('error');
  });

  it('should undo else condition change', () => {
    const cmd = new EditElseConditionCommand('frag_1', 0, 'failure', 'error');

    const afterDo = cmd.do(ast);
    const afterUndo = cmd.undo(afterDo);

    const frag = afterUndo.find(n => n.id === 'frag_1');
    expect(frag.elseClauses[0].condition).toBe('failure');
  });

  it('should handle empty else condition', () => {
    const cmd = new EditElseConditionCommand('frag_1', 0, 'failure', '');

    const result = cmd.do(ast);

    const frag = result.find(n => n.id === 'frag_1');
    expect(frag.elseClauses[0].condition).toBe('');
  });

  it('should not modify main fragment condition', () => {
    const cmd = new EditElseConditionCommand('frag_1', 0, 'failure', 'error');

    const result = cmd.do(ast);

    const frag = result.find(n => n.id === 'frag_1');
    expect(frag.condition).toBe('success');
    expect(frag.elseClauses[0].condition).toBe('error');
  });

  it('should handle multiple else clauses', () => {
    const astWithMultipleElse = [
      {
        id: 'frag_1',
        type: 'fragment',
        fragmentType: 'alt',
        condition: 'case 1',
        entries: [],
        elseClauses: [
          { condition: 'case 2', entries: [] },
          { condition: 'case 3', entries: [] }
        ]
      }
    ];

    const cmd = new EditElseConditionCommand('frag_1', 1, 'case 3', 'default');

    const result = cmd.do(astWithMultipleElse);

    const frag = result.find(n => n.id === 'frag_1');
    expect(frag.elseClauses[0].condition).toBe('case 2');
    expect(frag.elseClauses[1].condition).toBe('default');
  });

  it('should not modify non-fragment nodes', () => {
    const cmd = new EditElseConditionCommand('p_1', 0, 'failure', 'error');

    const result = cmd.do(ast);

    // Participant should be unchanged
    const participant = result.find(n => n.id === 'p_1');
    expect(participant.elseClauses).toBeUndefined();
  });
});

describe('ChangeEntrySpacingCommand (BACKLOG-086)', () => {
  let ast;

  beforeEach(() => {
    ast = [
      { id: 'p_1', type: 'participant', alias: 'A' },
      { id: 'p_2', type: 'participant', alias: 'B' },
      { id: 'msg_1', type: 'message', from: 'A', to: 'B', label: 'msg1' }
    ];
  });

  describe('with existing directive', () => {
    beforeEach(() => {
      ast = [
        { id: 'p_1', type: 'participant', alias: 'A' },
        { id: 'd_1', type: 'directive', directiveType: 'entryspacing', value: 1.0 },
        { id: 'msg_1', type: 'message', from: 'A', to: 'B', label: 'msg1' }
      ];
    });

    it('should update existing directive value', () => {
      const cmd = new ChangeEntrySpacingCommand(1.0, 1.5, 'd_1');

      const result = cmd.do(ast);

      const directive = result.find(n => n.id === 'd_1');
      expect(directive.value).toBe(1.5);
    });

    it('should undo directive value change', () => {
      const cmd = new ChangeEntrySpacingCommand(1.0, 1.5, 'd_1');

      const afterDo = cmd.do(ast);
      const afterUndo = cmd.undo(afterDo);

      const directive = afterUndo.find(n => n.id === 'd_1');
      expect(directive.value).toBe(1.0);
    });
  });

  describe('without existing directive', () => {
    it('should create new directive', () => {
      const cmd = new ChangeEntrySpacingCommand(1.0, 1.2, null);

      const result = cmd.do(ast);

      const directive = result.find(n => n.type === 'directive' && n.directiveType === 'entryspacing');
      expect(directive).toBeDefined();
      expect(directive.value).toBe(1.2);
    });

    it('should insert directive after participants', () => {
      const cmd = new ChangeEntrySpacingCommand(1.0, 1.2, null);

      const result = cmd.do(ast);

      // Should be: p_1, p_2, directive, msg_1
      expect(result[0].type).toBe('participant');
      expect(result[1].type).toBe('participant');
      expect(result[2].type).toBe('directive');
      expect(result[3].type).toBe('message');
    });

    it('should undo by removing created directive', () => {
      const cmd = new ChangeEntrySpacingCommand(1.0, 1.2, null);

      const afterDo = cmd.do(ast);
      const afterUndo = cmd.undo(afterDo);

      const directive = afterUndo.find(n => n.type === 'directive' && n.directiveType === 'entryspacing');
      expect(directive).toBeUndefined();
      expect(afterUndo.length).toBe(3);
    });
  });
});

// ============================================================================
// AddParticipantCommand Tests (BACKLOG-089)
// ============================================================================

describe('AddParticipantCommand (BACKLOG-089)', () => {
  let ast;

  beforeEach(() => {
    ast = [
      { id: 'p_1', type: 'participant', participantType: 'participant', alias: 'Alice', displayName: 'Alice' },
      { id: 'p_2', type: 'participant', participantType: 'participant', alias: 'Bob', displayName: 'Bob' },
      { id: 'msg_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' }
    ];
  });

  describe('do', () => {
    it('should add a participant', () => {
      const cmd = new AddParticipantCommand('participant', 'Charlie', 'Charlie');

      const result = cmd.do(ast);

      expect(result.length).toBe(4);
      const charlie = result.find(n => n.alias === 'Charlie');
      expect(charlie).toBeDefined();
      expect(charlie.type).toBe('participant');
      expect(charlie.participantType).toBe('participant');
    });

    it('should add participant after existing participants', () => {
      const cmd = new AddParticipantCommand('participant', 'Charlie', 'Charlie');

      const result = cmd.do(ast);

      // Should be: Alice, Bob, Charlie, message
      expect(result[0].alias).toBe('Alice');
      expect(result[1].alias).toBe('Bob');
      expect(result[2].alias).toBe('Charlie');
      expect(result[3].type).toBe('message');
    });

    it('should add actor type', () => {
      const cmd = new AddParticipantCommand('actor', 'User', 'End User');

      const result = cmd.do(ast);

      const user = result.find(n => n.alias === 'User');
      expect(user.participantType).toBe('actor');
      expect(user.displayName).toBe('End User');
    });

    it('should add database type', () => {
      const cmd = new AddParticipantCommand('database', 'DB', 'Database');

      const result = cmd.do(ast);

      const db = result.find(n => n.alias === 'DB');
      expect(db.participantType).toBe('database');
    });

    it('should add queue type', () => {
      const cmd = new AddParticipantCommand('queue', 'Q', 'Message Queue');

      const result = cmd.do(ast);

      const q = result.find(n => n.alias === 'Q');
      expect(q.participantType).toBe('queue');
    });

    it('should handle empty AST', () => {
      const cmd = new AddParticipantCommand('participant', 'First', 'First');

      const result = cmd.do([]);

      expect(result.length).toBe(1);
      expect(result[0].alias).toBe('First');
    });

    it('should insert at specific index', () => {
      const cmd = new AddParticipantCommand('participant', 'Middle', 'Middle', 1);

      const result = cmd.do(ast);

      expect(result[1].alias).toBe('Middle');
    });

    it('should generate unique ID', () => {
      const cmd = new AddParticipantCommand('participant', 'Charlie', 'Charlie');

      const result = cmd.do(ast);

      const charlie = result.find(n => n.alias === 'Charlie');
      expect(charlie.id).toMatch(/^p_/);
    });
  });

  describe('undo', () => {
    it('should remove the added participant', () => {
      const cmd = new AddParticipantCommand('participant', 'Charlie', 'Charlie');

      const afterDo = cmd.do(ast);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo.length).toBe(3);
      const charlie = afterUndo.find(n => n.alias === 'Charlie');
      expect(charlie).toBeUndefined();
    });

    it('should restore original AST structure', () => {
      const cmd = new AddParticipantCommand('participant', 'Charlie', 'Charlie');

      const afterDo = cmd.do(ast);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo[0].alias).toBe('Alice');
      expect(afterUndo[1].alias).toBe('Bob');
      expect(afterUndo[2].type).toBe('message');
    });
  });

  describe('getParticipantId', () => {
    it('should return the generated participant ID', () => {
      const cmd = new AddParticipantCommand('participant', 'Test', 'Test');

      const result = cmd.do(ast);
      const participantId = cmd.getParticipantId();

      const participant = result.find(n => n.id === participantId);
      expect(participant).toBeDefined();
      expect(participant.alias).toBe('Test');
    });
  });
});

// ============================================================================
// AddFragmentCommand Tests (BACKLOG-091)
// ============================================================================

describe('AddFragmentCommand (BACKLOG-091)', () => {
  let ast;

  beforeEach(() => {
    ast = [
      { id: 'p_1', type: 'participant', participantType: 'participant', alias: 'Alice', displayName: 'Alice' },
      { id: 'p_2', type: 'participant', participantType: 'participant', alias: 'Bob', displayName: 'Bob' },
      { id: 'msg_1', type: 'message', from: 'Alice', to: 'Bob', label: 'Hello' }
    ];
  });

  describe('do', () => {
    it('should add an alt fragment', () => {
      const cmd = new AddFragmentCommand('alt', 'success');

      const result = cmd.do(ast);

      expect(result.length).toBe(4);
      const fragment = result.find(n => n.type === 'fragment');
      expect(fragment).toBeDefined();
      expect(fragment.fragmentType).toBe('alt');
      expect(fragment.condition).toBe('success');
    });

    it('should add a loop fragment', () => {
      const cmd = new AddFragmentCommand('loop', '10 times');

      const result = cmd.do(ast);

      const fragment = result.find(n => n.type === 'fragment');
      expect(fragment.fragmentType).toBe('loop');
      expect(fragment.condition).toBe('10 times');
    });

    it('should add an opt fragment', () => {
      const cmd = new AddFragmentCommand('opt', 'optional');

      const result = cmd.do(ast);

      const fragment = result.find(n => n.type === 'fragment');
      expect(fragment.fragmentType).toBe('opt');
    });

    it('should create empty fragment', () => {
      const cmd = new AddFragmentCommand('alt', 'test');

      const result = cmd.do(ast);

      const fragment = result.find(n => n.type === 'fragment');
      expect(fragment.entries).toEqual([]);
      expect(fragment.elseClauses).toEqual([]);
    });

    it('should insert at end by default', () => {
      const cmd = new AddFragmentCommand('alt', 'test');

      const result = cmd.do(ast);

      expect(result[3].type).toBe('fragment');
    });

    it('should insert at specific index', () => {
      const cmd = new AddFragmentCommand('alt', 'test', 1);

      const result = cmd.do(ast);

      expect(result[1].type).toBe('fragment');
    });

    it('should generate unique ID', () => {
      const cmd = new AddFragmentCommand('alt', 'test');

      const result = cmd.do(ast);

      const fragment = result.find(n => n.type === 'fragment');
      expect(fragment.id).toMatch(/^f_/);
    });

    it('should handle empty AST', () => {
      const cmd = new AddFragmentCommand('alt', 'test');

      const result = cmd.do([]);

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('fragment');
    });
  });

  describe('undo', () => {
    it('should remove the added fragment', () => {
      const cmd = new AddFragmentCommand('alt', 'test');

      const afterDo = cmd.do(ast);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo.length).toBe(3);
      const fragment = afterUndo.find(n => n.type === 'fragment');
      expect(fragment).toBeUndefined();
    });

    it('should restore original AST structure', () => {
      const cmd = new AddFragmentCommand('alt', 'test');

      const afterDo = cmd.do(ast);
      const afterUndo = cmd.undo(afterDo);

      expect(afterUndo[0].type).toBe('participant');
      expect(afterUndo[1].type).toBe('participant');
      expect(afterUndo[2].type).toBe('message');
    });
  });

  describe('getFragmentId', () => {
    it('should return the generated fragment ID', () => {
      const cmd = new AddFragmentCommand('loop', 'forever');

      const result = cmd.do(ast);
      const fragmentId = cmd.getFragmentId();

      const fragment = result.find(n => n.id === fragmentId);
      expect(fragment).toBeDefined();
      expect(fragment.fragmentType).toBe('loop');
    });
  });
});

describe('MoveNoteToParticipantCommand', () => {
  let ast;

  beforeEach(() => {
    ast = [
      { type: 'participant', alias: 'alice', label: 'Alice', id: 'p1' },
      { type: 'participant', alias: 'bob', label: 'Bob', id: 'p2' },
      { type: 'participant', alias: 'charlie', label: 'Charlie', id: 'p3' },
      { type: 'note', id: 'n1', noteType: 'note', placement: 'right', participants: ['alice'], text: 'Hello note' },
      { type: 'message', from: 'alice', to: 'bob', label: 'msg', id: 'm1' }
    ];
  });

  describe('do', () => {
    it('should change note participant', () => {
      const cmd = new MoveNoteToParticipantCommand('n1', 'alice', 'bob');

      const result = cmd.do(ast);
      const note = result.find(n => n.id === 'n1');

      expect(note.participants).toEqual(['bob']);
    });

    it('should not modify other nodes', () => {
      const cmd = new MoveNoteToParticipantCommand('n1', 'alice', 'bob');

      const result = cmd.do(ast);

      expect(result.find(n => n.id === 'p1').alias).toBe('alice');
      expect(result.find(n => n.id === 'm1').from).toBe('alice');
    });

    it('should preserve other note properties', () => {
      const cmd = new MoveNoteToParticipantCommand('n1', 'alice', 'charlie');

      const result = cmd.do(ast);
      const note = result.find(n => n.id === 'n1');

      expect(note.noteType).toBe('note');
      expect(note.placement).toBe('right');
      expect(note.text).toBe('Hello note');
    });
  });

  describe('undo', () => {
    it('should restore original participant', () => {
      const cmd = new MoveNoteToParticipantCommand('n1', 'alice', 'bob');

      const afterDo = cmd.do(ast);
      const afterUndo = cmd.undo(afterDo);
      const note = afterUndo.find(n => n.id === 'n1');

      expect(note.participants).toEqual(['alice']);
    });
  });

  describe('notes inside fragments', () => {
    let fragmentAst;

    beforeEach(() => {
      fragmentAst = [
        { type: 'participant', alias: 'alice', label: 'Alice', id: 'p1' },
        { type: 'participant', alias: 'bob', label: 'Bob', id: 'p2' },
        {
          type: 'fragment',
          id: 'f1',
          fragmentType: 'alt',
          entries: [
            { type: 'note', id: 'n1', noteType: 'note', placement: 'left', participants: ['alice'], text: 'Note in fragment' }
          ],
          elseClauses: [
            {
              condition: 'else',
              entries: [
                { type: 'note', id: 'n2', noteType: 'note', placement: 'right', participants: ['bob'], text: 'Note in else' }
              ]
            }
          ]
        }
      ];
    });

    it('should move note inside fragment entries', () => {
      const cmd = new MoveNoteToParticipantCommand('n1', 'alice', 'bob');

      const result = cmd.do(fragmentAst);
      const fragment = result.find(n => n.id === 'f1');
      const note = fragment.entries.find(e => e.id === 'n1');

      expect(note.participants).toEqual(['bob']);
    });

    it('should move note inside else clause', () => {
      const cmd = new MoveNoteToParticipantCommand('n2', 'bob', 'alice');

      const result = cmd.do(fragmentAst);
      const fragment = result.find(n => n.id === 'f1');
      const note = fragment.elseClauses[0].entries.find(e => e.id === 'n2');

      expect(note.participants).toEqual(['alice']);
    });

    it('should undo move inside fragment', () => {
      const cmd = new MoveNoteToParticipantCommand('n1', 'alice', 'bob');

      const afterDo = cmd.do(fragmentAst);
      const afterUndo = cmd.undo(afterDo);
      const fragment = afterUndo.find(n => n.id === 'f1');
      const note = fragment.entries.find(e => e.id === 'n1');

      expect(note.participants).toEqual(['alice']);
    });
  });

  describe('description', () => {
    it('should have descriptive name', () => {
      const cmd = new MoveNoteToParticipantCommand('n1', 'alice', 'bob');

      expect(cmd.description).toBe('Move note to bob');
    });
  });
});
