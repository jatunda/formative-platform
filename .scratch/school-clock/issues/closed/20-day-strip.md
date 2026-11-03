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

**Status:** closed

- [x] The strip shows the day's Segments for the teacher's Division, with the current Segment and the current moment marked
- [x] Breaks and Assemblies are distinguishable without colour
- [x] Off-Hours shows the Next School Day with its date; hidden in Summer and Experience Week
- [x] Whole day / just this Segment switch cleanly in place, with no separate hairline bar left anywhere
- [x] It matches the design reference at every checklist size (an agenda list on the phone)
- [x] It has an accessible text equivalent (e.g. a list of Segments and times) that isn't re-announced every tick
- [x] Tests: which Segments show on a School Day, during Off-Hours and on a day off; hidden in Summer and Experience Week; follows the setting
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-10-30: built on `school-clock-20`.**

- **Model (Seam 1):** `web/clock/day-bar.js` (pure, `@ts-check`): `describeBar(now, moment, schoolYears, { division, dayStrip, periodLabels })` gives the bar to draw, or null when it's hidden (Summer, Experience Week, an unknown date). Blocks carry name, short name ("P3", "Nutr.", never "Nut"), Period Label (Periods only), kind, start/end, state (past / now / next / later) and position in percent; plus the fill (`done`), the Now marker (`nowAt`) and the end time. During a Passing Period a `passing` gap block is added and the next block is `next`. Before school it's today's Segments ("Today · All Day"); after school and on days off the Next School Day's, with its date. Off-Hours are whole day on either setting (the reference's choice). It reads the day's Segments through a new `segmentsOn(day, schoolYears, division)` export in `clock-model.js`.
- **View:** `web/clock/day-bar-view.js` draws it into `.clock-bar-slot`: a `section` labelled "Today's Segments", "Segments on Wed, Oct 28", or the Segment's name ("Period 3 · AP CSA") on just this Segment; each block's hidden text ("Period 3 · AP CSA, 10:30 AM to 11:15 AM, now" / ", up next"); the current block's fill is a `progressbar` ("Period 3 progress"). It rebuilds only when what's listed changes and otherwise moves the fill and the marker, so focus and the screen reader's place survive the ticks; nothing is a live region. The agenda list (phone) is built alongside and shown by CSS at the narrow breakpoint, with Now / Up next pills and "· Break" / "· Assembly" in words; the current row is scrolled into view.
- **Setting:** the saved `dayStrip` key is kept (true = whole day, the default; false = just this Segment), so 16's saved settings carry over and 21 can bind its Look sheet control to it. For now a plain "Bottom bar" fieldset with Whole day / Just this Segment radios sits in the Settings panel (replacing the "Day Strip" checkbox, whose old test moved into `clock-page-bar.test.js`).
- **Hidden** also before a Division is chosen and while the timer has the big spot (running, paused or ringing), as the reference says; on short screens (480×320) by the existing `.clock-bar-slot` rule.
- **CSS:** a new "the bar" section in `clock.css` (tokens only) ported from the reference, plus the phone agenda rules in the narrow breakpoint (they key off `:has(.clock-bar--day:not([hidden]))`, so `clock.js` needed no screen class).
- **One choice the reference made implicitly:** the times under the track drop AM/PM ("10:10", as the reference shows), because "10:10 AM" and "10:30 AM" collide under the Nutrition sliver; the hidden text and the agenda keep the full time.
- **Tests:** `clock-day-bar.test.js` (Seam 1: School Day, Passing Period, Division, both settings, before / after school, weekend, hidden in Experience Week, Summer with and without a next year, unknown date) and `clock-page-bar.test.js` (Seam 2: hidden text, kinds, progress without re-announcing, agenda, the setting saved and switched in place, Off-Hours labels, hidden states). A `clock-page.test.js` helper that read every `li` on the page now reads only the Settings panel's.
- **Screenshots:** in a Period, Passing Period, before / after school, a weekend and Experience Week, on both settings, at 1920×1080, 1440×900, 1280×720, 480×320 and 390×844 via `?at=`, next to the reference (kept outside the repo): the bar matches, 0 axe violations. Checked in the dark default only; 21's themes restyle it through the tokens. The plain "Turn sound on" prompt (18) sits over the bar's middle, as the reference places overlays.
