# 07: Live status header with Schedule Drift

**What to build:** The header becomes a broadcast-style status strip with the tournament title, the current phase, match progress, a live wall clock, and Schedule Drift (how far behind or ahead the Current Match is versus its scheduled Match Time).

**Blocked by:** 01 (Arena theme tokens and fluid page shell)

**Status:** ready-for-agent

- [ ] The phase shown is derived from state: Setup (no matches) → Qualification → Alliance Selection (all Qualification Matches complete, no bracket) → Elimination → Complete (bracket fully decided)
- [ ] Progress shows e.g. `Match 7 of 24` during Qualification and `Elimination 3 of 7` (non-Bye matches) during Elimination
- [ ] The live clock ticks without re-rendering the whole app (only its own element updates, on an interval)
- [ ] Schedule Drift shows `On schedule` (within ±1 min), `N min behind`, or `N min ahead`, comparing now with the Current Match's Match Time; it is hidden when there is no current match or no Start Time
- [ ] Phase, progress and drift come from pure, unit-tested functions in their own module
- [ ] The interval timer is cleaned up and never duplicated across re-renders
- [ ] `cd web && npm run test:coverage` exits clean
