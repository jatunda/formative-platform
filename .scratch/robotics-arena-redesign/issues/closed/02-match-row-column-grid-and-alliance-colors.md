# 02: Match rows as a fixed column grid with red/blue alliances

**What to build:** Each Qualification Match row becomes a CSS grid with stable columns, so every score input has its own column instead of sharing one with Alliance B's team names, and rows line up vertically down the list. Alliance A is styled red and Alliance B blue, as in VEX. The same red/blue treatment applies to Elimination Match cards in the bracket.

**Blocked by:** 01 (Arena theme tokens and fluid page shell)

**Status:** closed

- [x] Match row columns in order: Match Time | Field (only when Field Count > 1) | Current-match label | Red alliance teams | Red score | Blue score | Blue alliance teams | Actions (Mark Complete / Save Edit, ✓ Complete, ↑ ↓)
- [x] Score inputs sit in their own grid columns and align across all rows, whatever the team name length
- [x] Red side and blue side are visually distinct (tinted cell or stripe, and the score input picks up the side color); the winner highlight and No-Show strike-through still read clearly on both colors
- [x] At full-bleed widths the team columns absorb the extra space, and the score and action columns stay fixed width
- [x] Below the narrow breakpoint the row degrades cleanly (stacks without horizontal page scroll)
- [x] Bracket match cards use the same red (A) / blue (B) side treatment
- [x] Is-current / is-up-next / is-complete states are restyled to the new tokens (current gets the live glow)
- [x] Tests cover any new render branches; `cd web && npm run test:coverage` exits clean

## Comments

- Qualification rows get a new `robotics-match-grid` class (plus `has-field` when Field Count > 1). The grid is not put on `.robotics-match-row` because Teams-tab rows reuse that class for their card look.
- Each side and each score is its own grid cell, using named grid areas. The "vs" separator is gone from Qualification rows because it isn't in the column list. Bracket cards keep it.
- `renderAllianceSide` takes the side's color (`'red'` for A, `'blue'` for B). Bracket sides and score inputs get `is-red` / `is-blue`.
- **Stacking is on the list's own width (container query on the match card), not the viewport,** so it also works once ticket 04 puts the list in a narrower column. There are three tiers: one line at 66rem and up, actions on a second line between 44 and 66rem, and fully stacked below 44rem. A single row needs about 66rem before the team columns get usable space, because the root font is 18px and the actions need about 13.5rem.
- **No-Show** is now muted text with a danger-colored strike, so it shows up on the red tint. This applies everywhere, bracket cards included.
- Current gets the live-cyan glow and pill, Up Next gets a dashed gold border, and Complete gets a success-tinted border and dimmed opacity.
- "Red/blue alliance color" and "side A/B" aren't in the `web/robotics/CONTEXT.md` glossary. They're a candidate for `/domain-modeling`.
