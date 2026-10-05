# 05: Compact "Current Match" indicator in the match list

**What to build:** The Qualification Matches list marks the Current Match without reserving a full fixed-width text-label column on every row. Today every row reserves a `7.5rem`-wide column for the "Current Match" pill even when it's blank (only one row in the whole list ever shows it), eating horizontal space that could go to names/scores. Replace it with a compact indicator (e.g. a small dot or icon) that clearly marks the Current Match row at a glance without a dedicated wide column.

**Blocked by:** None (can start immediately).

**Status:** closed

- [ ] The Current Match row is still clearly, visually distinguishable as current in the match list.
- [ ] Non-current rows no longer reserve a wide blank label column — that space is available to other row content (names/scores).
- [ ] The indicator remains legible/readable from across a room (per the panel's projected-display intent).
- [ ] `cd web && npm run test:coverage` passes.
