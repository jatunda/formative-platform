# 52: On phones shorter than 390 × 844, the stage leaves the agenda no room (edit mode, and three Readouts before school)

**Priority:** low

**What to build:** `npm run check:clock -- --editing --size 375x667 --size 360x740` fails in most states, with one, two or three Readouts. With the agenda showing (school days, after school, a day off, the weekend) the Readouts, their Remove buttons, the line and the edit note take the whole height, so the agenda is 1–35px tall and its last row can't be reached; some states scroll the page. Without the agenda (Experience Week, Summer) the stage spills up to 46px above and below its row. Outside edit mode, 375 × 667 already fails one state (before school, agenda 25px tall with three Readouts).

Ticket 45 fixed edit mode at the default sizes (390 × 844 passes) by stepping the phone's digits down to 16vh, or 8svh with the agenda, and the small Readouts to 26px. Shorter phones need more than smaller text: decide with Eric whether edit mode on a phone should let the stage scroll, shrink the agenda to a minimum, or something else.

The failure outside edit mode is the same problem, not a separate one: the stage's Readouts and line take the height the agenda needs. It shows outside edit mode only at its worst (three Readouts and the before-school line at 375 × 667), so whatever this ticket decides for edit mode should cover it too.

Built behaviour: closed tickets 11 (Readouts and edit mode), 43 (the phone agenda's scroll), 44 (the short layout and its prompt crowding), 45 (edit mode's stage at the default sizes).

**Blocked by:** None (can start immediately)

**Status:** needs-triage

- [ ] `npm run check:clock -- --editing --size 375x667 --size 360x740` passes with one, two and three Readouts, sound prompt showing and not
- [ ] `npm run check:clock` passes at 375 × 667 with three Readouts outside edit mode
- [ ] Other sizes are unchanged
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

Found while building ticket 45 (see its `## Comments`).

`npm run check:clock:full` (agent-tooling ticket 01) lists this ticket's failures as known in `KNOWN_FAILURES` (`web/scripts/clock-check-matrix.js`), so the fix must remove those entries; the full run fails while any of them passes. Its first run pinned the failing set down: at 375 × 667 in edit mode, two and three Readouts fail in every state with the sound prompt showing, and one Readout fails before school, during passing and in Experience Week; with sound on, two and three Readouts fail in those three states; with the timer, three Readouts fail everywhere and two in Period and Nutrition. Outside edit mode, before school fails with two Readouts as well as three. At 360 × 740 in edit mode with the prompt showing, three Readouts fail everywhere, two in six states, and three with the timer before school and on a day off; one Readout passes.
