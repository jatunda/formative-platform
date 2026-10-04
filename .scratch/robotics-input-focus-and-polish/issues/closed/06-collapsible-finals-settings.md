# 06: Collapsible settings section on the Finals tab

**What to build:** On the Finals tab, the setup cards — "Form a Playoff Alliance", "Playoff Alliances", and "Bracket Configuration" — collapse under one single heading the teacher can open/close, mirroring the existing Match Timeline accordion pattern already used on Schedule & Standings (collapsed by default into a one-line summary, open/closed choice remembered). This frees the Elimination Bracket view to be the main focus of the tab once setup is done, instead of competing with it for space above the bracket.

**Blocked by:** None (can start immediately).

**Status:** closed

- [ ] The three setup cards are grouped under one collapsible heading on the Finals tab.
- [ ] Collapsing the heading leaves the Elimination Bracket as the dominant content on the tab.
- [ ] The open/closed choice persists the same way the Match Timeline's does (remembered across visits).
- [ ] Forming an alliance, removing one, and editing Bracket Configuration still all work correctly while the section is expanded.
- [ ] `cd web && npm run test:coverage` passes.
