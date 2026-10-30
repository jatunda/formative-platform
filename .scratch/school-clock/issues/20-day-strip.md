# 20: The bar — whole day or just this Segment

**What to build:** One bar along the bottom of `/clock` that merges the Day Strip and the progress bar (Eric's review in 03's Comments), built to the design reference. It has two settings: **whole day** shows today's Segments, with the current Segment's block filling left to right and a "now" marker; **just this Segment** collapses the same bar to the current Segment stretched full width. The saved Day Strip setting from 16 becomes this whole day / just this Segment choice. In both settings:

- Breaks and Assemblies are told apart by pattern, not just colour;
- Period Labels appear in the strip;
- on a phone it becomes an agenda list;
- during Off-Hours it shows the Next School Day's Segments, labelled with that day ("Mon, Nov 30");
- it's hidden during Summer and Experience Week;
- a Passing Period fills its gap and highlights the next block;
- "Nutrition" is never shortened to "Nut" ("Nutr." where space is tight).

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: Look; user story 80c). Design reference: `.scratch/school-clock/mockups/final/`. Mockup origin: direction B in `.scratch/school-clock/mockups/b/`. Vocabulary: **Segment**, **Break**, **Assembly**, **Period Label**, **Next School Day** in `web/clock/CONTEXT.md`.

**Blocked by:** 16, 17

**Status:** ready-for-agent

- [ ] The strip shows the day's Segments for the teacher's Division, with the current Segment and the current moment marked
- [ ] Breaks and Assemblies are distinguishable without colour
- [ ] Off-Hours shows the Next School Day with its date; hidden in Summer and Experience Week
- [ ] Whole day / just this Segment switch cleanly in place, with no separate hairline bar left anywhere
- [ ] It matches the design reference at every checklist size (an agenda list on the phone)
- [ ] It has an accessible text equivalent (e.g. a list of Segments and times) that isn't re-announced every tick
- [ ] Tests: which Segments show on a School Day, during Off-Hours and on a day off; hidden in Summer and Experience Week; follows the setting
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
