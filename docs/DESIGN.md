# Design Document

## Overview

This document provides technical design details for implementing the hermetic sequence diagram tool. It covers AST structure, parser implementation, rendering strategy, UI progression, and export/storage mechanisms.

**Design Philosophy:**
- Start lean, iterate based on learnings
- Document educated guesses explicitly
- Defer decisions that depend on implementation experience
- Prioritize integration over comprehensive unit testing

---

## Phase 1 Feature Scope

Phase 1 implements the **minimal viable parse→render loop** with these features:

**IN SCOPE:**
- Participant types: `participant`, `actor`, `database` (3 of 10 types)
- Participant styling: fill color, border color, border width/style
- Participant aliases: `participant "Display Name" as Alias`
- Messages: `->`, `->>`, `-->`, `-->>` (4 of 7+ arrow types)
- Message labels with basic text
- Fragments: `alt...else...end`, `loop...end` (2 of 16+ types)
- Comments: `//` and `#` style
- Blank lines (semantic whitespace)
- Title directive: `title My Diagram`
- Basic text markup: `**bold**`, `//italic//`, `\n` line breaks

**OUT OF SCOPE (later phases):**
- Remaining participant types (rparticipant, boundary, control, entity, icons, images)
- Advanced message features (delays, boundary messages, styling brackets)
- Remaining fragments (opt, par, break, critical, ref, etc.)
- Notes, boxes, annotations
- Activations (activate/deactivate)
- Spacing controls (space, participantspacing, entryspacing)
- Lifeline styling
- Autonumbering, linear, parallel
- Named styles and type-based styles
- Frame directive
- Participant groups
- Advanced text markup (color, size, wordwrap, etc.)
- Create/destroy lifecycle

**Rationale:** This subset exercises all core mechanisms (parsing, AST structure, fragment nesting, rendering, serialization) without overwhelming Phase 1 complexity.

---

## Command Pattern for Undo/Redo

### When to Implement

**Phase 1:** No commands - direct AST replacement only
**Phase 3:** Full command pattern for interactive diagram edits

**Rationale:** Phase 1 is read-only rendering. Commands add complexity that isn't needed until users can interact with the diagram.

### Command Structure

```javascript
class Command {
  constructor(description) {
    this.description = description;  // For debugging/logging
  }
  
  do(ast) {
    // Returns new AST with changes applied
    throw new Error('Must implement do()');
  }
  
  undo(ast) {
    // Returns AST reverted to pre-change state
    throw new Error('Must implement undo()');
  }
}
```

### Example Commands

**MoveMessageTarget:**
```javascript
class MoveMessageTargetCommand extends Command {
  constructor(messageId, oldTarget, newTarget) {
    super(`Move message target from ${oldTarget} to ${newTarget}`);
    this.messageId = messageId;
    this.oldTarget = oldTarget;
    this.newTarget = newTarget;
  }
  
  do(ast) {
    return ast.map(node => 
      node.id === this.messageId
        ? { ...node, to: this.newTarget }
        : node
    );
  }
  
  undo(ast) {
    return ast.map(node =>
      node.id === this.messageId
        ? { ...node, to: this.oldTarget }
        : node
    );
  }
}
```

**ReorderNode:**
```javascript
class ReorderNodeCommand extends Command {
  constructor(nodeId, oldIndex, newIndex) {
    super(`Reorder node from ${oldIndex} to ${newIndex}`);
    this.nodeId = nodeId;
    this.oldIndex = oldIndex;
    this.newIndex = newIndex;
  }
  
  do(ast) {
    const newAst = [...ast];
    const node = newAst.splice(this.oldIndex, 1)[0];
    newAst.splice(this.newIndex, 0, node);
    return newAst;
  }
  
  undo(ast) {
    const newAst = [...ast];
    const node = newAst.splice(this.newIndex, 1)[0];
    newAst.splice(this.oldIndex, 0, node);
    return newAst;
  }
}
```

**ReplaceAST (for text edits):**
```javascript
class ReplaceASTCommand extends Command {
  constructor(oldAst, newAst) {
    super('Text edit');
    this.oldAst = oldAst;
    this.newAst = newAst;
  }
  
  do(ast) {
    return this.newAst;
  }
  
  undo(ast) {
    return this.oldAst;
  }
}
```

### History Management

```javascript
class CommandHistory {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.undoStack = [];
    this.redoStack = [];
  }
  
  execute(command, currentAst) {
    const newAst = command.do(currentAst);
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];  // Clear redo stack on new action
    return newAst;
  }
  
  undo(currentAst) {
    if (this.undoStack.length === 0) return currentAst;
    const command = this.undoStack.pop();
    this.redoStack.push(command);
    return command.undo(currentAst);
  }
  
  redo(currentAst) {
    if (this.redoStack.length === 0) return currentAst;
    const command = this.redoStack.pop();
    this.undoStack.push(command);
    return command.do(currentAst);
  }
}
```

### Integration with CodeMirror

CodeMirror has its own undo stack for text editing. We integrate by:
- Letting CodeMirror handle character-level undo during typing
- Creating ReplaceAST command when parse completes (after debounce)
- Our history stack handles structural changes + text parse events
- Keyboard shortcuts (Ctrl-Z) go to our history first, fall back to CodeMirror if our stack is empty

---

## AST Node Schemas

### Common Fields

All AST nodes share these fields:

```javascript
{
  id: string,        // UUID generated during parse (e.g., 'msg_a3f7b2c1')
  type: string,      // Node type identifier
  sourceLineStart: number,   // Line number where node begins (1-indexed)
  sourceLineEnd: number      // Line number where node ends
}
```

