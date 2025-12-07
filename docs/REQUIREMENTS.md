# Complete Feature Inventory of SequenceDiagram.org

**Building a clone requires replicating a mature tool with 10+ years of development.** This exhaustive documentation covers every syntax element, interaction pattern, and capability discovered through official documentation and release history. The tool combines text-based scripting with visual editing—a unique hybrid approach that makes it particularly powerful.

---

## Complete syntax reference

### Participant types and declarations

The tool supports **10 distinct participant types** with extensive styling options:

| Type | Syntax | Description |
|------|--------|-------------|
| `participant` | `participant Name` | Default rectangular box |
| `rparticipant` | `rparticipant Name` | Rounded corners box (v9.14.0+) |
| `actor` | `actor Name` | Stick figure icon |
| `boundary` | `boundary Name` | Boundary UML icon |
| `control` | `control Name` | Control UML icon |
| `database` | `database Name` | Cylinder database icon |
| `entity` | `entity Name` | Entity UML icon |
| `materialdesignicons` | `materialdesignicons F1FF Name` | MDI icons via hex codepoint |
| `fontawesome6solid/regular/brands` | `fontawesome6solid f48e Name` | Font Awesome 6 icons |
| `image` | `image data:image/png;base64,... Name` | Custom PNG images (50KB max) |

**Alias syntax variations:**
```
participant "Long Display Name" as ShortAlias
participant "Multi\nLine Name" as A
actor "<color:#green>Styled\nName</color>" as B #red
participant "++**Bold Big**++" as p2 ;0
```

**Participant styling uses unified syntax** `#fill-color #border-color;border-width;border-style`:
```
database DB #lightblue #green;3;dashed
actor Actor #yellow #orange;4
participant P ;3;dashed    // border only, no fill
participant P2 #pink ;0    // no border (width 0)
```

### Message arrows - every variation

**Core arrow types form a matrix** of line style × arrow head × direction:

| Pattern | Meaning |
|---------|---------|
| `->` | Synchronous (solid line, filled arrow) |
| `->>` | Asynchronous (solid line, open arrow) |
| `-->` | Return/response (dashed line, filled arrow) |
| `-->>` | Async return (dashed line, open arrow) |
| `<-` | Reversed direction |
| `<->` | Bidirectional |
| `-x` | Failure/lost message (X terminator) |

**Non-instantaneous messages** show propagation delay:
```
A->(5)B:delayed message      // 5 units delay
A(3)<--B:delayed return      // return with delay
space -6                      // negative space for overlapping messages
```

**Incoming/outgoing boundary messages:**
```
[->A:incoming from left
A->]:outgoing to right
[<-A:outgoing to left
A<-]:incoming from right
```

**Message styling (v9.16.0+ syntax with brackets):**
```
A-[;4]>B:line weight 4
A-[#red;3]>B:red, weight 3
A-[#00ff00;2]>B:hex color
A-[##myStyle]->B:named style
```

**Legacy styling (still supported):**
```
A-:4>B:weight 4
A-#red:3>B:color and weight
```

### Fragment types - complete list

The tool supports **16 fragment types** plus expandable sections:

| Fragment | Purpose | Supports `else` |
|----------|---------|-----------------|
| `alt` | Alternative/conditional (if-else) | Yes (primary use) |
| `opt` | Optional execution | Yes |
| `loop` | Iteration | Yes |
| `par` | Parallel threads | Yes |
| `break` | Exception/abort | Yes |
| `critical` | Critical section | Yes |
| `ref` | Reference to another diagram | Yes |
| `seq` | Weak sequencing | Yes |
| `strict` | Strict sequencing | Yes |
| `neg` | Negative/invalid scenario | Yes |
| `ignore` | Ignored messages | Yes |
| `consider` | Considered messages | Yes |
| `assert` | Assertion | Yes |
| `region` | Region grouping | Yes |
| `group` | Custom label | Yes |
| `expandable+` | Expanded collapsible section | No |
| `expandable-` | Collapsed section | No |

**Fragment syntax:**
```
alt condition
A->B:case 1
else other condition
A->B:case 2
end

loop i < 1000
A->B:iterate
end

group custom label [optional subtitle]
A->B:grouped
end

expandable- collapsed section title
B->C:hidden when collapsed
end
```

**Fragment styling includes operator color:**
```
alt#yellow #green #red;2;dashed condition  // operator, fill, border
opt#green #auto condition                   // #auto calculates lighter shade
else #pink #yellow;5;dashed failure         // styled else clause
```

### Notes, boxes, and annotations

**Seven annotation shapes** with positional variants:

| Shape | Syntax Options |
|-------|----------------|
| `note` | `note over A`, `note over A,B`, `note left of A`, `note right of A` |
| `box` | `box over A`, `box left of A`, `box right of A` |
| `abox` | Angular box - same positions plus `aboxright`, `aboxleft` |
| `rbox` | Rounded box - same positions |
| `ref` | `ref over A,B:reference text` |
| `state` | `state over A:state text` (rounded box for state info) |
| Divider | `==divider text==` |

