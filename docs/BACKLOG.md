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
- [ ] BUG-021: Note box should expand to fit long text
- [ ] BUG-022: Textarea resize should expand width, not just height
- [ ] BUG-041: Participant overlay on scroll doesn't work correctly - Only detects rect-based participants (missing actors, databases, icons), sticky positioning broken, always visible when should only show on scroll

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
