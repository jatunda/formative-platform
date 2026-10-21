# 15: Bracket settings stored once

**What to build:** Bracket Size and whether a Third-Place Match is included are stored only in the Tournament's Elimination settings. The built Elimination Bracket holds its matches (and Seeds, if they still belong there), not its own copy of those settings. The Match Timeline's scheduled-match count reuses the bracket module's "played Elimination Matches" query instead of its own Bye filter. Nothing visible changes. Saved Tournaments from before the change still load.

Source: candidate 5 ("Single source for Elimination Bracket settings", Worth exploring) of the 2026-10-12 architecture review. Vocabulary: **Bracket Size**, **Third-Place Match**, **Bye**, **Seed**, **Elimination Bracket** in `web/robotics/CONTEXT.md`.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] Bracket Size and Third-Place inclusion have exactly one stored location; every reader uses it
- [x] The Match Timeline counts scheduled Elimination Matches via the bracket module's played-match query; the duplicated Bye filter is deleted
- [x] A Tournament saved before the change (settings duplicated inside the Bracket) is upgraded to the new shape when read, through the same saved-Tournament upgrade step ticket 10 added, and then behaves the same. No other code reads the old shape
- [x] Unit tests cover the scheduled count with Byes and with/without a Third-Place Match, and loading an old-shape saved Tournament
- [x] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`

## Decisions

- **Old-shape saved Tournaments (2026-10-12, Eric):** upgrade on read, following ticket 10's precedent, so the rest of the code only knows one shape. Reading both shapes forever was rejected.

## Comments

- **2026-10-20 (implementation):** `buildBracket` now returns `{ seeds, matches }`. Seeds stay in the Bracket because `resolveMatchSides` reads them. `paddedSize` went too; nothing read it, and it can be recomputed with `nextPowerOfTwo`. Bracket Size and the Third-Place setting live only in `state.elimination`. `upgradeSavedTournament` gains a second step, `moveBracketSettingsOutOfBracket`: when a saved Bracket still has `bracketSize`, its `bracketSize`/`includeThirdPlace` are copied into the Elimination settings and the Bracket keeps only `seeds`/`matches`. The Bracket's copy wins over the settings because it is what the matches were built with. The two never differed in practice, since the settings were locked while a Bracket existed. `getScheduledMatchCount` uses `getPlayedEliminationMatches`. `match-timeline.js` now starts with `// @ts-check`.
