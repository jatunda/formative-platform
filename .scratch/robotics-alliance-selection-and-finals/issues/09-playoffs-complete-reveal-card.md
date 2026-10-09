# 09: "Playoffs complete" card with Reveal Results

**What to build:** Once every Elimination Match (Third-Place Match included) has a winner, the Finals Current Match area turns into a boxed "**Playoffs complete**" card with a **Reveal Results →** button, shown above the bracket. It uses the same style as the Qualification Round's "Qualification Round complete" card. The old Reveal Results button at the bottom of Finals is removed.

Spec: `.scratch/robotics-alliance-selection-and-finals/spec.md`, user stories 60–61. Vocabulary: **Podium**, **Placement** in `web/robotics/CONTEXT.md`.

**Blocked by:** 08 (Finals live view).

**Status:** ready-for-agent

- [ ] When the Elimination Bracket is complete, the Current Match area shows the "Playoffs complete" card, built from the generic phase-complete card from ticket 02
- [ ] Reveal Results → switches to the Results tab
- [ ] The Reveal Results button below the bracket no longer exists
- [ ] Editing a result so a match becomes undecided again brings the Current Match display back
- [ ] DOM tests cover the card appearing, the navigation, and the card reverting
- [ ] `npm run test:coverage` in `web/` passes
