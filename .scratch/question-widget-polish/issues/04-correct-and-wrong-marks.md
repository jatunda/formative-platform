# 04: ✓ / ✗ marks on correct and wrong Options

**What to build:** Correct and wrong Options don't rely on color alone, so a color-blind student can tell them apart. The correct Option's box shows a ✓, and each wrong pick's box shows a ✗, at the right end of the box. Every box always reserves that space, even before a mark appears, so the answer text never moves or rewraps when a mark appears. The radio keeps showing the final pick. Applies in Practice Sets and in embedded Questions.

**Blocked by:** 02 (Whole Option box selects, with clear states)

**Status:** ready-for-agent

- [ ] Once revealed, the correct Option shows a ✓ at the right end of its box.
- [ ] The student's wrong picks show a ✗ there: the mid-retry wrong pick, and the wrong picks on a finished Second-Try Correct or Missed Question.
- [ ] Every box reserves the mark's space from the start, so long Option text wraps identically before and after a mark appears, and the radio and text never shift.
- [ ] Each mark has screen-reader text ("Correct answer" / "Your answer, incorrect"). The ✓ / ✗ symbol itself is hidden from screen readers.
- [ ] Widget tests cover:
  - which Options get a ✓ or ✗ in each Outcome
  - the screen-reader text
  - no marks before any submit
- [ ] Lint, typecheck and `test:coverage` are clean.
