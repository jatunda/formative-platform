# 14: Swiss match-count fairness warning and adaptive Standings ranking

**What to build:** Standings today rank by raw win count, ties broken by raw cumulative points — both of which favor whichever Team happened to play more Qualification Matches. Rather than forcing every tournament into evenly-divisible match counts, warn the teacher when their configuration will produce uneven match counts and let them choose, and make Standings rank fairly either way:

- When generating/regenerating matchups, if `teams × matchesPerTeam` won't divide evenly across Qualification Matches (so some Teams will play one more match than others), show a confirmation dialog that requires an explicit acknowledgement or cancel before proceeding. The dialog recommends a couple of nearby `matchesPerTeam` values that *would* divide evenly for the current team count — never suggesting a change to the number of Teams, only to matches-per-team.
- If the teacher proceeds with an uneven match count, Standings ranks by win percentage, ties broken by average points per match, instead of raw wins/points — and the display adapts to show these rate-based columns instead of (or alongside) the raw ones.
- If match counts end up even, Standings keeps today's behavior: rank by raw wins, ties broken by raw cumulative points.

**Blocked by:** 02 (Confirmation dialogs for Reset Results and New Tournament), 05 (Teams-tab lock-state UX) — reuses the confirm-dialog component and slots into the same Generate/Regenerate flow

**Status:** closed

- [ ] Generating or regenerating matchups with a `matchesPerTeam` × team-count that won't produce equal match counts for every Team shows a confirmation dialog before proceeding
- [ ] That dialog recommends at least one or two alternative `matchesPerTeam` values (not team-count changes) that would produce equal match counts for the current roster size
- [ ] Canceling the dialog leaves existing matchups untouched; confirming proceeds with the uneven generation as today
- [ ] Standings detects whether every Team has played the same number of completed Qualification Matches
- [ ] When match counts are equal, Standings ranks by wins then cumulative points, as today
- [ ] When match counts are unequal, Standings ranks by win percentage then average points per match, and the displayed columns reflect rate-based figures instead of raw ones
- [ ] `web/robotics/CONTEXT.md`'s **Standings** entry is updated to describe both ranking modes
