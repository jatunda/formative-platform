# 05: Teams-tab lock-state UX

**What to build:** Make the Teams tab clearly communicate when the roster/matchup-generation controls are locked (i.e. once any Qualification Match is complete, per the existing Pairing Draw rule) instead of just disabling a button with no explanation.

**Blocked by:** 03 (Add-Team form keyboard UX and validation) — shares the Add-Team form's disabled-state wiring

**Status:** closed

- [x] The matchup-generation button reads "Generate Matchups" when no Qualification Matches exist yet, and "Regenerate Matchups" once they do
- [x] When that button is disabled (because a Qualification Match is already complete), hovering or clicking it shows a hint that Reset Results or New Tournament must be used first
- [x] Adding a new Team is disallowed under the same condition that disables regenerating matchups, with a visible reason shown the same way
- [x] There is clear visual spacing separating the Generate/Regenerate Matchups control from the Reset Results / New Tournament button group, so they don't read as one cluster
