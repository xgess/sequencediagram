# Backlog

Remaining work items. See FEATURES.md for what's already implemented.

---

## Bug Fixes (Syntax Compatibility with sequencediagram.org)

These are differences between our parser and the syntax documented at https://sequencediagram.org/instructions.html

### Participant Types

- [ ] **BUG-001**: Icon participant naming mismatch
  - They use: `fontawesome6solid`, `fontawesome6regular`, `fontawesome6brands`
  - We use: `fontawesome7solid`, `fontawesome7regular`, `fontawesome7brands`
  - They use: `materialdesignicons`
  - We use: `mdi`
  - **Decision needed**: Match their naming or keep ours?

### Note Types

- [ ] **BUG-002**: Missing `aboxright` and `aboxleft` as note types
  - Their syntax: `aboxright over A,B:text`, `aboxleft left of A:text`
  - We have these in type styles but not as parseable note types

### Lifecycle

- [ ] **BUG-003**: Missing standalone `create` keyword
  - Their syntax: `create participantName`
  - We only support: `A->*B:<<create>>`

### Failure Messages

- [ ] **BUG-004**: Missing failure message variants
  - Their syntax supports:
    - `Ax-B:failure` (x before dash)
    - `Bx-B:failure` (self-message failure with x before)
    - `A-#redxB:failure` (color in failure arrow)
    - `A--#redx(1)C:failure` (dashed, colored, delayed failure)
  - We only support: `A-xB:failure` and `A--xB:failure`

### Fragment Styling

- [ ] **BUG-005**: Missing `else` clause styling
  - Their syntax: `else #pink #yellow;5;dashed condition`
  - We parse else conditions but not else styling

- [ ] **BUG-006**: Missing `#auto` background option for fragments
  - Their syntax: `opt#green #auto optional` (auto-colored background)
  - We don't recognize `#auto`

### Group Fragment

- [ ] **BUG-007**: Missing `group name [bracket text]` syntax
  - Their syntax: `group own name [some text]`
  - We treat everything after `group` as the condition

### Message Styling Position

- [ ] **BUG-008**: Failure x combined with styled bracket
  - Their syntax: `Alicex[#red;3]-Bob:failure` (x before bracket)
  - We only support x after the arrow: `A-[#red;3]xB:failure`

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

- 1377 tests passing across 37 test files
- 25 example files demonstrating features
