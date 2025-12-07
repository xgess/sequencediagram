# Architecture Documentation

## Core Architectural Principles

### Single Source of Truth: The AST

The Abstract Syntax Tree (AST) is the **only source of truth** in the application. Both the text editor and SVG diagram are views that are derived from the AST.

```
User Edit (text OR diagram)
    ↓
Parse/Modify AST ← [Single Source of Truth]
    ↓
    ├→ Serialize to text (CodeMirror view)
    └→ Render to SVG (Diagram view)
```

**Key implications:**
- Text is not authoritative; it's a serialized representation of the AST
- SVG is not authoritative; it's a rendered representation of the AST
- All edits, whether from text or diagram, modify the AST
- Changes propagate from AST to both views

### Immutable AST Updates with Command Pattern

To support undo/redo (100 levels per requirements), we use immutable AST operations wrapped in commands.

**Command Structure:**
```javascript
{
  do: (ast) => newAst,      // Returns modified AST
  undo: (ast) => oldAst,    // Returns previous state
  description: "Move message target"
}
```

**History Management:**
- Maintain a command history stack
- Undo: pop command, call `.undo()`, update current AST
- Redo: push command back, call `.do()`, update current AST
- Both text edits AND diagram interactions create commands

**Note:** CodeMirror has its own undo stack for raw typing. We integrate with it such that:
- Parse events (when text changes stabilize) create "ReplaceAST" commands
- Our command stack handles structural edits and diagram interactions

### AST Node Identity

Every AST node receives a **stable UUID** during parsing:

```javascript
{
  id: 'msg_a3f7b2c1',  // Stable identifier
  type: 'message',
  from: 'A',
  to: 'B',
  // ... other fields
}
```

**Why UUIDs:**
- Array indices break when nodes are reordered
- Enable stable references during drag operations
- Simplify SVG→AST mapping via data attributes
- Support future features (selection, multi-edit)

### Bidirectional Mapping: SVG ↔ AST

SVG elements carry data attributes linking to AST nodes:

```html
<g data-node-id="msg_a3f7b2c1" class="message">
  <!-- rendered message -->
</g>
```

**Interaction flow:**
1. User clicks/drags SVG element
2. Read `data-node-id` attribute
3. Look up AST node by ID
4. Create command to modify that node
5. Execute command → new AST → re-render

No complex bidirectional mapping structures needed; DOM data attributes are sufficient.

---

## Data Model

### AST Structure

The AST is a **flat array** of nodes representing the diagram in document order:

```javascript
const ast = [
  { id: 'p1', type: 'participant', alias: 'A', displayName: 'Alice', ... },
  { id: 'c1', type: 'comment', text: '// This is the setup phase' },
  { id: 'm1', type: 'message', from: 'A', to: 'B', label: 'Request', ... },
  { id: 'bl1', type: 'blankline' },
  { id: 'm2', type: 'message', from: 'B', to: 'A', label: 'Response', ... },
  { id: 'f1', type: 'fragment', fragmentType: 'alt', condition: 'success', 
    entries: [/* nested node IDs */], ... },
  // ... more nodes
]
```

**Node Types** (representative, not exhaustive):
- `participant` - All participant types (participant, actor, database, etc.)
- `message` - Arrows between participants
- `fragment` - alt, loop, opt, etc. with nested entries
- `note` - Notes and boxes (note, box, abox, rbox, ref, state)
- `activation` - activate/deactivate lifecycle
- `spacing` - space, participantspacing, entryspacing
- `directive` - title, frame, autonumber, linear, etc.
- `comment` - Single or multi-line comments
- `blankline` - Semantic whitespace between groups
- `divider` - Horizontal dividers
- `lifecycle` - create, destroy, destroyafter, destroysilent
- `participantgroup` - Grouping with nesting

**First-class Comments and Blank Lines:**
Comments and blank lines are AST nodes, not formatting metadata. This preserves:
- Grouping intent (blank lines separate logical sections)
- Documentation (comments stay with relevant code)
- User formatting preferences

When rendering SVG, these nodes are skipped or rendered as faint overlays. When serializing text, they're written exactly where they appear in the AST.

### Fragment Nesting

Fragments contain references to their child entries by ID:

