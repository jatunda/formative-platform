# 12: Elimination bracket tree layout

**What to build:** Redo the Elimination Bracket's visual layout so it reads as a conventional bracket tree: each match is positioned vertically centered between the two matches that feed into it, and the Third-Place Match is positioned to the left of the Final rather than wherever it currently falls.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Every non-Round-1 match is vertically centered between its two feeder matches (standard bracket-tree connector layout), across all round counts the Bracket Size supports
- [x] The Third-Place Match (when present) renders to the left of the Final, not interleaved with the main bracket columns
- [x] Byes still render clearly as Byes within this layout
- [x] Layout holds up for both small brackets (e.g. 2-4 Playoff Alliances) and larger ones (e.g. 8-16), including non-power-of-two Bracket Sizes
