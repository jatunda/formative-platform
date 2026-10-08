# 05: `recordEliminationResult`/`setEliminationDraftScore`/`setEliminationNoShow` throw when `state.elimination.bracket` is `null`

**What to build:** The three Elimination match setters in `web/robotics/state.js` tolerate `state.elimination.bracket` being `null` (its default before `generateBracket` has ever run, and its value again after `resetResults`/`newTournament`), no-opping instead of throwing a `TypeError`.

Source: surfaced during `/code-review` of `.scratch/robotics-architecture-deepening/issues/closed/04-no-show-setters-throw-on-unmatched-match-ref.md`. Not yet grilled in detail.

Context: Issue 04 fixed `setQualificationNoShow`/`setEliminationNoShow` crashing on an unmatched `matchIndex`/`matchId` *within* an existing bracket. It did not touch the layer above that: all three functions below unconditionally read `state.elimination.bracket.matches` before `updateOneMatch` ever runs, so if `bracket` itself is `null` they throw immediately:

```js
export function recordEliminationResult(state, matchId, { scoreA, scoreB }) {
  const bracket = {
    ...state.elimination.bracket,
    matches: updateOneMatch(state.elimination.bracket.matches, byId(matchId), () => ({ scoreA, scoreB, completed: true })),
    //       ^ throws if state.elimination.bracket is null
  };
  ...
}
```

`setEliminationDraftScore` and `setEliminationNoShow` share the identical unguarded access.

Concrete repro: `setEliminationNoShow(createInitialState(), 'anything', 'team-1', true)` throws on `createInitialState()`'s default `bracket: null`. More subtly, a stale No-Show toggle closure captured while the Finals view was visible can fire after a Reset/New-Tournament dispatch has nulled `elimination.bracket`, before the debounced repaint tears down the old bracket DOM — the same "stale closure" scenario issue 04 fixed for match-level lookups, just one level up (bracket-level instead of match-level).

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] `recordEliminationResult`, `setEliminationDraftScore`, and `setEliminationNoShow` return state unchanged when `state.elimination.bracket` is `null`, instead of throwing
- [x] Direct unit test covers the null-bracket case for all three setters
- [x] `npm run test:coverage` passes clean per `CLAUDE.md`

## Comments

Fixed by extracting a shared `updateEliminationBracket(state, matchId, makePatch)` helper in `web/robotics/state.js` that guards on `!state.elimination.bracket` before delegating to the existing `byId`/`updateOneMatch` machinery, and rewriting `recordEliminationResult`/`setEliminationDraftScore`/`setEliminationNoShow` as one-line callers of it. A `/code-review` pass flagged that guarding each of the three setters individually duplicated the same check three times, against this file's own pattern of extracting shared logic (`byIndex`/`byId`/`updateOneMatch`/`noShowPatch`); folding the guard into the shared helper instead closed that gap in one place. Added one test covering the null-bracket no-op case for all three setters.
