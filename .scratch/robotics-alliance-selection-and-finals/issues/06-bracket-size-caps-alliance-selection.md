# 06: Bracket Size caps Alliance Selection

**What to build:** Bracket Size now decides how many Playoff Alliances Alliance Selection forms, so the class doesn't have to run through every Team.
- **Prefill:** Bracket Size comes from the Estimated Bracket Size in Tournament Settings until the teacher sets it.
- **Reaching the cap:** once that many alliances have formed, the banner reads "All N alliances formed". The remaining Teams get a muted "not advancing" tag. Pick and Declined stay visible but inactive; clicking one shows an error toast: "All N alliances are formed. Raise Bracket Size to keep picking."
- **Raising Bracket Size:** picking resumes.
- **Lowering Bracket Size below the number already formed:** refused, with the error toast "N alliances are already formed. Remove alliances before lowering Bracket Size below N." The input reverts to its saved value.
- **Starting short:** Start Finals with fewer alliances than Bracket Size asks for confirmation ("Only 3 of 4 alliances formed — start Finals with 3?"). If confirmed, Bracket Size shrinks to match before the Bracket is built.

Spec: `.scratch/robotics-alliance-selection-and-finals/spec.md`, user stories 18, 33–37, 44, and "Locked and invalid actions explain themselves". Vocabulary: **Bracket Size**, **Alliance Selection** in `web/robotics/CONTEXT.md`.

**Blocked by:** 03 (Alliance Selection tab).

**Status:** ready-for-agent

- [ ] The effective Bracket Size is the explicit value, or the Estimated Bracket Size when none is set
- [ ] Selection is complete once the number of alliances formed reaches the effective Bracket Size. The banner then says so, and leftover Teams are tagged "not advancing"
- [ ] With selection complete, clicking Pick or Declined leaves state unchanged and shows the "raise Bracket Size" toast
- [ ] Raising Bracket Size makes picking available again
- [ ] Setting Bracket Size below the number of alliances formed leaves state unchanged, shows the "remove alliances first" toast, and reverts the input
- [ ] Start Finals with fewer alliances than Bracket Size asks for confirmation. If confirmed, Bracket Size becomes the number formed and the Bracket is built. If cancelled, nothing changes
- [ ] The block-reason query covers both new reasons. Unit tests cover the effective size, completion, and refusal. DOM tests cover the toasts and the short-start confirm
- [ ] `npm run test:coverage` in `web/` passes
