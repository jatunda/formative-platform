# 22: Timer UI — the ring and the timer picker

**What to build:** The classroom timer gets its designed look, built to the design reference:

- while it runs or is paused, the timer is the big Readout (16's behaviour), with C's progress ring around it;
- the timer picker offers the 1/2/5/10 presets, a custom time, and the last 3 custom times as quick picks;
- pause, resume and cancel are shown on the big Readout.

The ring appears only around the timer, and it follows reduced motion.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: Look; user stories 42–47, 80f). Design reference: `.scratch/school-clock/mockups/final/`. Mockup origin: direction C in `.scratch/school-clock/mockups/c/`.

**Blocked by:** 16, 17

**Status:** ready-for-agent

- [ ] The picker and the running/paused timer match the design reference at every checklist size
- [ ] The ring shows the share of time left, updates smoothly, and is a steady (non-animated) ring under reduced motion
- [ ] The picker opens from the main screen in one tap; presets start at once; custom entry validates; quick picks are most recent first
- [ ] Keyboard: everything works with Tab, Enter and Escape; the timer's time left has an accessible name that isn't re-announced every second
- [ ] The axe scan has no violations
- [ ] Page tests check the behaviour (starting from a preset, a custom time, pause, resume, cancel, the ring's progress value), not styling
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
