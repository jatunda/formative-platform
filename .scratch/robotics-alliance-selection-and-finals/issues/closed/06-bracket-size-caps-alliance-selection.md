# 06: Bracket Size caps Alliance Selection

**What to build:** Bracket Size now decides how many Playoff Alliances Alliance Selection forms, so the class doesn't have to run through every Team.
- **Prefill:** Bracket Size comes from the Estimated Bracket Size in Tournament Settings until the teacher sets it.
- **Reaching the cap:** once that many alliances have formed, the banner reads "All N alliances formed". The remaining Teams get a muted "not advancing" tag. Pick and Declined stay visible but inactive; clicking one shows an error toast: "All N alliances are formed. Raise Bracket Size to keep picking."
- **Raising Bracket Size:** picking resumes.
- **Lowering Bracket Size below the number already formed:** refused, with the error toast "N alliances are already formed. Remove alliances before lowering Bracket Size below N." The input reverts to its saved value.
- **Starting short:** Start Finals with fewer alliances than Bracket Size asks for confirmation ("Only 3 of 4 alliances formed — start Finals with 3?"). If confirmed, Bracket Size shrinks to match before the Bracket is built.

Spec: `.scratch/robotics-alliance-selection-and-finals/spec.md`, user stories 18, 33–37, 44, and "Locked and invalid actions explain themselves". Vocabulary: **Bracket Size**, **Alliance Selection** in `web/robotics/CONTEXT.md`.

**Blocked by:** 03 (Alliance Selection tab).

**Status:** closed

- [x] The effective Bracket Size is the explicit value, or the Estimated Bracket Size when none is set
- [x] Selection is complete once the number of alliances formed reaches the effective Bracket Size. The banner then says so, and leftover Teams are tagged "not advancing"
- [x] With selection complete, clicking Pick or Declined leaves state unchanged and shows the "raise Bracket Size" toast
- [x] Raising Bracket Size makes picking available again
- [x] Setting Bracket Size below the number of alliances formed leaves state unchanged, shows the "remove alliances first" toast, and reverts the input
- [x] Start Finals with fewer alliances than Bracket Size asks for confirmation. If confirmed, Bracket Size becomes the number formed and the Bracket is built. If cancelled, nothing changes
- [x] The block-reason query covers both new reasons. Unit tests cover the effective size, completion, and refusal. DOM tests cover the toasts and the short-start confirm
- [x] `npm run test:coverage` in `web/` passes

## Comments

- The block-reason query takes the Bracket Size being set as a third argument (`'set-bracket-size', { bracketSize }`). Clearing the input means falling back to the Estimated Bracket Size, and that fallback is checked against the number formed too.
- `formPlayoffAlliance`, `declineTeam` and `setBracketConfig` no-op when the same query blocks them, so the toast and the state can't disagree.
- Once selection is complete the Captain is null, and leftover Teams are `not-advancing`. A Team that Declined before the cut keeps its Declined badge and Undo (Undo isn't blocked), so a Decline stays visible and reversible.
- Known gap, not in this ticket: lowering the *Estimated* Bracket Size in Tournament Settings (with no explicit Bracket Size) isn't guarded. With 3 alliances formed and the estimate lowered to 2, the banner reads "All 2 alliances formed" and Start Finals silently enters only the first 2. Ticket 07 or a follow-up could route that input through `set-bracket-size` too, or freeze the effective size into `bracketSize` once the first alliance forms.
