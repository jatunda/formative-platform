# 06: Tracer bullet — a plain `/clock` page that knows the current Segment

**What to build:** Visiting `mrhsieh.app/clock` (and the local emulator equivalent) shows a deliberately unstyled page that ticks every second and, on an ordinary weekday, shows the Day Label, the current Segment, time left in it, and "up next" during a Passing Period, or that it's before/after school. This is the first thin path through every layer:

- the School Year data structure, populated only with the All Day Bell Schedule and the Weekday Defaults;
- the first part of the clock model's "describe a moment" query: in a Segment, a Passing Period with up next, or before/after school on a School Day;
- the hosting rewrite;
- a thin page controller with time passed in.

The page is plain on purpose. The design reference (03) restyles it later, so don't spend effort on visuals.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: new context and folder, hosting, static data, clock model, ticking; user stories 1, 2, 4, 5, 14, 15, 18). ADR: `docs/adr/0014-school-clock-data-is-static.md`. Vocabulary: `web/clock/CONTEXT.md`.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] The School Year data shape can express Bell Schedules with Segments (name, kind: Period / Break / Assembly, wall-clock start and end), with room for per-Division Segment lists and Calendar Exceptions. Only All Day and the Weekday Defaults are filled in here, and the shape is documented with JSDoc types
- [x] A registry of School Years exists, so later years are added without changing clock logic
- [x] The clock model (a pure module with `// @ts-check`) answers, for a given time: Day Label, current Segment with start and end, time left, time elapsed, Passing Period with up next (no zero-length Passing Period where two Segments touch), and before school / after school on a School Day
- [x] All values are computed from the current time on each tick, never by adding up ticks
- [x] `/clock` is served by a hosting rewrite placed above the catch-all, with no database or Cloud Function involved
- [x] The page controller takes time as a parameter. A jsdom test drives it with a fake clock and checks the text for an in-Period time, a Passing Period time, and an after-school time
- [x] **Simulated time:** the page accepts `?at=<local date-time>` (e.g. `?at=2027-01-20T09:50`), which starts its clock at that moment and ticks forward from there, and an optional `&speed=<n>` (e.g. `60` = one real second is one minute). It's built as the page's clock source, so every later ticket gets it for free. An invalid value is ignored. While simulated, a visible "Simulated time" banner shows the spoofed time
- [x] A test covers `?at=` and `&speed=` (the page shows the spoofed moment and advances at the given rate), plus an invalid value falling back to real time
- [x] Model unit tests cover each state above, including Period 2 → Nutrition (no Passing Period) and Nutrition → Period 3 (a 5-minute Passing Period showing up next)
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

Deferred / caveats at close: All Day times are placeholders from the ticket-01 mockups pending the district PDF (ticket 07 must verify); School Year range 2026-08-17..2027-05-28 is a guess; Division defaults to HS; `&speed=` only applies with a valid `?at=`.