```javascript
{
  id: 'f1',
  type: 'fragment',
  fragmentType: 'alt',
  condition: 'user authenticated',
  entries: ['m3', 'm4'],  // IDs of messages inside this fragment
  elseClauses: [
    { condition: 'invalid credentials', entries: ['m5', 'n1'] }
  ]
}
```

When rendering or serializing, traverse the flat AST but respect fragment boundaries. Fragments don't create a separate tree hierarchy—they reference positions in the flat array.

### Styling Data

Styling information is attached directly to relevant nodes:

```javascript
{
  id: 'p1',
  type: 'participant',
  alias: 'A',
  displayName: 'Alice',
  style: {
    fill: '#lightblue',
    border: '#green',
    borderWidth: 3,
    borderStyle: 'dashed'
  }
}
```

Named styles are stored separately and referenced:

```javascript
const namedStyles = {
  'myWarning': {
    fill: '#white',
    border: '#red',
    borderWidth: 2,
    borderStyle: 'dashed',
    textMarkup: '**<color:#red>'
  }
};

// In node:
{
  id: 'n1',
  type: 'note',
  styleRef: 'myWarning',  // Reference to named style
  // ...
}
```

---

## Technology Stack

### Core Technologies

| Technology | Choice | Rationale |
|------------|--------|-----------|
| **Language** | Vanilla JavaScript ES6+ | No build step, no transpilation, future-proof |
| **Module System** | ES Modules | Native browser support, clean imports |
| **Parser** | Hand-written recursive descent | Simple syntax, better error messages, no dependencies |
| **Rendering** | SVG (native DOM) | Direct element manipulation, inspectable, CSS styling |
| **Text Editor** | CodeMirror 5 | Proven, lightweight, syntax highlighting support |
| **Compression** | lz-string 1.5.0 | URL sharing (matches original site) |
| **SVG Export** | Canvas2Svg | SVG file generation |
| **Icons** | Font Awesome 6 + Material Design Icons | Match original site capabilities |
| **Security** | DOMPurify | Sanitize embedded SVG icons |

### Build and Deployment

- **No build step for development:** Open `index.html` in browser, works immediately
- **Optional minification for production:** TBD in Phase 5
- **Docker:** nginx serving static files
- **Hosting:** Cloudflare (specific service TBD)

### File Structure

```
/
├── src/
│   ├── ast/
│   │   ├── nodes.js           # AST node type definitions
│   │   ├── parser.js          # Text → AST
│   │   └── serializer.js      # AST → Text
│   ├── rendering/
│   │   ├── renderer.js        # AST → SVG (main)
│   │   ├── participants.js    # Render participant boxes
│   │   ├── messages.js        # Render arrows
│   │   ├── fragments.js       # Render alt/loop/etc boxes
│   │   ├── notes.js           # Render notes/boxes
│   │   └── layout.js          # Calculate positions
│   ├── commands/
│   │   ├── command.js         # Command base class
│   │   ├── history.js         # Undo/redo stack
│   │   └── operations.js      # Specific mutation commands
│   ├── editor/
│   │   ├── editor.js          # CodeMirror integration
│   │   └── syntax.js          # Syntax highlighting mode
│   ├── interactions/
│   │   ├── mouse.js           # Click/drag handlers
│   │   ├── keyboard.js        # Keyboard shortcuts
│   │   └── tools.js           # Interaction modes
│   ├── export/
│   │   ├── png.js             # PNG export
│   │   ├── svg.js             # SVG export
│   │   └── txt.js             # Text file download
│   ├── storage/
│   │   ├── filesystem.js      # File System Access API
│   │   └── localstorage.js    # Browser localStorage
│   └── main.js                # App initialization
├── lib/                        # Vendored dependencies
│   ├── codemirror/
│   ├── lz-string/
│   ├── canvas2svg/
│   ├── fontawesome/
│   ├── materialdesignicons/
│   └── dompurify/
├── public/
│   ├── index.html
│   └── styles.css
├── tests/
│   ├── parser.test.js
│   ├── renderer.test.js
│   └── commands.test.js
├── examples/                   # Sample .txt diagrams
├── docs/                       # This directory
└── docker/
    ├── Dockerfile
    └── nginx.conf
```

---

## Data Flow

### Parse → Render Cycle

**Initial Load or Text Edit:**

```
1. User types in CodeMirror
2. [Debounce 300ms]
3. Parse text → AST with UUIDs
4. Create ReplaceAST command
5. Execute command
6. Serialize AST → update CodeMirror (if different)
7. Render AST → update SVG
```

