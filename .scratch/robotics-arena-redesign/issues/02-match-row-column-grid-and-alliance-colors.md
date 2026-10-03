# 02: Match rows as a fixed column grid with red/blue alliances

**What to build:** Each Qualification Match row becomes a CSS grid with stable columns, so every score input has its own column instead of sharing one with Alliance B's team names, and rows line up vertically down the list. Alliance A is styled red and Alliance B blue, as in VEX. The same red/blue treatment applies to Elimination Match cards in the bracket.

**Blocked by:** 01 (Arena theme tokens and fluid page shell)

**Status:** ready-for-agent

- [ ] Match row columns in order: Match Time | Field (only when Field Count > 1) | Current-match label | Red alliance teams | Red score | Blue score | Blue alliance teams | Actions (Mark Complete / Save Edit, ✓ Complete, ↑ ↓)
- [ ] Score inputs sit in their own grid columns and align across all rows, whatever the team name length
- [ ] Red side and blue side are visually distinct (tinted cell or stripe, and the score input picks up the side color); the winner highlight and No-Show strike-through still read clearly on both colors
- [ ] At full-bleed widths the team columns absorb the extra space, and the score and action columns stay fixed width
- [ ] Below the narrow breakpoint the row degrades cleanly (stacks without horizontal page scroll)
- [ ] Bracket match cards use the same red (A) / blue (B) side treatment
- [ ] Is-current / is-up-next / is-complete states are restyled to the new tokens (current gets the live glow)
- [ ] Tests cover any new render branches; `cd web && npm run test:coverage` exits clean
