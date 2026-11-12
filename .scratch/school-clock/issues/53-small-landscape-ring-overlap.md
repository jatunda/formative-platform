# 53: At 480 × 320 with sound on, the timer's ring runs into the side Readouts

**Priority:** low

**What to build:** `npm run check:clock -- --size 480x320 --timer --sound-on --layout countdown,clock,countup` fails in six states (period, break, assembly, a day off, the weekend, summer): the ring's circle overlaps small Readout 2 (the clock's "AM" sits under the ring's edge). With one Readout, summer fails the same way against small Readout 1. With the sound prompt showing, the ring is shorter and clears them; it's the extra height left when sound is already on that lets the ring grow wide enough to reach the side column.

The ring's size should take the side Readouts' width into account at this size, as it already does with the sound prompt showing.

Built behaviour: closed tickets 44 (the short layout and its prompt crowding) and the ring-fit checks in `web/clock/ring-fit.js`; `web/scripts/clock-check.mjs` checks the ring against the side Readouts.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `npm run check:clock -- --size 480x320 --timer --sound-on --layout countdown,clock,countup` passes
- [ ] `npm run check:clock -- --size 480x320 --timer --sound-on` passes
- [ ] Ticket 53's entries are removed from `KNOWN_FAILURES` in `web/scripts/clock-check-matrix.js` and `npm run check:clock:full` passes
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

Found by the first `npm run check:clock:full` run (agent-tooling ticket 01).

**2026-11-12: triaged.** Eric: yes, build it.
