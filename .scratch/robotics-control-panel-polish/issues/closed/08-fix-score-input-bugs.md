# 08: Fix match-row score input bugs

**What to build:** Two input bugs on every match row (Qualification and Elimination): the number inputs show browser spin/stepper arrows that aren't useful here, and typing scores then toggling a No-Show checkbox before clicking "Mark Complete" wipes out the typed-but-unsaved scores. Fix both.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Score number inputs no longer show up/down spinner arrows, on both Qualification and Elimination match rows
- [x] Typing a score, then toggling any No-Show flag on that same match before marking it complete, no longer clears the typed score
- [x] This holds for repeated toggling (on/off/on) and for toggling either side's No-Show, not just one
