# Implementation Backlog

This backlog contains all tasks needed to build the hermetic sequence diagram tool. Tasks are organized into phases with vertical slices in Phase 1 for incremental delivery. Each task should be completable in a single commit within one LLM session.

---

## Phase 0: Requirements & Design ✅

**Status:** Complete
- REQUIREMENTS.md ✅
- ARCHITECTURE.md ✅  
- DESIGN.md ✅
- This BACKLOG.md ✅

---

## Phase 1: Core Engine (Stateless Rendering)

### Slice 0: Foundation

## BACKLOG-001: Project setup and directory structure ✅
**Phase:** 1.0
**Dependencies:** None
**Status:** Complete (commit 639f86e)
**Description:** Create the complete directory structure per ARCHITECTURE.md, add package.json with Vitest, create placeholder files for all Phase 1 modules.
**Acceptance Criteria:**
- Directory structure matches ARCHITECTURE.md ✅
- package.json with Vitest and jsdom configured ✅
- Empty module files: parser.js, renderer.js, serializer.js, main.js ✅
- tests/ directory with placeholder test files ✅
- public/index.html and styles.css created ✅
- Can run `npm test` (even with no tests yet) ✅

## BACKLOG-002: AST node type definitions and ID generation ✅
**Phase:** 1.0
**Dependencies:** BACKLOG-001
**Status:** Complete (included in BACKLOG-001 commit)
**Description:** Implement AST node schemas from DESIGN.md. Create `generateId()` function for UUID generation with type prefixes.
**Acceptance Criteria:**
- `nodes.js` exports node type constants and schema documentation ✅
- `generateId(type)` returns format: `{prefix}_{8-random-chars}` ✅
- Unit tests verify ID uniqueness and format ✅
- Collision detection (regenerate if duplicate in same parse) - deferred, not needed yet


---

### Slice 1: Minimal End-to-End

## BACKLOG-003: Test harness HTML page ✅
**Phase:** 1.0
**Dependencies:** BACKLOG-001
**Status:** Complete (included in BACKLOG-001 commit)
**Description:** Create minimal HTML test harness per DESIGN.md Phase 1 UI: textarea, render button, error div, SVG container.
**Acceptance Criteria:**
- public/index.html has textarea, button, error div, SVG element ✅
- Basic CSS layout: two-column with editor left, diagram right ✅
- Loads main.js as ES module ✅
- Button click logs to console (placeholder for wiring) ✅

## BACKLOG-004: Parse basic participant declaration (no styling) ✅
**Phase:** 1.1
**Dependencies:** BACKLOG-002
**Status:** Complete
**Description:** Implement parser for simplest case: `participant Name`. Returns AST node with type='participant', alias, displayName (both = Name), no styling.
**Acceptance Criteria:**
- `parse("participant Alice")` returns 1-element AST ✅
- Node has: id, type='participant', participantType='participant', alias='Alice', displayName='Alice', style={} ✅
- sourceLineStart and sourceLineEnd populated ✅
- Test case for single participant ✅

## BACKLOG-005: Render single participant box ✅
**Phase:** 1.1
**Dependencies:** BACKLOG-004
**Status:** Complete
**Description:** Implement renderer to draw participant as SVG rect + text. No lifelines yet. Hardcode position (x=50, y=50, width=100, height=60).
**Acceptance Criteria:**
- `render(ast)` returns SVG element ✅
- Contains `<g data-node-id="{id}" class="participant">` with rect and text ✅
- Text shows displayName ✅
- Rect has default styling (white fill, black border) ✅
- Integration test: parse → render → verify SVG structure ✅

## BACKLOG-006: Serialize participant back to text ✅
**Phase:** 1.1
**Dependencies:** BACKLOG-004
**Status:** Complete
**Description:** Implement serializer to convert participant AST node back to text format.
**Acceptance Criteria:**
- `serialize(ast)` returns `"participant Alice"` ✅
- Round-trip test: parse → serialize → parse produces same AST ✅
- Handles displayName = alias case (output just `participant Name`) ✅


---

### Slice 2: Add Messages

## BACKLOG-007: Wire parse-render-serialize to test harness ✅
**Phase:** 1.1
**Dependencies:** BACKLOG-003, BACKLOG-005, BACKLOG-006
**Status:** Complete
**Description:** Connect button click in HTML to parse textarea → render to SVG → display errors if any.
**Acceptance Criteria:**
- Typing `participant Alice` in textarea + clicking Render shows box in SVG ✅
- Errors display in error div if parse fails ✅
- Console logs AST for debugging ✅
- Can see first vertical slice working end-to-end ✅

## BACKLOG-008: Parse basic message (-> arrow only) ✅
**Phase:** 1.2
**Dependencies:** BACKLOG-004
**Status:** Complete (all 4 arrow types implemented)
**Description:** Parse `Alice->Bob:Hello` syntax. Message node references participant aliases (not IDs).
**Acceptance Criteria:**
- Parses: `Alice->Bob:Hello` into message node ✅
- Node has: type='message', from='Alice', to='Bob', arrowType='->', label='Hello' ✅
- Test case: participant + message ✅

## BACKLOG-009: Layout calculation for messages ✅
**Phase:** 1.2
**Dependencies:** BACKLOG-008
**Status:** Complete
**Description:** Implement layout.js to calculate participant X positions and message Y coordinates.
**Acceptance Criteria:**
- `calculateLayout(ast)` returns Map of nodeId → {x, y, width, height} ✅
- Participants distributed horizontally ✅
- Messages get Y-coordinates below participants ✅
- buildParticipantMap() creates alias→node lookup ✅

## BACKLOG-010: Render message arrow and label ✅
**Phase:** 1.2
**Dependencies:** BACKLOG-009
**Status:** Complete
**Description:** Render message as SVG line with arrow marker and text label.
**Acceptance Criteria:**
- Message renders as `<line>` from source lifeline to target lifeline ✅
- Arrow marker defined in `<defs>` and applied to line ✅
- Label text rendered at midpoint above line ✅
- data-node-id attribute on message group ✅

