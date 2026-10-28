# 04: ✓ / ✗ marks on correct and wrong Options

**What to build:** Correct and wrong Options don't rely on color alone, so a color-blind student can tell them apart. The correct Option's box shows a ✓, and each wrong pick's box shows a ✗, at the right end of the box. Every box always reserves that space, even before a mark appears, so the answer text never moves or rewraps when a mark appears. The radio keeps showing the final pick. Applies in Practice Sets and in embedded Questions.

**Blocked by:** 02 (Whole Option box selects, with clear states)

**Status:** closed

- [x] Once revealed, the correct Option shows a ✓ at the right end of its box.
- [x] The student's wrong picks show a ✗ there: the mid-retry wrong pick, and the wrong picks on a finished Second-Try Correct or Missed Question.
- [x] Every box reserves the mark's space from the start, so long Option text wraps identically before and after a mark appears, and the radio and text never shift.
- [x] Each mark has screen-reader text ("Correct answer" / "Your answer, incorrect"). The ✓ / ✗ symbol itself is hidden from screen readers.
- [x] Widget tests cover:
  - which Options get a ✓ or ✗ in each Outcome
  - the screen-reader text
  - no marks before any submit
- [x] Lint, typecheck and `test:coverage` are clean.

## Comments

- Widget state gains `wrongPicks: number[]`, every submitted wrong Option in order. It drives both the red outline and the ✗ on a finished Question, so a Second-Try Correct's first wrong pick and both of a Missed Question's picks stay red. Saved Progress accepts it (version unchanged) and drops entries whose `wrongPicks` isn't a list of Option indexes. The widget drops restored indexes past the Option count.
- Older saved entries without `wrongPicks` are kept. Their earlier wrong picks are unknown, so only a Missed Question's final pick gets red and a ✗, as before.
- Each mark is a `span.question-widget-mark` inside the `<label>`: the symbol is `aria-hidden`, and the text sits in a new `.visually-hidden` utility. Every box has wider right padding, and the mark is absolutely positioned in that space.
