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

**Status:** ready-for-agent

- [ ] Clicking anywhere in an Option's box selects that Option, the same as clicking its radio, including on a showing Explanation. The click also focuses the radio, so arrow keys and Enter keep working.
- [ ] Once a Question is finished, clicking a box doesn't change the selection.
- [ ] A selected Option has a 2 px accent-blue border and a light blue background tint. The radio still shows the selection.
- [ ] While answering, boxes show a pointer cursor and a subtle hover highlight.
- [ ] A focused Option shows an outline outside its border (focus within the box), distinguishable from the selected look.
- [ ] When a box is both selected and an already-submitted wrong pick, the red look wins. Green and red feedback always win over blue.
- [ ] Every box always has a 2 px border, so changing state never shifts the text.
- [ ] Vertical padding is about 12 px, for an easy tap target on phones.
- [ ] Border and background changes fade over about 0.2 s, matching the rest of the site.
- [ ] The keyboard-only flow through a Practice Set still works end to end.
- [ ] Widget tests cover:
  - selecting by clicking the box outside the label
  - selecting by clicking a showing Explanation
  - no change once finished
  - the selected marker following the selection
- [ ] Lint, typecheck and `test:coverage` are clean.
