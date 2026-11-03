# 13: The classroom timer

**What to build:** On the plain `/clock` page a teacher can:

- start a countdown timer from the 1, 2, 5 or 10 minute presets, or type a custom duration;
- pause, resume and cancel it;
- see it ring through the sound engine when it ends, until dismissed or for 60 seconds at most.

**Kept across reloads:**
- a running timer, so a reload doesn't lose it;
- the last 3 custom durations, shown as quick picks.

Spec: `.scratch/school-clock/spec.md` (user stories 42–47, 64). Vocabulary: `web/clock/CONTEXT.md`.

**Blocked by:** 12

**Status:** closed

- [x] Timer logic is a pure module: a running timer is stored as an end time; a paused timer is stored as its remaining time; remaining time is always computed from the current time
- [x] Presets, custom entry (with sensible validation), pause, resume and cancel
- [x] The last 3 distinct custom durations are kept as quick picks, most recent first
- [x] A running or paused timer survives a reload (saved settings)
- [x] The timer's end comes back from the "rings in a window" query and rings through the sound engine
- [x] Tests with a fake clock and storage: start → reload → still counting; pause/resume arithmetic; quick-pick order; ring at end
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

- Typed input: minutes ('7', '1.5'), m:ss, h:mm:ss; 1 s to 24 h. Starting replaces a running timer. A timer that ended while closed is cleared without ringing. Presets aren't added to quick picks. In simulated time the timer is memory-only and never touches the saved real timer.
