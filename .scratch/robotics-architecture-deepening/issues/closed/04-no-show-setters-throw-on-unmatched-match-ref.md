# 04: `setQualificationNoShow`/`setEliminationNoShow` throw instead of no-op on an unmatched match reference

**What to build:** `setQualificationNoShow` and `setEliminationNoShow` in `web/robotics/state.js` tolerate a `matchIndex`/`matchId` that doesn't resolve to an existing match (e.g. a stale No-Show toggle closure firing after `regenerateMatchups`/bracket regeneration has changed the underlying array), matching every other setter's silent-no-op behavior on an unmatched locator instead of crashing.

Source: surfaced during `/code-review` of `.scratch/robotics-architecture-deepening/issues/closed/01-unify-match-score-controls.md` (the render-loop/state/match-timeline selector-deepening work bundled into that same commit). Not yet grilled in detail.

Context: `updateOneMatch(matches, locator, patch)` already no-ops correctly when `locator` matches nothing — it's a `.map` that only patches the matching element, so an unmatched locator just returns the array unchanged. But `setQualificationNoShow`/`setEliminationNoShow` build their `patch` *before* calling `updateOneMatch`, by eagerly looking up the match themselves:

```js
export function setQualificationNoShow(state, matchIndex, teamId, flag) {
  const matches = updateOneMatch(state.qualification.matches, byIndex(matchIndex), noShowPatch(state.qualification.matches[matchIndex], teamId, flag));
  ...
}

export function setEliminationNoShow(state, matchId, teamId, flag) {
  const match = state.elimination.bracket.matches.find((m) => m.id === matchId);
  ...
  matches: updateOneMatch(state.elimination.bracket.matches, byId(matchId), noShowPatch(match, teamId, flag)),
  ...
}
```

If the index/id doesn't resolve, `state.qualification.matches[matchIndex]` or `.find(...)` is `undefined`, and `noShowPatch(match, ...)` crashes on `{ ...match.noShow }` before `updateOneMatch`'s own locator ever gets a chance to no-op. Every other setter (`setQualificationDraftScore`, `setEliminationDraftScore`, `recordQualificationResult`, `recordEliminationResult`, etc.) only touches the match inside `updateOneMatch`'s callback, so they don't have this eager-lookup problem.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] `setQualificationNoShow`/`setEliminationNoShow` compute `noShowPatch` only once a match is confirmed to exist, or inline the patch inside `updateOneMatch`'s own locator callback (matching how the other setters avoid an eager lookup)
- [x] An unmatched `matchIndex`/`matchId` is a silent no-op (returns state with `matches` unchanged), not a thrown error
- [x] Direct unit test covers the unmatched-reference case for both setters
- [x] `npm run test:coverage` passes clean per `CLAUDE.md`

**Resolution:** `updateOneMatch`'s third parameter is now always a `(match) => patch` function, evaluated only inside the `.map` callback when `locator` matches — never eagerly. All six call sites (the two `*NoShow` setters plus the four score/draft setters) were updated to this one calling convention, removing the dual object/function signature that an earlier fix pass had introduced.
