# 06: Now Playing hero card

**What to build:** A large "Now Playing" card at the top of the matches column spotlights the Current Match for the projected audience. It shows the Match Time, Field, red vs blue alliances with their Members, big score inputs and Mark Complete, beside a smaller **Up Next** preview. The Current Match row in the list stays, still highlighted.

**Blocked by:** 02 (Match row column grid), 04 (Side-by-side Matches and Standings)

**Status:** closed

- [x] The card renders the Current Match (first not-yet-complete Qualification Match) with Match Time, Field (when Field Count > 1), red and blue alliance team names with Members, large score inputs, No-Show toggles and Mark Complete
- [x] Score inputs and No-Show toggles in the card dispatch the same actions as the list row, so draft scores stay in sync between the card and the row
- [x] An Up Next preview (teams + Match Time, read-only) shows when there is one
- [x] When no Qualification Matches exist, or all are complete, the card shows an empty/finished state (e.g. "Qualification Round complete — on to Finals →" switching to the Finals tab)
- [x] Display-scale typography (scores and team names readable from the back of a classroom), using the live glow
- [x] Tests cover current / up-next-present / up-next-absent / all-complete / no-matches branches; `cd web && npm run test:coverage` exits clean
