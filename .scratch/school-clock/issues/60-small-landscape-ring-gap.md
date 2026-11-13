# 60: At 480 × 320 the timer's ring sits closer than the gap to the top bar's buttons

**Priority:** low

**What to build:** Since ticket 56, `check:clock` checks the ring the way `ring-fit.js` fits it: the ring's circle must stay `RING_GAP` (12px) clear of the top bar's Day Label and buttons and of the small Readouts' values (`web/clock/ring-geometry.js`). Before, it only checked that they didn't overlap at all. At 480 × 320 with the timer showing (and not in edit mode), every state, every layout, sound on or off, fails that:

- The ring comes about 4px from the "Timer" button and about 10px from "Bells". At this size the ring keeps below the top bar (the short layout), so ring-fit doesn't fit it to the top bar at all; the stage starts about 4px under the top bar and the ring fills the stage's height.
- In some states (about half), the ring also comes closer than the gap to a side Readout's value, often the clock's "AM". `--side-room` gives the side column its widest value plus `RING_GAP`, but the values are centred in that column, so the space between the ring and the value is closer to half the gap.

Nothing overlaps: the old check passed all of these. It's the 12px of breathing room that's missing.

`npm run check:clock -- --size 480x320 --timer` and `npm run check:clock -- --size 480x320 --timer --sound-on --layout countdown,clock,countup` show it. The renders are in `KNOWN_FAILURES` (`web/scripts/clock-check-matrix.js`) under ticket 60.

Decide whether the short layout's ring should keep the gap from the top bar (ring-fit measuring there too, or the ring's size rule leaving the room) and whether `--side-room` should allow for the centring, or whether a smaller gap is right at this size (then the check needs to know it).

Built behaviour: closed tickets 53 (the ring and the side Readouts at this size) and 56 (the shared ring geometry).

**Blocked by:** None (can start immediately)

**Status:** open

- [ ] `npm run check:clock -- --size 480x320 --timer` passes
- [ ] `npm run check:clock -- --size 480x320 --timer --sound-on --layout countdown,clock,countup` passes
- [ ] Ticket 60's entry is removed from `KNOWN_FAILURES` in `web/scripts/clock-check-matrix.js` and `npm run check:clock:full` passes
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

Found by the stricter ring check from ticket 56 (2026-11-12): `check:clock:full` gave 60 unexpected renders, all of them 480 × 320 with the timer and not editing (1r, 2r and 3r, sound on and off, all ten states).
