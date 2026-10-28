# 01: Full-width Question editor text box

**What to build:** In the Question editor, the text box where Eric writes a Question fills the page's width (800 px), the same as the text boxes in the Lesson and Page editors. Today it falls back to the browser's narrow default width.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] The Question editor's text box is as wide as the page content, matching the Lesson and Page editors.
- [x] Its height and vertical resizing are unchanged.
- [x] The Lesson and Page editors look exactly as before.
- [x] Lint, typecheck and `test:coverage` are clean.

## Comments

Added a `#questionDslInput { width: 100%; box-sizing: border-box; }` rule in `web/style.css`; font, height and resize are untouched and `#dslInput` is unchanged. No test added: jsdom does not compute layout, so a test would only restate the CSS.
