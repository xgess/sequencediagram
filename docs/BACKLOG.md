# Backlog

Remaining work items. See FEATURES.md for what's already implemented.

---

## Bug Fixes

### To Be Ingested
(leave this here for easily adding new bugs):


### Fixed
- [x] BUG-016: Zooming moves diagram off to the right/out of screen - Fixed by wrapping SVG in scrollable container
- [x] BUG-017: "note right of alice" attaches to wrong participant - Fixed by positioning relative to lifeline (centerX)
- [x] BUG-018: Double-click edit should be multiline - Already fixed by BUG-012
- [x] BUG-019: Multiline message text should be above arrow - Fixed by offsetting Y based on line count
- [x] BUG-020: Adding new messages resets zoom - should preserve - Fixed by calling updateZoom() after re-rendering

### Pending
- [ ] BUG-021: Note box should expand to fit long text
- [ ] BUG-022: Textarea resize should expand width, not just height
- [ ] BUG-029: Database participant styling issues
- [ ] BUG-030: participantstyle doesn't affect normal participants
- [ ] BUG-031: Selection highlighting is ugly
- [ ] BUG-032: Messages to/from unknown participants go off-screen

---

## BUG-029: Database participant styling issues

Multiple issues with styled database participants (e.g., `database my-db #lightblue #green;3;dashed`):

1. **Dashed border not applied** - The border style (dashed/dotted) is ignored on database icons
2. **Fill color only at top** - The fill color only applies to the top ellipse, not the entire database cylinder
3. **Icon too wide** - The database icon is wider than necessary, should be more compact
4. **Label position wrong** - The name appears inside the database icon; should be below it like other participant types

---

## BUG-030: participantstyle doesn't affect normal participants

`participantstyle` directive correctly applies to `actor` and `database` participant types, but does NOT apply to regular `participant` declarations. All participant types should respect the default type style.

---

## BUG-031: Selection highlighting is ugly

When clicking a message in the diagram, the corresponding source line is highlighted. However, the highlighting style is problematic:

- Appears as thick dark blue vertical lines between each token
- Looks fragmented and ugly
- Should instead highlight the entire line uniformly, as if the user had selected the text manually

---

## BUG-032: Messages to/from unknown participants go off-screen

When a message references a participant that doesn't exist:

- **Unknown source**: Arrow line extends off-screen to the left
- **Unknown target**: Arrow line extends past all participants to the right

**Expected behavior**: Display an error indicator or error message instead of rendering a broken arrow. Could show inline error text like "Unknown participant: X" or highlight the message as an error.

---

## FEATURE-001: FontAwesome and Material Design Icons syntax

The current `@fa-icon` and `@mdi-icon` syntax doesn't match sequencediagram.org. Need to update to match their syntax:

**Current (broken) syntax:**
```
participant @fa-user Alice
participant @mdi-database DB
```

**Expected syntax (from sequencediagram.org/instructions.html):**
```
fontawesome6regular f0f8 Hospital #blue
fontawesome6solid f2bd User #red
materialdesigns F01BC Database #green
```

The format is: `icontype hexcode Name [styling]`

Icon types include:
- `fontawesome6regular` - FA6 regular icons
- `fontawesome6solid` - FA6 solid icons
- `fontawesome6brands` - FA6 brand icons
- `materialdesigns` - Material Design icons

See https://sequencediagram.org/instructions.html for full documentation.

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