**ID Generation:**
```javascript
function generateId(type) {
  // Format: {type-prefix}_{random-8-chars}
  const prefix = {
    'participant': 'p',
    'message': 'm',
    'fragment': 'f',
    'comment': 'c',
    'blankline': 'bl',
    'directive': 'd',
    'error': 'e'
  }[type] || 'n';
  
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${random}`;
}
```

Uses Math.random() for simplicity. Collisions are astronomically unlikely in single-diagram context. If collision occurs during parse, regenerate.

### Participant Node

```javascript
{
  id: 'p_...',
  type: 'participant',
  participantType: 'participant' | 'actor' | 'database' | ...,  // One of 10 types
  alias: string,                 // Short name used in messages (e.g., 'A')
  displayName: string,           // Visual label (can be multiline with \n)
  style: {
    fill: string | null,         // Fill color (e.g., '#lightblue', null if not set)
    border: string | null,       // Border color
    borderWidth: number | null,  // Border width in pixels
    borderStyle: 'solid' | 'dashed' | 'dotted' | null
  },
  sourceLineStart: number,
  sourceLineEnd: number
}
```

**Examples:**
- `participant Alice` → `{ alias: 'Alice', displayName: 'Alice', style: {} }`
- `database "My DB" as DB #lightblue #green;3;dashed` → 
  ```javascript
  {
    participantType: 'database',
    alias: 'DB',
    displayName: 'My DB',
    style: {
      fill: '#lightblue',
      border: '#green',
      borderWidth: 3,
      borderStyle: 'dashed'
    }
  }
  ```

### Message Node

```javascript
{
  id: 'm_...',
  type: 'message',
  from: string,          // Participant alias or '[' for boundary
  to: string,            // Participant alias or ']' for boundary
  arrowType: '->' | '->>' | '-->' | '-->>' | '<-' | '<->' | '-x',
  label: string,         // Message text (can contain markup)
  delay: number | null,  // Delay units for A->(5)B syntax (Phase 2+)
  style: {
    color: string | null,
    lineWidth: number | null,
    styleRef: string | null  // Reference to named style (Phase 3+)
  } | null,
  sourceLineStart: number,
  sourceLineEnd: number
}
```

**Notes:**
- `from` and `to` reference participant aliases (not IDs), resolved during layout
- Boundary messages use `'['` or `']'` as from/to
- Label contains raw text including markup like `**bold**`
- `delay` field is null in Phase 1 (syntax not yet parsed)
- `styleRef` for named styles added in Phase 3+

### Participant Alias Resolution

**Problem:** Messages reference participants by alias, but AST nodes have IDs.

**Solution:** Build an alias→node map during layout calculation:

```javascript
function buildParticipantMap(ast) {
  const map = new Map();
  for (const node of ast) {
    if (node.type === 'participant') {
      map.set(node.alias, node);
    }
  }
  return map;
}

// During layout:
const participantMap = buildParticipantMap(ast);
for (const node of ast) {
  if (node.type === 'message') {
    const fromParticipant = participantMap.get(node.from);
    const toParticipant = participantMap.get(node.to);
    if (!fromParticipant || !toParticipant) {
      // Error: undefined participant
      // Render error indicator or skip message
    }
  }
}
```

**Forward references:** Participants can be used before they're declared. Map is built once at start of layout, so order doesn't matter.

**Duplicate aliases:** Parser creates error node on duplicate. Last declaration wins in map.

### Fragment Node

```javascript
{
  id: 'f_...',
  type: 'fragment',
  fragmentType: 'alt' | 'loop' | 'opt' | 'par' | ...,  // One of 16+ types
  condition: string,           // Fragment label/condition
  entries: string[],           // Array of AST node IDs inside this fragment
  elseClauses: Array<{
    condition: string,
    entries: string[],
    style: { /* same as main */ } | null
  }>,
  style: {
    operatorColor: string | null,   // Color of fragment label background
    fill: string | null,
    border: string | null,
    borderWidth: number | null,
    borderStyle: 'solid' | 'dashed' | 'dotted' | null
  } | null,
  sourceLineStart: number,
  sourceLineEnd: number
}
```

**Fragment Nesting:**
Fragments contain child entries by ID reference, not by embedding. The flat AST array maintains document order, and fragments specify which IDs belong to them.

**Example:**
```
alt success
A->B:ok
else failure
A->B:error
end
```
Becomes:
```javascript
[
  { id: 'f1', type: 'fragment', fragmentType: 'alt', condition: 'success',
    entries: ['m1'], elseClauses: [{ condition: 'failure', entries: ['m2'] }] },
  { id: 'm1', type: 'message', from: 'A', to: 'B', label: 'ok' },
  { id: 'm2', type: 'message', from: 'A', to: 'B', label: 'error' }
]
```

### Comment Node

```javascript
{
  id: 'c_...',
  type: 'comment',
  text: string,              // Full comment text including '//' or '#'
  sourceLineStart: number,
  sourceLineEnd: number
}
```

Comments are first-class nodes. When serializing, they're written exactly where they appear in the AST. When rendering, they're optionally displayed as faint overlay text or skipped entirely.

### Blank Line Node

```javascript
{
  id: 'bl_...',
  type: 'blankline',
  sourceLineStart: number,
  sourceLineEnd: number
}
```

Blank lines preserve grouping intent. During serialization, they emit newlines. During rendering, they add visual spacing between sections.

### Directive Nodes

**Title:**
```javascript
{
  id: 't_...',
  type: 'directive',
  directiveType: 'title',
  value: string,             // Can contain markup
  sourceLineStart: number,
  sourceLineEnd: number
}
```

Other directives (frame, fontfamily, autonumber, etc.) follow the same pattern with different `directiveType` and `value` structures. These are deferred to later phases.

---

## Fragment Nesting Strategy

**Design Decision:** Fragments use **ID references in a flat AST** rather than tree embedding.

**Rationale:**
- Simpler to manipulate (move entries in/out of fragments)
- Easier serialization (single pass through array)
- Supports fragment overlap detection (if needed)
- Matches document-order thinking

