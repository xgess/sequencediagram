# Architecture

## Core Principles

### Single Source of Truth: The AST

The Abstract Syntax Tree (AST) is the **only source of truth**. Both the text editor and SVG diagram are views derived from the AST.

```
User Edit (text OR diagram)
    ↓
Parse/Modify AST ← [Single Source of Truth]
    ↓
    ├→ Serialize to text (CodeMirror view)
    └→ Render to SVG (Diagram view)
```

### Command Pattern for Undo/Redo

Immutable AST operations wrapped in commands support 100 levels of undo/redo.

```javascript
class Command {
  do(ast) { }    // Returns new AST with changes applied
  undo(ast) { }  // Returns AST reverted to pre-change state
}
```

### AST Node Identity

Every node has a stable UUID for SVG↔AST mapping:

```javascript
{ id: 'msg_a3f7b2c1', type: 'message', from: 'A', to: 'B', ... }
```

SVG elements carry `data-node-id` attributes linking to AST nodes.

---

## Data Model

### AST Structure

Flat array of nodes in document order:

```javascript
const ast = [
  { id: 'p1', type: 'participant', alias: 'A', displayName: 'Alice', ... },
  { id: 'm1', type: 'message', from: 'A', to: 'B', label: 'Request', ... },
  { id: 'f1', type: 'fragment', fragmentType: 'alt', entries: [...], ... },
]
```

**Node Types:** participant, message, fragment, note, activation, spacing, directive, comment, blankline, divider, lifecycle, participantgroup

### Fragment Nesting

Fragments reference child entries by ID (flat structure with references):

```javascript
{
  type: 'fragment',
  fragmentType: 'alt',
  entries: ['m3', 'm4'],
  elseClauses: [{ condition: '...', entries: ['m5'] }]
}
```

### Styling

Inline styles on nodes:
```javascript
{ style: { fill: '#lightblue', border: '#green', borderWidth: 3 } }
```

Named styles referenced:
```javascript
{ styleRef: 'myWarning' }
```

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | Vanilla JavaScript ES6+ |
| Modules | ES Modules (native) |
| Parser | Hand-written recursive descent |
| Rendering | SVG (native DOM) |
| Editor | CodeMirror 5 |
| Compression | lz-string (URL sharing) |
| Icons | Font Awesome 7 + Material Design Icons |

---

## File Structure

```
public/                    # Deployable folder
├── index.html
├── styles.css
├── src/
│   ├── ast/
│   │   ├── parser.js      # Text → AST
│   │   ├── serializer.js  # AST → Text
│   │   └── nodes.js       # Node type definitions
│   ├── rendering/
│   │   ├── renderer.js    # AST → SVG (main)
│   │   ├── layout.js      # Position calculation
│   │   ├── participants.js
│   │   ├── messages.js
│   │   ├── fragments.js
│   │   └── notes.js
│   ├── commands/          # Undo/redo operations
│   ├── editor/            # CodeMirror integration
│   ├── interaction/       # Mouse, keyboard, dialogs
│   ├── export/            # PNG, SVG, TXT export
│   ├── storage/           # URL sharing, autosave
│   └── main.js            # App initialization
└── lib/                   # Vendored dependencies
    ├── codemirror/
    ├── lz-string/
    ├── fontawesome/
    └── mdi/
tests/                     # Vitest tests
examples/                  # Sample diagrams
docs/                      # Documentation
```

---

## Data Flow

### Text Edit → Render
```
1. User types in CodeMirror
2. Parse text → AST
3. Create ReplaceAST command
4. Execute command
5. Render AST → SVG
```

### Diagram Interaction → Render
```
1. User drags element
2. Read data-node-id from SVG
3. Create mutation command
4. Execute command → new AST
5. Serialize AST → CodeMirror
6. Render AST → SVG
```

---

## Key Design Decisions

**Full re-render on every change:** Simpler than incremental DOM updates. Performance is acceptable for realistic diagrams (<100 entries).

**Canonical serialization:** Users lose custom formatting when making diagram edits. Consistent formatting is predictable.

**Comments and blank lines are AST nodes:** Preserves user intent, grouping, and documentation.

**Hand-written parser:** Simple syntax, better error recovery, no dependencies.