## BACKLOG-011: Render lifelines ✅
**Phase:** 1.2
**Dependencies:** BACKLOG-009
**Status:** Complete
**Description:** Draw dashed vertical lines from each participant box to diagram bottom.
**Acceptance Criteria:**
- Lifeline for each participant ✅
- Extends from bottom of participant box to totalHeight ✅
- Dashed style (#ccc, stroke-width=1, dasharray=5,5) ✅
- data-participant attribute on each lifeline ✅
- Rendered behind messages (correct z-order) ✅

## BACKLOG-012: Serialize message to text ✅
**Phase:** 1.2
**Dependencies:** BACKLOG-008
**Status:** Complete
**Description:** Add message serialization to serializer.js.
**Acceptance Criteria:**
- Outputs: `Alice->Bob:Hello` ✅
- Round-trip test passes ✅


---

### Slice 3: Add Styling

## BACKLOG-013: Calculate SVG dimensions ✅
**Phase:** 1.2
**Dependencies:** BACKLOG-009
**Status:** Complete
**Description:** Dynamically set SVG width/height/viewBox based on participant positions and entry count.
**Acceptance Criteria:**
- SVG width = rightmost participant + margin ✅
- SVG height = calculated totalHeight from layout ✅
- viewBox matches width/height ✅

## BACKLOG-014: Parse participant styling ✅
**Phase:** 1.3
**Dependencies:** BACKLOG-004
**Status:** Complete
**Description:** Extend participant parser to handle styling syntax.
**Acceptance Criteria:**
- Parses: `participant Alice #lightblue #green;3;dashed` ✅
- Handles partial styles ✅
- Handles border-only and no border ✅

## BACKLOG-015: Apply participant styling in renderer ✅
**Phase:** 1.3
**Dependencies:** BACKLOG-014
**Status:** Complete
**Description:** Use style object from AST to set SVG rect attributes.
**Acceptance Criteria:**
- Rect fill uses style.fill or default white ✅
- Stroke uses style.border or default black ✅
- stroke-width uses style.borderWidth or default 1 ✅
- stroke-dasharray set if style.borderStyle='dashed' ✅

## BACKLOG-016: Serialize participant with styling ✅
**Phase:** 1.3
**Dependencies:** BACKLOG-014
**Status:** Complete
**Description:** Output styling in canonical format when serializing participant.
**Acceptance Criteria:**
- Outputs styling correctly ✅
- Round-trip test passes with styling ✅

## BACKLOG-017: Parse participant alias syntax ✅
**Phase:** 1.3
**Dependencies:** BACKLOG-014
**Status:** Complete
**Description:** Handle `participant "Display Name" as Alias` syntax.
**Acceptance Criteria:**
- Parses: `participant "Web Server" as WS` ✅
- Parses multiline: `participant "Line1\nLine2" as A` ✅
- Handles escaping: `participant "My \"DB\"" as DB` ✅

## BACKLOG-018: Render multiline participant names ✅
**Phase:** 1.3
**Dependencies:** BACKLOG-017
**Status:** Complete
**Description:** Render displayName with \n as multiple SVG tspan elements.
**Acceptance Criteria:**
- `\n` in displayName creates line breaks ✅
- Each line rendered as separate tspan ✅
- Centered alignment ✅


---

### Slice 4: Expand Arrow Types

## BACKLOG-019: Serialize participant aliases ✅
**Phase:** 1.3
**Dependencies:** BACKLOG-017
**Status:** Complete
**Description:** Output `participant "Display Name" as Alias` when alias differs from displayName.
**Acceptance Criteria:**
- If alias = displayName: output `participant Alice` ✅
- If different: output `participant "Web Server" as WS` ✅
- Escape internal quotes and preserve \n ✅

## BACKLOG-020: Parse async arrow (->>) ✅
**Phase:** 1.4
**Dependencies:** BACKLOG-008
**Status:** Complete (implemented in BACKLOG-008)
**Description:** Add support for asynchronous arrow type.
**Acceptance Criteria:**
- Parses: `Alice->>Bob:async message` ✅
- arrowType='->>' ✅

## BACKLOG-021: Parse dashed return (-->) ✅
**Phase:** 1.4
**Dependencies:** BACKLOG-008
**Status:** Complete (implemented in BACKLOG-008)
**Description:** Add support for return arrow with solid arrowhead.
**Acceptance Criteria:**
- Parses: `Bob-->Alice:response` ✅
- arrowType='-->' ✅

## BACKLOG-022: Parse async dashed return (-->>) ✅
**Phase:** 1.4
**Dependencies:** BACKLOG-008
**Status:** Complete (implemented in BACKLOG-008)
**Description:** Add support for async return arrow.
**Acceptance Criteria:**
- Parses: `Bob-->>Alice:async response` ✅
- arrowType='-->>' ✅

## BACKLOG-023: Render async arrow with open arrowhead ✅
**Phase:** 1.4
**Dependencies:** BACKLOG-020
**Status:** Complete (implemented in BACKLOG-010)
**Description:** Create SVG marker for open arrowhead.
**Acceptance Criteria:**
- New marker definition in SVG defs ✅
- Lines with arrowType ->> or -->> use open marker ✅

## BACKLOG-024: Render dashed line for return arrows ✅
**Phase:** 1.4
**Dependencies:** BACKLOG-021
**Status:** Complete (implemented in BACKLOG-010)
**Description:** Apply stroke-dasharray to --> and -->> message lines.
**Acceptance Criteria:**
- Lines with --> or -->> have dashed style ✅


---

### Slice 5: Add More Participant Types

## BACKLOG-025: Update serializer for all arrow types ✅
**Phase:** 1.4
**Dependencies:** BACKLOG-020 through BACKLOG-024
**Status:** Complete (implemented in BACKLOG-012)
**Description:** Ensure serializer outputs correct arrow syntax for all 4 types.
**Acceptance Criteria:**
- Correctly outputs ->, ->>, -->, -->> ✅
- Round-trip tests pass for all arrow types ✅

## BACKLOG-026: Parse actor participant type ✅
**Phase:** 1.5
**Dependencies:** BACKLOG-004
**Status:** Complete (implemented in BACKLOG-004)
**Description:** Add support for `actor Name` syntax.
**Acceptance Criteria:**
- Parses: `actor Alice` ✅
- participantType='actor' ✅

## BACKLOG-027: Render actor as stick figure ✅
**Phase:** 1.5
**Dependencies:** BACKLOG-026
**Status:** Complete
**Description:** Render actor participant type with stick figure icon.
**Acceptance Criteria:**
- SVG shapes for stick figure ✅
- Name label below figure ✅
- Lifeline from center ✅

## BACKLOG-028: Parse database participant type ✅
**Phase:** 1.5
**Dependencies:** BACKLOG-004
**Status:** Complete (implemented in BACKLOG-004)
**Description:** Add support for `database Name` syntax.
**Acceptance Criteria:**
- Parses: `database DB` ✅
- participantType='database' ✅

## BACKLOG-029: Render database as cylinder ✅
**Phase:** 1.5
**Dependencies:** BACKLOG-028
**Status:** Complete
**Description:** Render database participant type with cylinder icon.
**Acceptance Criteria:**
- SVG ellipse + rect for cylinder shape ✅
- Name label in center ✅
- Lifeline from center ✅


---

### Slice 6: Add Fragments

## BACKLOG-030: Update serializer for participant types ✅
**Phase:** 1.5
**Dependencies:** BACKLOG-026 through BACKLOG-029
**Status:** Complete (implicit in serializer)
**Description:** Serialize correct keyword for each participant type.
**Acceptance Criteria:**
- Outputs `participant`, `actor`, or `database` based on participantType ✅
- Round-trip tests pass ✅

## BACKLOG-031: Parse alt fragment with else ✅
**Phase:** 1.6
**Dependencies:** BACKLOG-008
**Status:** Complete
**Description:** Implement multi-line fragment parsing for alt...else...end.
**Acceptance Criteria:**
- Parses alt/else/end block ✅
- Fragment node has: fragmentType, condition, entries[], elseClauses[] ✅
- Child nodes added to flat AST with IDs recorded in fragment ✅
- Nested parsing supported ✅

## BACKLOG-032: Calculate layout for fragments ✅
**Phase:** 1.6
**Dependencies:** BACKLOG-031
**Status:** Complete
**Description:** Extend layout calculation to handle fragments.
**Acceptance Criteria:**
- Fragment layout includes y, height spanning all children ✅
- Adds top/bottom padding ✅
- else clause adds divider space ✅

## BACKLOG-033: Render alt fragment box and labels ✅
**Phase:** 1.6
**Dependencies:** BACKLOG-032
**Status:** Complete
**Description:** Render fragment as background rect with label corner and else dividers.
**Acceptance Criteria:**
- Fragment box spans children horizontally ✅
- Label corner shows fragment type and condition ✅
- else dividers drawn between sections ✅
- data-node-id on fragment group ✅

## BACKLOG-034: Parse loop fragment ✅
**Phase:** 1.6
**Dependencies:** BACKLOG-031
**Status:** Complete (implemented in BACKLOG-031)
**Description:** Add support for `loop...end` syntax.
**Acceptance Criteria:**
- Parses loop with condition ✅
- fragmentType='loop' ✅
- elseClauses empty array ✅

## BACKLOG-035: Render loop fragment ✅
**Phase:** 1.6
**Dependencies:** BACKLOG-034
**Status:** Complete (uses same renderer as alt)
**Description:** Render loop fragment with "loop" label.
**Acceptance Criteria:**
- Same rendering logic as alt but with "loop" label ✅

## BACKLOG-036: Serialize fragments ✅
**Phase:** 1.6
**Dependencies:** BACKLOG-031, BACKLOG-034
**Status:** Complete
**Description:** Serialize fragments with proper indentation and else clauses.
**Acceptance Criteria:**
- Outputs fragment with indented entries ✅
- 2-space indentation for child entries ✅
- Round-trip test passes ✅


---

### Slice 7: Comments and Metadata

## BACKLOG-037: Fragment styling ✅
**Phase:** 1.6
**Dependencies:** BACKLOG-033
**Status:** Complete
**Description:** Parse and render fragment styling: `alt#operator #fill #border;width;style condition`.
**Acceptance Criteria:**
- Parses fragment styling ✅
- style object has operatorColor, fill, border, borderWidth, borderStyle ✅
- Renderer applies styling to fragment box and label corner ✅
- Serializer outputs styling ✅
- Round-trip test passes ✅

## BACKLOG-038: Parse single-line comments ✅
**Phase:** 1.7
**Dependencies:** BACKLOG-004
**Status:** Complete
**Description:** Parse `// comment` and `# comment` as comment nodes in AST.
**Acceptance Criteria:**
- Creates node with type='comment', text='// comment' ✅
- Preserves position in AST ✅
- Test case with comments interspersed with other nodes ✅

## BACKLOG-039: Parse blank lines ✅
**Phase:** 1.7
**Dependencies:** BACKLOG-004
**Status:** Complete
**Description:** Parse blank lines as blankline nodes in AST to preserve grouping.
**Acceptance Criteria:**
- Creates node with type='blankline' ✅
- sourceLineStart/End track position ✅
- Test case with blank lines ✅

## BACKLOG-040: Serialize comments and blank lines ✅
**Phase:** 1.7
**Dependencies:** BACKLOG-038, BACKLOG-039
**Status:** Complete (implemented as part of BACKLOG-038 and BACKLOG-039)
**Description:** Output comments and blank lines in their AST position.
**Acceptance Criteria:**
- Comments output verbatim ✅
- Blank lines output as empty line ✅
- Position preserved in serialized text ✅
- Round-trip test passes ✅

## BACKLOG-041: Layout handling for blank lines ✅
**Phase:** 1.7
**Dependencies:** BACKLOG-039
**Status:** Complete
**Description:** Add extra vertical space (20px) for blank line nodes.
**Acceptance Criteria:**
- Blank lines increase currentY without rendering anything ✅
- Visual grouping effect in diagram ✅
- Test case shows spacing ✅

## BACKLOG-042: Parse title directive ✅
**Phase:** 1.7
**Dependencies:** BACKLOG-004
**Status:** Complete
**Description:** Parse `title My Diagram` into directive node.
**Acceptance Criteria:**
- Creates node with type='directive', directiveType='title', value='My Diagram' ✅
- Can contain text markup (deferred to BACKLOG-045)
- Test case added ✅

## BACKLOG-043: Render title ✅
**Phase:** 1.7
**Dependencies:** BACKLOG-042
**Status:** Complete
**Description:** Render title at top of diagram.
**Acceptance Criteria:**
- Text element at y=25, centered horizontally ✅
- Larger font size (18px) ✅
- Renders text markup if present (deferred to BACKLOG-046)
- Adjusts diagram start Y to accommodate title ✅


---

### Slice 8: Text Markup

## BACKLOG-044: Serialize title ✅
**Phase:** 1.7
**Dependencies:** BACKLOG-042
**Status:** Complete (implemented as part of BACKLOG-042)
**Description:** Output `title Text` as first non-comment line.
**Acceptance Criteria:**
- Title appears at top of output ✅
- Round-trip test passes ✅

## BACKLOG-045: Parse basic text markup tokens ✅
**Phase:** 1.8
**Dependencies:** BACKLOG-008
**Status:** Complete
**Description:** Implement markup parser for **bold**, //italic//, \n in message labels and participant names. Creates internal markup AST per DESIGN.md.
**Acceptance Criteria:**
- parseMarkup(text) returns array of {type, content} segments ✅
- Handles: **bold**, //italic//, \n ✅
- Test cases for each markup type and combinations ✅

## BACKLOG-046: Render text markup to SVG tspans ✅
**Phase:** 1.8
**Dependencies:** BACKLOG-045
**Status:** Complete
**Description:** Convert markup segments to styled SVG tspan elements.
**Acceptance Criteria:**
- Bold segments have font-weight="bold" ✅
- Italic segments have font-style="italic" ✅
- \n creates new tspan with dy offset ✅
- Works in message labels and participant names (integration pending)
- Test: message with markup renders correctly ✅


---

### Slice 9: Error Handling

## BACKLOG-047: Preserve markup in serializer ✅
**Phase:** 1.8
**Dependencies:** BACKLOG-045
**Status:** Complete
**Description:** Ensure serializer outputs markup syntax exactly.
**Acceptance Criteria:**
- **bold** stays as **bold** in output ✅
- //italic// stays as //italic// ✅
- \n stays as literal \n (not actual newline) ✅
- Round-trip test passes with markup ✅

## BACKLOG-048: Create error nodes for parse failures ✅
**Phase:** 1.9
**Dependencies:** BACKLOG-004
**Status:** Complete
**Description:** When parser encounters unknown syntax, create error node instead of crashing.
**Acceptance Criteria:**
- Unknown syntax creates node with type='error', text, message ✅
- Parser continues to next line ✅
- Multiple errors can exist in same AST ✅
- Test case with syntax errors ✅

## BACKLOG-049: Render error nodes ✅
**Phase:** 1.9
**Dependencies:** BACKLOG-048
**Status:** Complete
**Description:** Display error nodes as red warning boxes in diagram per DESIGN.md.
**Acceptance Criteria:**
- Red bordered box with warning icon (⚠) ✅
- Error message displayed ✅
- Gets 40px height in layout ✅
- Test: parse error renders warning box ✅

## BACKLOG-050: Display parse errors in UI ✅
**Phase:** 1.9
**Dependencies:** BACKLOG-048
**Status:** Complete
**Description:** Show error count and messages in error div of test harness.
**Acceptance Criteria:**
- Error div shows count: "2 errors" ✅
- Lists each error with line number and message ✅
- Red text styling ✅
- Clicking error scrolls textarea to that line (if possible without CodeMirror) ✅


---

### Slice 10: Integration and Testing

## BACKLOG-051: Serialize error nodes as comments ✅
**Phase:** 1.9
**Dependencies:** BACKLOG-048
**Status:** Complete
**Description:** Output error nodes as comments so serialized text is valid.
**Acceptance Criteria:**
- Outputs: `// ERROR: {message} - "{text}"` ✅
- Position preserved ✅
- Re-parsing serialized output creates comment node (preserves info) ✅

## BACKLOG-052: Integration test suite ✅
**Phase:** 1.10
**Dependencies:** All prior Phase 1 tasks
**Status:** Complete
**Description:** Create comprehensive integration tests covering all Phase 1 features.
**Acceptance Criteria:**
- Tests for each participant type ✅
- Tests for each arrow type ✅
- Tests for fragments (nested, styled, else clauses) ✅
- Tests for comments, blank lines, title ✅
- Tests for text markup ✅
- Tests for error handling ✅
- All tests pass ✅

## BACKLOG-053: Round-trip property tests ✅
**Phase:** 1.10
**Dependencies:** BACKLOG-052
**Status:** Complete
**Description:** Verify parse → serialize → parse produces identical AST for all Phase 1 features.
**Acceptance Criteria:**
- Round-trip test for each syntax element ✅
- Canonical formatting is stable ✅
- Edge cases covered (empty labels, special chars, etc.) ✅

## BACKLOG-054: Example diagrams collection ✅
**Phase:** 1.10
**Dependencies:** All prior Phase 1 tasks
**Status:** Complete
**Description:** Create examples/ directory with 5-10 sample diagrams exercising all Phase 1 features.
**Acceptance Criteria:**
- Each example is a .txt file ✅
- Covers: basic flow, fragments, styling, multiple participant types, comments ✅
- All examples parse and render without errors ✅
- Serves as documentation and regression tests ✅


---

## Phase 2: Editor Integration

### Editor Setup

## BACKLOG-055: Performance baseline ✅
**Phase:** 1.10
**Dependencies:** BACKLOG-052
**Status:** Complete
**Description:** Measure parse and render time for diagrams of varying sizes (10, 50, 100 entries).
**Acceptance Criteria:**
- Automated timing tests ✅
- Results logged to console ✅
- Baseline documented for Phase 3 optimization comparison ✅
- 50-entry diagram renders in <50ms ✅ (actual: ~1.5ms)

## BACKLOG-056: Vendor CodeMirror 5 ✅
**Phase:** 2.1
**Dependencies:** Phase 1 complete
**Status:** Complete
**Description:** Download and vendor CodeMirror 5.65.16 into lib/ directory. No CDN dependencies.
**Acceptance Criteria:**
- CodeMirror files in lib/codemirror/ ✅
- All required CSS and JS files present ✅
- Can import from local files ✅
- No network requests ✅

## BACKLOG-057: Replace textarea with CodeMirror ✅
**Phase:** 2.1
**Dependencies:** BACKLOG-056
**Status:** Complete
**Description:** Integrate CodeMirror instance into HTML test harness, remove textarea.
**Acceptance Criteria:**
- CodeMirror instance renders in editor-pane ✅
- Can type and edit text ✅
- getValue() returns current text ✅
- Remove "Render" button (will auto-update) ✅

## BACKLOG-058: Debounced auto-render ✅
**Phase:** 2.2
**Dependencies:** BACKLOG-057
**Status:** Complete
**Description:** Wire CodeMirror onChange to parse → render with 300ms debounce.
**Acceptance Criteria:**
- Diagram updates automatically while typing ✅
- 300ms delay prevents mid-word parsing ✅
- No re-render if text unchanged ✅
- Smooth editing experience ✅

## BACKLOG-059: Syntax highlighting mode ✅
**Phase:** 2.2
**Dependencies:** BACKLOG-057
**Status:** Complete
**Description:** Create custom CodeMirror mode for sequence diagram syntax highlighting.
**Acceptance Criteria:**
- Keywords highlighted: participant, actor, database, alt, loop, else, end, etc. ✅
- Arrow operators highlighted ✅
- Comments greyed out ✅
- Strings quoted ✅
- Applied to editor ✅

## BACKLOG-060: Basic auto-completion ✅
**Phase:** 2.2
**Dependencies:** BACKLOG-059
**Status:** Complete
**Description:** Implement Ctrl-Space auto-completion for keywords and participant aliases.
**Acceptance Criteria:**
- Ctrl-Space / Cmd-Space triggers suggestions ✅
- Suggests: participant types, fragment types, participant aliases in scope ✅
- Arrow keys navigate, Enter accepts ✅
- Works mid-word ✅

## BACKLOG-061: Error markers in scrollbar ✅
**Phase:** 2.2
**Dependencies:** BACKLOG-058
**Status:** Complete
**Description:** Display red markers in CodeMirror scrollbar for lines with parse errors.
**Acceptance Criteria:**
- Each error gets marker at correct line ✅
- Clicking marker scrolls to line ✅
- Markers update on text change ✅
- Tooltip shows error message on hover ✅

## BACKLOG-062: Undo/redo integration ✅
**Phase:** 2.2
**Dependencies:** BACKLOG-057
**Status:** Complete
**Description:** Verify CodeMirror's built-in undo/redo works correctly. Document integration point for Phase 3 command history.
**Acceptance Criteria:**
- Ctrl-Z / Cmd-Z undoes typing ✅
- Ctrl-Y / Cmd-Shift-Z redoes ✅
- Undo stack depth = 100 ✅
- Document hook point for Phase 3 ReplaceAST command integration ✅

## BACKLOG-063: Find and Replace functionality ✅
**Phase:** 2.3
**Dependencies:** BACKLOG-057
**Status:** Complete
**Description:** Implement CodeMirror find/replace dialog per REQUIREMENTS.md.
**Acceptance Criteria:**
- Ctrl-F opens find dialog ✅
- Shift-Ctrl-F opens find dialog with replace option ✅
- Shift-Ctrl-R opens replace dialog ✅
- Find next/previous with Enter/Shift-Enter ✅
- Replace single or replace all ✅
- Case-sensitive option ✅
- Regular expression support ✅

## BACKLOG-064: Word wrap toggle ✅
**Phase:** 2.3
**Dependencies:** BACKLOG-057
**Status:** Complete
**Description:** Add word wrap toggle option in editor settings.
**Acceptance Criteria:**
- Toggle button or menu item ✅
- CodeMirror lineWrapping option toggled ✅
- Preference saved to localStorage ✅
- Default: off ✅

## BACKLOG-065: Tab handling configuration ✅
**Phase:** 2.3
**Dependencies:** BACKLOG-057
**Status:** Complete
**Description:** Configure CodeMirror tab behavior per REQUIREMENTS.md.
**Acceptance Criteria:**
- Tab key inserts spaces (not tab character) ✅
- Shift-Tab de-indents ✅
- Configurable tab width (default: 2 spaces) ✅
- Consistent with fragment indentation ✅


---

## Phase 3: Interactivity (SVG → Text)

### Foundation

## BACKLOG-066: Command pattern base classes ✅
**Phase:** 3.1
**Dependencies:** Phase 2 complete
**Status:** Complete
**Description:** Implement Command class and CommandHistory per DESIGN.md.
**Acceptance Criteria:**
- Command base class with do/undo methods ✅
- CommandHistory with execute/undo/redo ✅
- 100-level history cap ✅
- Unit tests for history management ✅

## BACKLOG-067: ReplaceAST command ✅
**Phase:** 3.1
**Dependencies:** BACKLOG-063
**Status:** Complete
**Description:** Implement command to replace entire AST (for text edits).
**Acceptance Criteria:**
- Stores old and new AST ✅
- do() returns new AST, undo() returns old ✅
- Integration with CodeMirror: create ReplaceAST command after parse completes ✅
- Test: type → parse → undo → redo cycle ✅

## BACKLOG-068: Keyboard shortcuts for undo/redo ✅
**Phase:** 3.1
**Dependencies:** BACKLOG-064
**Status:** Complete
**Description:** Wire Ctrl-Z/Y to command history (taking precedence over CodeMirror when history non-empty).
**Acceptance Criteria:**
- Ctrl-Z calls commandHistory.undo() if stack has commands ✅
- Falls back to CodeMirror undo if history empty ✅
- Ctrl-Y / Ctrl-Shift-Z for redo ✅
- Status bar shows undo/redo availability ✅ (via getHistoryInfo())

## BACKLOG-069: Click to select element ✅
**Phase:** 3.2
**Dependencies:** BACKLOG-063
**Status:** Complete
**Description:** Implement click handler to select any diagram element (participant, message, fragment, note).
**Acceptance Criteria:**
- Clicking element highlights it (stroke or glow) ✅
- Only one element selected at a time ✅
- Click background deselects ✅
- Selected element ID stored in app state ✅

## BACKLOG-070: Highlight source line on selection ✅
**Phase:** 3.2
**Dependencies:** BACKLOG-066
**Status:** Complete
**Description:** When diagram element clicked, highlight corresponding line(s) in CodeMirror.
**Acceptance Criteria:**
- Selected element's sourceLineStart/End used to highlight ✅
- CodeMirror scrolls to line if needed ✅
- Line highlight cleared on deselect ✅
- Bidirectional: clicking code also selects diagram element (deferred to later task)

## BACKLOG-071: Delete key deletes selected element ✅
**Phase:** 3.2
**Dependencies:** BACKLOG-066
**Status:** Complete
**Description:** Pressing Delete key removes selected element from AST.
**Acceptance Criteria:**
- Creates RemoveNode command ✅
- Element removed from AST ✅
- Text and diagram update ✅
- Undo restores element ✅
- Test: delete message, undo, verify restored ✅


### Selection and Basic Interaction

## BACKLOG-072: Context-sensitive cursor behavior ✅
**Phase:** 3.2
**Dependencies:** BACKLOG-066
**Status:** Complete
**Description:** Implement context-sensitive cursor changes per REQUIREMENTS.md to indicate possible actions.
**Acceptance Criteria:**
- Hover over message shows move cursor ✅
- Hover over message endpoints shows resize cursor ✅
- Hover over fragment boundaries shows resize cursor ✅
- Hover over draggable elements shows grab/grabbing cursor ✅
- Hover over clickable elements shows pointer cursor ✅
- Default cursor when no action available ✅


### Message Interactions

## BACKLOG-073: Drag message to reposition vertically ✅
**Phase:** 3.3
**Dependencies:** BACKLOG-066
**Status:** Complete
**Description:** Click and drag message to move it up/down in entry order.
**Acceptance Criteria:**
- Dragging message changes its Y position ✅
- Creates ReorderNode command on drop ✅
- Message moves in AST array ✅
- Text updates to show new position ✅
- Undo moves message back ✅

## BACKLOG-074: Drag message endpoint to change target ✅
**Phase:** 3.3
**Dependencies:** BACKLOG-066
**Status:** Complete
**Description:** Drag arrow endpoint to snap to different participant lifeline.
**Acceptance Criteria:**
- Dragging endpoint shows visual feedback ✅
- Snaps to nearest participant lifeline ✅
- Creates MoveMessageTarget command ✅
- Message.to updated in AST ✅
- Text updates: `Alice->Charlie:msg` (was Bob) ✅
- Undo restores original target ✅

## BACKLOG-075: Drag message endpoint to change source ✅
**Phase:** 3.3
**Dependencies:** BACKLOG-074
**Status:** Complete
**Description:** Same as BACKLOG-074 but for source endpoint.
**Acceptance Criteria:**
- Drag from-end of message ✅
- Snaps to participant lifeline ✅
- Creates MoveMessageSource command ✅
- message.from updated ✅

## BACKLOG-076: Double-click message to edit label ✅
**Phase:** 3.3
**Dependencies:** BACKLOG-066
**Status:** Complete
**Description:** Double-clicking message opens inline edit dialog for label text.
**Acceptance Criteria:**
- Dialog appears near message with text input ✅
- Pre-filled with current label ✅
- Enter or click OK commits change ✅
- Esc or click Cancel dismisses without change ✅
- Creates EditMessageLabel command ✅
- Text updates ✅

## BACKLOG-077: Create message by dragging between lifelines ✅
**Phase:** 3.3
**Dependencies:** BACKLOG-066
**Status:** Complete
**Description:** Click participant lifeline and drag to another to create new message.
**Acceptance Criteria:**
- Click lifeline initiates drag ✅
- Rubber-band line follows cursor ✅
- Drop on other lifeline creates message ✅
- Default arrow type: -> ✅
- Modifier keys: Shift=dashed, Ctrl=open arrow ✅
- Creates AddMessage command ✅
- Prompt for label text after creation ✅


### Participant Interactions

## BACKLOG-078: Drag participant to reorder horizontally ✅
**Phase:** 3.4
**Dependencies:** BACKLOG-066
**Status:** Complete
**Description:** Drag participant left/right past another to reorder.
**Acceptance Criteria:**
- Dragging participant past neighbor swaps positions ✅
- Creates ReorderParticipant command ✅
- All messages to/from reordered participants update visually ✅
- Text shows participants in new order ✅
- Undo restores order ✅

## BACKLOG-079: Double-click participant to edit name and alias ✅
**Phase:** 3.4
**Dependencies:** BACKLOG-066
**Status:** Complete
**Description:** Double-click participant opens edit dialog for displayName and alias.
**Acceptance Criteria:**
- Dialog with two text inputs: Display Name, Alias ✅
- Pre-filled with current values ✅
- Enter/OK commits changes ✅
- Creates EditParticipant command ✅
- Text updates: `participant "New Name" as Alias` ✅
- Messages still reference alias (updated if alias changes) ✅

## BACKLOG-080: Delete participant (with warning) ✅
**Phase:** 3.4
**Dependencies:** BACKLOG-068
**Status:** Complete
**Description:** Deleting participant shows warning if messages reference it.
**Acceptance Criteria:**
- Warning dialog: "X messages reference this participant. Delete anyway?" ✅
- If confirmed, participant removed ✅
- Orphaned messages become errors ✅
- Undo restores participant and fixes errors ✅


### Fragment Interactions

## BACKLOG-081: Drag fragment top boundary to include/exclude entries ✅
**Phase:** 3.5
**Dependencies:** BACKLOG-066
**Status:** Complete
**Description:** Drag top edge of fragment box up/down to change which entries are inside.
**Acceptance Criteria:**
- Dragging boundary shows visual feedback ✅
- Drop adjusts fragment.entries array ✅
- Creates AdjustFragmentBoundary command ✅
- Text updates with entries moved in/out of fragment ✅
- Undo restores ✅

## BACKLOG-082: Drag fragment bottom boundary ✅
**Phase:** 3.5
**Dependencies:** BACKLOG-081
**Status:** Complete
**Description:** Same as BACKLOG-081 for bottom edge.
**Acceptance Criteria:**
- Drag bottom edge to include/exclude trailing entries ✅

## BACKLOG-083: Drag fragment else divider ✅
**Phase:** 3.5
**Dependencies:** BACKLOG-081
**Status:** Complete
**Description:** Drag else divider line to move entries between main and else clause.
**Acceptance Criteria:**
- Dragging divider moves entries between fragment.entries and elseClauses[0].entries ✅
- Creates MoveEntryBetweenClauses command ✅
- Text updates ✅
- Undo restores ✅

## BACKLOG-084: Double-click fragment label to edit condition ✅
**Phase:** 3.5
**Dependencies:** BACKLOG-066
**Status:** Complete
**Description:** Double-click fragment top label to edit condition text.
**Acceptance Criteria:**
- Dialog with text input for condition ✅
- Enter/OK commits ✅
- Creates EditFragmentCondition command ✅
- Text updates: `alt new condition` ✅

## BACKLOG-085: Double-click else label to edit else condition ✅
**Phase:** 3.5
**Dependencies:** BACKLOG-084
**Status:** Complete
**Description:** Same as BACKLOG-084 for else clause labels.
**Acceptance Criteria:**
- Edit else clause condition ✅


### Additional Interactions

## BACKLOG-086: Keyboard shortcut: +/- for entry spacing ✅
**Phase:** 3.7
**Dependencies:** Phase 3 interactions
**Status:** Complete
**Description:** Add keyboard shortcuts to adjust entry spacing when element selected or clicked anywhere.
**Acceptance Criteria:**
- Click anywhere or select element, press + increases entryspacing ✅
- Press - decreases entryspacing ✅
- Updates entryspacing directive in text ✅
- Visual feedback shows new spacing immediately ✅
- Command for undo/redo ✅

## BACKLOG-087: Drag dividers and spaces to reposition
**Phase:** 3.7
**Dependencies:** BACKLOG-066, BACKLOG-126
**Status:** Blocked (waiting for divider/space parsing in BACKLOG-126)
**Description:** Make divider and space elements draggable per REQUIREMENTS.md drag operations.
**Acceptance Criteria:**
- Dividers (==text==) can be dragged up/down to reposition
- Space directives can be dragged to move
- Creates ReorderNode command
- Text updates to show new position
- Undo restores position


### Context Menu

## BACKLOG-088: Right-click context menu ✅
**Phase:** 3.6
**Dependencies:** BACKLOG-066
**Status:** Complete
**Description:** Implement right-click menu with options to add elements.
**Acceptance Criteria:**
- Right-click background or element shows menu ✅
- Categories: Participants, Messages, Fragments, Notes (Phase 4), Other ✅
- Menu positioned at click location ✅
- Selecting item initiates creation workflow ✅
- Esc closes menu ✅

## BACKLOG-089: Add participant from context menu ✅
**Phase:** 3.6
**Dependencies:** BACKLOG-088
**Status:** Complete
**Description:** Context menu > Add Participant prompts for type, name, alias.
**Acceptance Criteria:**
- Dialog with dropdowns and text inputs ✅
- Creates AddParticipant command ✅
- New participant added at end or after selected participant ✅
- Text updates ✅

## BACKLOG-090: Add message from context menu ✅
**Phase:** 3.6
**Dependencies:** BACKLOG-088
**Status:** Complete
**Description:** Context menu > Add Message prompts for source, target, arrow type, label.
**Acceptance Criteria:**
- Dialog with dropdowns for participants and arrow type ✅
- Text input for label ✅
- Creates AddMessage command ✅
- Inserted after selected element or at end ✅
- Text updates ✅

## BACKLOG-091: Add fragment from context menu ✅
**Phase:** 3.6
**Dependencies:** BACKLOG-088
**Status:** Complete
**Description:** Context menu > Add Fragment prompts for type and condition.
**Acceptance Criteria:**
- Dialog with fragment type dropdown ✅
- Text input for condition ✅
- Creates AddFragment command ✅
- Empty fragment initially (entries=[]) ✅
- User can drag boundaries to include entries ✅
- Text updates ✅


---

## Phase 4: File I/O & Export

### Export Formats

## BACKLOG-092: PNG export implementation ✅
**Phase:** 4.1
**Dependencies:** Phase 3 complete
**Status:** Complete
**Description:** Implement PNG export using SVG → Canvas → Data URL approach per DESIGN.md.
**Acceptance Criteria:**
- exportPNG(svgElement, zoom) function ✅
- Canvas sized based on SVG bbox * zoom ✅
- Generates data URL ✅
- Returns PNG blob ✅

## BACKLOG-093: PNG download action ✅
**Phase:** 4.1
**Dependencies:** BACKLOG-092
**Status:** Complete
**Description:** Add "Export PNG" menu item that downloads PNG file.
**Acceptance Criteria:**
- Button in diagram toolbar ✅
- Triggers download with diagram.png ✅
- Uses 2x scale for high DPI ✅
- Works in all browsers ✅

## BACKLOG-094: PNG copy-to-clipboard action
**Phase:** 4.1
**Dependencies:** BACKLOG-092
**Status:** Deferred (can be added later if needed)
**Description:** Add "Copy PNG" option that renders in modal for user to copy.
**Acceptance Criteria:**
- Menu item in Export menu
- Opens modal with PNG image
- User can right-click to copy
- Modal has "Done" button

## BACKLOG-095: SVG export with embedded source ✅
**Phase:** 4.1
**Dependencies:** None (uses existing SVG)
**Status:** Complete
**Description:** Implement SVG export with source text in <desc> element per DESIGN.md.
**Acceptance Criteria:**
- Clones SVG, adds <desc> with source ✅
- Serializes to string ✅
- Creates blob and download ✅

## BACKLOG-096: SVG download action ✅
**Phase:** 4.1
**Dependencies:** BACKLOG-095
**Status:** Complete
**Description:** Add "Export SVG" menu item.
**Acceptance Criteria:**
- Button in diagram toolbar ✅
- Downloads diagram.svg ✅
- Source text embedded in <desc> element ✅

## BACKLOG-097: TXT export ✅
**Phase:** 4.1
**Dependencies:** None (uses serializer)
**Status:** Complete
**Description:** Add "Export Text" menu item that downloads serialized text.
**Acceptance Criteria:**
- Button in diagram toolbar ✅
- Downloads diagram.txt ✅
- Content is serialize(currentAst) ✅


### File System Access

## BACKLOG-098: Open file from filesystem ✅
**Phase:** 4.2
**Dependencies:** None
**Status:** Complete
**Description:** Implement File System Access API to open .txt/.sduml files per DESIGN.md.
**Acceptance Criteria:**
- Open button in editor toolbar ✅
- Shows file picker with .txt/.sduml/.svg filter ✅
- Reads file content ✅
- Parses and loads into editor ✅
- Stores fileHandle for later save ✅
- Keyboard shortcut: Ctrl/Cmd-O ✅
- Fallback for browsers without File System Access API ✅

## BACKLOG-099: Open SVG file and extract source ✅
**Phase:** 4.2
**Dependencies:** BACKLOG-092
**Status:** Complete
**Description:** When opening .svg file, extract source from <desc> element.
**Acceptance Criteria:**
- File picker includes .svg in allowed types ✅
- Parses SVG XML with DOMParser ✅
- Extracts text from <desc> ✅
- Loads into editor ✅
- If <desc> missing, shows error alert ✅

## BACKLOG-100: Save file to filesystem ✅
**Phase:** 4.2
**Dependencies:** BACKLOG-092
**Status:** Complete
**Description:** Save current text to filesystem, reusing fileHandle if available.
**Acceptance Criteria:**
- Save button in editor toolbar ✅
- Keyboard shortcut: Ctrl/Cmd-S ✅
- If fileHandle exists, writes directly ✅
- If no handle, prompts for location with showSaveFilePicker ✅
- Saves as .txt ✅
- Console message confirms save ✅
- Fallback download for browsers without File System Access API ✅

## BACKLOG-101: Save As ✅
**Phase:** 4.2
**Dependencies:** BACKLOG-094
**Status:** Complete
**Description:** Force save dialog even if fileHandle exists.
**Acceptance Criteria:**
- Keyboard shortcut: Ctrl/Cmd-Shift-S ✅
- Always shows save picker ✅
- Updates fileHandle after successful save ✅


### localStorage

## BACKLOG-102: Save diagram to localStorage
**Phase:** 4.3  
**Dependencies:** None  
**Description:** Implement named diagram storage in browser localStorage per DESIGN.md.  
**Acceptance Criteria:**
- saveDiagram(name, text) stores in localStorage.diagrams[id]
- Includes name, text, modified timestamp
- Auto-generates ID if needed

## BACKLOG-103: List saved diagrams
**Phase:** 4.3  
**Dependencies:** BACKLOG-096  
**Description:** Create visual diagram manager modal showing saved diagrams.  
**Acceptance Criteria:**
- Menu item: File > Manage Diagrams
- Modal shows list with name, modified date, size
- Click diagram loads it
- Delete button removes from localStorage
- Close button

## BACKLOG-104: Autosave to localStorage
**Phase:** 4.3  
**Dependencies:** BACKLOG-096  
**Description:** Automatically save current diagram every 60 seconds.  
**Acceptance Criteria:**
- Timer triggers every 60s if text changed
- Saves to localStorage.autosave
- On load, prompts to recover if autosave newer than opened file
- Can disable in settings


### URL Sharing

## BACKLOG-105: Vendor lz-string library
**Phase:** 4.4  
**Dependencies:** None  
**Description:** Download and vendor lz-string 1.5.0 into lib/ directory.  
**Acceptance Criteria:**
- lz-string.js in lib/
- Can import and use compressToEncodedURIComponent
- No network requests

## BACKLOG-106: Generate share URL
**Phase:** 4.4  
**Dependencies:** BACKLOG-099  
**Description:** Implement share URL generation with lz-string compression per DESIGN.md.  
**Acceptance Criteria:**
- createShareURL(text, options) function
- Uses window.location.origin (dynamic)
- Fragment-based: #initialData={compressed}
- Options: presentation, shrinkToFit
- Returns full URL

## BACKLOG-107: Share button with URL display
**Phase:** 4.4  
**Dependencies:** BACKLOG-100  
**Description:** Add "Share" button that generates URL and displays in modal.  
**Acceptance Criteria:**
- Button in toolbar or menu
- Modal shows URL in text input (auto-selected)
- Copy button copies to clipboard
- Checkboxes for presentation mode, shrink-to-fit

## BACKLOG-108: Load from URL on page load
**Phase:** 4.4  
**Dependencies:** BACKLOG-099  
**Description:** Check URL hash on page load and decompress if present.  
**Acceptance Criteria:**
- loadFromURL() called in main.js initialization
- Decompresses initialData param
- Loads into editor
- Applies presentation/shrinkToFit options if present
- If decompression fails, shows error


---

## Phase 5: Polish & Deploy

### View Modes and UI Polish

## BACKLOG-109: Resizable editor/diagram splitter
**Phase:** 5.1  
**Dependencies:** Phase 4 complete  
**Description:** Make border between editor and diagram draggable to resize panes.  
**Acceptance Criteria:**
- Cursor changes to resize on border hover
- Dragging adjusts flex widths
- Stores preference in localStorage
- Min/max widths enforced

## BACKLOG-110: Zoom controls ✓
**Phase:** 5.1
**Dependencies:** None
**Description:** Add zoom in/out buttons above diagram with zoom level display.
**Acceptance Criteria:**
- Buttons: +, -, Reset ✓
- Display: "100%" ✓
- Adjusts SVG scale transform ✓
- Affects PNG export resolution ✓
- Keyboard: Ctrl-Plus, Ctrl-Minus ✓

## BACKLOG-111: Presentation mode
**Phase:** 5.1  
**Dependencies:** None  
**Description:** Implement presentation mode that hides editor and shows diagram fullscreen.  
**Acceptance Criteria:**
- Menu item or Ctrl-M to toggle
- Hides editor pane and toolbar
- Diagram fills viewport
- Esc exits presentation mode

## BACKLOG-112: Read-only presentation mode
**Phase:** 5.1  
**Dependencies:** BACKLOG-105  
**Description:** Presentation mode variant with panning enabled and editing disabled.  
**Acceptance Criteria:**
- Menu item: View > Read-Only Present
- Disables all mouse editing interactions
- Enables click-drag to pan diagram
- Scroll wheel to zoom

## BACKLOG-113: Participant overlay on scroll
**Phase:** 5.1  
**Dependencies:** None  
**Description:** Show participant names at viewport top when scrolled down per REQUIREMENTS.md.  
**Acceptance Criteria:**
- Fixed position overlay at top
- Shows participant boxes when main participant area scrolled out of view
- Enabled by default
- Toggle in View menu

## BACKLOG-114: Shrink to fit
**Phase:** 5.1  
**Dependencies:** BACKLOG-104  
**Description:** Scale diagram to fit available viewport space.  
**Acceptance Criteria:**
- Button or menu item
- Calculates scale factor
- Applies to SVG viewBox
- Works with presentation mode


### Additional Features from Requirements

## BACKLOG-115: Remaining participant types - rparticipant
**Phase:** 5.2  
**Dependencies:** Phase 1 complete  
**Description:** Add support for rparticipant (rounded corners).  
**Acceptance Criteria:**
- Parse `rparticipant Name`
- Render with rounded rect
- Serialize correctly

## BACKLOG-116: Remaining participant types - boundary, control, entity
**Phase:** 5.2  
**Dependencies:** BACKLOG-109  
**Description:** Add UML participant types.  
**Acceptance Criteria:**
- Parse and render boundary (boundary icon)
- Parse and render control (control icon)
- Parse and render entity (entity icon)
- Icons match UML standard shapes

## BACKLOG-117: Font Awesome 6 participant type
**Phase:** 5.2  
**Dependencies:** None  
**Description:** Add fontawesome6solid/regular/brands participant type with icon support.  
**Acceptance Criteria:**
- Vendor Font Awesome 6.5.2
- Parse `fontawesome6solid f48e Name` syntax
- Render icon from hex codepoint
- Security: sanitize with DOMPurify

## BACKLOG-118: Material Design Icons participant type
**Phase:** 5.2  
**Dependencies:** None  
**Description:** Add materialdesignicons participant type.  
**Acceptance Criteria:**
- Vendor Material Design Icons 7.4.47
- Parse `materialdesignicons F1FF Name`
- Render icon from codepoint
- Sanitize with DOMPurify

## BACKLOG-119: Image participant type
**Phase:** 5.2  
**Dependencies:** None  
**Description:** Add support for custom PNG image participants.  
**Acceptance Criteria:**
- Parse `image data:image/png;base64,... Name`
- 50KB size limit enforced
- Render image in participant box
- Sanitize with DOMPurify

## BACKLOG-120: Remaining arrow types - reversed, bidirectional, lost
**Phase:** 5.3  
**Dependencies:** Phase 1 complete  
**Description:** Add <-, <->, -x arrow types.  
**Acceptance Criteria:**
- Parse all three types
- Render with correct directions and terminators
- X terminator for -x (lost message)
- Serialize correctly

## BACKLOG-121: Message delays (non-instantaneous)
**Phase:** 5.3  
**Dependencies:** BACKLOG-114  
**Description:** Add support for A->(5)B syntax showing propagation delay.  
**Acceptance Criteria:**
- Parse delay number from message syntax
- Render message with visual delay (sloped line)
- Works with space -N for overlapping messages
- Serialize with delay

## BACKLOG-122: Boundary messages
**Phase:** 5.3  
**Dependencies:** BACKLOG-114  
**Description:** Add support for [->A, A->], [<-A, A<-] syntax.  
**Acceptance Criteria:**
- Parse boundary message syntax
- '[' and ']' are valid from/to values
- Render arrows to/from diagram edge
- Serialize correctly

## BACKLOG-123: Message styling with brackets
**Phase:** 5.3  
**Dependencies:** BACKLOG-114  
**Description:** Add v9.16.0+ bracket syntax for message styling.  
**Acceptance Criteria:**
- Parse A-[#red;3]>B syntax
- Parse A-[##myStyle]>B (named style reference)
- Apply styling to message line
- Serialize with brackets

## BACKLOG-124: Remaining fragment types (13 types)
**Phase:** 5.4  
**Dependencies:** Phase 1 complete  
**Description:** Add all remaining fragment types: opt, par, break, critical, ref, seq, strict, neg, ignore, consider, assert, region, group.  
**Acceptance Criteria:**
- Each type parses with fragmentType set
- Render with correct label
- Support else clauses for all (per requirements)
- Serialize correctly
- Note: Implementation details minimal, learned from alt/loop

## BACKLOG-125: Expandable fragments
**Phase:** 5.4  
**Dependencies:** BACKLOG-118  
**Description:** Add expandable+/- fragment types that collapse/expand.  
**Acceptance Criteria:**
- Parse expandable+ (expanded) and expandable- (collapsed)
- Render with expand/collapse icon
- Click icon toggles state (re-render)
- State stored in AST or app state
- Hidden entries not rendered when collapsed

## BACKLOG-126: Notes and boxes - all 7 types
**Phase:** 5.5  
**Dependencies:** None  
**Description:** Add support for note, box, abox, rbox, ref, state, divider.  
**Acceptance Criteria:**
- Parse: `note over A,B:text`, `note left of A:text`, etc.
- All positions: over, left of, right of
- Parse: `box`, `abox`, `rbox`, `ref`, `state` with same positions
- Parse divider: `==text==`
- Render each with appropriate shape
- Serialize correctly

## BACKLOG-127: Note and box styling
**Phase:** 5.5  
**Dependencies:** BACKLOG-120  
**Description:** Add styling support for notes/boxes.  
**Acceptance Criteria:**
- Parse unified styling syntax
- Apply to note background and border
- Serialize with styling

## BACKLOG-128: Note interactions - drag and edit
**Phase:** 5.5  
**Dependencies:** BACKLOG-120, Phase 3 complete  
**Description:** Make notes draggable and editable.  
**Acceptance Criteria:**
- Drag middle to move vertically
- Drag ends to change coverage (which participants)
- Double-click to edit text
- Delete key removes
- Commands for undo/redo

## BACKLOG-129: Lifecycle - create, destroy
**Phase:** 5.6  
**Dependencies:** None  
**Description:** Add create and destroy lifecycle commands.  
**Acceptance Criteria:**
- Parse: `A->*B:<<create>>`, `destroy C`, `destroyafter C`, `destroysilent C`
- Render create arrow to participant (appears at message Y)
- Render destroy X at participant lifeline
- destroyafter adds space, destroysilent omits X
- Serialize correctly

## BACKLOG-130: Activations
**Phase:** 5.6  
**Dependencies:** None  
**Description:** Add activation/deactivation support.  
**Acceptance Criteria:**
- Parse: `activate B`, `deactivate B`, `deactivateafter B`
- Parse: `activate B #lightblue` (styled)
- Parse: `autoactivation on/off`
- Parse: `activecolor #color` (default and per-participant)
- Render activation bars on lifelines
- Auto-activation: activate on request, deactivate on response
- Serialize correctly

## BACKLOG-131: Spacing controls
**Phase:** 5.7  
**Dependencies:** None  
**Description:** Add space, participantspacing, entryspacing directives.  
**Acceptance Criteria:**
- Parse: `space`, `space 3`, `space -4`
- Parse: `participantspacing 50`, `participantspacing equal`
- Parse: `entryspacing 0.1`
- Apply spacing in layout calculation
- Negative space allows overlapping messages
- Serialize directives

## BACKLOG-132: Lifeline styling
**Phase:** 5.7  
**Dependencies:** None  
**Description:** Add lifelinestyle directive.  
**Acceptance Criteria:**
- Parse: `lifelinestyle #red;4;solid`
- Parse: `lifelinestyle B #black;2;dashed` (per-participant)
- Apply styling to lifeline rendering
- Serialize correctly

## BACKLOG-133: Autonumbering
**Phase:** 5.7  
**Dependencies:** None  
**Description:** Add autonumber directive for message numbering.  
**Acceptance Criteria:**
- Parse: `autonumber 1`, `autonumber off`
- Render numbers next to message labels
- Increment for each message
- Toggle off when directive encountered
- Serialize directive

## BACKLOG-134: Linear and parallel directives
**Phase:** 5.7  
**Dependencies:** None  
**Description:** Add linear and parallel message positioning directives.  
**Acceptance Criteria:**
- Parse: `linear`, `linear off`, `parallel`, `parallel off`
- linear: same-type messages at same Y
- parallel: all entries at same Y
- Override default sequential layout
- Serialize directives

## BACKLOG-135: Frame directive
**Phase:** 5.7  
**Dependencies:** None  
**Description:** Add frame around entire diagram.  
**Acceptance Criteria:**
- Parse: `frame Title`
- Parse styling: `frame#fill #border;width;style Title`
- Render frame as border rect around diagram with label
- Serialize correctly

## BACKLOG-136: Participant groups
**Phase:** 5.7  
**Dependencies:** None  
**Description:** Add participantgroup for grouping participants.  
**Acceptance Criteria:**
- Parse: `participantgroup #color Label ... end`
- Nesting supported
- Render background box around grouped participants
- Serialize with proper nesting and indentation

## BACKLOG-137: Bottom participants
**Phase:** 5.7  
**Dependencies:** None  
**Description:** Add bottomparticipants directive.  
**Acceptance Criteria:**
- Parse: `bottomparticipants`
- Render participant boxes at bottom of diagram too
- Lifelines extend from top participants to bottom participants
- Serialize directive

## BACKLOG-138: Font family directive
**Phase:** 5.7  
**Dependencies:** None  
**Description:** Add fontfamily directive.  
**Acceptance Criteria:**
- Parse: `fontfamily sans-serif`, `fontfamily "Custom Font"`
- Apply to all text in diagram
- Serialize correctly

## BACKLOG-139: Advanced text markup
**Phase:** 5.8  
**Dependencies:** Phase 1 markup complete  
**Description:** Add remaining markup types: --small--, ++big++, ""mono"", ~~strike~~, <color>, <size>, <align>, <position>, <stroke>, <background>, <difference>, <wordwrap>, <sub>, <sup>, <link>.  
**Acceptance Criteria:**
- Parse all markup types
- Render to appropriate SVG styling
- <link> creates clickable SVG link
- <wordwrap> breaks text at character limit
- Serialize markup

## BACKLOG-140: Named styles system
**Phase:** 5.8  
**Dependencies:** BACKLOG-133  
**Description:** Implement named styles per REQUIREMENTS.md v9.16.0+.  
**Acceptance Criteria:**
- Parse: `style myStyle #fill #border;width;style,**<color:#red>`
- Parse style reference: `note ##myStyle:text`
- Store named styles in separate map
- Apply when rendering element with styleRef
- Serialize style definitions and references

## BACKLOG-141: Type-based styles
**Phase:** 5.8  
**Dependencies:** BACKLOG-134  
**Description:** Add type-based styling directives that auto-apply to element types.  
**Acceptance Criteria:**
- Parse: `participantstyle`, `notestyle`, `messagestyle`, `dividerstyle`, `boxstyle`, `aboxstyle`, `rboxstyle`, `aboxrightstyle`, `aboxleftstyle`
- Each directive sets default styling for that type
- Applied during rendering if element has no explicit style
- Serialize directives

## BACKLOG-142: Comprehensive test suite for all features
**Phase:** 5.9  
**Dependencies:** All feature tasks complete  
**Description:** Expand test suite to cover every feature in REQUIREMENTS.md.  
**Acceptance Criteria:**
- Tests for all participant types (10 types)
- Tests for all arrow types (7+ types)
- Tests for all fragment types (16 types)
- Tests for notes, activations, lifecycle, spacing, styling
- Tests for all text markup
- Tests for named and type-based styles
- All tests pass


### Testing and Documentation

## BACKLOG-143: Example diagrams for all features
**Phase:** 5.9  
**Dependencies:** All feature tasks complete  
**Description:** Create comprehensive examples/ collection demonstrating every feature.  
**Acceptance Criteria:**
- 20+ example .txt files
- Each example focuses on specific feature set
- Comments explain usage
- "Complete Feature Demo" from REQUIREMENTS.md included
- All examples parse and render without errors

## BACKLOG-144: README documentation
**Phase:** 5.9  
**Dependencies:** None  
**Description:** Write comprehensive README.md.  
**Acceptance Criteria:**
- Project overview and goals
- Feature list
- Quick start instructions
- Development setup
- Self-hosting instructions
- License info
- Contributing guidelines
- Links to REQUIREMENTS, ARCHITECTURE, DESIGN docs

## BACKLOG-145: Dockerfile for static file serving
**Phase:** 5.10  
**Dependencies:** None  
**Description:** Create Dockerfile using nginx to serve static files.  
**Acceptance Criteria:**
- Dockerfile in docker/ directory
- Uses nginx:alpine base
- Copies public/, src/, lib/ to nginx html directory
- nginx.conf for correct MIME types and caching
- Build succeeds: `docker build -t sequence-diagram .`


### Deployment

## BACKLOG-146: Docker Compose for local testing
**Phase:** 5.10  
**Dependencies:** BACKLOG-139  
**Description:** Create docker-compose.yml for easy local deployment.  
**Acceptance Criteria:**
- docker-compose.yml in root
- Mounts local files for development
- Port 8080 mapped
- `docker-compose up` starts server
- Access at http://localhost:8080

## BACKLOG-147: Minification (optional)
**Phase:** 5.10  
**Dependencies:** None  
**Description:** Decide if minification is needed. If yes, set up terser for JS minification.  
**Acceptance Criteria:**
- Evaluate: development priority vs. production optimization
- If implemented: terser configured, minified versions in dist/
- If not: document decision to serve raw source
- Update Dockerfile accordingly

## BACKLOG-148: Domain purchase and DNS setup
**Phase:** 5.10  
**Dependencies:** BACKLOG-139  
**Description:** Purchase domain and configure DNS.  
**Acceptance Criteria:**
- Domain purchased (TBD)
- DNS records created
- Documented in deployment docs

## BACKLOG-149: Deploy to Cloudflare
**Phase:** 5.10  
**Dependencies:** BACKLOG-142  
**Description:** Deploy to Cloudflare hosting service.  
**Acceptance Criteria:**
- Evaluate Cloudflare Pages vs Workers vs other
- Deploy Docker image or static files
- SSL configured
- Access at purchased domain
- Deployment steps documented

## BACKLOG-150: GitHub repository setup
**Phase:** 5.10  
**Dependencies:** BACKLOG-138  
**Description:** Create public GitHub repository with all code.  
**Acceptance Criteria:**
- Repository created
- .gitignore configured
- All code pushed
- README renders correctly
- LICENSE file (MIT or Apache 2.0)
- GitHub Actions for CI tests (optional)

## BACKLOG-151: Self-hosting instructions
**Phase:** 5.10  
**Dependencies:** BACKLOG-139, BACKLOG-144  
**Description:** Document how others can self-host.  
**Acceptance Criteria:**
- Instructions in README or separate HOSTING.md
- Docker method documented
- Direct nginx serving documented
- Kubernetes example (optional)
- Cloudflare Pages deployment documented

---

## Notes on Backlog Usage

### Task Estimation
- Phase 1 tasks (BACKLOG-001 to BACKLOG-055): Average 30-60 minutes each
- Phase 2 tasks: 1-2 hours each
- Phase 3 tasks: 1-3 hours each (interactions are complex)
- Phase 4 tasks: 1-2 hours each
- Phase 5 tasks: Varies widely (some are 30 min, deployment may be several hours)

### Commit Strategy
Each backlog item should result in ONE commit with:
- Code changes
- Tests (if applicable)
- Updated documentation (if applicable)
- Commit message referencing backlog number: "BACKLOG-042: Implement title directive rendering"

### Verification
After completing each task:
1. Run test suite (`npm test`)
2. Manual test in browser
3. Verify no regressions
4. Update this document to mark task complete: ✅

### Context Management
- Start each session by reading relevant backlog item(s)
- Reference ARCHITECTURE.md and DESIGN.md as needed
- Keep sessions focused on 1-2 related items
- Document learnings or deviations in commit message

### Feature Coverage Checklist
This backlog exhaustively covers all features from REQUIREMENTS.md:
- ✅ All 10 participant types
- ✅ All 7+ arrow types  
- ✅ All 16 fragment types
- ✅ All 7 note/box types
- ✅ Lifecycle management
- ✅ Activations
- ✅ Spacing controls
- ✅ All directives
- ✅ Named and type-based styles
- ✅ All text markup types
- ✅ Editor features (syntax highlighting, autocomplete, error markers, undo/redo, find/replace, word wrap, tab handling, selection sync)
- ✅ Interactive editing (click, double-click, drag, right-click, keyboard shortcuts, context-sensitive cursors)
- ✅ Export formats (PNG download + copy, SVG, TXT)
- ✅ File I/O and storage
- ✅ URL sharing
- ✅ View modes (presentation, read-only presentation, participant overlay, shrink to fit, zoom)
- ✅ Resizable splitter
- ✅ Deployment

Total: 151 tasks covering all requirements
