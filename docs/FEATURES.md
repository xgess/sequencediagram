# Features

This document describes what's currently implemented in the sequence diagram tool.

---

## Syntax Overview

```
title My Diagram

participant Alice
actor Bob
database DB

Alice->Bob:Hello
Bob-->Alice:Response
Bob->>DB:Query
DB-->>Bob:Results
```

---

## Participants

Declare participants at the top of your diagram. They appear left-to-right in declaration order.

### Basic Types

| Syntax | Description |
|--------|-------------|
| `participant Name` | Rectangle box |
| `rparticipant Name` | Rounded rectangle |
| `actor Name` | Stick figure |
| `database Name` | Cylinder |
| `boundary Name` | UML boundary icon |
| `control Name` | UML control icon |
| `entity Name` | UML entity icon |

### With Display Names and Aliases

```
participant "Web Server" as WS
actor "End User" as User
```

### Styling

```
participant Alice #lightblue
participant Bob #yellow #red;2;dashed
```

Format: `#fill` or `#fill #border;width;style`

- `fill`: Background color
- `border`: Border color
- `width`: Border width in pixels
- `style`: `solid`, `dashed`, or `dotted`

### Icon Participants

```
fontawesome6solid f007 User
fontawesome6regular f0e0 Email
fontawesome6brands f09b GitHub
materialdesignicons F01C9 Database
```

Uses Font Awesome 6 or Material Design Icons by hex codepoint.

---

## Messages

### Arrow Types

| Syntax | Description |
|--------|-------------|
| `A->B:text` | Solid line, filled arrow |
| `A->>B:text` | Solid line, open arrow |
| `A-->B:text` | Dashed line, filled arrow |
| `A-->>B:text` | Dashed line, open arrow |
| `A<-B:text` | Reverse direction |
| `A<->B:text` | Bidirectional |
| `A-xB:text` | Lost message (X terminator) |

### Self-Messages

```
Alice->Alice:Think
```

### Boundary Messages

```
[->Alice:Incoming from outside
Alice->]:Outgoing to outside
```

### Message Delays

```
Alice->(3)Bob:Delayed message
```

The number indicates delay units. The arrow is rendered as a sloped line.

### Message Styling

```
Alice-[#red;2]->Bob:Styled message
Alice-[##myStyle]->Bob:Named style reference
```

---

## Fragments

Fragments group messages with a labeled box.

### Basic Fragments

```
alt condition
  Alice->Bob:Option A
else other condition
  Alice->Bob:Option B
end
```

### Fragment Types

| Type | Description |
|------|-------------|
| `alt` | Alternative (with else) |
| `opt` | Optional |
| `loop` | Loop |
| `par` | Parallel |
| `break` | Break |
| `critical` | Critical section |
| `neg` | Negative (invalid) |
| `ignore` | Ignore |
| `consider` | Consider |
| `assert` | Assertion |
| `ref` | Reference |
| `seq` | Sequence |
| `strict` | Strict ordering |
| `region` | Region |
| `group` | Generic group |

### Expandable Fragments

```
expandable+ My Section
  Alice->Bob:Hidden by default
end
```

Click the +/- icon to collapse/expand.

### Fragment Styling

```
alt#blue #lightyellow condition
  ...
end
```

---

## Notes and Boxes

### Note Types

| Syntax | Shape |
|--------|-------|
| `note` | Rectangle with folded corner |
| `box` | Rectangle |
| `abox` | Angular box (hexagon) |
| `rbox` | Rounded rectangle |

### Positions

```
note over Alice:Text
note over Alice,Bob:Spanning note
note left of Alice:Left side
note right of Alice:Right side
```

### Styling

```
note over Alice #lightblue:Styled note
box over Bob #yellow #red;2:Styled box
```

### Dividers

```
==Section Title==
```

Creates a horizontal divider line with centered text.

---

## Lifecycle

### Create and Destroy

```
Alice->*Bob:<<create>>
destroy Bob
```

- `*` before participant name in message creates it at that point
- `destroy Participant` ends the lifeline with an X
- `destroyafter Participant` adds space after the X
- `destroysilent Participant` ends without showing X

### Activations

```
activate Alice
Alice->Bob:Request
activate Bob
Bob-->Alice:Response
deactivate Bob
deactivate Alice
```

Or use auto-activation:

```
autoactivation on
Alice->Bob:Request
Bob-->Alice:Response
```

Styling:

