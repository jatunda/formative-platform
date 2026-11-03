# 08: Off-Hours, days off, Experience Week and Summer

**What to build:** Outside school hours, the plain `/clock` page says something useful:

- when the Next School Day starts ("Mon, Nov 30 · starts in 2d 14h");
- how long it's been since school ended (counting back across weekends and holidays);
- what today is on a day off (Day Label);
- "HS Experience Week" during Experience Week;
- "Day N of Summer" from the moment the last Segment of the year ends, with a countdown to the first day once the next School Year is registered;
- a plain clock on dates outside every known School Year.

This finishes the clock model's "describe a moment" query.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: clock model, School Day rules; user stories 29–41). Vocabulary: **Off-Hours**, **Next School Day**, **Day Label**, **Experience Week**, **Summer**, **School Year** in `web/clock/CONTEXT.md`.

**Blocked by:** 06

**Status:** closed

- [x] Next School Day: skips weekends, days off and Experience Week, and gives the first Segment's start
- [x] "Since school ended" counts from the last Segment's end of the most recent School Day, including before school (e.g. Monday morning → since Friday's last Segment)
- [x] Days off and weekends return their Day Label ("Weekend" on weekends without an exception)
- [x] Experience Week returns its own state, with no Segments
- [x] Summer starts at the end of the last Segment of a School Year's last School Day; the day count is correct; the first-day countdown appears only when the next School Year is registered
- [x] A date outside every School Year returns an "unknown" state that the page shows as a plain clock
- [x] Countdowns across the 2026-11-01 daylight-saving change are correct in wall-clock terms
- [x] Model tests use small made-up School Years (so this ticket doesn't wait on 07). The page test covers a day off and Summer
- [x] All student-visible wording is positive
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
Day 1 of Summer starts at the end of the last Segment of the last School Day (5/27/27 11:30), so 5/28 'Done!' shows Day 2 of Summer. Summer ends on the next registered year's start date; with no next year it lasts one year from the last year's start, then plain clock. Countdowns across DST count real elapsed time. The day-classifier helper isn't exported yet.
