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

**Status:** ready-for-agent

- [ ] Timer logic is a pure module: a running timer is stored as an end time; a paused timer is stored as its remaining time; remaining time is always computed from the current time
- [ ] Presets, custom entry (with sensible validation), pause, resume and cancel
- [ ] The last 3 distinct custom durations are kept as quick picks, most recent first
- [ ] A running or paused timer survives a reload (saved settings)
- [ ] The timer's end comes back from the "rings in a window" query and rings through the sound engine
- [ ] Tests with a fake clock and storage: start → reload → still counting; pause/resume arithmetic; quick-pick order; ring at end
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
