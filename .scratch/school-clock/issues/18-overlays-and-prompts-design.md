# 18: Overlays and prompts in the design reference's look

**What to build:** Everything that appears on top of the main screen, built to the design reference:

- the first-visit Division prompt;
- the "turn sound on" prompt, including the plain note that the tab must stay open;
- the ringing state: the flash (under 3 per second, steady highlight under reduced motion) and the dismiss card, with the ring's source named ("Period Alarm · 5 min before end");
- any confirmation or error toast the page shows.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: visual ringing, sound engine; user stories 21, 64–66, 69, 71). Design reference: `.scratch/school-clock/mockups/final/`. Vocabulary: `web/clock/CONTEXT.md`.

**Blocked by:** 17

**Status:** ready-for-agent

- [ ] Each overlay matches the design reference at every checklist size
- [ ] The Division prompt and the dismiss card take keyboard focus when shown and return it afterwards; Escape dismisses a ring
- [ ] A ring is announced to screen readers once (live region), without the ticking Readouts being read out
- [ ] The flash obeys the 3-per-second limit and the reduced-motion variant; colour is never the only signal
- [ ] Playwright screenshots of each overlay (reached via `?at=`) are compared against the design reference; the axe scan has no violations
- [ ] Page tests check the behaviour (focus, dismiss, announce), not styling
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
