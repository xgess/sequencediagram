# Sequence Diagram Editor

Browser-based sequence diagram editor with vanilla JavaScript, AST-based parsing, and SVG rendering. No framework dependencies.

## Commands

```bash
npm install          # Install dependencies
npm test             # Run test suite (vitest)
npm run dev          # Start dev server (port 3000)
npx serve public     # Alternative: serve public folder
```

## Architecture

### Rendering Pipeline
1. Parse diagram text → AST (`src/ast/parser.js`)
2. Calculate layout positions (`src/rendering/layout.js`)
3. Render SVG elements (`src/rendering/renderer.js`)
4. Handle interactions (`src/interaction/`)

### Directory Structure
```
public/
├── src/
│   ├── ast/           # Parser, serializer, AST nodes
│   ├── rendering/     # SVG rendering, layout, components
│   ├── interaction/   # UI: drag, zoom, dialogs, context menu
│   ├── commands/      # Undo/redo command pattern
│   ├── export/        # PNG, SVG, TXT export
│   └── markup/        # Text markup parsing (**bold**, etc.)
├── lib/               # External: CodeMirror, FontAwesome, MDI
└── index.html         # Main app entry
tests/                 # Vitest test files
examples/              # Example diagram files
docs/                  # Documentation
```

### Key Patterns

- **Command Pattern**: All AST mutations go through Command classes for undo/redo
- **AST-based**: Diagram source ↔ AST ↔ SVG (never manipulate SVG directly)
- **Layout separation**: `layout.js` calculates positions, renderers just draw
- **Serialization round-trip**: `parse(serialize(ast))` must equal `ast`

## Code Style

- Vanilla JavaScript (ES6+), no frameworks
- 2-space indentation
- Single quotes for strings
- Semicolons required
- camelCase for functions/variables, PascalCase for classes
- JSDoc comments for public functions

## Naming Conventions

- Commands: `*Command.js` (e.g., `AddMessageCommand.js`)
- Tests: `*.test.js` matching source file names
- CSS classes: kebab-case (`message-arrow`, `participant-box`)
- AST node types: lowercase (`message`, `participant`, `fragment`)

## Testing

- Framework: Vitest with jsdom environment
- Run single file: `npm test -- tests/parser.test.js`
- Tests use `parse()` → `serialize()` round-trips to verify correctness
- Mock DOM with jsdom for rendering tests

## Icon Participants

Icons use unicode hex codes, not names:
```
fontawesome6solid f095 "Label" as Alias
fontawesome6regular f007 "Label" as Alias
fontawesome6brands f09b "Label" as Alias
materialdesignicons F0004 "Label" as Alias
```

See `public/icons.html` for icon reference.

## Preferences

### Commit Messages
- Do not include "Generated with Claude" or AI attribution
- Do not include "Co-Authored-By" lines
- Use conventional commit format: `type(scope): description`
- Keep messages concise and descriptive

### Code and Documentation
- Write for the present and future, not the past
- No "previously", "used to", "was changed from", "before this commit"
- No "BUG-XXX" or "BACKLOG-XXX" references in code or docs
- If someone wants history, they can check git
- Comments explain what code does, not what it replaced

### General
- Prefer editing existing files over creating new ones
- No emoji in code, comments, or documentation
- Keep solutions simple - don't over-engineer
- Run tests before committing
