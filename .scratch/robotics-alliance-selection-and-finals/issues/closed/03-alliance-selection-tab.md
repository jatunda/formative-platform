# 03: Alliance Selection tab: Standings, Alliance Captain, Pick, alliance list, Start Finals

**What to build:** A new **Alliance Selection** tab between Schedule & Standings and Finals, where the class watches Playoff Alliances form.

- **Standings table:** the full Standings are projected. Teams already in a Playoff Alliance are grayed out and tagged "Alliance N". The **Alliance Captain** (the highest-ranked Team not yet in a Playoff Alliance) is highlighted, and a banner reads "Team X is picking".
- **Pick:** clicking **Pick** on an available Team forms an alliance with the Captain. The new alliance briefly highlights, and the Captain moves on.
- **Alliance list:** shows the alliances in Seed order, which is the order they were formed. ↑/↓ reorders them and Remove deletes one.
- **Settings:** Bracket Size and the Third-Place checkbox move here from Finals.
- **Start Finals →:** builds the Elimination Bracket from the alliances in list order and switches to the Finals tab. With fewer than 2 alliances, it does nothing and shows an error toast: "Form at least 2 alliances before starting the Finals."
- **Qualification not finished:** a notice warns that Standings and the Captain may still change, without blocking anything.

**Finals tab:**
- The "Playoff Setup" accordion, the Seeds card, and "Auto-fill Seeds from Standings" are removed.
- With no Bracket, it shows "Form alliances on the Alliance Selection tab".

**Schedule & Standings tab:** the "Qualification Round complete" button becomes **On to Alliance Selection →**.

**Seeds:** they are now just the alliance list order. The per-number seed store and the per-seed dropdowns go away. Older saved Tournaments must still load; ignoring their old seed map is safe.

Alliance Selection rules live in one new pure module, with no DOM code. This ticket adds:
- the Captain query
- the row-status query
- the block-reason query, which returns a toast message, or null when the action is allowed. Tickets 06 and 07 add more reasons to it.

Spec: `.scratch/robotics-alliance-selection-and-finals/spec.md`, user stories 11–17, 19–20, 29, 39–43, 58–59. Vocabulary: **Alliance Selection**, **Alliance Captain**, **Seed** in `web/robotics/CONTEXT.md`.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] The tab order is Teams | Schedule & Standings | Alliance Selection | Finals | Results
- [x] The Captain is the highest-ranked Team in Standings not in a Playoff Alliance, using the same Standings computation as the Standings tab
- [x] Rows render as in-alliance (grayed, "Alliance N"), Captain (highlighted), or available (with a Pick button)
- [x] Pick forms an alliance of the Captain and the chosen Team, briefly highlights it in the list, and advances the Captain
- [x] The alliance list is in Seed order. ↑/↓ reorders it and Remove deletes an alliance, and the Captain is recomputed
- [x] Bracket Size and Third-Place are editable on this tab
- [x] Start Finals with 2 or more alliances builds the Bracket in list order, resets the Podium reveal, and switches to Finals
- [x] Start Finals with fewer than 2 alliances leaves state unchanged and shows the explanatory error toast
- [x] A "Qualification Round isn't finished" notice appears while Qualification Matches remain
- [x] The Finals tab has no setup UI, and shows the empty-state message when there's no Bracket
- [x] The "Qualification Round complete" card's button reads **On to Alliance Selection →** and goes to that tab
- [x] The per-number seed map, the seed-setting action, and Auto-fill Seeds are removed, and their tests replaced. A saved Tournament that still has the old seed map loads without error
- [x] Unit tests cover the Captain query, the row statuses, alliance reordering, the Start Finals rules, and the block-reason query. DOM tests cover the tab flow end to end
- [x] `npm run test:coverage` in `web/` passes
