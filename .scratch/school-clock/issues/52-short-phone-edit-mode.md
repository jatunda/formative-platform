# 52: On phones shorter than 390 × 844, edit mode leaves the agenda no room

**Priority:** low

**What to build:** `npm run check:clock -- --editing --size 375x667 --size 360x740` fails in most states, with one, two or three Readouts. With the agenda showing (school days, after school, a day off, the weekend) the Readouts, their Remove buttons, the line and the edit note take the whole height, so the agenda is 1–35px tall and its last row can't be reached; some states scroll the page. Without the agenda (Experience Week, Summer) the stage spills up to 46px above and below its row. Outside edit mode, 375 × 667 already fails one state (before school, agenda 25px tall with three Readouts).

Ticket 45 fixed edit mode at the default sizes (390 × 844 passes) by stepping the phone's digits down to 16vh, or 8svh with the agenda, and the small Readouts to 26px. Shorter phones need more than smaller text: decide with Eric whether edit mode on a phone should let the stage scroll, shrink the agenda to a minimum, or something else.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

- [ ] `npm run check:clock -- --editing --size 375x667 --size 360x740` passes with one, two and three Readouts, sound prompt showing and not
- [ ] `npm run check:clock` passes at 375 × 667 with three Readouts outside edit mode
- [ ] Other sizes are unchanged
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

Found while building ticket 45 (see its `## Comments`).