**Implementation:**
1. During parsing, when encountering `alt...end`, accumulate child node IDs between markers
2. Fragment node stores array of IDs: `entries: ['m1', 'm2', 'n1']`
3. During rendering/serialization, check if current node ID is referenced by any fragment
4. Render fragment box around referenced entries

**Nested fragments:**
If a fragment contains another fragment, the inner fragment's ID appears in the outer fragment's `entries` array:
```javascript
[
  { id: 'f1', type: 'fragment', fragmentType: 'alt', entries: ['m1', 'f2', 'm3'] },
  { id: 'm1', type: 'message', ... },
  { id: 'f2', type: 'fragment', fragmentType: 'loop', entries: ['m2'] },
  { id: 'm2', type: 'message', ... },
  { id: 'm3', type: 'message', ... }
]
```

---

## Parser Design

### Overall Approach

**Line-by-line recursive descent parser:**

```javascript
function parse(text) {
  const lines = text.split('\n');
  const ast = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (!line || line.startsWith('//') || line.startsWith('#')) {
      // Handle comments and blank lines
      const node = parseCommentOrBlank(lines[i], i);
      ast.push(node);
      i++;
    } else if (line.startsWith('participant') || line.startsWith('actor') || ...) {
      const node = parseParticipant(line, i);
      ast.push(node);
      i++;
    } else if (isFragmentStart(line)) {
      const { node, endLine } = parseFragment(lines, i);
      ast.push(node);
      i = endLine + 1;
    } else if (isMessage(line)) {
      const node = parseMessage(line, i);
      ast.push(node);
      i++;
    } else {
      // Unknown syntax - create error node
      ast.push({ id: generateId(), type: 'error', text: line, sourceLineStart: i+1, sourceLineEnd: i+1 });
      i++;
    }
  }
  
  return ast;
}
```

### Multi-line Construct Parsing

**Fragment Example (`alt...else...end`):**

```javascript
function parseFragment(lines, startLine) {
  const firstLine = lines[startLine].trim();
  const match = firstLine.match(/^(alt|loop|opt)\s*(.*)/);
  const fragmentType = match[1];
  const condition = match[2];
  
  const entries = [];
  const elseClauses = [];
  let currentSection = entries;  // Track which section we're populating
  let i = startLine + 1;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (line === 'end') {
      // Fragment complete
      return {
        node: {
          id: generateId(),
          type: 'fragment',
          fragmentType,
          condition,
          entries,
          elseClauses,
          sourceLineStart: startLine + 1,
          sourceLineEnd: i + 1
        },
        endLine: i
      };
    } else if (line.startsWith('else')) {
      // Switch to else clause
      const elseCondition = line.substring(4).trim();
      const elseEntries = [];
      elseClauses.push({ condition: elseCondition, entries: elseEntries });
      currentSection = elseEntries;
      i++;
    } else {
      // Parse child entry recursively
      const childNode = parseLine(lines, i);  // Returns {node, linesConsumed}
      currentSection.push(childNode.node.id);
      ast.push(childNode.node);  // Add to flat AST
      i += childNode.linesConsumed;
    }
  }
  
  // Missing 'end' - create error
  return {
    node: { id: generateId(), type: 'error', text: 'Unclosed fragment', ... },
    endLine: i
  };
}
```

**Key points:**
- Parser maintains both fragment node and flat AST
- Child nodes are added to flat AST, IDs added to fragment's `entries`
- `else` switches which array receives subsequent IDs
- Missing `end` creates error node but doesn't crash

### Error Handling

**Strategy:** Continue parsing on errors, create error nodes

```javascript
{
  id: 'e_...',
  type: 'error',
  text: string,              // The problematic line
  message: string,           // Human-readable error
  sourceLineStart: number,
  sourceLineEnd: number
}
```

Error nodes:
- Are skipped during rendering (or rendered as red warning boxes)
- Appear in serialized text as comments: `// ERROR: message`
- Don't break the parse of subsequent lines

**Common errors:**
- Unknown participant alias in message
- Unclosed fragment
- Malformed syntax
- Unrecognized directive

---

## Text Markup Rendering

### Parsing Markup to Styled Spans

Message labels, participant names, and other text can contain markup like `**bold**`, `//italic//`, `\n`.

**Approach:** Parse markup into an intermediate structure, render to SVG `<tspan>` elements.

**Markup AST (internal to renderer):**
```javascript
[
  { type: 'text', content: 'Hello ' },
  { type: 'bold', content: 'world' },
  { type: 'text', content: '!' }
]
```

**Simple regex-based parser (Phase 1):**
```javascript
function parseMarkup(text) {
  const segments = [];
  let remaining = text;
  
  while (remaining) {
    // Check for \n
    if (remaining.startsWith('\\n')) {
      segments.push({ type: 'linebreak' });
      remaining = remaining.substring(2);
      continue;
    }
    
    // Check for **bold**
    const boldMatch = remaining.match(/^\*\*(.*?)\*\*/);
    if (boldMatch) {
      segments.push({ type: 'bold', content: boldMatch[1] });
      remaining = remaining.substring(boldMatch[0].length);
      continue;
    }
    
    // Check for //italic//
    const italicMatch = remaining.match(/^\/\/(.*?)\/\//);
    if (italicMatch) {
      segments.push({ type: 'italic', content: italicMatch[1] });
      remaining = remaining.substring(italicMatch[0].length);
      continue;
    }
    
    // Plain text until next markup
    const nextMarkup = remaining.search(/(\*\*|\/\/|\\n)/);
    if (nextMarkup === -1) {
      segments.push({ type: 'text', content: remaining });
      break;
    } else {
      segments.push({ type: 'text', content: remaining.substring(0, nextMarkup) });
      remaining = remaining.substring(nextMarkup);
    }
  }
  
  return segments;
}
```

