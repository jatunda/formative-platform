# 45: In Readouts edit mode, the stage spills out of its row

**Priority:** low

**What to build:** `npm run check:clock -- --editing --layout countdown,clock,countup` fails its stage check (added in ticket 44) in several places. In edit mode the stage grows taller than its row, so it runs up into the top bar and down into the bottom row:

- 480 × 320, Off-Hours states (after school, day off, weekend, Experience Week, Summer): about 25px above and below. Before ticket 44 every state here spilled about 38px; 44's smaller digits fixed Period, Assembly and before school.
- 1280 × 720: Passing Period (11px) and before school (21px).
- 390 × 844: Experience Week (8px). Also, Passing Period and before school leave the phone agenda only 1–31px tall, so its last row can't be reached (the agenda check from ticket 43).

The cause is likely that, while the sound prompt shows, the short layout's prompt rule (`--type-digits: calc(34vh - …)`) is more specific than `.clock-screen.is-editing`'s `22vh`, so edit mode keeps the bigger digits. Edit mode also adds the add/remove buttons and the edit note. Confirm before fixing.

Edit mode is a teacher moment, not a projected one, so the digits can step down further there. Found while building ticket 44 (see its `## Comments`). Built behaviour: closed tickets 11 (edit mode), 42 (tapping the bar in edit mode), 43 (phone height), 44.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

- [ ] `npm run check:clock -- --editing` passes with one, two and three Readouts at every default size, sound prompt showing and not
- [ ] Outside edit mode, nothing changes
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass
