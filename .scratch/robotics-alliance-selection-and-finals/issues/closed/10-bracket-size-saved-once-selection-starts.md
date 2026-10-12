# 10: Bracket Size is saved for good once Alliance Selection starts

**What to build:** Until the first Playoff Alliance forms, Bracket Size follows the Estimated Bracket Size from Tournament Settings. Forming that first alliance saves the current effective Bracket Size as the Tournament's Bracket Size, and from then on it no longer follows the estimate. It only changes when the teacher edits it on the Alliance Selection tab. That edit is still checked against the number of alliances formed (ticket 06), and Start Finals can still shrink it when starting short. Only Reset Results and New Tournament clear it back to following the estimate.

**Why:** Found while closing ticket 06. Without a saved Bracket Size, lowering the Estimated Bracket Size during Alliance Selection gets around the "below the number formed" refusal. For example, with 3 alliances formed and the estimate lowered to 2, the banner reads "All 2 alliances formed" and Start Finals silently enters only the first 2 alliances. Once Bracket Size is saved, the estimate can't affect selection at all, so it needs no guard of its own.

Spec: `.scratch/robotics-alliance-selection-and-finals/spec.md`, user stories 34 and 37 ("so that alliances are never dropped silently"). Vocabulary: **Bracket Size**, **Estimated Bracket Size** in `web/robotics/CONTEXT.md`.

**Blocked by:** None (builds on 06, which is closed).

**Status:** closed

- [x] Forming the first Playoff Alliance while no Bracket Size is set saves the effective Bracket Size (the current Estimated Bracket Size) as Bracket Size. If one is already set, it is left alone
- [x] Once Bracket Size is saved, changing the Estimated Bracket Size in Tournament Settings doesn't change the Bracket Size, the selection-complete check, the banner, or what Start Finals enters
- [x] Removing every alliance keeps the saved Bracket Size. Discard Bracket (ticket 07) keeps it too
- [x] Reset Results and New Tournament clear Bracket Size, so it follows the Estimated Bracket Size again
- [x] Clearing the Bracket Size input after it has been saved: decide whether the input refuses to be emptied, or whether clearing it saves the current estimate (still checked against the number formed). Either way, a cleared input must not go back to following the estimate. Record the choice in Comments
- [x] Tournaments saved during Alliance Selection before this change, with alliances but no Bracket Size, still load. Decide whether reading such a Tournament saves its Bracket Size, or whether the next alliance formed does, and record the choice
- [x] Update the **Bracket Size** entry in `web/robotics/CONTEXT.md`: it follows the Estimated Bracket Size only until the first Playoff Alliance forms
- [x] Unit tests cover the save on the first alliance, the estimate no longer mattering afterwards, and Reset Results clearing it. A DOM test covers editing the estimate in Tournament Settings mid-selection and showing that Alliance Selection doesn't change
- [x] `npm run test:coverage` in `web/` passes

## Comments

- Clearing the Bracket Size input once Bracket Size is saved is refused: the input reverts and an error toast reads "Enter a Bracket Size of 2 or more." (the same `set-bracket-size` block-reason query, so `setBracketConfig` no-ops too). "Saved" means any explicit Bracket Size, whether the teacher typed it or the first alliance saved it, so a value typed before selection can't be cleared either; type the estimate's number instead. Saving the estimate on clear was rejected because it would quietly re-couple the two fields.
- Tournaments saved mid-selection before this change (alliances, no Bracket Size) are upgraded when read (`upgradeSavedTournament`, called from `initRoboticsApp`). Bracket Size is saved as the effective Bracket Size, raised to the number of alliances formed. Waiting for the next alliance was rejected: a Tournament whose selection was already complete would never form another, so the estimate would keep mattering. Raising to the number formed means a Tournament already in the ticket-06 bug state (3 formed, estimate 2) now shows "All 3 alliances formed" and drops none.
- Forming any alliance re-saves the effective Bracket Size, which is a no-op whenever one is already saved.