**Rendering to SVG:**
```javascript
function renderMarkupToSVG(text, x, y) {
  const segments = parseMarkup(text);
  const tspans = [];
  let dy = 0;
  
  for (const seg of segments) {
    if (seg.type === 'linebreak') {
      dy += 20;  // Line height
      continue;
    }
    
    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    tspan.textContent = seg.content;
    tspan.setAttribute('x', x);
    tspan.setAttribute('dy', dy);
    
    if (seg.type === 'bold') {
      tspan.setAttribute('font-weight', 'bold');
    } else if (seg.type === 'italic') {
      tspan.setAttribute('font-style', 'italic');
    }
    
    tspans.push(tspan);
    dy = 0;  // Reset dy after linebreak
  }
  
  return tspans;
}
```

**Phase 1 scope:** `**bold**`, `//italic//`, `\n` only. Advanced markup (`<color>`, `<size>`, etc.) deferred to later phases.

**Nested markup:** Phase 1 doesn't handle `**//bold italic//**`. Implement if needed in Phase 3.

---

## Layout Calculation

### Y-Coordinate Assignment

**Strategy:** Single top-to-bottom pass through AST

```javascript
function calculateLayout(ast, participants) {
  let currentY = 100;  // Start Y position (below participant boxes)
  const layout = new Map();  // nodeId -> {x, y, width, height}
  const participantMap = buildParticipantMap(ast);
  
  for (const node of ast) {
    if (node.type === 'participant') {
      // Participants are positioned horizontally at top
      // Y is fixed, X calculated from order
      continue;
    }
    
    if (node.type === 'message') {
      layout.set(node.id, { y: currentY, height: 50 });
      currentY += 50 + getSpacing();
    }
    
    if (node.type === 'fragment') {
      const fragmentStart = currentY;
      currentY += 30;  // Top padding
      
      // Calculate Y for all entries inside fragment
      for (const entryId of node.entries) {
        const entryNode = findNodeById(ast, entryId);
        const entryLayout = layoutNode(entryNode, currentY, participantMap);
        layout.set(entryId, entryLayout);
        currentY = entryLayout.y + entryLayout.height + getSpacing();
      }
      
      // Handle else clauses
      for (const elseClause of node.elseClauses) {
        currentY += 20;  // Else divider
        for (const entryId of elseClause.entries) {
          const entryNode = findNodeById(ast, entryId);
          const entryLayout = layoutNode(entryNode, currentY, participantMap);
          layout.set(entryId, entryLayout);
          currentY = entryLayout.y + entryLayout.height + getSpacing();
        }
      }
      
      currentY += 30;  // Bottom padding
      layout.set(node.id, { 
        y: fragmentStart, 
        height: currentY - fragmentStart 
      });
    }
    
    if (node.type === 'blankline') {
      currentY += 20;  // Add extra spacing
    }
    
    // Comments don't affect layout
  }
  
  return { layout, totalHeight: currentY + 50 };  // Add bottom margin
}

function layoutNode(node, startY, participantMap) {
  // Recursive helper for fragment children
  if (node.type === 'message') {
    return { y: startY, height: 50 };
  }
  if (node.type === 'fragment') {
    // Nested fragment - calculate recursively
    // ... similar to above
  }
  return { y: startY, height: 0 };
}

function getSpacing() {
  return 10;  // Default spacing between entries (Phase 1)
  // Later: read from entryspacing directive
}
```

### Lifeline Rendering

**Lifelines extend from participant box to diagram bottom:**

```javascript
function renderLifelines(svg, participantMap, totalHeight) {
  const lifelineGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  lifelineGroup.id = 'lifelines';
  
  for (const [alias, participant] of participantMap) {
    const x = participant.layout.x + participant.layout.width / 2;
    const y1 = participant.layout.y + participant.layout.height;
    const y2 = totalHeight - 50;  // Extend to bottom with margin
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#ccc');
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-dasharray', '5,5');
    line.setAttribute('data-participant', alias);
    
    lifelineGroup.appendChild(line);
  }
  
  return lifelineGroup;
}
```

### SVG Dimensions

```javascript
function calculateSVGDimensions(participantMap, totalHeight) {
  let maxX = 0;
  for (const [alias, participant] of participantMap) {
    const rightEdge = participant.layout.x + participant.layout.width;
    if (rightEdge > maxX) maxX = rightEdge;
  }
  
  return {
    width: maxX + 50,   // Right margin
    height: totalHeight,
    viewBox: `0 0 ${maxX + 50} ${totalHeight}`
  };
}
```

**Application:**
```javascript
const { layout, totalHeight } = calculateLayout(ast, participants);
const { width, height, viewBox } = calculateSVGDimensions(participantMap, totalHeight);

svgElement.setAttribute('width', width);
svgElement.setAttribute('height', height);
svgElement.setAttribute('viewBox', viewBox);
```

**X-Coordinate Assignment:**
Participants are laid out left-to-right based on order of appearance in AST:
```javascript
function layoutParticipants(ast) {
  const participants = ast.filter(n => n.type === 'participant');
  let x = 50;
  const layout = new Map();
  
  for (const p of participants) {
    layout.set(p.alias, { x, y: 50, width: 100 });
    x += 150;  // Fixed spacing (for Phase 1)
  }
  
  return layout;
}
```

**Spacing controls (Phase 1):**
- Default vertical spacing between entries: 50px
- Blank lines add 20px
- Fragments add 30px top/bottom padding

Advanced spacing directives (`space`, `participantspacing`, `entryspacing`) are deferred.

---

## Rendering Strategy

### SVG Structure

```xml
<svg id="diagram" width="..." height="...">
  <defs>
    <!-- Marker definitions for arrow heads -->
  </defs>
  
  <g id="participants">
    <g data-node-id="p1" class="participant">
      <rect />
      <text />
    </g>
    <!-- ... more participants -->
  </g>
  
  <g id="lifelines">
    <line data-participant="A" />
    <!-- ... more lifelines -->
  </g>
  
  <g id="diagram-body">
    <g data-node-id="m1" class="message">
      <line />
      <text />
    </g>
    
    <g data-node-id="f1" class="fragment">
      <rect class="fragment-box" />
      <text class="fragment-label" />
      <!-- Fragment entries rendered inside -->
    </g>
    
    <!-- ... more elements -->
  </g>
</svg>
```

