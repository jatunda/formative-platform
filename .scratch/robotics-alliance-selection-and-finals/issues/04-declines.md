# 04: Declines

**What to build:** The teacher can record that an invited Team **Declined**. Each available row in the Alliance Selection table gets a **Declined** button.
- **Marking a Decline:** the Team shows a "Declined" badge, and the button becomes **Undo**.
- **Who it applies to:** a Decline counts against every Alliance Captain from then on. It stays in place when alliances are removed, and only Undo clears it.
- **Overriding it:** clicking **Pick** on a Declined Team asks for confirmation ("Team X declined earlier — pick anyway?"), then forms the alliance.
- **A Declined Team can still become Alliance Captain.**
- **Reset Results** clears Declines too, and its confirm dialog now mentions "alliances and declines".

Spec: `.scratch/robotics-alliance-selection-and-finals/spec.md`, user stories 16, 21–26, 62–63. Vocabulary: **Decline**, **Reset Results** in `web/robotics/CONTEXT.md`.

**Blocked by:** 03 (Alliance Selection tab).

**Status:** ready-for-agent

- [ ] Tournament state records the Declined Teams. Saved Tournaments without this field load and behave as if no one has Declined
- [ ] Decline and Undo actions exist. The row shows a "Declined" badge and an Undo button
- [ ] Picking a Declined Team asks for confirmation first, and forms the alliance only if confirmed
- [ ] A Declined Team can be the Alliance Captain, and the Captain highlight takes precedence over the Declined badge for highlighting
- [ ] Removing an alliance doesn't clear any Decline
- [ ] Reset Results clears Declines, and its confirm text mentions alliances and declines. New Tournament still clears everything
- [ ] Unit tests cover decline/undo, Captain eligibility, and Reset Results. DOM tests cover the badge, Undo, and the override confirm
- [ ] `npm run test:coverage` in `web/` passes
