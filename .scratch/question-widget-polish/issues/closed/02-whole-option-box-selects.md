# 02: Whole Option box selects, with clear states

**What to build:** A student can click anywhere in an Option's box to select it, not just on the radio button or the text. This includes clicking on an Explanation showing inside the box. A selected Option is obvious at a glance. This applies everywhere the question widget appears: Practice Sets and Questions embedded in Lessons/Pages.

Agreed look (from the design review):

| State | Border | Background | Cursor |
|---|---|---|---|
| Default (answering) | 2 px gray | none | pointer |
| Hover (answering) | 2 px lighter gray | faint blue | pointer |
| Selected | 2 px accent blue | light blue tint (~15%) | pointer |
| Keyboard focus | plus an accent-blue outline outside the border | — | — |
| Wrong pick (mid-retry) | 2 px red | light red | pointer |
| Correct (finished) | 2 px green | light green | default |

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Clicking anywhere in an Option's box selects that Option, the same as clicking its radio, including on a showing Explanation. The click also focuses the radio, so arrow keys and Enter keep working.
- [x] Once a Question is finished, clicking a box doesn't change the selection.
- [x] A selected Option has a 2 px accent-blue border and a light blue background tint. The radio still shows the selection.
- [x] While answering, boxes show a pointer cursor and a subtle hover highlight.
- [x] A focused Option shows an outline outside its border (focus within the box), distinguishable from the selected look.
- [x] When a box is both selected and an already-submitted wrong pick, the red look wins. Green and red feedback always win over blue.
- [x] Every box always has a 2 px border, so changing state never shifts the text.
- [x] Vertical padding is about 12 px, for an easy tap target on phones.
- [x] Border and background changes fade over about 0.2 s, matching the rest of the site.
- [x] The keyboard-only flow through a Practice Set still works end to end.
- [x] Widget tests cover:
  - selecting by clicking the box outside the label
  - selecting by clicking a showing Explanation
  - no change once finished
  - the selected marker following the selection
- [x] Lint, typecheck and `test:coverage` are clean.

## Comments

Each Option row (`.question-widget-option`) now has its own click handler. A click outside the `<label>` (the padding or a showing Explanation) selects that Option and focuses its radio. The browser still handles clicks inside the label, and a link in an Explanation only follows the link. New classes: `.question-widget-option-selected` on the selected row while answering, and `.question-widget-options-answering` on the options container until the Question is finished (it drives the pointer cursor and hover). Keyboard focus uses `.question-widget-option:has(input:focus-visible)`. The red and green rules come after the blue rule in `style.css`, so they win.
