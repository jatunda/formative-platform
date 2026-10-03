# 09: Match-row visual polish and compact no-show control

**What to build:** On both the Schedule tab's Qualification Matches and the Finals tab's Elimination Matches: give completed matches a clear winner indicator and a clear no-show indicator, replace the No-Show checkboxes with a more compact click-on-team-name toggle, and fix the inconsistent horizontal alignment between match rows.

**Blocked by:** 08 (Fix match-row score input bugs) — builds on the same row markup once score-input handling is already correct, so the no-show-toggle rework isn't done twice

**Status:** closed

- [x] On a completed match, the winning side's team name(s) are visually distinguished (bold + a different color) from the losing side
- [x] On a completed match, any team marked No-Show is visually distinguished (e.g. faded/reduced-opacity red) from teams that showed up
- [x] No-Show is toggled by clicking the team's name directly, instead of a separate checkbox labeled "<team> no-show"; the row no longer dedicates a visible checkbox+label per team for this
- [x] The no-show click-toggle is clearly interactive (cursor/hover affordance) so it doesn't read as plain text
- [x] Horizontal alignment is consistent across every match row — alliance names, score inputs, and action buttons line up in the same columns from row to row
