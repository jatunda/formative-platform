# 07: Live Match query; Schedule Drift and auto-scroll follow the Finals

**What to build:** During the Elimination Bracket, the status header shows Schedule Drift against the Finals' Current Match, and the page auto-scrolls to it, the same way both already work during the Qualification Round. Today both quietly stop working once the Bracket exists, because each works out the Current Match on its own and only knows about Qualification.

Do this by adding one phase-aware **Live Match** query: given the Tournament, it returns the Current Match (whichever phase is running), its schedule entry and Match Time, Up Next, and each side's label ("Winner of Round 2 · Match 1", "Runner-up of …" for Third-Place sides, never "Loser of"). The header's match progress, Schedule Drift and auto-scroll read from it. Now Playing / Up Next move over in ticket 08.

Source: candidate 1 ("One phase-aware Live Match module", Strong) of the 2026-10-12 architecture review, plus the Schedule Drift bug found in that review. Vocabulary: **Current Match**, **Up Next**, **Match Time**, **Schedule Drift** in `web/robotics/CONTEXT.md`.

Context: Current Match is currently derived separately by the Qualification/Elimination helpers, the header's match progress (which recomputes the Elimination match number itself), the drift time lookup (Qualification only), the Now Playing bundles, and auto-scroll (Qualification only).

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] A single Live Match query returns, for whichever phase is running: the Current Match reference, its schedule entry and Match Time, Up Next, and both sides' labels, or nothing when no match is in play (setup, Alliance Selection, complete)
- [x] Schedule Drift is shown during the Elimination Bracket, measured against the Elimination Current Match's Match Time
- [x] Auto-scroll targets the Elimination Current Match during the Finals
- [x] Header match progress ("Match 7 of 24" / "Elimination 3 of 7") reads from the Live Match query, so it no longer recomputes the Elimination number separately
- [x] A completed Tie stays the Current Match, and Byes are skipped (existing Current Match rules hold)
- [x] Pure unit tests cover the query in both phases, including Third-Place "Runner-up of" labels and the no-match-in-play cases
- [x] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`

## Comments

- 2026-10-13: Implemented in `web/robotics/live-match.js` (`getLiveMatch`). Notes for ticket 08:
  - Elimination header progress now counts the Current Match's position in bracket order (as Qualification already does), not decided matches + 1. The two differ only when a later match is decided before an earlier one, e.g. an earlier Tie.
  - Bracket cards get an `is-current` class (no CSS yet). It's the Finals auto-scroll target. Auto-scroll remembers the last Current Match per tab.
  - "Live Match" is a code-level term and isn't in `web/robotics/CONTEXT.md`. Add it there if it turns out to be domain language.
