# 02: Prefactor: make the Now Playing display reusable for any match kind

**What to build:** No visible change. The Qualification Round's big Current Match + smaller Up Next display, and its boxed "Qualification Round complete" card, are generalized so the Finals tab can reuse them (ticket 08). The display takes its inputs as parameters:
- the match, and the team list for each side
- the score-draft, record-result, and No-Show actions
- the match meta to show

The complete card takes its message, button label, and destination tab.

Spec: `.scratch/robotics-alliance-selection-and-finals/spec.md`, "Shared Now Playing display". Follows the same idea as the earlier unification of score controls across Qualification and Elimination Matches.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] The Now Playing display no longer depends directly on Qualification-specific state or actions. Everything Qualification-specific is passed in by the Schedule & Standings tab
- [x] The phase-complete card is generic: message, button label, and destination are passed in
- [x] The Schedule & Standings tab looks and behaves exactly as before
- [x] Existing Qualification Now Playing tests pass unchanged
- [x] `npm run test:coverage` in `web/` passes