**All support unified styling:**
```
note over A #lightblue #green;3;dashed:styled note
==info==#yellow #orange;4
```

### Create, destroy, and lifecycle management

```
A->*B:<<create>>           // create with message
B-->*C:<<create>>          // dashed create
create C                    // create without message
destroy C                   // destroy at previous entry's Y
destroyafter C              // destroy with dedicated space
destroysilent C             // stop lifeline without X symbol
```

### Activations and auto-activation

```
activate B
activate B #lightblue #green;3;dashed   // styled activation
deactivate B
deactivateafter B                        // after previous entry

autoactivation on    // auto-activate on requests, deactivate on responses
autoactivation off

activecolor #orange #green;2;dashed      // default activation color
activecolor C #blue                      // per-participant default
```

### Spacing and layout controls

```
space                        // default vertical space
space 3                      // 3 units
space -4                     // negative (for overlapping)

participantspacing 50        // minimum 50 pixels between participants
participantspacing equal     // equal spacing

entryspacing 0.1             // compact
entryspacing 3               // expanded

bottomparticipants           // render participants at bottom too
```

### Lifeline styling

```
lifelinestyle #red;4;solid              // all lifelines
lifelinestyle B #black;2;dashed         // specific participant
lifelinestyle C #gray;1;solid
```

### Automatic numbering and linear messages

```
autonumber 1     // start numbering at 1
autonumber 10    // start at 10
autonumber off   // stop numbering

linear           // subsequent same-type messages at same Y
linear off

parallel         // all subsequent entries at same Y position
parallel off
```

---

## Text styling - comprehensive markup

| Markup | Effect |
|--------|--------|
| `**text**` | Bold |
| `//text//` | Italic |
| `--text--` | Small |
| `++text++` | Big |
| `""text""` | Monospaced |
| `~~text~~` | Strikethrough |
| `<color:#red>text</color>` | Colored |
| `<size:20>text</size>` | Custom size |
| `<align:center>text</align>` | Alignment (left/center/right) |
| `<position:left>text</position>` | Position on messages |
| `<stroke:5:#red>text</stroke>` | Text stroke/outline |
| `<background:#red>text</background>` | Background color |
| `<difference>text</difference>` | Inverted for contrast |
| `<wordwrap:20>text</wordwrap>` | Auto word wrap at 20 chars |
| `<sub>text</sub>` | Subscript |
| `<sup>text</sup>` | Superscript |
| `<link:URL>text</link>` | Clickable hyperlink |
| `\n` | Line break |
| `\+`, `\/`, `\\` | Escape characters |

**Combinable:** `++**Big Bold**++`, `//**Bold Italic**//`

---

## Named and type-based styles (v9.16.0+)

**Named styles** can be defined once and applied to multiple elements:
```
style myWarning #white #red;2;dashed,**<color:#red>
note right of A ##myWarning: warning!
A<-[##myWarning]-B:error
```

**Type-based styles** auto-apply to all elements of that type:
```
participantstyle #green #red;3;dashed,//**
notestyle <color:#blue><wordwrap:25>//**
messagestyle #lightblue;2,**//
dividerstyle <color:#yellow>**//
boxstyle <color:#red>
aboxstyle ++<color:#gray>
rboxstyle ;3,<color:#purple><wordwrap:25>
aboxrightstyle <color:#pink>
aboxleftstyle <color:#brown>--
```

---

## Other syntax elements

**Title and frame:**
```
title My Diagram
title <size:30><color:#violet>LARGE TITLE\nWITH LINE BREAK</color></size>

frame Example Diagram
frame#lightblue #c5cbc8 #lightgreen;3;dashed Styled Frame
```

**Participant groups (nested supported):**
```
participantgroup #lightgreen **Group 1**
participant A
participant B
end

participantgroup #lightgreen #blue;3;dashed Name1
participantgroup #gray sub1
participant A
end
end
```

**Font family:**
```
fontfamily sans-serif
fontfamily mono
fontfamily "My Custom Font"
```

**Comments:**
```
// This is a comment
# This is also a comment
```

---

## Interactive behaviors and UI

### Mouse interactions

**Single click:**
- Selects element for editing/deletion
- On expandable labels: toggles expand/collapse
- Anywhere + press `+`/`-`: adjusts entry spacing

**Double-click:**
- Opens inline edit dialog for any element
- On participants: edits both alias and display name
- On fragment top/else: edits that section's label

**Right-click:**
- Opens context menu to add new elements
- Menu organized into categories (Notes & Boxes, Fragments, Activations, Other)

**Drag operations:**
- **Creating messages:** Click and drag between participant lifelines
- **Reordering participants:** Drag left/right past other participants
- **Moving messages:** Drag middle for Y position; drag ends to change source/target
- **Notes/boxes/refs:** Drag middle for position; drag ends for coverage
- **Fragments:** Drag top/bottom/else to include/exclude entries
- **Dividers/spaces:** Drag to reposition

