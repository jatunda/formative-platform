# 28: BUG: the timer ring overlaps the text above it at some zoom levels

**Priority:** low

**What's wrong:** At some browser zoom levels the timer's circle runs into the text at the top of the screen (the day/heading lines).

**To do:** Reproduce it with `npm run check:clock` across window sizes and device-pixel ratios (zoom levels from 67% to 200% correspond to viewport sizes), find which size rule lets the ring grow past its space, and make it fit the space that's left. Screenshot before and after.

Built behaviour: closed ticket 22 (timer ring). Files: `timer-ring.js`, `timer.css`, `clock.css`.

**Blocked by:** none

**Status:** open

- [ ] The ring never overlaps the top text at any size `check:clock` covers, including short, wide windows
- [ ] The ring stays as large as the space allows
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
