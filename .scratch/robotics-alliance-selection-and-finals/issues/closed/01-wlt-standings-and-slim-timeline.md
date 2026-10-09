# 01: W-L-T Standings with Win Points, and a slim folded Match Timeline

**What to build:** Standings show every Team's record as W-L-T on a single line, and rank Teams the way VEX does. A Tie counts for both sides: Win Points (2 per win, 1 per Tie, 0 per loss) in even-match-count mode, and half a win in uneven mode. On the Schedule & Standings tab, the folded Match Timeline shrinks to a slim, title-only row, so the full Standings for 8 Teams fit in the sidebar without scrolling.

Spec: `.scratch/robotics-alliance-selection-and-finals/spec.md`, user stories 1–10. Vocabulary: **Tie**, **Win Points**, **Standings** in `web/robotics/CONTEXT.md`.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] Each Standings entry carries a Tie count and Win Points. A completed Qualification Match with equal Scores gives a Tie to every Team on both sides, except a No-Show Team, which still records a loss
- [x] Even-match-count Standings rank by Win Points, then cumulative Score
- [x] Uneven-match-count Standings compute Win % as (W + ½T) / matches played, with average Score as the tiebreaker
- [x] The Standings table shows a `W-L-T` column that never wraps onto two lines
- [x] The copied Standings Markdown shows `W-L-T`
- [x] A collapsed Match Timeline shows only its chevron and title, with no summary text and reduced padding. Expanding it still shows the full timing controls
- [x] Unit tests cover each Tie rule. DOM tests cover the W-L-T text and the summary-free collapsed Timeline
- [x] `npm run test:coverage` in `web/` passes

## Comments

Implemented. `computeStandings` entries gain `ties` and `winPoints`; raw mode sorts by Win Points then cumulative Score; rate mode's Win % is (W + ½T) / played. `formatRecord` in `standings.js` is the single W-L-T formatter for the table cell (`.robotics-record-cell`, `nowrap`) and the Markdown export. The collapsed Match Timeline is title-only with reduced padding; `renderAccordion`'s `summary` is now optional (the Finals Playoff Setup still uses one until it's removed in a later ticket), and the now-unused `formatTimelineSummary` was deleted with its tests.
