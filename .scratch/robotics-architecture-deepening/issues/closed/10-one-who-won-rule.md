# 10: One "who won" rule for every phase

**What to build:** Whether a side won, lost or Tied a Match is decided by one rule shared by the Qualification match rows' winner highlight, the Elimination Bracket's advancement, and Standings. Today there are three separate encodings: an inline comparison in the Qualification row rendering, the Elimination winner helper, and Standings' own win/loss logic. Nothing visible changes. A future scoring rule then lands once.

Keep the existing per-phase differences explicit in the shared rule's interface rather than re-encoded by callers: a Tie in Qualification is a result (half a win), while in Elimination it leaves the Match undecided; a No-Show is a loss for that Team alone and never affects which side wins.

Source: candidate 2 of the 2026-10-12 architecture review. Vocabulary: **Tie**, **No-Show**, **Score**, **Win Points**, **Standings** in `web/robotics/CONTEXT.md`.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] One winner rule is used by Qualification row rendering, Elimination advancement, and Standings
- [x] No inline score comparison for "who won" remains in render code
- [x] Tie and No-Show behaviour is unchanged in both phases (existing Standings and bracket tests pass)
- [x] Unit tests cover the shared rule: win, loss, Tie in each phase, incomplete match, and No-Show not affecting the winning side
- [x] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`

## Comments

- **2026-10-14 (implementation):** The shared rule is `web/robotics/match-result.js`. `matchOutcome` is the core (A / B / Tie / incomplete). It has two phase entry points: `winningSide`, where a Tie has no winner (used by Elimination advancement and the Qualification row highlight, which never highlighted a Tie), and `qualificationTeamResult`, where a Tie is a result and a No-Show is a loss (used by Standings). One edge changed, but it can't be reached: a completed match with a `null` Score used to count as a Tie in Standings and now goes by the row highlight's rule. Recording a result always saves numeric Scores, so this never shows.