**Modifier keys for message creation:**
- **Shift:** Dashed line
- **Ctrl/Cmd:** Open arrow (async)
- **Shift+Ctrl/Cmd:** Open arrow with dashed line

### Cursor behavior

Context-sensitive cursors indicate possible actions (hover, drag, resize zones).

---

## Editor features (CodeMirror-based)

| Feature | Details |
|---------|---------|
| **Syntax highlighting** | Custom mode for sequence diagram syntax |
| **Auto-completion** | Ctrl-Space / Cmd-Space triggers suggestions |
| **Error marking** | Syntax errors shown in scrollbar; click to jump |
| **Undo/Redo** | 100 levels; Ctrl-Z / Ctrl-Y (or Ctrl-Shift-Z) |
| **Find/Replace** | Ctrl-F, Shift-Ctrl-F, Shift-Ctrl-R |
| **Word wrap toggle** | Available in settings |
| **Resizable panel** | Drag east-west to resize editor width |
| **Tab handling** | Tab inserts spaces; Shift-Tab de-indents |
| **Selection sync** | Clicking diagram element highlights source line |

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl-S / Cmd-S | Save |
| Ctrl-O / Cmd-O | Open |
| Ctrl-M / Cmd-M | Presentation mode |
| Ctrl-Space | Autocomplete |
| Ctrl-F | Find |
| Shift-Ctrl-F | Replace |
| Ctrl-Enter | Save edit popup changes |
| ESC | Close modal/popup |
| Delete | Delete selected element |

---

## View modes and display options

| Mode | Description |
|------|-------------|
| **Presentation Mode** | Hides editor/menus; shows only diagram |
| **Read-Only Presentation** | Presentation mode + disables mouse editing; enables pan/drag |
| **Participant Overlay** | Shows participant names at top when scrolled (default: enabled) |
| **Shrink to Fit** | Scales diagram to fit available space |
| **Zoom In/Out** | Buttons adjust zoom; affects PNG export resolution |

---

## Export capabilities

### PNG Export
- Rendered at current zoom level
- Two modes: direct download or render-for-copy

### SVG Export
- Vector format with **embedded source text** in `<desc>` element
- Exported SVGs can be reopened for editing
- Clickable links preserved
- Font icons embedded as SVG elements

### TXT Export
- Plain text format with `.txt` or `.sduml` extension
- Direct download to local file system

---

## Storage and sharing

### Local File System
- File System Access API for open/save to original location
- Browser localStorage for named diagrams with visual manager dialog
- **No cloud storage integration** - hermetic operation only

### URL Sharing
- Uses lz-string compression for compact URLs
- Fragment-based (`#initialData=...`) - data never reaches server
- **Dynamic domain detection:** Share URLs automatically use current origin (e.g., `http://localhost:8080/...` or `https://whatever.example.com/...`)
- Options: shrink-to-fit, presentation mode

---

## Technical dependencies for hermetic clone

| Library | Purpose | Version |
|---------|---------|---------|
| **CodeMirror** | Text editor | 5.65.16 |
| **lz-string** | URL compression | 1.5.0 |
| **Canvas2Svg** | SVG export | - |
| **Font Awesome 6** | Icon participants | 6.5.2 |
| **Material Design Icons** | Icon participants | 7.4.47 |
| **DOMPurify** | SVG security | - |

**Note:** All dependencies must be bundled/vendored for hermetic operation. No CDN dependencies or external network requests after initial page load.

---

## Sample diagram demonstrating features

```
title <size:20>**Complete Feature Demo**</size>
fontfamily sans-serif
participantspacing equal
notestyle <wordwrap:30>
style warning #white #red;2;dashed,**<color:#red>

participantgroup #lightblue **System**
actor User
rparticipant "Web\nApp" as App #lightgreen
database DB #lightyellow
materialdesignicons F1FF "Config\nService" as Config #lightcoral
fontawesome6solid f48e "Cache\nLayer" as Cache #lightgray
end

autonumber 1
User->App:Login Request
activate App #lightblue
App->DB:Validate Credentials
activate DB
alt#green #auto credentials valid
DB-->App:User Data
App->Config:Load Settings
Config-->App:Config Data
App->Cache:Store Session
Cache-->App:Cached
App-->User:<color:#green>**Success**</color>
else credentials invalid
DB-->>App:Error
note right of App ##warning:Authentication\nFailed
App-->>User:<color:#red>Invalid Login</color>
end
deactivate DB

loop retry < 3
App->(2)Cache:Check Connection
space -1
App->Cache:Health Check
end

expandable+ Additional Details
User->App:Request Details
App->*Worker:<<create>>
Worker-->App:Processing
destroy Worker
end

deactivate App
==End of Flow==
```

This inventory covers the **complete feature set** of sequencediagram.org as of December 2025. The tool has evolved significantly since 2014, with major additions including rparticipant (v9.14.0), subscript/superscript (v9.15.0), and unified styling syntax (v9.16.0). Legacy syntax remains supported for backward compatibility.