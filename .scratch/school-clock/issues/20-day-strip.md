# 20: The Day Strip

**What to build:** Along the bottom of `/clock`, a strip of today's Segments shows the shape of the day and where it is now, built to the design reference (B's strip from the mockups):

- Breaks and Assemblies are told apart by pattern, not just colour;
- Period Labels appear in the strip;
- on a phone it becomes an agenda list;
- during Off-Hours it shows the Next School Day's Segments, labelled with that day ("Mon, Nov 30");
- it's hidden during Summer and Experience Week;
- it follows the Day Strip setting (default on).

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: Look; user story 80c). Design reference: `.scratch/school-clock/mockups/final/`. Mockup origin: direction B in `.scratch/school-clock/mockups/b/`. Vocabulary: **Segment**, **Break**, **Assembly**, **Period Label**, **Next School Day** in `web/clock/CONTEXT.md`.

**Blocked by:** 16, 17

**Status:** ready-for-agent

- [ ] The strip shows the day's Segments for the teacher's Division, with the current Segment and the current moment marked
- [ ] Breaks and Assemblies are distinguishable without colour
- [ ] Off-Hours shows the Next School Day with its date; hidden in Summer and Experience Week
- [ ] The Day Strip setting hides and shows it; the main screen reflows cleanly both ways
- [ ] It matches the design reference at every checklist size (an agenda list on the phone)
- [ ] It has an accessible text equivalent (e.g. a list of Segments and times) that isn't re-announced every tick
- [ ] Tests: which Segments show on a School Day, during Off-Hours and on a day off; hidden in Summer and Experience Week; follows the setting
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
