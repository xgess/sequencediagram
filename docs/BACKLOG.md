# Backlog

Remaining work items. See FEATURES.md for what's already implemented.

---

## Bug Fixes

### To Be Ingested
(leave this here for easily adding new bugs):


### Fixed
- [x] BUG-033: Actor/database participant label overlaps icon - Fixed by adjusting text Y position
- [x] BUG-034: First message text is positioned too high - Fixed by reducing baseOffset from 12 to 6
- [x] BUG-035: Activate aligns to next element instead of previous message - Fixed by tracking lastMessageY
- [x] BUG-036: Deactivate ends too late - Fixed by using lastMessageY for deactivate positioning
- [x] BUG-037: Fragment header overlaps message text - Fixed by increasing FRAGMENT_HEADER_HEIGHT and ELSE_LABEL_HEIGHT
- [x] BUG-038: Adjacent fragments have no spacing - Fixed by adding FRAGMENT_MARGIN after fragments
- [x] BUG-039: Cmd+/ comment toggle not working - Fixed by using event.code in addition to event.key
- [x] BUG-040: FontAwesome icons don't render - Fixed by updating font family to "Font Awesome 7"

### Previously Fixed
- [x] BUG-016: Zooming moves diagram off to the right/out of screen - Fixed by wrapping SVG in scrollable container
- [x] BUG-017: "note right of alice" attaches to wrong participant - Fixed by positioning relative to lifeline (centerX)
- [x] BUG-018: Double-click edit should be multiline - Already fixed by BUG-012
- [x] BUG-019: Multiline message text should be above arrow - Fixed by offsetting Y based on line count
- [x] BUG-020: Adding new messages resets zoom - should preserve - Fixed by calling updateZoom() after re-rendering
- [x] BUG-029: Database participant styling issues - Fixed all 4 issues (dashed borders, fill, compact icon, label below)
- [x] BUG-031: Selection highlighting is ugly - Fixed by using addLineClass for full-line background
- [x] BUG-032: Messages to/from unknown participants go off-screen - Fixed by showing error indicator
- [x] FEATURE-001: Image participants - Added `image data:image/...;base64,... Name` syntax

### Pending
(none)

### Fixed (UI)
- [x] BUG-021: Note box should expand to fit long text - Fixed by increasing CHAR_WIDTH from 5.5 to 7 for proportional fonts
- [x] BUG-022: Textarea resize should expand width, not just height - Fixed by adding auto-resize on input that expands both dimensions

### Fixed (Recent)
- [x] BUG-041: Participant overlay on scroll - Fixed by using sticky positioning in diagram pane, listening to scroll on correct element (diagram-pane), extracting position data from all participant types (actors, databases, icons), centering overlay boxes over lifelines, and adding translucent backdrop

---

## Color & Style System Issues (All Fixed)

### Fixed

- [x] **BUG-023**: Named CSS colors (e.g., `#lightblue`) - Fixed by creating `src/rendering/colors.js` with 140+ named colors and `resolveColor()` utility
- [x] **BUG-024**: `##styleName` on notes/dividers - Fixed by updating parser to detect `##` prefix
- [x] **BUG-025**: `dotted` border style - Fixed by adding `stroke-dasharray: 2,2` rendering in all elements
- [x] **BUG-026**: Type styles not applied - Fixed by implementing `applyTypeStyle()` for participants, notes, and dividers
- [x] **BUG-027**: Named style property mapping - Verified correct: messages map `fill->color`, `borderWidth->width`; notes/dividers use properties directly
- [x] **BUG-028**: Colored arrow markers - Fixed by creating dynamic per-color markers and removing CSS stroke override

---

## Deferred Features

### Image Participants

```
image data:image/png;base64,... Name
```

Custom PNG images as participant icons. Deferred due to security considerations.

### Advanced Text Markup

These markup types are not yet implemented:

- `<align:left|center|right>` - Text alignment
- `<position:left|center|right>` - Text positioning (different from align)
- `<difference>` - Inverse/difference color effect
- `<wordwrap:N>` - Word wrap at N characters

### Autosave Disable

Setting to disable autosave is not implemented.

---

## Deployment

These require external action:

- [ ] Domain purchase and DNS setup
- [ ] Deploy to Cloudflare (or other hosting)
- [ ] GitHub repository setup

---

## Participant Overlay Polish (OVERLAY-001 to OVERLAY-008)

Make the sticky participant overlay look professional and polished when scrolling long diagrams.

### OVERLAY-001: Render actual participant visuals instead of text boxes

**Current**: Shows plain text boxes with participant names
**Goal**: Show the actual participant visual representation (actor stick figures, database cylinders, FontAwesome icons, MDI icons, images)