**Key SVG attributes:**
- `data-node-id`: Links SVG element to AST node (enables click → AST lookup)
- `data-participant`: For lifelines (enables message endpoint snapping)
- CSS classes for styling hooks

### Full Re-render Approach

**On every AST change:**
1. Clear `#diagram-body` contents
2. Recalculate layout
3. Render all participants (top)
4. Render all lifelines
5. Render all messages, fragments, notes in document order
6. Attach event listeners to interactive elements

**Performance:**
For 50 entries (realistic diagram size), full re-render is <16ms on modern hardware. Optimization deferred until proven necessary.

**Future optimization points (if needed):**
- Virtual DOM diffing
- Canvas for non-interactive layers
- Incremental layout updates

### Fragment Rendering Algorithm

**Challenge:** Fragment box must wrap child entries that are scattered in the flat AST.

**Solution:** Use layout information to calculate fragment bounds

```javascript
function renderFragment(fragment, layout, ast) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('data-node-id', fragment.id);
  group.setAttribute('class', 'fragment');
  
  // Get fragment layout (calculated earlier)
  const fragmentLayout = layout.get(fragment.id);
  
  // Determine horizontal bounds (min/max X of participants involved)
  const participantXPositions = getParticipantXPositions(fragment, ast, layout);
  const minX = Math.min(...participantXPositions) - 20;  // Left margin
  const maxX = Math.max(...participantXPositions) + 20;  // Right margin
  const width = maxX - minX;
  
  // Draw main fragment box
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', minX);
  rect.setAttribute('y', fragmentLayout.y);
  rect.setAttribute('width', width);
  rect.setAttribute('height', fragmentLayout.height);
  rect.setAttribute('fill', fragment.style?.fill || '#f0f0f0');
  rect.setAttribute('stroke', fragment.style?.border || '#000');
  rect.setAttribute('stroke-width', fragment.style?.borderWidth || 1);
  if (fragment.style?.borderStyle === 'dashed') {
    rect.setAttribute('stroke-dasharray', '5,5');
  }
  group.appendChild(rect);
  
  // Draw fragment label (top-left corner)
  const labelBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  labelBox.setAttribute('x', minX);
  labelBox.setAttribute('y', fragmentLayout.y);
  labelBox.setAttribute('width', 80);
  labelBox.setAttribute('height', 25);
  labelBox.setAttribute('fill', fragment.style?.operatorColor || '#fff');
  group.appendChild(labelBox);
  
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('x', minX + 5);
  label.setAttribute('y', fragmentLayout.y + 18);
  label.setAttribute('font-weight', 'bold');
  label.textContent = fragment.fragmentType;
  group.appendChild(label);
  
  const condition = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  condition.setAttribute('x', minX + 90);
  condition.setAttribute('y', fragmentLayout.y + 18);
  condition.textContent = `[${fragment.condition}]`;
  group.appendChild(condition);
  
  // Draw else clauses as horizontal dividers
  let currentY = fragmentLayout.y + 30;
  for (const entryId of fragment.entries) {
    const entryLayout = layout.get(entryId);
    currentY = entryLayout.y + entryLayout.height;
  }
  
  for (const elseClause of fragment.elseClauses) {
    const elseLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    elseLine.setAttribute('x1', minX);
    elseLine.setAttribute('y1', currentY);
    elseLine.setAttribute('x2', maxX);
    elseLine.setAttribute('y2', currentY);
    elseLine.setAttribute('stroke', '#000');
    elseLine.setAttribute('stroke-dasharray', '3,3');
    group.appendChild(elseLine);
    
    const elseLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    elseLabel.setAttribute('x', minX + 5);
    elseLabel.setAttribute('y', currentY + 15);
    elseLabel.textContent = `[${elseClause.condition}]`;
    group.appendChild(elseLabel);
    
    currentY += 20;
    for (const entryId of elseClause.entries) {
      const entryLayout = layout.get(entryId);
      currentY = entryLayout.y + entryLayout.height;
    }
  }
  
  return group;
}

function getParticipantXPositions(fragment, ast, layout) {
  const positions = [];
  
  // Collect all participants referenced in fragment's messages
  const entryIds = [
    ...fragment.entries,
    ...fragment.elseClauses.flatMap(c => c.entries)
  ];
  
  for (const entryId of entryIds) {
    const entry = ast.find(n => n.id === entryId);
    if (entry.type === 'message') {
      const fromX = layout.get(entry.from)?.x;
      const toX = layout.get(entry.to)?.x;
      if (fromX) positions.push(fromX);
      if (toX) positions.push(toX);
    }
  }
  
  return positions;
}
```

**Key insight:** Fragment doesn't directly contain child elements in DOM. Fragment box is rendered first, then child messages are rendered on top. This works because:
1. Fragment box is just a background rectangle
2. Child elements naturally appear "inside" because their Y-coordinates are within fragment bounds
3. SVG rendering order handles layering

### Error Node Rendering

**Error nodes** (created during parse failures) need visual representation:

```javascript
function renderError(errorNode, layout) {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('data-node-id', errorNode.id);
  group.setAttribute('class', 'error');
  
  const y = layout.get(errorNode.id)?.y || 0;
  
  // Red warning box
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', 10);
  rect.setAttribute('y', y);
  rect.setAttribute('width', 600);
  rect.setAttribute('height', 40);
  rect.setAttribute('fill', '#ffeeee');
  rect.setAttribute('stroke', '#ff0000');
  rect.setAttribute('stroke-width', 2);
  group.appendChild(rect);
  
  // Error icon (⚠)
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  icon.setAttribute('x', 20);
  icon.setAttribute('y', y + 28);
  icon.setAttribute('font-size', 24);
  icon.textContent = '⚠';
  group.appendChild(icon);
  
  // Error message
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', 50);
  text.setAttribute('y', y + 25);
  text.setAttribute('fill', '#cc0000');
  text.textContent = `Error: ${errorNode.message} - "${errorNode.text}"`;
  group.appendChild(text);
  
  return group;
}
```

