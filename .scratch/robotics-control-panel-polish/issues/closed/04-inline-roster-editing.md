# 04: Inline roster editing (name, members)

**What to build:** Let the teacher edit an existing Team's name and Member list from the Teams tab roster list at any point in the Tournament, including mid-run, without disrupting already-generated Qualification Matches, Playoff Alliances, or results. Teams are referenced by a stable id everywhere they're used, so renaming or editing members is already safe at the data layer — this ticket is the UI to do it.

**Blocked by:** None (can start immediately)

**Status:** closed

- [ ] Each roster row has an edit control (inline fields, or edit-mode toggle) for the Team's name and its Member list
- [ ] Saving an edit updates the Team everywhere it's displayed (match rows, standings, alliances, bracket) without altering any existing match, alliance, or seed assignment
- [ ] Editing is available before, during, and after the Qualification Round and Elimination Bracket — not gated by the same lock that governs regenerating matchups
- [ ] Members can be added and removed individually, not just replaced as one comma-separated blob