```
activate Alice #lightblue
activecolor #lightyellow
```

---

## Spacing and Layout

### Vertical Spacing

```
space
space 3
space -2
```

Adds or removes vertical space. Negative values allow overlapping.

### Entry Spacing

```
entryspacing 0.5
```

Multiplier for space between entries (default 1.0).

### Participant Spacing

```
participantspacing 100
participantspacing equal
```

Fixed pixel width or equal distribution.

### Linear and Parallel

```
linear
Alice->Bob:Same row
Alice->Charlie:Same row
linear off

parallel
Alice->Bob:Parallel
Charlie->Dave:Parallel
parallel off
```

---

## Styling

### Lifeline Styles

```
lifelinestyle #gray;2;dashed
lifelinestyle Alice #black;1;solid
```

### Named Styles

```
style warning #white #red;2;dashed
style success #lightgreen

Alice-[##warning]->Bob:Alert!
note over Alice ##success:Done
```

### Type-Based Defaults

```
participantstyle #lightblue
messagestyle #333333
notestyle #lightyellow
dividerstyle #gray
```

Sets default styling for all elements of that type.

---

## Text Formatting

### Basic Markup

| Syntax | Result |
|--------|--------|
| `**text**` | **Bold** |
| `//text//` | *Italic* |
| `__text__` | Underline |
| `~~text~~` | ~~Strikethrough~~ |
| `--text--` | Small text |
| `++text++` | Large text |
| `""text""` | Monospace |

### Advanced Markup

```
<color:#red>Red text</color>
<size:18>Large text</size>
<sub>subscript</sub>
<sup>superscript</sup>
<link:https://example.com>Click here</link>
```

### Line Breaks

Use `\n` for line breaks in labels and names:

```
participant "Line 1\nLine 2" as P
Alice->Bob:First line\nSecond line
```

---

## Directives

### Title

```
title My Sequence Diagram
```

### Font Family

```
fontfamily sans-serif
fontfamily "Courier New"
```

### Frame

```
frame SD My Diagram
```

Draws a border around the entire diagram with a label.

### Autonumber

```
autonumber 1
Alice->Bob:Message 1
Bob->Charlie:Message 2
autonumber off
```

### Bottom Participants

```
bottomparticipants
```

Repeats participant boxes at the bottom of the diagram.

### Participant Groups

```
participantgroup #lightblue Frontend
  participant WebApp
  participant Mobile
end

participantgroup #lightgreen Backend
  participant API
  database DB
end
```

---

## Editor Features

- **Syntax highlighting** for keywords, arrows, strings
- **Auto-completion** (Ctrl/Cmd+Space) for keywords and participant names
- **Error markers** in scrollbar gutter
- **Find/Replace** (Ctrl/Cmd+F, Ctrl/Cmd+H)
- **Undo/Redo** (Ctrl/Cmd+Z, Ctrl/Cmd+Y)
- **Line numbers**
- **Word wrap toggle**

---

## Diagram Interactions

### Selection

- Click element to select (highlights in diagram, shows line in editor)
- Delete key removes selected element
- Click background to deselect

### Editing

- Double-click message to edit label
- Double-click participant to edit name
- Double-click fragment label to edit condition

### Dragging

- Drag participant left/right to reorder
- Drag message up/down to reorder
- Drag fragment boundaries to include/exclude entries
- Drag dividers to reposition

### Context Menu

Right-click to add:
- Participants (all types)
- Messages (all arrow types)
- Fragments (all types)

---

## Export

- **PNG** - High resolution image (2x scale)
- **Copy PNG** - Copy to clipboard
- **SVG** - Vector format with source embedded
- **TXT** - Plain text source

---

## File Operations

- **Open** (Ctrl/Cmd+O) - Open .txt, .svg files
- **Save** (Ctrl/Cmd+S) - Save to file system
- **Save As** (Ctrl/Cmd+Shift+S) - Save with new name
- **Share** - Generate URL with compressed diagram

---

## View Modes

- **Zoom** (+/-/Reset buttons, Ctrl+Plus/Minus)
- **Fit** - Scale diagram to fit viewport
- **Presentation** (Ctrl/Cmd+M) - Full screen diagram
- **Read-only** - Pan and zoom without editing

---

## Storage

- **Autosave** - Saves to localStorage every 60 seconds
- **Recovery** - Prompts to recover on page load if autosave exists
- **URL Sharing** - Diagram compressed in URL fragment
