# 05: Compact, collapsible Match Timeline

**What to build:** The Match Timeline card stops spanning the full page width. It becomes a compact panel that is collapsed by default into a one-line summary of the current configuration, and it expands in place to show the existing controls in a tight layout. It sits at the top of the narrow right-hand column from ticket 04 (above Standings), and on narrow screens at the top of the stacked layout.

**Blocked by:** 04 (Side-by-side Matches and Standings)

**Status:** closed

- [x] Collapsed state shows a single summary line, e.g. `Forward · starts 1:00 PM · 4 + 1 min · 2 fields · ends ~2:10 PM` (Backward mode leads with the target end time instead)
- [x] The summary text comes from a pure, unit-tested function covering both modes, singular/plural fields, and an unset start/end time
- [x] Clicking the summary (or a chevron button that exposes its expanded state to assistive tech) toggles the expanded panel, and it is keyboard-operable
- [x] The expanded panel contains all existing controls (mode, start/end time + Apply, match duration, gap, field count) in a compact layout that fits the narrow column
- [x] Collapsed by default; the teacher's open/closed choice is remembered across reloads (a UI preference stored separately from Tournament state, so Reset Results / New Tournament don't touch it)
- [x] `cd web && npm run test:coverage` exits clean
