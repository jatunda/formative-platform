# 04: Shrink long team/member names instead of wrapping

**What to build:** Long team names and member names shrink their font size to stay on one line, instead of wrapping and breaking the surrounding row/table layout. Today a long name wraps onto a second line and drags sibling cells with it — e.g. on the Schedule & Standings tab, a long team name wrapping pushes the W-L column onto its own second row, which is unreadable.

Applies wherever team/member names render in width-constrained cells: Qualification Match rows (Schedule & Standings), the Standings table, and the Now Playing banner's team/member display. Shrinking (not truncating-with-ellipsis) is the desired behavior, so the full name stays visible, just smaller.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] A team with a long name on the Schedule & Standings match list shrinks its name to fit one line; the row's other columns (W-L, scores, etc.) stay aligned on one row.
- [x] A long team or member name in the Standings table shrinks to fit one line instead of wrapping.
- [x] A long team/member name in the Now Playing banner shrinks to fit rather than wrapping awkwardly.
- [x] Short names are unaffected (render at the normal size).
- [x] `cd web && npm run test:coverage` passes.

## Comments

Implemented as a character-length heuristic: `nameFitStyle` in `robotics.js` computes a `--robotics-name-scale` custom property (1 for names ≤14 chars, stepping down 0.03/char to a 0.6 floor) set as an inline style on the name element. `robotics.css`'s `.robotics-fit-name` utility adds `white-space: nowrap`, and each context (match-row team names, Standings team-name/members, Now Playing team-name/members) folds the scale into its own existing font-size via `calc()` so short names are untouched. Verified visually in a real browser (long team "Robo Raiders Supreme Alliance" with long members) across all three locations — match rows, Standings table, and the Now Playing banner — plus `cd web && npm run test:coverage` (1145 tests, thresholds met).