**Error node layout:**
Error nodes get 50px height in layout calculation, same as messages. They're rendered inline at their position in the AST.

**User actions:**
- Clicking error node highlights the corresponding line in editor (Phase 2+)
- Errors shown in status bar with count (Phase 2+)
- Error markers in editor scrollbar (Phase 2+)

---

## Serialization Format

**Approach:** Canonical formatting (like Prettier)

### Formatting Rules (Educated Guess)

**Participants:**
```
participant "Display Name" as Alias #fill #border;width;style
```
- One per line
- Quotes around display name if it contains spaces or special chars
- Style components space-separated: `#color #color;number;word`
- Omit style components if not set

**Messages:**
```
From->To:Label Text
```
- No spaces around arrow
- Colon immediately after destination
- Label can span multiple lines with `\n` preserved

**Fragments:**
```
alt condition
  <indented entries>
else other condition
  <indented entries>
end
```
- 2-space indent for entries inside fragments
- `else` clauses at same indent as `alt`
- `end` at same indent as opening keyword

**Comments:**
```
// Comment text
```
- Preserved exactly as they appear in AST
- Position maintained

**Blank lines:**
- Single empty line between logical groups
- Multiple consecutive blank lines collapsed to one (educated guess)

**Example serialized output:**
```
title My Diagram

participant Alice
participant Bob
database "My DB" as DB #lightblue

// Setup phase
Alice->Bob:Hello
Bob->Alice:Hi there

alt authenticated
  Alice->DB:Query
  DB->Alice:Result
else not authenticated
  Alice->DB:Login
end
```

### Escaping Rules

**Quotes in display names:**
```javascript
// Input AST: displayName = 'My "Special" DB'
// Output: participant "My \"Special\" DB" as DB
```
Escape internal quotes with backslash.

**Backslashes in text:**
```javascript
// Input AST: label = 'Path: C:\Users\Alice'
// Output: Alice->Bob:Path: C:\\Users\\Alice
```
Double backslashes to escape.

**Literal newlines in AST:**
```javascript
// Input AST: label = 'Line 1\nLine 2'
// Output: Alice->Bob:Line 1\nLine 2
```
Keep `\n` as two characters (backslash + n), not actual newline.

**Special characters in aliases:**
Aliases must be alphanumeric or underscore. Parser rejects invalid aliases with error node.

**Colon in message labels:**
```javascript
// Input AST: label = 'Time: 10:30'
// Output: Alice->Bob:Time: 10:30
```
No escaping needed - colon in label text is fine. Parser splits on first colon after arrow only.

### Trade-offs

**Lost on edit:**
- Custom whitespace alignment
- Comment placement within a line
- Multiple blank lines collapsed to one

**Preserved:**
- Comment content and relative position
- Blank line grouping
- Node order

Users accept formatting loss when opting into visual editing. Consistency is more valuable than perfect preservation.

---

## Page Layout and UI Progression

### Phase 1: Minimal Test Harness

**HTML Structure:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Sequence Diagram Tool</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="container">
    <div id="editor-pane">
      <h3>Source Text</h3>
      <textarea id="source" rows="20" cols="50"></textarea>
      <button id="render-btn">Render Diagram</button>
      <div id="errors"></div>
    </div>
    
    <div id="diagram-pane">
      <h3>Diagram</h3>
      <svg id="diagram"></svg>
    </div>
  </div>
  
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

**Features:**
- `<textarea>` for text input (CodeMirror comes in Phase 2)
- Manual "Render" button (auto-update comes in Phase 2)
- Error display area for parse errors
- SVG container for diagram

**No interactions yet:** Diagram is read-only, no drag/click handlers

**Rationale:** Can see parse→render working immediately without editor complexity.

### Phase 2: Live Editor

**Changes:**
- Replace `<textarea>` with CodeMirror instance
- Remove "Render" button
- Add debounced auto-render on text change (300ms)
  - **300ms rationale:** Balance between responsiveness and performance. Long enough to avoid re-parsing mid-word, short enough to feel live. Standard value used by many editors (VS Code uses 200-500ms depending on language).
- Syntax highlighting for keywords
- Error markers in scrollbar

**New elements:**
```html
<div id="editor-pane">
  <div id="codemirror-container"></div>
  <div id="status-bar">
    <span id="line-col">Line 1, Col 1</span>
    <span id="parse-time"></span>
  </div>
</div>
```

### Phase 3: Interactive Diagram

**Changes:**
- Add toolbar above diagram:
  ```html
  <div id="toolbar">
    <button id="zoom-in">+</button>
    <button id="zoom-out">-</button>
    <span id="zoom-level">100%</span>
  </div>
  ```
- Attach mouse event handlers to SVG elements
- Cursor changes on hover (resize, move, grab)
- Selection highlight on click

**No new panes:** Still two-column layout

### Phase 4: Export and Storage

**Changes:**
- Add menu bar:
  ```html
  <nav id="menu-bar">
    <button id="menu-file">File ▾</button>
    <button id="menu-export">Export ▾</button>
    <button id="menu-view">View ▾</button>
  </nav>
  ```
- Dropdown menus for actions
- Modal dialogs for localStorage browser

### Phase 5: Polish

**Changes:**
- Resizable splitter between panes (drag to resize)
- Settings dialog
- Presentation mode (hide editor, fullscreen diagram)
- Help/about modal

### CSS Layout (All Phases)

