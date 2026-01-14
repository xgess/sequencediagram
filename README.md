# Sequence Diagram Tool

A web-based sequence diagram editor inspired by [sequencediagram.org](https://sequencediagram.org). Create, edit, and export UML sequence diagrams with a simple text-based syntax.

## Quick Start

```bash
# Serve the public folder
npx serve public

# Open http://localhost:3000
```

Type in the editor:
```
participant User
participant Server

User->Server:Request
Server-->User:Response
```

See the diagram update in real-time.

## Features

### Participants
- `participant`, `rparticipant` (rounded), `actor`, `database`
- `boundary`, `control`, `entity` (UML stereotypes)
- Styling: `participant A #fill #border;width;style`
- Groups: `participantgroup #color Label ... end`

### Messages
- `->` sync, `->>` async, `-->` return, `-->>` async return
- `<->` bidirectional, `-x` lost message
- `[->` incoming, `->]` outgoing boundary messages
- `->(N)` delayed messages
- Colored: `A-[#red]->B:message`

### Fragments
`alt/else`, `opt`, `loop`, `par`, `break`, `critical`, `ref`, `group`, and more.

### Notes
`note over A:text`, `note left of A:text`, `note right of A:text`
Box variants: `box`, `abox`, `rbox`

### Lifecycle
- Create: `A->*B:<<create>>`
- Destroy: `destroy A`
- Activations: `activate A`, `deactivate A`, `autoactivation on`

### Styling
- Named styles: `style error #red` then `A-[##error]->B:msg`
- Type defaults: `messagestyle #blue`, `notestyle #yellow`
- Text markup: `**bold**`, `//italic//`, `<color:#red>text</color>`
- Dividers: `==Section Title==`

### Layout
- `space N` - vertical spacing
- `entryspacing N`, `participantspacing N`
- `linear`, `parallel` - message positioning
- `autonumber N` - automatic numbering
- `frame SD Name` - diagram frame

### Export
- PNG (2x for retina), SVG, TXT
- Copy to clipboard
- URL sharing with compressed source

### UI
- Resizable panes, zoom controls
- Presentation mode (Ctrl+M)
- Undo/redo (100 levels)
- Autosave to local storage

## Project Structure

```
public/               # Deployable folder
├── index.html
├── styles.css
├── src/
│   ├── ast/          # Parser and serializer
│   ├── rendering/    # SVG renderer
│   ├── commands/     # Undo/redo
│   ├── interaction/  # UI handlers
│   ├── export/       # PNG/SVG export
│   └── storage/      # Autosave, URL sharing
└── lib/              # CodeMirror, lz-string
tests/                # Vitest tests
examples/             # Sample diagrams
docs/                 # Documentation
```

## Development

```bash
npm install
npm test
```

## Documentation

- [SYNTAX.md](docs/SYNTAX.md) - Full syntax reference
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design

## Browser Support

Chrome/Edge 80+, Firefox 80+, Safari 14+

## Differences from sequencediagram.org

This tool is nearly feature-complete with [sequencediagram.org](https://sequencediagram.org). The following features are not implemented:

| Feature | Syntax | Description |
|---------|--------|-------------|
| `<difference>` | `<difference>text</difference>` | Blend mode text effect |
| `<wordwrap>` | `<wordwrap:50>text</wordwrap>` | Force word wrap at N characters |

## License

MIT
