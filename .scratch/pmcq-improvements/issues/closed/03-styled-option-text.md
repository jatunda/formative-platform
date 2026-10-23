# 03: Styled text in Options and Explanations

**What to build:** Inline code, bold, italic and links in a Question's Option text and Explanations render as formatting instead of raw markup characters. This applies both in Practice Sets and in Questions embedded in Lessons/Pages via a Question Link. Text stays HTML-escaped, so `<` in a code answer can't break the page.

See the spec (`../spec.md`): user stories 57–62, and "Inline formatting in Options and Explanations".

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] The shared content renderer exposes its existing single-line inline formatter (escape, then links, then bold/italic, then inline code). Its existing behavior for Lesson/Page text is unchanged.
- [x] The question widget renders Option labels and Explanations through that formatter.
- [x] Clicking a formatted Option's label still selects its radio, and keyboard selection still works.
- [x] Widget tests cover:
  - inline code, bold, italic and a link in an Option
  - the same in an Explanation (mid-retry wrong Explanation and revealed correct Explanation)
  - `<`, `>`, `&` and `"` in Option text staying escaped
- [x] Lint, typecheck and `test:coverage` are clean.

## Comments

- `processInlineCode` was already exported from `content-renderer.js`; no renderer change was needed. The widget wraps Option text in a `span.question-widget-option-text` inside the `<label>`, so label clicks and native radio keyboard behavior are unchanged.
- A link inside an Option label follows the link on click rather than selecting the radio (normal browser behavior for an `<a>` in a `<label>`).