```css
#container {
  display: flex;
  height: 100vh;
}

#editor-pane {
  flex: 0 0 50%;  /* Fixed 50% width in Phase 1-2 */
  /* flex: 0 0 var(--editor-width); in Phase 5 (resizable) */
  border-right: 1px solid #ccc;
  overflow: auto;
}

#diagram-pane {
  flex: 1;
  overflow: auto;
  position: relative;
}

#diagram {
  width: 100%;
  height: 100%;
}
```

---

## Testing Strategy

### Philosophy

**Integration tests over unit tests** during development.

**Rationale:**
- System is highly integrated (parser → AST → renderer)
- Unit testing individual functions doesn't catch integration bugs
- Integration tests are more valuable during rapid iteration
- Unit tests can be added later for complex algorithms if needed

### Test Framework Choice

**Vitest** - Modern, fast, ESM-native test runner

**Why Vitest:**
- Native ES module support (matches our vanilla JS approach)
- Fast execution with watch mode
- Compatible with Jest API (easy migration if needed)
- No build step required for tests
- Works well with browser DOM APIs via jsdom

**Setup:**
```bash
npm install -D vitest jsdom
```

**Config (vitest.config.js):**
```javascript
export default {
  test: {
    environment: 'jsdom',
    globals: true
  }
}
```

### Test Structure

**Integration test example:**
```javascript
// tests/integration.test.js
describe('Parse and Render', () => {
  test('basic participant and message', () => {
    const input = `
      participant Alice
      participant Bob
      Alice->Bob:Hello
    `;
    
    const ast = parse(input);
    expect(ast).toHaveLength(3);
    expect(ast[0].type).toBe('participant');
    expect(ast[2].type).toBe('message');
    
    const svg = render(ast);
    expect(svg.querySelector('[data-node-id^="p_"]')).toBeTruthy();
    expect(svg.querySelector('[data-node-id^="m_"]')).toBeTruthy();
  });
  
  test('fragment with else clause', () => {
    const input = `
      participant A
      participant B
      alt success
      A->B:ok
      else failure
      A->B:error
      end
    `;
    
    const ast = parse(input);
    const fragment = ast.find(n => n.type === 'fragment');
    expect(fragment.entries).toHaveLength(1);
    expect(fragment.elseClauses).toHaveLength(1);
    
    const svg = render(ast);
    expect(svg.querySelector('.fragment')).toBeTruthy();
  });
});
```

**Test each phase milestone:**
- Phase 1: Parse → AST → Render → Serialize round-trip tests
- Phase 2: Editor integration (harder to test, manual testing OK)
- Phase 3: Command execution and undo/redo
- Phase 4: Export formats (PNG base64, SVG with embedded source)

**Testing framework:** TBD (Jest, Vitest, or minimal runner). Decide in Phase 1 backlog.

---

## Export Formats

### PNG Export

**Approach:** SVG → Canvas → PNG Data URL

**Implementation (using Canvas2Svg):**
```javascript
function exportPNG(svgElement, zoom = 1.0) {
  const canvas = document.createElement('canvas');
  const bbox = svgElement.getBBox();
  
  canvas.width = bbox.width * zoom;
  canvas.height = bbox.height * zoom;
  
  const ctx = canvas.getContext('2d');
  ctx.scale(zoom, zoom);
  
  // Serialize SVG to string
  const svgString = new XMLSerializer().serializeToString(svgElement);
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(svgString);
  
  img.onload = () => {
    ctx.drawImage(img, 0, 0);
    const pngDataUrl = canvas.toDataURL('image/png');
    downloadFile(pngDataUrl, 'diagram.png');
  };
}
```

**Two modes (per requirements):**
1. **Direct download:** Trigger browser download dialog
2. **Render for copy:** Display PNG in modal, user right-clicks to copy

**Zoom level:** Uses current diagram zoom (toolbar buttons adjust zoom)

### SVG Export

**Approach:** Serialize SVG with embedded source text

**Implementation:**
```javascript
function exportSVG(svgElement, sourceText) {
  const clone = svgElement.cloneNode(true);
  
  // Embed source text in <desc> element
  const desc = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
  desc.textContent = sourceText;
  clone.insertBefore(desc, clone.firstChild);
  
  // Serialize
  const svgString = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  downloadFile(url, 'diagram.svg');
}
```

**Re-opening exported SVGs:**
When opening an SVG file, extract text from `<desc>` element and populate editor.

**Font icons:** Font Awesome and MDI icons are embedded as `<path>` elements (not references to external fonts), ensuring SVG portability.

### TXT Export

**Approach:** Serialize AST to text, download as `.txt` or `.sduml`

```javascript
function exportTXT(ast) {
  const text = serialize(ast);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  downloadFile(url, 'diagram.txt');
}
```

---

## File I/O and Storage

### File System Access API

**Modern browser API** for reading/writing local files with permission.

**Open file:**
```javascript
async function openFile() {
  const [fileHandle] = await window.showOpenFilePicker({
    types: [
      { description: 'Sequence Diagrams', accept: { 'text/plain': ['.txt', '.sduml'] } },
      { description: 'SVG Images', accept: { 'image/svg+xml': ['.svg'] } }
    ]
  });
  
  const file = await fileHandle.getFile();
  const text = await file.text();
  
  // If SVG, extract from <desc>
  if (file.name.endsWith('.svg')) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'image/svg+xml');
    const desc = doc.querySelector('desc');
    return desc ? desc.textContent : '';
  }
  
  return text;
}
```

**Save file:**
```javascript
async function saveFile(text, fileHandle = null) {
  if (!fileHandle) {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: 'diagram.txt',
      types: [{ description: 'Sequence Diagrams', accept: { 'text/plain': ['.txt'] } }]
    });
  }
  
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
  
  return fileHandle;  // Store for next save
}
```

**Permission handling:** Browser prompts user on first access. Subsequent saves to same file don't re-prompt.

### Browser localStorage

**For named diagrams** and autosave.

