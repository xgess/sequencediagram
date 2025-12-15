# Sequence Diagram Tool

A web-based sequence diagram editor inspired by [sequencediagram.org](https://sequencediagram.org). Create, edit, and export UML sequence diagrams with a simple text-based syntax.

## Features

### Core Functionality
- **Text-based syntax** - Write diagrams using simple, readable text
- **Live preview** - See changes instantly as you type
- **Full round-trip** - Edit in text or diagram, both stay in sync
- **Undo/Redo** - 100-level history with Ctrl+Z/Ctrl+Y

### Participant Types
- `participant` - Standard rectangle box
- `rparticipant` - Rounded rectangle
- `actor` - Stick figure (for humans/users)
- `database` - Cylinder shape
- `boundary` - Boundary UML stereotype
- `control` - Control UML stereotype
- `entity` - Entity UML stereotype

### Message Types
- `->` Synchronous call
- `->>` Asynchronous call
- `-->` Dashed return
- `-->>` Async dashed return
- `<-`, `<--` Reversed arrows
- `<->`, `<->>` Bidirectional
- `-x`, `--x` Lost messages

### Fragments
All standard UML combined fragments:
- `alt/else` - Alternative branches
- `opt` - Optional
- `loop` - Iteration
- `par` - Parallel
- `break` - Break out
- `critical` - Critical section
- And 9 more: `ref`, `seq`, `strict`, `neg`, `ignore`, `consider`, `assert`, `region`, `group`

### Notes and Annotations
- `note over A:text` - Note spanning participants
- `note left of A:text` - Note to the left
- `note right of A:text` - Note to the right
- `box`, `abox`, `rbox` - Different note shapes
- `==Title==` - Section dividers

### Styling
- Participant colors: `participant A #lightblue`
- Border styling: `participant A #fill #border;width;style`
- Message colors: `A-[#red]->B:message`
- Named styles: `style error #red` then `A-[##error]->B:msg`
- Type-based defaults: `messagestyle #blue`
- Text markup: `**bold**`, `//italic//`, `<color:#red>text</color>`

### Lifecycle
- Create participants dynamically: `A->*B:<<create>>`
- Destroy participants: `destroy A`
- Activations: `activate A`, `deactivate A`
- Auto-activation mode

### Layout Controls
- `space` / `space N` - Add vertical spacing
- `entryspacing N` - Set default message spacing
- `participantspacing N` - Set participant spacing
- `linear` / `parallel` - Control message positioning
- `autonumber` - Automatic message numbering
- `frame SD Name` - Add diagram frame

### Export Options
- **PNG** - High-resolution image (2x scale for retina)
- **Copy PNG** - Copy to clipboard
- **SVG** - Vector format with embedded source
- **TXT** - Plain text source

### UI Features
- Resizable editor/diagram panes
- Zoom controls (+/- and fit-to-view)
- Presentation mode (Ctrl+M)
- Read-only view mode
- URL sharing with compressed source
- Local storage autosave

## Quick Start

1. Open `public/index.html` in a browser
2. Start typing in the editor:
```
participant User
participant Server

User->Server:Request
Server-->User:Response
```
3. See the diagram update in real-time

## Development Setup

```bash
# Clone the repository
git clone <repo-url>
cd sequencediagram

# Install dependencies
npm install

# Run tests
npm test

# Start development server (optional)
npx serve .
```

### Project Structure
```
sequencediagram/
├── public/           # HTML and CSS
├── src/
│   ├── ast/          # Parser and serializer
│   ├── rendering/    # SVG renderer
│   ├── commands/     # Edit commands (undo/redo)
│   ├── interaction/  # UI interactions
│   ├── export/       # PNG/SVG export
│   └── storage/      # Local storage and URL sharing
├── lib/              # Vendored dependencies (CodeMirror)
├── tests/            # Test suite (1300+ tests)
├── examples/         # Example diagrams
└── docs/             # Documentation
```

## Self-Hosting

### Static File Server
The app is entirely client-side. Serve these directories:
- `public/` - HTML and CSS
- `src/` - JavaScript modules
- `lib/` - CodeMirror dependencies

### Using Docker
```bash
# Build the image
docker build -t sequence-diagram .

# Run the container
docker run -p 8080:80 sequence-diagram

# Access at http://localhost:8080
```

### Using Docker Compose
```bash
docker-compose up
# Access at http://localhost:8080
```

## Documentation

- [REQUIREMENTS.md](docs/REQUIREMENTS.md) - Full syntax specification
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design
- [DESIGN.md](docs/DESIGN.md) - Implementation details
- [BACKLOG.md](docs/BACKLOG.md) - Development backlog

## Browser Support

Works in modern browsers with ES modules support:
- Chrome/Edge 80+
- Firefox 80+
- Safari 14+

## Contributing

1. Read the documentation in `docs/`
2. Check `docs/BACKLOG.md` for open tasks
3. Run tests before submitting: `npm test`
4. Follow existing code style

## License

MIT License - See LICENSE file for details.

## Acknowledgments

Inspired by [sequencediagram.org](https://sequencediagram.org) - a fantastic sequence diagram tool.
