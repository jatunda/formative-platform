# 13: Match Timeline rework

**What to build:** Clean up the Match Timeline card on the Schedule tab and move its bracket-size estimation up front. Concretely: Start Time and End Time only need a time-of-day, not a full date, since a Tournament runs in one sitting; both Forward mode (Start Time) and Backward mode (End Time) get an explicit Apply button instead of Forward applying on every keystroke/blur and Backward alone having a button; the entered time value must keep displaying after Apply instead of clearing itself; and the "Estimated Bracket Size" / "estimated Third-Place Match" inputs move out of the Backward-mode timeline card entirely and into the Teams tab's tournament setup, asked once up front, defaulting the Third-Place Match question to off.

**Blocked by:** 05 (Teams-tab lock-state UX) — adds new fields to the same Teams-tab settings card

**Status:** closed

- [x] Start Time and End Time inputs capture only a time-of-day (today implied), not a full date-and-time
- [x] Both Forward mode and Backward mode have an explicit Apply button; nothing recalculates the schedule until Apply is clicked
- [x] After clicking Apply, the time value the teacher entered remains visible in its field (does not revert to blank)
- [x] "Estimated Bracket Size" and "estimated Third-Place Match" are asked once, on the Teams tab, as part of initial tournament setup — not on the Schedule tab's timeline card
- [x] The estimated Third-Place Match question defaults to off (not included) rather than today's default of on
- [x] With the estimate inputs removed, the Backward-mode timeline card layout is no longer cramped/broken
- [x] `web/robotics/CONTEXT.md`'s **Match Timeline** entry is updated if its description of where Estimated Bracket Size / Third-Place estimate are configured no longer matches
