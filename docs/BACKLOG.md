# Backlog

Remaining work items. See FEATURES.md for what's already implemented.

---

## Bug Fixes

These are known issues that need to be fixed before adding new features.

- [ ] **BUG-001**: (Add bugs discovered during testing here)

---

## Deferred Features

### Image Participants

```
image data:image/png;base64,... Name
```

Custom PNG images as participant icons. Deferred due to security considerations (URL handling, size limits, sanitization).

### Advanced Text Markup

These markup types from the original sequencediagram.org are not yet implemented:

- `<align:left|center|right>` - Text alignment
- `<position:N>` - Explicit positioning
- `<difference:N>` - Relative positioning
- `<wordwrap:N>` - Word wrap at N characters

### Autosave Disable

Setting to disable autosave is not implemented. Autosave is always on.

---

## Deployment

These require external action (domain purchase, hosting setup):

- [ ] **Domain purchase and DNS setup**
- [ ] **Deploy to Cloudflare (or other hosting)**
- [ ] **GitHub repository setup**

---

## Future Enhancements

Ideas for future work (not committed):

- Keyboard shortcuts reference panel
- Export to other formats (PDF, Mermaid, PlantUML)
- Import from other formats
- Collaborative editing
- Themes (dark mode, custom colors)
- Animation/presentation stepping through messages
- Touch/mobile support improvements

---

## Notes

- All core features from REQUIREMENTS.md are implemented
- 1377 tests passing across 37 test files
- 25 example files demonstrating features
