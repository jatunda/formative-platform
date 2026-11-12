# 53: At 480 × 320 with sound on, the timer's ring runs into the side Readouts

**Priority:** low

**What to build:** `npm run check:clock -- --size 480x320 --timer --sound-on --layout countdown,clock,countup` fails in six states (period, break, assembly, a day off, the weekend, summer): the ring's circle overlaps small Readout 2 (the clock's "AM" sits under the ring's edge). With one Readout, summer fails the same way against small Readout 1. With the sound prompt showing, the ring is shorter and clears them; it's the extra height left when sound is already on that lets the ring grow wide enough to reach the side column.

The ring's size should take the side Readouts' width into account at this size, as it already does with the sound prompt showing.

Built behaviour: closed tickets 44 (the short layout and its prompt crowding) and the ring-fit checks in `web/clock/ring-fit.js`; `web/scripts/clock-check.mjs` checks the ring against the side Readouts.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] `npm run check:clock -- --size 480x320 --timer --sound-on --layout countdown,clock,countup` passes
- [x] `npm run check:clock -- --size 480x320 --timer --sound-on` passes
- [x] Ticket 53's entries are removed from `KNOWN_FAILURES` in `web/scripts/clock-check-matrix.js` and `npm run check:clock:full` passes
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

Found by the first `npm run check:clock:full` run (agent-tooling ticket 01).

**2026-11-12: triaged.** Eric: yes, build it.

**2026-11-12: built.** Cause: the short layout sizes the ring from the stage's height and the viewport width alone (`min(100cqh, 60vw)`), with the ring in the middle column of `1fr auto 1fr` and the small Readouts in the right one. With sound on there's no prompt row, so the stage is taller and the ring grows to 245px of a 456px row, leaving each side column 105px. The clock's value ("10:40:01 AM", 110px with its padding) is wider than that, so its Readout spilled left out of the column, under the ring's edge. Nothing measured the side column's content.

- `ring-fit.js` now also sets `--side-room` on the Readouts while the timer shows, on every screen: the widest small Readout's value plus `RING_GAP`. A value is only as wide as its own text (not its column), so it doesn't feed back. It re-measures on a MutationObserver too, since the values tick and the small Readouts are rebuilt without the region resizing.
- `timer.css`: both the base rule and the short layout's `--ring-d` add `100cqw - 2 * var(--side-room, 0px)`. At 480 × 320 with three Readouts the ring is now 219px and the clock Readout sits about 5px clear of it.
- `clock-ring-fit.test.js` guards the measurement (widest value, short screens included, re-measured on change, zero with no side column).
- Both `check:clock` commands above pass 11/11; `check:clock:full` passes 1633/1694 with 61 known (ticket 52 only), 0 unexpected, 0 stale.
