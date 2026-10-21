# 16: Third-Place Match can be toggled on a live Bracket; Seed glossary follows list order

**What to build:** Two places where `web/robotics/CONTEXT.md` and the code disagree are settled (decided 2026-10-12, see Decisions):

1. **Third-Place Match toggle: the glossary wins, so the code changes.** The teacher can switch the Third-Place Match on or off at any time, including on a live Elimination Bracket, until the Third-Place Match itself is marked complete. Today the toggle locks as soon as a Bracket exists. Switching it on adds a Third-Place Match between the two Semifinal-round losers ("Runner-up of …" sides until those are decided); switching it off removes it. Either way:
   - Match Times are recalculated forward from now automatically, so the schedule reflects the added or removed match.
   - The Podium's reveal progress is cleared, because the Placements change (3rd exists or not), so the Podium is revealed again from the start.
   - Recorded results of every other Elimination Match are untouched.
2. **Seeds: the code wins, so the glossary changes.** Seed N is the Nth Playoff Alliance in list order; the teacher changes Seeds by reordering Playoff Alliances before Start Finals. There is no separate per-Bracket-Slot Seed override.

Source: glossary drift found during the 2026-10-12 architecture review. Vocabulary: **Third-Place Match**, **Placement**, **Podium**, **Match Timeline**, **Seed**, **Bracket Slot**, **Elimination Bracket** in `web/robotics/CONTEXT.md`.

**Blocked by:** 15 (Bracket settings stored once). With Third-Place inclusion stored in one place, the toggle only has to change that one value and the Bracket's matches.

**Status:** ready-for-agent

- [ ] The Third-Place toggle stays available while a Bracket exists, and locks only once the Third-Place Match is marked complete (the Alliance Selection lock no longer blocks it)
- [ ] Switching it on with a live Bracket adds a Third-Place Match fed by the Semifinal-round losers; switching it off removes it. Other Elimination results are unchanged
- [ ] Toggling recalculates Match Times forward from now
- [ ] Toggling clears the Podium's reveal progress; the Results tab only shows the Podium once every Elimination Match (Third-Place included, if on) has a winner
- [ ] Current Match / Up Next and "Playoffs complete" pick up the added or removed Third-Place Match correctly
- [ ] Edge cases covered and behaviour recorded in Comments: toggling on after the Final is already complete; toggling off while the Third-Place Match has a score entered but isn't marked complete; brackets too small to have a Semifinal round
- [ ] `web/robotics/CONTEXT.md` updated: the **Third-Place Match** entry mentions the automatic Match Time recalculation and Podium re-cover; the **Match Timeline** entry notes this as the one case Match Times change without Recalculate; the **Seed** entry says Seeds follow Playoff Alliance list order, changed by reordering, with no per-slot override; the **Elimination Bracket** entry's "fixed once generated" wording allows for the Third-Place Match being added or removed
- [ ] Unit tests cover the toggle on a live Bracket (on, off, locked after completion), the recalculated Match Times, and the Podium reset; a DOM test covers toggling from the Finals view
- [ ] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`

## Decisions

- **Third-Place toggle (2026-10-12, Eric):** the glossary is right. The toggle stays available until the Third-Place Match is complete, including on a live Bracket. Keeping the lock-at-Start-Finals behaviour was rejected.
- **Match Times on toggle (2026-10-12, Eric):** recalculate automatically, forward from now. This is a deliberate exception to "only Recalculate Match Times changes Match Times".
- **Podium on toggle (2026-10-12, Eric):** re-cover the Podium, as a new Bracket would. Blocking the toggle once any reveal has started was rejected.
- **Seeds (2026-10-12, Eric):** the code is right. Seeds follow Playoff Alliance list order; the glossary's per-slot override is removed.