Implementation:
1. Clone the participant's SVG group from the main diagram
2. Scale it appropriately for the overlay height (36-40px)
3. Strip the text label if showing separately
4. Position the visual centered in the overlay box
5. For icon participants (FA6, MDI), render the actual icon character

Files: `src/interaction/participantOverlay.js`

### OVERLAY-002: Match participant styling in overlay

**Current**: All overlay boxes are identical white boxes with black borders
**Goal**: Preserve participant colors, borders, and style attributes

Implementation:
1. Extract style info from participant data-attributes or computed styles
2. Apply background color (`fill` from rect)
3. Apply border color (`stroke` from rect)
4. Apply border style (dashed, dotted) if applicable
5. For actors/databases/icons, use a subtle matching background

Files: `src/interaction/participantOverlay.js`, `public/styles.css`

### OVERLAY-003: Smooth fade-in/out transitions

**Current**: Overlay appears/disappears instantly
**Goal**: Subtle fade/slide animation when showing/hiding

Implementation:
1. Add CSS transitions for opacity and transform
2. Fade from 0 to 1 opacity over 150-200ms
3. Optional: slight slide down from -10px to 0
4. Use `requestAnimationFrame` or CSS transitions (CSS preferred)
5. Ensure no layout jank during transition

CSS additions:
```css
#participant-overlay {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
  opacity: 0;
}
#participant-overlay.visible {
  opacity: 1;
}
```

Files: `src/interaction/participantOverlay.js`, `public/styles.css`

### OVERLAY-004: Handle multiline participant names elegantly

**Current**: Displays full multiline text which may overflow
**Goal**: Show truncated or wrapped text that fits within overlay height

Implementation:
1. Limit to first line if multiple lines exist
2. Or use ellipsis truncation if single line is too long
3. Show full name on hover via tooltip
4. Ensure consistent height across all participants

Files: `src/interaction/participantOverlay.js`, `public/styles.css`

### OVERLAY-005: Proper sizing and spacing for icon participants

**Current**: All overlay boxes use same width calculation
**Goal**: Icon participants should show compact icon with appropriate spacing

Implementation:
1. Detect participant type (actor, database, icon)
2. For icon types: render icon + abbreviated/truncated label
3. Adjust box width based on content type
4. Icons should be appropriately sized (24-28px) for overlay
5. Ensure icons don't touch edges (proper padding)

Files: `src/interaction/participantOverlay.js`

### OVERLAY-006: Improved translucency and backdrop

**Current**: Uses `backdrop-filter: blur(3px)` with 0.6 opacity background
**Goal**: More polished glass-morphism effect

Implementation:
1. Fine-tune backdrop blur (try 4-8px)
2. Adjust background opacity for better contrast
3. Add subtle bottom border or shadow for definition
4. Ensure text remains readable over any diagram content
5. Test with various diagram backgrounds (colored fragments, notes)

CSS updates:
```css
#participant-overlay {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
```

Files: `public/styles.css`

### OVERLAY-007: Sync overlay with zoom level

**Current**: Basic scale multiplier applied to positions
**Goal**: Overlay boxes should perfectly align with diagram participants at any zoom

Implementation:
1. Recalculate positions when zoom changes
2. Listen to zoom events and re-render overlay
3. Ensure overlay width matches zoomed participant width
4. Test at zoom levels from 10% to 500%

Files: `src/interaction/participantOverlay.js`, `src/interaction/zoom.js`

### OVERLAY-008: Click-to-scroll navigation

**Current**: Overlay boxes are non-interactive
**Goal**: Clicking an overlay participant scrolls to that participant's first activity

Implementation:
1. Add click handlers to overlay boxes
2. Find the participant's lifeline and first message/activation
3. Smooth scroll to bring that section into view
4. Optional: highlight the participant briefly after scroll
5. Cursor should be pointer on hover

Files: `src/interaction/participantOverlay.js`, `public/styles.css`

### Priority Order

1. OVERLAY-003 (transitions) - Quick win, big visual impact
2. OVERLAY-006 (backdrop polish) - Quick win, CSS only
3. OVERLAY-001 (actual visuals) - Core feature improvement
4. OVERLAY-002 (styling match) - Enhances OVERLAY-001
5. OVERLAY-007 (zoom sync) - Bug fix category
6. OVERLAY-004 (multiline) - Edge case handling
7. OVERLAY-005 (icon sizing) - Detail work
8. OVERLAY-008 (click nav) - Nice-to-have enhancement

---

## Future Enhancements

Ideas for future work (not committed):

- Keyboard shortcuts reference panel
- Export to other formats (PDF, Mermaid, PlantUML)
- Import from other formats
- Collaborative editing
- Themes (dark mode)
- Animation/presentation stepping
- Touch/mobile improvements

---

## Notes

- All syntax compatible with sequencediagram.org/instructions.html
- 1424 tests passing across 37 test files
- 25 example files demonstrating features
