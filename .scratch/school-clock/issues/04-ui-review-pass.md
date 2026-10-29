# 04: UI/UX review pass on the built clock

**What to do:** Once the clock is built, review the real page (not the mockups) against the design reference and the self-review checklist, and fix what falls short. Interactive behaviour is what mockups couldn't show, so it gets the most attention: tapping Readouts, opening the drawer, a ring arriving, the sound prompt, the mini player, keyboard-only use.

Spec: `.scratch/school-clock/spec.md`. Design reference: `.scratch/school-clock/mockups/final/`.

**Blocked by:** 03, 06–14, and the UI tickets that apply the design reference (to be written once 03 is signed off)

**Status:** open

- [ ] Run the real page locally and drive it with Playwright at every checklist size, with the clock spoofed through the page's `?at=` / `&speed=` parameters (ticket 06) to land on each state (in a Period, Passing Period, Break, Assembly, before and after school, a day off, Experience Week, Summer, ringing)
- [ ] Compare each screenshot to the design reference; fix visual drift
- [ ] Passes the full self-review checklist in `01-design-mockups.md`, including an automated accessibility scan with no violations
- [ ] Keyboard-only: every action (cycle a Readout, add a Readout, open settings, start the timer, dismiss a ring, toggle Bells) works with Tab/Enter/Space/Escape, and focus is never lost
- [ ] Screen reader: the Segment and Readout have sensible accessible names, and a ring is announced without the per-second ticking being read out
- [ ] Motion: the flash obeys the 3-per-second limit, and the reduced-motion variant works
- [ ] Notes on what was found and fixed, recorded under Comments
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
