# 14: Named tournament actions: migrate the rest and remove raw closures

**What to build:** Every remaining handler (Schedule, scores and Mark Complete, No-Shows, Match Timeline, Finals, Results/Podium reveal, Reset Results, New Tournament) and the robotics DOM tests go through named actions. Dispatch stops accepting arbitrary state functions. Workarounds that exist only because closures captured stale render-time state (e.g. the Podium reveal's stale-read workaround, after-render callbacks re-finding DOM nodes) are removed where named actions make them unnecessary.

Source: candidate 3 of the 2026-10-12 architecture review (contract half). See ticket 13 for the action-vocabulary decision.

**Blocked by:** 13 (expand), 10 (one "who won" rule), 11 (Backward Apply action). 10 and 11 change handlers this ticket moves.

**Status:** closed

- [x] No handler passes a closure to dispatch; dispatch accepts only named actions
- [x] DOM tests seed and drive state through named actions (or saved-Tournament seeding), not raw state functions
- [x] Stale-closure workarounds that are no longer needed are deleted, with a note in Comments for any that remain and why
- [x] No behaviour change: existing DOM tests pass, changed only to use named actions
- [x] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`

## Comments

- **2026-10-20 (implementation):** New actions in `web/robotics/actions.js`: `set-draft-score`, `record-result`, `set-no-show` (each takes `phase: 'qualification' | 'elimination'` plus `matchRef`, the Qualification Match's index or the Elimination Match's id), `reorder-qualification-match`, `apply-match-timeline`, `reveal-next-placement`, `replay-reveal`, `reset-results`, `new-tournament`. Match Timeline field edits reuse `set-timeline-config`. The `QUALIFICATION_MATCH_ACTIONS` / `ELIMINATION_MATCH_ACTIONS` setter bundles in `robotics.js` are gone; match views pass a `phase` string instead. `dispatch(action, afterRender)` takes only an action object now.
- **Podium reveal stale read: removed.** `reveal-next-placement` reports `outcome.revealedPlace`, read from the Tournament as the action runs, so the updater-closure workaround is gone. Back-to-back reveals before a rebuild still each get their own place.
- **After-render callbacks: kept.** Four remain: marking the newest alliance `is-new` after a pick, the Podium block's rise animation and confetti, the Start Finals confirm/tab switch, and refocusing the Team name field after Enter. Each needs the freshly rebuilt DOM, not fresh state, so named actions don't replace them. Moving them into render would need one-shot screen state (e.g. "just revealed place N") that gets cleared after one paint. That would be a separate change.
- **DOM tests:** multi-step seeding now goes through a `dispatchAll` helper, which throws on a blocked action. Two tests needed state that no action produces: the Podium reveal left over from an earlier Bracket is now seeded as a saved Tournament and reloaded, and "Start Finals builds nothing" now dispatches `remove-alliance`. The "follows Standings for the Captain" test no longer injects `random: () => 0.5` into Regenerate Matchups. It never depended on that order.
