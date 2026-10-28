# 03: "Why is this wrong?" after finishing

**What to build:** Once a Question is finished, a student can read why any wrong Option is wrong. Every wrong Option, including the student's own wrong picks, shows a closed **Why is this wrong?** toggle inside its box. Clicking the toggle, or anywhere on that finished box, shows or hides that Option's Explanation. While the student is still answering, nothing changes: only their wrong pick's own Explanation shows, so the answer isn't given away. Applies in Practice Sets and in embedded Questions. `CONTEXT.md`'s Explanation entry already describes this.

**Blocked by:** 02 (Whole Option box selects, with clear states)

**Status:** ready-for-agent

- [ ] After a Question is finished, each wrong Option shows a "Why is this wrong?" toggle, closed by default. This includes the student's own wrong picks on a Second-Try Correct or Missed Question. The correct Option's Explanation shows as it does today.
- [ ] The toggle's label is always "Why is this wrong?". An arrow (▸ closed, ▾ open) shows its state, and screen readers hear whether it's expanded.
- [ ] Clicking the toggle, or anywhere on that finished box, shows or hides that Option's Explanation, using the existing Explanation style.
- [ ] Finished boxes with a toggle show a pointer cursor and the hover highlight; the correct Option's box doesn't.
- [ ] Any number of Explanations can be open at once.
- [ ] Opened Explanations aren't saved in Saved Progress and aren't synced between tabs. Every time the Question is redrawn (Back/Next, a refresh, a change from another tab), they start closed.
- [ ] While still answering, no toggles appear.
- [ ] The student's own wrong picks stay outlined red when closed.
- [ ] Widget tests cover:
  - toggles appear only once finished, and on every wrong Option
  - opening and closing by the toggle and by the box
  - several open at once
  - closed again after a redraw
  - none while answering
- [ ] Lint, typecheck and `test:coverage` are clean.
