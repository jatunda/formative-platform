# 07: Live status header with Schedule Drift

**What to build:** The header becomes a broadcast-style status strip with the tournament title, the current phase, match progress, a live wall clock, and Schedule Drift (how far behind or ahead the Current Match is versus its scheduled Match Time).

**Blocked by:** 01 (Arena theme tokens and fluid page shell)

**Status:** closed

- [x] The phase shown is derived from state: Setup (no matches) → Qualification → Alliance Selection (all Qualification Matches complete, no bracket) → Elimination → Complete (bracket fully decided)
- [x] Progress shows e.g. `Match 7 of 24` during Qualification and `Elimination 3 of 7` (non-Bye matches) during Elimination
- [x] The live clock ticks without re-rendering the whole app (only its own element updates, on an interval)
- [x] Schedule Drift shows `On schedule` (within ±1 min), `N min behind`, or `N min ahead`, comparing now with the Current Match's Match Time; it is hidden when there is no current match or no Start Time
- [x] Phase, progress and drift come from pure, unit-tested functions in their own module
- [x] The interval timer is cleaned up and never duplicated across re-renders
- [x] `cd web && npm run test:coverage` exits clean

## Comments

**Implementation notes (2026-10-03):**

- Pure functions live in `web/robotics/tournament-status.js`: `getTournamentPhase`, `getMatchProgress`, `getCurrentMatchTime`, `getScheduleDrift`, `formatScheduleDrift`.
- **Complete** means every played (non-Bye) Elimination Match has a winner. A match marked complete with a tie, or with a TBD side, doesn't count as decided, for either phase or progress.
- **Drift** rounds to whole minutes. Anything that rounds to 1 minute or less reads `On schedule`, so the strip never shows "1 min behind".
- **Drift is hidden outside Qualification**, because Current Match is Qualification-only in `CONTEXT.md`. A follow-up could extend drift to Elimination Matches, which also have a Match Time.
- **Progress** is shown only in Qualification and Elimination. It is hidden in Setup, Alliance Selection and Complete.
- **Clock timer:** one `setInterval` per app, started by `initRoboticsApp`, not by render. `destroy()` clears it. Starting a new app stops the previous one's clock.
- The title is shortened to "Robotics Tournament".
- "Tournament phase" isn't in the `web/robotics/CONTEXT.md` glossary yet. It's a candidate for `/domain-modeling`.
