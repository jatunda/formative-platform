# 10: Eric: real-device check

**What to build:** Confidence that the deployed Practice Set changes behave on real devices and browsers, where jsdom tests can't reach: real storage, real tabs, real phone widths.

**Blocked by:** 02 (tab sync), 03 (styled text), 05 (Next buttons), 09 (deployed)

**Status:** closed

Checklist (use a Practice Set with at least 4 Questions, including one with inline code in an Option):

- [x] **Refresh mid-set:** answer 2 Questions, get the 3rd wrong once, then refresh. You land on Q3 with one Attempt used and the wrong Explanation still showing, and the Running Score is correct.
- [x] **Close and return:** close the tab, reopen the link later, and land on the Frontier.
- [x] **Finish and return:** finish the set, reopen it, and land on the summary.
- [x] **Reset:** "Reset answers & start over" on the summary clears everything and lands on Q1 with `- / -`.
- [x] **Two tabs:** answer in tab A; tab B updates without celebrating and stays on the Question it was showing. Reset in A sends B to Q1.
- [x] **Navigation:** the top-bar Next is grayed out on an unfinished Question, and clicking it shows the toast. The green Next replaces Submit at the same size, with nothing jumping. "See results" / "Results →" appear on the last Question.
- [x] **Keyboard only:** arrow keys + Enter drive the whole set.
- [x] **Styled text:** inline code, bold and italic render in Options and Explanations, in the Practice Set and in a Lesson/Page with that Question embedded.
- [x] **Phone:** on a phone (or a narrow window), the top bar wraps cleanly, nothing is cut off, and the Running Score doesn't shift as it changes.
- [x] **Loading:** first load shows the frame immediately with no Question 1 flash before the Frontier, and no spinner flashes on a fast load.
- [x] **Two browsers:** Chrome plus one other browser (e.g. Safari on a phone).

Note anything off under **Comments**; Claude will turn each into a ticket.

## Comments

Done by Eric (reported 2026-10-27): every check passed, with nothing to file.
