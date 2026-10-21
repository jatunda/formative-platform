# 14: Named tournament actions: migrate the rest and remove raw closures

**What to build:** Every remaining handler (Schedule, scores and Mark Complete, No-Shows, Match Timeline, Finals, Results/Podium reveal, Reset Results, New Tournament) and the robotics DOM tests go through named actions. Dispatch stops accepting arbitrary state functions. Workarounds that exist only because closures captured stale render-time state (e.g. the Podium reveal's stale-read workaround, after-render callbacks re-finding DOM nodes) are removed where named actions make them unnecessary.

Source: candidate 3 of the 2026-10-12 architecture review (contract half). See ticket 13 for the action-vocabulary decision.

**Blocked by:** 13 (expand), 10 (one "who won" rule), 11 (Backward Apply action). 10 and 11 change handlers this ticket moves.

**Status:** ready-for-agent

- [ ] No handler passes a closure to dispatch; dispatch accepts only named actions
- [ ] DOM tests seed and drive state through named actions (or saved-Tournament seeding), not raw state functions
- [ ] Stale-closure workarounds that are no longer needed are deleted, with a note in Comments for any that remain and why
- [ ] No behaviour change: existing DOM tests pass, changed only to use named actions
- [ ] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`
