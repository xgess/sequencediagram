# Backlog

Remaining work items. See FEATURES.md for what's already implemented.

---

## Bug Fixes

### Fixed
- [x] BUG-016: Zooming moves diagram off to the right/out of screen - Fixed by wrapping SVG in scrollable container

### Pending
- [ ] BUG-017: "note right of alice" attaches to wrong participant
- [ ] BUG-018: Double-click edit should be multiline (may already be fixed by BUG-012) 


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
- 1377 tests passing across 37 test files
- 25 example files demonstrating features