**Diagram Interaction:**

```
1. User drags message endpoint
2. Read data-node-id from SVG element
3. Calculate new target participant
4. Create MoveMessageTarget command
5. Execute command → new AST
6. Serialize AST → update CodeMirror
7. Render AST → update SVG
```

### Command Execution Flow

```javascript
// Example command execution
function executeCommand(command) {
  const newAst = command.do(currentAst);
  commandHistory.push(command);
  currentAst = newAst;
  
  // Update both views
  updateTextEditor(serialize(currentAst));
  updateDiagram(render(currentAst));
}

// Undo
function undo() {
  if (commandHistory.length === 0) return;
  const command = commandHistory.pop();
  const newAst = command.undo(currentAst);
  redoStack.push(command);
  currentAst = newAst;
  
  updateTextEditor(serialize(currentAst));
  updateDiagram(render(currentAst));
}
```

---

## Key Algorithms

### Parser Strategy

**Approach:** Hand-written, line-by-line parser

**Process:**
1. Split input into lines
2. For each line, match against syntax patterns
3. Create AST node with UUID
4. Handle multi-line constructs (fragments, participant groups)
5. On error: create error node, continue parsing next line

**Why not a parser generator:**
- Syntax is simple enough (simpler than markdown)
- Better control over error recovery
- No additional dependencies
- Easier debugging with custom error messages

### Rendering Strategy

**Approach:** Full re-render on every AST change

**Process:**
1. Calculate layout (participant positions, message Y-coordinates)
2. Clear SVG container
3. Render participants
4. Render messages, fragments, notes in document order
5. Attach data-node-id to all interactive elements

**Why full re-render:**
- Simpler implementation
- Avoid subtle DOM sync bugs
- Performance is acceptable for realistic diagrams (<100 entries)
- If needed later, optimize with virtual DOM or selective updates

**Layout Calculation:**
- Single pass through AST to calculate positions
- Participants: distribute horizontally
- Messages/fragments/notes: assign Y-coordinates based on entry order
- Handle spacing directives (space, participantspacing, entryspacing)

### Serialization Strategy

**Approach:** Canonical formatting (like Prettier)

**Process:**
1. Traverse AST in order
2. Emit each node as text according to syntax rules
3. Preserve comments and blank lines in position
4. Apply consistent indentation for fragments

**Trade-off:**
Users lose custom formatting (whitespace, alignment) when making diagram edits. This is acceptable because:
- They opted into visual editing
- Consistent formatting is predictable
- Alternative (preserving formatting) is extremely complex

---

## Open Questions / Future Decisions

These decisions are deferred to implementation phases:

1. **Testing framework:** Jest, Vitest, or minimal test runner? (Decide in Phase 1)
2. **Browser support:** Evergreen only, or polyfills for older browsers? (Decide in Phase 5)
3. **Minification:** Include minified versions or serve raw source? (Decide in Phase 5)
4. **CodeMirror version:** Stick with CM5 or migrate to CM6? (CM5 for now, revisit later)
5. **Performance optimizations:** Virtual DOM, canvas layer for selections, etc. (Only if needed)
6. **Advanced undo/redo:** Integration with CodeMirror's undo, per-character vs per-parse (Decide in Phase 2)

---

## Development Principles

1. **Build for incremental delivery:** Each phase should produce working software
2. **Optimize for LLM context:** Small, focused modules that fit in context windows
3. **Hermetic from day one:** No CDN dependencies, all libraries vendored
4. **Test core logic:** Parser and command operations must be tested
5. **Defer premature optimization:** Measure before optimizing

---

## Notes for Implementation

### Phase 1 Focus
Start with stateless parse → render:
- Parser: text → AST
- Renderer: AST → SVG
- No editor integration
- No interactions
- Simple HTML test harness with textarea

### Phase 2 Focus
Add editor and live updates:
- Integrate CodeMirror
- Wire parse → render on text change
- Syntax highlighting
- Error display

### Phase 3 Focus
Add diagram interactions:
- Mouse handlers
- Command pattern implementation
- AST mutations
- Bidirectional sync

This architecture supports the hermetic, feature-complete clone described in REQUIREMENTS.md while maintaining simplicity and developer-friendliness.
