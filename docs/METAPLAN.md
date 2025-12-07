# Project Meta Plan: Hermetic Sequence Diagram Tool

## Overview
Build an open-source, hermetic clone of sequencediagram.org that runs entirely in the browser with no backend dependencies. Implemented in vanilla JavaScript (ES6+), dockerized for easy deployment anywhere.

## Guiding Principles
- **Hermetic**: Once loaded, zero network requests required
- **Feature parity**: Match sequencediagram.org's syntax and capabilities exactly
- **Developer-friendly**: Simple tooling, no build step, easy to fork and deploy
- **Modular development**: Bite-sized tasks, context-window-friendly LLM sessions
- **Personal project**: Built for your own use and learning

## Project Phases

### Phase 0: Requirements & Design (Current Phase)
**Deliverables:**
- `REQUIREMENTS.md` - Exhaustive feature inventory from sequencediagram.org
- `ARCHITECTURE.md` - Technical decisions (vanilla JS, SVG rendering, file structure, etc.)
- `BACKLOG.md` - Granular, commit-sized implementation tasks
- `DESIGN.md` - Parser strategy, AST structure, bidirectional sync approach

**Process:**
1. Systematically audit sequencediagram.org (all features, syntax, interactions)
2. Document complete feature set with examples
3. Define technical architecture
4. Break into ~50 implementation tasks (each achievable in single LLM session)

### Phase 1: Core Engine (Stateless Rendering)
**Goal:** Parse text → render SVG, no interactivity yet

**Key Tasks:**
- Lexer/parser for sequence diagram syntax
- AST data structure
- SVG renderer (participants, messages, fragments, notes, styling)
- Unit tests for parser
- Static HTML test harness

**Success Criteria:** Can render all example diagrams from requirements doc

### Phase 2: Editor Integration
**Goal:** Live editing experience

**Key Tasks:**
- Integrate text editor (CodeMirror or Monaco)
- Wire change events to re-parse and re-render
- Syntax highlighting
- Error handling and display

**Success Criteria:** Type in editor, diagram updates in real-time

### Phase 3: Interactivity (SVG → Text)
**Goal:** Edit via clicking/dragging in diagram

**Key Tasks (incremental):**
- Participant: drag to reorder, double-click to edit, delete key
- Messages: drag endpoints, drag position, double-click text, delete
- Notes/boxes: similar interaction patterns
- Fragments: drag boundaries
- AST → text serialization
- Bidirectional sync (text ↔ diagram)

**Success Criteria:** All editing operations work via both text and diagram

### Phase 4: File I/O & Export
**Goal:** Save, load, and export diagrams

**Key Tasks:**
- Import/export .txt files
- PNG export (SVG → Canvas → PNG)
- Browser localStorage for autosave/recovery
- Clear/new diagram functionality

**Success Criteria:** Full file lifecycle matches original site

### Phase 5: Polish & Deploy
**Goal:** Production-ready, self-hostable

**Key Tasks:**
- Dockerfile (nginx serving static files)
- Docker Compose for local testing
- Deploy to Cloudflare (deployment method TBD)
- Domain purchase and DNS configuration
- README with self-hosting instructions
- LICENSE file (MIT or Apache 2.0)

**Success Criteria:** Running on your own domain, easy for others to self-host

## Development Workflow

### Per-Task Process
1. Identify next backlog item (e.g., "BACKLOG #23: Implement participant drag reordering")
2. Start fresh Claude session in Project
3. Claude reads: REQUIREMENTS.md, ARCHITECTURE.md, relevant code
4. Claude implements focused change with tests
5. Developer: review, test manually, commit
6. Update BACKLOG.md (mark complete, note any learnings)

### Context Management Strategy
- Keep individual sessions focused (1-2 backlog items max)
- Use Project to maintain documents, not to carry forward code context
- Reference design docs explicitly: "implement X per ARCHITECTURE.md section Y"
- Prefer small commits over large refactors

## Repository Structure (Planned)
```
/
├── src/
│   ├── parser.js          # Text → AST
│   ├── renderer.js        # AST → SVG
│   ├── editor.js          # Text editor integration
│   ├── interactions.js    # SVG click/drag handlers
│   ├── serializer.js      # AST → Text
│   ├── file-io.js         # Import/export
│   └── main.js            # App initialization
├── tests/
│   ├── parser.test.js
│   └── renderer.test.js
├── public/
│   ├── index.html
│   └── styles.css
├── docker/
│   ├── Dockerfile
│   └── nginx.conf
├── docs/
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── BACKLOG.md
│   └── DESIGN.md
├── examples/              # Sample .txt diagrams
├── README.md
└── LICENSE
```

## Technology Stack Decisions

### Core Technology
- **Language**: Vanilla JavaScript (ES6+), native ES modules
- **No build step**: Direct browser execution (minification TBD)
- **Rendering**: SVG (for easy element inspection/interaction)
- **Editor**: TBD (CodeMirror or Monaco, evaluate in Architecture phase)
- **Testing**: TBD (evaluate simple test runners)

### Deployment
- **Container**: Docker + nginx for static file serving
- **Hosting**: Cloudflare (specific service TBD based on needs)
- **Self-hosting**: Docker image pushable to any registry/k8s

### Rationale
- Vanilla JS: No transpiling, no build complexity, future-proof
- SVG: Direct DOM manipulation for interactions vs Canvas pixel manipulation
- Zero build step: Clone repo → open index.html → works

## Open Questions (To Resolve in Phase 0)
- Which text editor library? (CodeMirror vs Monaco)
- Testing strategy? (Jest, Vitest, or minimal test runner?)
- AST design: mutable vs immutable?
- Serialization: regenerate full text or smart diff-based updates?
- Browser support targets? (Evergreen only, or support older versions?)
- Minification: include minified versions or serve raw source?

## Next Immediate Steps
1. Create Claude Project in UI
2. Add this meta plan to Project
3. Begin Phase 0: Start drafting REQUIREMENTS.md by auditing sequencediagram.org
4. Draft ARCHITECTURE.md with technology decisions
5. Break requirements into BACKLOG.md tasks