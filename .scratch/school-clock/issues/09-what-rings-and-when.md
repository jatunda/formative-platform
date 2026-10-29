# 09: What rings and when

**What to build:** The plain `/clock` page lists "next rings today": every upcoming Bell, Clock Alarm and Period Alarm with its time, its source and its sound, from a hard-coded sample set of settings until 10 brings saved settings. Behind it is the clock model's second query, "rings in a window": every ring in a half-open time range. This ticket also defines the shapes of the Alarm and Bells settings.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: clock model "rings in a window"; Testing Decisions: Seam 1; user stories 48–55, 59–61). Vocabulary: **Alarm**, **Clock Alarm**, **Period Alarm**, **Bells**, **Block Day**, **Segment**, **Period**, **Break**, **Assembly** in `web/clock/CONTEXT.md`.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] JSDoc-typed settings shapes for Bells (on/off, sound) and Alarms (kind, enabled, sound; Clock Alarm time and once / every School Day; Period Alarm anchor as minutes from start, minutes before end, or halfway; Period selection; Bell Schedule selection)
- [ ] Bells ring at the start and end of every Period and Break, never Assemblies, and ring once where one Segment ends exactly as the next begins
- [ ] Clock Alarms: "once" rings only on its day; "every School Day" rings only on School Days (not days off or Experience Week)
- [ ] Period Alarms apply only to Periods (Periods 1–7 by default; Seminar and Super Seminar when ticked), never Breaks or Assemblies; minutes-from-start, minutes-before-end and halfway land at the right times on both 45- and 85-minute Periods
- [ ] Bell Schedule scoping works, and the Block Days shortcut selects Even, Odd, Late Start Even and HS Super Seminar Even
- [ ] A disabled Alarm never rings
- [ ] A timer end time passed in comes back as a ring
- [ ] Windows are half-open: a ring exactly on a window's edge appears in exactly one of two adjacent windows
- [ ] Unit tests cover each rule above. The page test checks the "next rings" list for a fake time
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