**Storage format:**
```javascript
{
  'diagrams': {
    'diagram-1': {
      name: 'Login Flow',
      text: 'participant Alice\n...',
      modified: '2025-01-15T10:30:00Z'
    },
    'diagram-2': { ... }
  },
  'autosave': {
    text: '...',
    timestamp: '2025-01-15T10:35:00Z'
  }
}
```

**Operations:**
- List diagrams: `Object.keys(localStorage.diagrams)`
- Load: `localStorage.diagrams['diagram-1'].text`
- Save: `localStorage.diagrams[id] = { name, text, modified: new Date().toISOString() }`
- Autosave: Every 60 seconds, save to `localStorage.autosave`

**Visual manager:** Modal dialog showing list of saved diagrams with name, modified date, and size.

---

## URL Sharing

### lz-string Compression

**Approach:** Compress source text, encode in URL fragment

**Share URL generation:**
```javascript
import LZString from 'lz-string';

function createShareURL(text, options = {}) {
  const compressed = LZString.compressToEncodedURIComponent(text);
  const baseUrl = window.location.origin + window.location.pathname;
  
  let url = `${baseUrl}#initialData=${compressed}`;
  
  if (options.presentation) {
    url += '&presentation=true';
  }
  if (options.shrinkToFit) {
    url += '&shrinkToFit=true';
  }
  
  return url;
}
```

**URL parsing on load:**
```javascript
function loadFromURL() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  
  const compressed = params.get('initialData');
  if (!compressed) return null;
  
  const text = LZString.decompressFromEncodedURIComponent(compressed);
  const presentation = params.get('presentation') === 'true';
  const shrinkToFit = params.get('shrinkToFit') === 'true';
  
  return { text, presentation, shrinkToFit };
}
```

**Dynamic origin detection:**
Share URLs use `window.location.origin`, so they work on:
- `http://localhost:8080/` during development
- `https://mydiagrams.example.com/` in production
- `https://subdomain.cloudflare.app/` on Cloudflare

**Fragment-based (#):** Data never sent to server, client-side only.

---

## Explicitly Deferred Design Decisions

These items will be designed during implementation based on learnings:

### Parser Details
- **Exact regex patterns** for each syntax element
- **Text markup parsing** (nested `**//bold italic//**`, escape sequences)
- **Style parsing edge cases** (e.g., `#auto` color calculation, `##styleName` lookup)
- **Participant alias resolution** (handling forward references, duplicate aliases)

### Renderer Details
- **SVG path generation** for different arrow types (filled vs open, X terminator)
- **Text wrapping algorithm** for labels
- **Fragment box corner radius** and visual treatment
- **Collision detection** for overlapping elements
- **Icon rendering** (Font Awesome, MDI) - SVG embedding vs font references

### Interaction Details
- **Drag threshold** (pixels before initiating drag)
- **Snap-to-grid** behavior for positioning
- **Multi-select** implementation (Shift+click, Ctrl+click)
- **Context menu** structure and positioning
- **Inline edit dialog** design and validation

### CodeMirror Integration
- **Syntax highlighting mode** (keyword list, regex patterns)
- **Auto-completion** trigger logic and suggestion list
- **Error marker** rendering in scrollbar
- **Line highlighting** when clicking diagram element
- **Scroll synchronization** between editor and diagram

### Performance
- **Render optimization** (virtual DOM, canvas layers, etc.)
- **Large diagram handling** (1000+ entries, though unlikely)
- **Debounce timing** (300ms is educated guess, may adjust)
- **Memory management** for command history (100-level cap is good, but GC strategy TBD)

### Styling
- **CSS theme** (colors, fonts, spacing)
- **Dark mode** support
- **Responsive layout** for smaller screens
- **Print stylesheet** for PDF generation

---

## Development Notes

### Phase 1 Success Criteria

**Can parse and render:**
- 3 participant types with styling
- 4 message arrow types
- alt/loop fragments with else clauses
- Comments and blank lines
- Title directive

**Round-trip test passes:**
```javascript
const input = `
  participant Alice
  participant Bob
  Alice->Bob:Hello
`;

const ast = parse(input);
const output = serialize(ast);
const ast2 = parse(output);

expect(ast).toEqual(ast2);  // Canonical form is stable
```

**Manual UI test:**
- Type in textarea
- Click "Render"
- See participants and messages in SVG
- See title at top
- See error message if syntax invalid

### Phase 2 Success Criteria

- CodeMirror integrated
- Auto-render on typing (debounced)
- Syntax errors shown in scrollbar
- Undo/redo works in editor (CodeMirror's built-in undo)

### Phase 3 Success Criteria

- Click message → select it
- Drag message endpoint → updates AST → text updates
- Undo/redo works for diagram edits
- Command history at 100 levels

### Tools and Workflow

**No build step in development:**
```bash
# Just open in browser
open public/index.html
# Or run simple HTTP server
python3 -m http.server 8080
```

**Testing:**
```bash
# TBD: Jest or Vitest
npm test
```

**Vendoring dependencies:**
```bash
# Download libraries to lib/ directory
wget https://cdn.example.com/codemirror.js -O lib/codemirror/codemirror.js
```

All external dependencies must be vendored for hermetic operation.

---

## Summary

This design provides:
1. **AST structure** for Phase 1 node types
2. **Fragment nesting** using ID references
3. **Parser approach** with multi-line example
4. **Layout calculation** strategy
5. **UI progression** through phases
6. **Lean Phase 1 scope** (3 participant types, 4 arrows, 2 fragments)
7. **Testing philosophy** (integration over unit)
8. **Export formats** (PNG, SVG, TXT)
9. **File I/O** (File System Access API, localStorage)
10. **URL sharing** (lz-string compression)
11. **Serialization format** (canonical, educated guess)
12. **Deferred decisions** (explicitly called out)

The design is detailed enough to write concrete BACKLOG.md tasks while acknowledging that some details will emerge during implementation.
