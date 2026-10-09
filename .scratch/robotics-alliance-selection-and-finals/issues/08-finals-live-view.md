# 08: Finals live view: Current Match and Up Next

**What to build:** The top of the Finals tab shows a big **Current Match** and a smaller **Up Next**, using the shared Now Playing display from ticket 02.
- **Which match is Current:** the first undecided Elimination Match in bracket order: by round, then slot, with the Third-Place Match before the Final, and Byes skipped.
- **Up Next:** the next undecided Elimination Match after it.
- **Ties:** a completed Elimination Match that ended in a Tie has no winner, so it stays Current until its Score is changed.
- **Sides not yet known:** read "Winner of Round R · Match S".
- **Entering results:** scores, No-Shows, and Mark Complete work from the big display. They edit the same draft as the match's card in the bracket.
- **Match meta:** Match Time and Field appear as they do in the Qualification Round.
- **Layout:** the bracket fills the remaining screen height, with each round's matches centered vertically.

Bracket order is defined once and shared by the schedule ordering and these new queries.

Spec: `.scratch/robotics-alliance-selection-and-finals/spec.md`, user stories 49–57, and "Finals Current Match and Up Next". Vocabulary: **Current Match**, **Up Next**, **Tie** in `web/robotics/CONTEXT.md`.

**Blocked by:** 02 (shared Now Playing display), 03 (Alliance Selection tab, which removes the Finals setup UI first).

**Status:** ready-for-agent

- [ ] Pure queries return the Elimination Current Match and Up Next, following the bracket-order, Tie, and Bye rules. Both return nothing once every Elimination Match has a winner
- [ ] Schedule ordering and the new queries share one definition of bracket order
- [ ] Undecided sides are labelled "Winner of Round R · Match S", based on the match that feeds them
- [ ] The Finals tab renders the shared Now Playing display for the Current Match and Up Next, with score entry, No-Show toggles, Mark Complete, and match meta
- [ ] A draft score entered in the big display shows in the bracket card, and the reverse
- [ ] The bracket fills the remaining viewport height, and its matches are centered vertically in each round column
- [ ] Unit tests cover the queries and the "Winner of…" labels. DOM tests cover scoring through the big display advancing the bracket
- [ ] `npm run test:coverage` in `web/` passes
