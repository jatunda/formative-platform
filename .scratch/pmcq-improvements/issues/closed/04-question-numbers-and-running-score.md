# 04: Question numbers and Running Score

**What to build:** While working through a Practice Set, the top bar shows `Question N of M` (the Question being viewed) and the Running Score: First-Try Correct out of Questions finished so far, e.g. `7 / 9 first try · 78%`, or `- / -` before any are finished. Nothing shifts or resizes as the numbers change. On phones the score wraps below the buttons. The summary shows no question number.

See the spec (`../spec.md`): user stories 31–40. `CONTEXT.md` defines Running Score.

**Blocked by:** 01 (Saved Progress). It shares the top bar and controller, and the score must count restored and set-edited Saved Progress correctly.

**Status:** closed

- [x] `Question N of M` reflects the viewed Question, counted in the student's order (from the Order step), not the Frontier.
- [x] The Running Score comes from the same Question Outcome tally as the summary and counts only Questions still in the set. Its percentage uses the summary's floor-not-round rule.
- [x] The empty state reads `- / -`. Numbers use tabular figures and the score area reserves its width, so the layout doesn't shift between empty, 1-digit and 2-digit values.
- [x] The score updates the moment a Question is finished, and is correct immediately after a resume or remount.
- [x] The top bar wraps cleanly at phone width with nothing cut off.
- [x] Controller tests cover:
  - the number on first load, after Next, after Back, and after resume
  - the score's empty state, after a first-try correct, a second-try correct and a missed Question
  - the score after resuming from Saved Progress
  - no number on the summary
- [x] Lint, typecheck and `test:coverage` are clean.

## Comments

- Top bar is now `.practice-nav-buttons` (Back; ticket 05's Next goes here) + `.practice-status` (`.practice-question-number`, `.practice-running-score`) + the keyboard hint. Under 600px the status group takes its own full row below the buttons.
- The summary's floor-not-round formatter is shared (`floorPercent`) by the Running Score and the grade note.
- A change from another tab that doesn't touch the viewed Question now refreshes the nav controls, so the score (and Next) stay current in every tab.
- CSS wrapping and reserved widths weren't checked in a real browser; ticket 10 (real-device check) covers that.
