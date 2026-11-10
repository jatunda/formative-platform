# 28: BUG: the timer ring overlaps the text above it at some zoom levels

**Priority:** low

**What's wrong:** At some browser zoom levels the timer's circle runs into the text at the top of the screen (the day/heading lines).

**To do:** Reproduce it with `npm run check:clock` across window sizes and device-pixel ratios (zoom levels from 67% to 200% correspond to viewport sizes), find which size rule lets the ring grow past its space, and make it fit the space that's left. Screenshot before and after.

**Also:** on a portrait tablet (820 × 1180) the timer layout fits but looks lopsided: the ring sits left of centre and the side Readouts' captions wrap to two or three lines (found in ticket 26; see its comments). Fix it here, since it's the same question of how the ring and side column share the space.

Built behaviour: closed ticket 22 (timer ring). Files: `timer-ring.js`, `timer.css`, `clock.css`.

**Blocked by:** none

**Status:** open

- [ ] The ring never overlaps the top text at any size `check:clock` covers, including short, wide windows
- [ ] The ring stays as large as the space allows
- [ ] Portrait tablet (820 × 1180): the ring is centred and the side captions don't wrap to several lines
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
