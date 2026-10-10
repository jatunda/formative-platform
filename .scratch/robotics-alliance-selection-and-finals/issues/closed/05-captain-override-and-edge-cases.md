# 05: Alliance Captain override and selection edge cases

**What to build:** The Captain banner gets a "change ▾" dropdown, so the teacher can pick a different Captain for the **current turn only**. The override is temporary screen state, not saved Tournament state. It clears when an alliance forms or the tab changes. The banner also handles the cases where picking would otherwise get stuck:
- **The Captain is the last available Team:** the banner reads "Team X is the last Team — no partners left" and shows a **Form single-Team alliance** button, with no confirm.
- **Every remaining Team has Declined:** the banner offers to pick a Declined Team anyway (the confirm from ticket 04) or to form a single-Team alliance.
- **Forming a single-Team alliance manually, through the override:** keeps the existing confirm.

Spec: `.scratch/robotics-alliance-selection-and-finals/spec.md`, user stories 27–28, 30–32, and "Captain override". Vocabulary: **Alliance Captain**, **Playoff Alliance** (single-Team) in `web/robotics/CONTEXT.md`.

**Blocked by:** 04 (Declines).

**Status:** closed

- [x] The banner's "change ▾" lists the available Teams. Choosing one makes it the Captain for this turn, and the table highlight follows
- [x] After an alliance forms, or the tab changes, the Captain reverts to the default rule
- [x] When only the Captain remains, the banner shows the last-Team message and a single-Team alliance button that forms the alliance without a confirm
- [x] When every remaining Team has Declined, the banner offers the pick-anyway path and the single-Team path
- [x] A manual single-Team alliance through the override still asks the existing confirm
- [x] DOM tests cover each case
- [x] `npm run test:coverage` in `web/` passes

## Comments

- The manual single-Team path is a "Form single-Team alliance" button in the banner, shown while the Captain still has partners, and it always confirms. When every remaining Team has Declined, the same button is made prominent and still confirms, because the spec only exempts the automatic last-Team case. The "pick anyway" path in that case is a banner hint pointing at the table's Pick buttons, which already ask for confirmation.
- "change ▾" lists the available Teams other than the current Captain. Override clearing lives in the pick action and in `setActiveTab`.
- The Captain `<select>` isn't lock-aware yet. Ticket 07 (lock) should route it through the block-reason query.
