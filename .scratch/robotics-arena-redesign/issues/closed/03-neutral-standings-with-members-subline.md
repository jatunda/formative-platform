# 03: Neutral Standings ranks, Members as a subline

**What to build:** Standings on the Schedule & Standings tab no longer give ranks 1–3 gold/silver/bronze color or bold, and every rank looks the same. The separate Members column goes away. Members show as a small second line under each team name, so the table fits the narrow side column that ticket 04 introduces.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Ranks 1–3 get no special color or weight; all rank cells look identical
- [x] The Members column is removed from both ranking modes (even: Rank, Team, W-L, Points; rate: Rank, Team, W-L, Win %, Avg Pts/Match)
- [x] Each Team cell shows the team name with its Members as a smaller, muted second line (omitted when a team has no Members)
- [x] The uneven-match-count note still appears in rate mode
- [x] Copy Standings to Clipboard output is unchanged (it is markdown export, not the table)
- [x] Tests updated for the new header set and team-cell structure; `cd web && npm run test:coverage` exits clean
