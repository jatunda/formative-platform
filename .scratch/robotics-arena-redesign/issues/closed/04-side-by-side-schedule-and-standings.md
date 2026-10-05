# 04: Side-by-side Qualification Matches and Standings

**What to build:** On wide screens the Schedule & Standings tab becomes two columns: Qualification Matches on the left (wide) and Standings on the right (narrow, sticky so it stays visible while scrolling a long match list). On narrow screens they stack as they do now.

**Blocked by:** 02 (Match row column grid), 03 (Neutral Standings)

**Status:** closed

- [x] At ≥ ~1100px viewport width the tab is a two-column grid: the matches column takes the remaining space and the Standings column is narrower (roughly a quarter of the width with a ~320px minimum, tuned visually at full-bleed widths)
- [x] The Standings column is sticky near the top so it stays in view while the match list scrolls; if it is taller than the viewport it scrolls internally rather than being clipped
- [x] Below the breakpoint the columns stack (matches, then Standings) with no horizontal page scroll
- [x] Copy Match Data / Copy Standings buttons stay with their respective column
- [x] Tests assert both regions render inside the new layout container; `cd web && npm run test:coverage` exits clean
