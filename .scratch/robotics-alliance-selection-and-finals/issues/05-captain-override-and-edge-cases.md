# 05: Alliance Captain override and selection edge cases

**What to build:** The Captain banner gets a "change ▾" dropdown, so the teacher can pick a different Captain for the **current turn only**. The override is temporary screen state, not saved Tournament state. It clears when an alliance forms or the tab changes. The banner also handles the cases where picking would otherwise get stuck:
- **The Captain is the last available Team:** the banner reads "Team X is the last Team — no partners left" and shows a **Form single-Team alliance** button, with no confirm.
- **Every remaining Team has Declined:** the banner offers to pick a Declined Team anyway (the confirm from ticket 04) or to form a single-Team alliance.
- **Forming a single-Team alliance manually, through the override:** keeps the existing confirm.

Spec: `.scratch/robotics-alliance-selection-and-finals/spec.md`, user stories 27–28, 30–32, and "Captain override". Vocabulary: **Alliance Captain**, **Playoff Alliance** (single-Team) in `web/robotics/CONTEXT.md`.

**Blocked by:** 04 (Declines).

**Status:** ready-for-agent

- [ ] The banner's "change ▾" lists the available Teams. Choosing one makes it the Captain for this turn, and the table highlight follows
- [ ] After an alliance forms, or the tab changes, the Captain reverts to the default rule
- [ ] When only the Captain remains, the banner shows the last-Team message and a single-Team alliance button that forms the alliance without a confirm
- [ ] When every remaining Team has Declined, the banner offers the pick-anyway path and the single-Team path
- [ ] A manual single-Team alliance through the override still asks the existing confirm
- [ ] DOM tests cover each case
- [ ] `npm run test:coverage` in `web/` passes
