# 49: Bug: the "Add Readout" dashed outline is partly cut off

**Priority:** low

**What to build:** In Readouts edit mode, the dashed rounded outline around "Add Readout" sometimes shows only partly, with its left side fading out or missing. Find when it happens (which layouts, sizes and number of Readouts; likely a parent clipping it, or a border shared with the divider beside it) and fix it so the whole outline always shows.

Eric's words: "sometimes the dotted line around 'add readout' is only partially visible, with the left side of the squircle fading to invisible."

Built behaviour: closed ticket 11 (Readout modes and edit mode).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The cause is found and written in a comment on this ticket
- [ ] With one, two and three Readouts, at the default sizes and at a phone size, the Add Readout outline is whole on every side
- [ ] `npm run check:clock -- --editing` screenshots show it whole
- [ ] A test guards the fix where jsdom can; the rest is checked in `check:clock`
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass
