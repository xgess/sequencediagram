# Project Context

## What This Is

A hermetic, browser-based sequence diagram tool cloning sequencediagram.org. Built in vanilla JavaScript with zero backend dependencies.

**For comprehensive details, see:**
- [`REQUIREMENTS.md`](REQUIREMENTS.md) - Complete feature inventory
- [`ARCHITECTURE.md`](ARCHITECTURE.md) - Technical decisions and data flow
- [`DESIGN.md`](DESIGN.md) - AST structure, algorithms, implementation details
- [`BACKLOG.md`](BACKLOG.md) - Granular implementation tasks

---

## Humility for LLMs

LLMs are not people, they are tools. LLMs do not author commits or accomplish tasks in the same way that hammers do not build picnic tables. Humans that use LLMs author commits and accomplish tasks. Maybe if LLMs do a really _really_ good job, this will change. 

---

## Coding Style

### JavaScript
- **ES6+ modules** - Native imports, no transpiling
- **Functional where possible** - Pure functions, immutable data patterns
- **Explicit over clever** - Readable code > terse code
- **No classes unless needed** - Prefer factory functions and closures
- **Named exports** - `export function parse()` not `export default`

### Naming Conventions
```javascript
// Functions: verbs, camelCase
function calculateLayout(ast) { }
function renderParticipant(node) { }

// Variables: nouns, camelCase
const participantMap = new Map();
const currentAst = [];

// Constants: SCREAMING_SNAKE for true constants
const MAX_HISTORY_SIZE = 100;
const DEFAULT_SPACING = 50;

// Private helpers: leading underscore (if needed)
function _generateId() { }
```

### File Organization
- One primary export per file
- Helper functions below main export
- Imports at top, grouped: stdlib → lib → local
- 200-300 lines max per file (split if larger)

### Comments
- **Why, not what** - Code explains what, comments explain why
- **Complex algorithms** - Document approach before implementation
- **TODOs** - Tag with phase: `// TODO(Phase3): Add undo support`
- **No commented-out code** - Delete it, git has history

### Error Handling
```javascript
// Create error nodes, don't throw during parse
if (!isValidSyntax(line)) {
  return { type: 'error', message: 'Invalid syntax', text: line };
}

// Throw for programmer errors
if (!ast) {
  throw new Error('AST is required'); // Should never happen
}
```

---

## Development Workflow

### Working on a Task
1. Read the backlog item (e.g., `BACKLOG-042`)
2. Reference relevant sections of ARCHITECTURE.md and DESIGN.md
3. Implement the focused change
4. Write/update tests
5. Commit with: `BACKLOG-042: Brief description`

### Testing Philosophy
- **Integration over unit** during rapid development
- **Test behavior, not implementation**
- **Happy path + edge cases** - Don't test every permutation
- **Add unit tests** for complex algorithms if needed later

### When to Split Work
Split into multiple commits if:
- Task touches >3 files significantly
- Natural checkpoint exists (e.g., parse complete, render separate)
- You're >2 hours in

Otherwise, keep it atomic.

---

## Key Architectural Points

### Single Source of Truth: The AST
```
User Edit (text or diagram) → Update AST → Render both views
```
Text and SVG are **views**, not sources. AST is authoritative.

### Immutability
- AST updates return new AST (don't mutate in place)
- Command pattern wraps mutations for undo/redo
- Phase 1: Direct replacement is OK, commands come in Phase 3

### Node Identity
Every AST node gets a UUID (`id: 'msg_a3f7b2c1'`) for stable references during interactions.

### Flat AST with ID References
Fragments don't nest nodes—they reference child IDs:
```javascript
[
  { id: 'f1', type: 'fragment', entries: ['m1', 'm2'] },
  { id: 'm1', type: 'message', ... },
  { id: 'm2', type: 'message', ... }
]
```

### Full Re-render
Clear SVG and redraw on every change. Simple, correct, fast enough. Optimize later if needed.

---

## Common Patterns

### Parsing Pattern
```javascript
function parseSomething(line, lineNumber) {
  const match = line.match(/^keyword (.+)$/);
  if (!match) return null;
  
  return {
    id: generateId('type'),
    type: 'typename',
    field: match[1],
    sourceLineStart: lineNumber,
    sourceLineEnd: lineNumber
  };
}
```

### Rendering Pattern
```javascript
function renderSomething(node, layout) {
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('data-node-id', node.id);
  group.setAttribute('class', 'something');
  
  // Create child elements
  const rect = document.createElementNS(SVG_NS, 'rect');
  // ... set attributes
  group.appendChild(rect);
  
  return group;
}
```

### Serialization Pattern
```javascript
function serializeSomething(node) {
  let output = 'keyword ';
  if (node.field) output += node.field;
  if (node.style) output += formatStyle(node.style);
  return output;
}
```

---

## What NOT to Do

- ❌ Don't add dependencies without discussion (hermetic = zero deps)
- ❌ Don't use CDNs (vendor everything to lib/)
- ❌ Don't add build steps (no webpack, no babel)
- ❌ Don't mutate AST in place (return new objects)
- ❌ Don't over-engineer Phase 1 (YAGNI until Phase 3)
- ❌ Don't implement features outside current phase
- ❌ Don't write comprehensive docs in code comments (link to design docs)

---

## Quick References

**Need feature details?** → REQUIREMENTS.md  
**Need architecture context?** → ARCHITECTURE.md  
**Need implementation guidance?** → DESIGN.md  
**Need next task?** → BACKLOG.md  
**Need project philosophy?** → sequence_diagram_metaplan.md

**Code structure:**
- `src/ast/` - Parsing and serialization
- `src/rendering/` - SVG rendering
- `src/commands/` - Undo/redo (Phase 3+)
- `src/editor/` - CodeMirror integration (Phase 2+)
- `src/interactions/` - Mouse/keyboard handlers (Phase 3+)

---

## Current Phase Status

**Phase 0:** ✅ Complete (Requirements, Architecture, Design, Backlog)  
**Phase 1:** 🚧 In Progress - Core stateless rendering engine  
**Next:** Phase 2 - CodeMirror integration

See BACKLOG.md for detailed task status and next items.
