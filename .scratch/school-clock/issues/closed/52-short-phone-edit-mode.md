# 52: On phones shorter than 390 × 844, the stage leaves the agenda no room (edit mode, and three Readouts before school)

**Priority:** low

**What to build:** `npm run check:clock -- --editing --size 375x667 --size 360x740` fails in most states, with one, two or three Readouts. With the agenda showing (school days, after school, a day off, the weekend) the Readouts, their Remove buttons, the line and the edit note take the whole height, so the agenda is 1–35px tall and its last row can't be reached; some states scroll the page. Without the agenda (Experience Week, Summer) the stage spills up to 46px above and below its row. Outside edit mode, 375 × 667 already fails one state (before school, agenda 25px tall with three Readouts).

Ticket 45 fixed edit mode at the default sizes (390 × 844 passes) by stepping the phone's digits down to 16vh, or 8svh with the agenda, and the small Readouts to 26px. Shorter phones need more than smaller text: decide with Eric whether edit mode on a phone should let the stage scroll, shrink the agenda to a minimum, or something else.

The failure outside edit mode is the same problem, not a separate one: the stage's Readouts and line take the height the agenda needs. It shows outside edit mode only at its worst (three Readouts and the before-school line at 375 × 667), so whatever this ticket decides for edit mode should cover it too.

Built behaviour: closed tickets 11 (Readouts and edit mode), 43 (the phone agenda's scroll), 44 (the short layout and its prompt crowding), 45 (edit mode's stage at the default sizes).

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] `npm run check:clock -- --editing --size 375x667 --size 360x740` passes with one, two and three Readouts, sound prompt showing and not
- [x] `npm run check:clock` passes at 375 × 667 with three Readouts outside edit mode
- [x] Other sizes are unchanged
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

Found while building ticket 45 (see its `## Comments`).

`npm run check:clock:full` (agent-tooling ticket 01) lists this ticket's failures as known in `KNOWN_FAILURES` (`web/scripts/clock-check-matrix.js`), so the fix must remove those entries; the full run fails while any of them passes. Its first run pinned the failing set down: at 375 × 667 in edit mode, two and three Readouts fail in every state with the sound prompt showing, and one Readout fails before school, during passing and in Experience Week; with sound on, two and three Readouts fail in those three states; with the timer, three Readouts fail everywhere and two in Period and Nutrition. Outside edit mode, before school fails with two Readouts as well as three. At 360 × 740 in edit mode with the prompt showing, three Readouts fail everywhere, two in six states, and three with the timer before school and on a day off; one Readout passes.

**2026-11-12: triaged.** Eric chose: the agenda always keeps a minimum of about three rows; the Readouts (and in edit mode their controls) shrink further to make room. Nothing scrolls except the agenda itself. This covers both edit mode and the before-school case outside it.

**2026-11-12: built.** Cause: on a phone with the agenda, the stage is as tall as its content and the agenda gets only what is left. Nothing kept a minimum for the agenda, so the Readouts squeezed it to 1px. The Readouts were sized by fixed caps (12svh, edit mode's 8svh) that only fit 390 x 844, and edit mode kept its 44px Remove pills and every line of the stage. With the timer, `timer.css`'s 34px small Readouts outranked edit mode's 26px, so at 360px three of them wrapped into a column.

Fix (as Eric chose, the agenda keeps three rows and the Readouts give):

- `clock.css` phone: the agenda's `min-height` is three rows (`--agenda-row`, 36px). The big Readout's size rule reads a new height cap, `--fit-h`, beside `--edit-cap`. The stage's sizes are custom properties (`--title-size`, `--next-label`, `--smalls-gap`, `--small-digits`) that crowded states set. The Remove pill is 32px on a phone, as in the short layout.
- New short-phone block (phone and `max-height: 760px`, so 390 x 844 is unchanged): with the agenda, `--fit-h` is the visible height (svh) less the fixed rows (three agenda rows included) and a room for each thing that shows (the banner, the sound prompt, the Off-Hours heading, the cycle hint, Up next, the small Readouts, edit mode's controls), with a 32px floor. The title and small Readouts step down and Up next goes on one line. In edit mode, as in the short layout, the title and the line step away (the agenda names the Segment and what's next), and the Remove pills, captions and gaps close up. The edit note stays.
- `timer.css` phone: the small Readouts beside the ring read `--small-digits`, so edit mode steps them down (390 x 844 timer edit mode: 34px to 26px).
- `clock-check-browser.mjs`: the agenda check now also fails when the last row runs under the window button or the sound prompt. Before, an agenda taller than its row was painted over them and `elementFromPoint` still found the row, so the check missed it.
- `clock-hosting.test.js` guards the three-row minimum, the `--fit-h` cap and its rooms, and the timer's small size (red before the fix).

`check:clock:full`: 1687/1694, the 7 left are ticket 53's known failures. 0 unexpected, 0 stale, and ticket 52's `KNOWN_FAILURES` entries are removed. In the worst case the matrix renders at 375 x 667 (simulated-time banner, sound prompt, three Readouts, before school), the big digits are 40px outside edit mode and 36px in it, with three agenda rows.

Not fixed here: phones with their browser bars showing (375 x 567, 375 x 611, 360 x 640) with two or three Readouts, which failed before this ticket too. That's ticket 54.

**2026-11-12: review fixes.** 390 x 844 and taller phones are back to how they look on `main` in edit mode: Up next's label on its own line, the small Readouts' `--gap-lg` margin, a `--tap` Remove pill and no agenda minimum (checked element by element against `main` at 390 x 844, 412 x 915 and 430 x 932, every default state, one to three Readouts, timer and not). Those changes now sit only in the short-phone block, as does the agenda's three-row minimum (`--agenda-min`). The timer's small Readouts still follow edit mode's 26px there (the real fix). The Remove pill, the captions and the edit note's margin are each one base rule reading custom properties that the short layout and a short phone set. Edit mode's hidden title and line are one rule shared by both layouts. `--frame-room` is named parts, and the digits' line height is one token (`--digits-line`).

`check:clock:full` on the merged result, with `KNOWN_FAILURES = []`: 1694/1694 passed, 0 unexpected, 0 stale. `check:clock`: 55/55.
