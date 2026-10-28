# 03: "Why is this wrong?" after finishing

**What to build:** Once a Question is finished, a student can read why any wrong Option is wrong. Every wrong Option, including the student's own wrong picks, shows a closed **Why is this wrong?** toggle inside its box. Clicking the toggle, or anywhere on that finished box, shows or hides that Option's Explanation. While the student is still answering, nothing changes: only their wrong pick's own Explanation shows, so the answer isn't given away. Applies in Practice Sets and in embedded Questions. `CONTEXT.md`'s Explanation entry already describes this.

**Blocked by:** 02 (Whole Option box selects, with clear states)

**Status:** closed

- [x] After a Question is finished, each wrong Option shows a "Why is this wrong?" toggle, closed by default. This includes the student's own wrong picks on a Second-Try Correct or Missed Question. The correct Option's Explanation shows as it does today.
- [x] The toggle's label is always "Why is this wrong?". An arrow (▸ closed, ▾ open) shows its state, and screen readers hear whether it's expanded.
- [x] Clicking the toggle, or anywhere on that finished box, shows or hides that Option's Explanation, using the existing Explanation style.
- [x] Finished boxes with a toggle show a pointer cursor and the hover highlight; the correct Option's box doesn't.
- [x] Any number of Explanations can be open at once.
- [x] Opened Explanations aren't saved in Saved Progress and aren't synced between tabs. Every time the Question is redrawn (Back/Next, a refresh, a change from another tab), they start closed.
- [x] While still answering, no toggles appear.
- [x] The student's own wrong picks stay outlined red when closed.
- [x] Widget tests cover:
  - toggles appear only once finished, and on every wrong Option
  - opening and closing by the toggle and by the box
  - several open at once
  - closed again after a redraw
  - none while answering
- [x] Lint, typecheck and `test:coverage` are clean.

## Comments

- Open/closed state is a Set inside the widget instance (never in getState()/Saved Progress), so every remount starts closed. Another tab can't change a finished Question short of a reset, so Back/Next is the controller-level redraw covered in practice-view.test.js.
- Row structure: label, then (finished wrong Options) button.question-widget-why-toggle[aria-expanded] with span.question-widget-why-arrow, then the optional p.question-widget-explanation. Toggleable boxes carry .question-widget-option-toggleable.
- A Second-Try Correct's first wrong pick isn't in the saved state, so only a Missed Question's last pick stays outlined red (unchanged from before).
- Closed in ticket 04: the widget now records every wrong pick (`wrongPicks`), so the student's own wrong picks stay outlined red on a Second-Try Correct and a Missed Question.
