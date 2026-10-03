# 06: Generate/Regenerate Matchups button on Schedule tab

**What to build:** The same matchup-generation control added in #05 (Generate vs. Regenerate naming, same lock state, same disabled-hint behavior) is also available from the Schedule / Swiss Live tab, so the teacher doesn't have to flip back to the Teams tab mid-run to regenerate.

**Blocked by:** 05 (Teams-tab lock-state UX) — reuses its naming and lock logic rather than re-implementing it

**Status:** closed

- [ ] The Schedule tab shows a Generate/Regenerate Matchups button with identical labeling, lock state, and disabled-hint behavior as the Teams tab's
- [ ] Clicking it from either tab produces identical results and both tabs reflect the new state immediately
