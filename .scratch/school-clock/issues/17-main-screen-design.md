# 17: The main screen in the design reference's look

**What to build:** `/clock` stops being a plain page. The main screen is built to the design reference from 03 in the default theme, across every state at every checklist size:

- A's layout: one big Readout and smaller Readouts arranged as the design specifies, with adding, removing and cycling them;
- the Day Label, the current Segment with its Period Label, up next during a Passing Period, and the Division;
- the Off-Hours, day-off, Experience Week, Summer and unknown-date displays;
- the main-screen controls (timer, Bells, fullscreen, settings entry point) and the feedback link placement;
- the "Simulated time" banner;
- the extra plain time line at the top, which duplicates a current-time Readout, is removed.

Overlays and prompts are ticket 18; the drawer is 19.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: Look, Readout modes; user stories 4–18, 29–41, 72–75, 79, 80). Design reference: `.scratch/school-clock/mockups/final/` and its design notes. Vocabulary: `web/clock/CONTEXT.md`. Deferred from 11's Comments: big-Readout styling and the duplicate time line.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] The default theme's tokens, type scale and spacing scale from the design notes are the page's styling source, set up so 21's themes can swap them
- [ ] Every state (in a Period, Passing Period, Break, Assembly, before school, after school, day off, Experience Week, Summer, unknown date, simulated time) matches the design reference at every checklist size
- [ ] Adding, removing and cycling Readouts works with mouse, touch and keyboard, with touch targets of at least 44 × 44 px; removing a Readout follows 03's design
- [ ] The big Readout uses tabular digits and meets the checklist's size rule at 1920 × 1080
- [ ] The duplicate plain time line is gone
- [ ] Playwright screenshots of every state, reached via `?at=`, are compared against the design reference; differences are fixed or explained under Comments
- [ ] The axe scan has no violations
- [ ] The existing page tests are updated to the new markup and still check behaviour, not styling
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
