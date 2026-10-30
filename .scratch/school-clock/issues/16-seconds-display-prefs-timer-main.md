# 16: Seconds toggle, saved display preferences, and the running timer as the main Readout

**What to build:** Three behaviour changes from Eric's mockup choice (ticket 02's Comments), built ahead of the design reference because none of them depends on how the page looks:

- **Seconds toggle:** a setting (default on) for whether clock times and countdowns show seconds. The last minute of a countdown always shows seconds, and the timer always shows seconds.
- **Saved display preferences:** Day Strip on/off (default on), theme id, optional font and palette swaps, and light/dark/auto are saved per device. Applying them visually waits for the design reference: the Day Strip, the themes and the ring are later UI tickets blocked by 03.
- **The running timer is the main Readout:** while a timer is running or paused it takes the big Readout's place, and the previous main Readout moves to a smaller one. Cancelling or dismissing the timer puts the layout back exactly as it was.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: Seconds, Look, device storage; user stories 80b–80f). Vocabulary: **Readout** in `web/clock/CONTEXT.md`. This extends what 10 (settings, the shared formatter), 11 (Readout layout) and 13 (timer) built.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The seconds setting is saved per device (default on). The shared time formatter applies it to clock times and countdowns everywhere on the page and in the mini player
- [ ] A countdown under one minute always shows seconds; the timer always shows seconds; durations of a day or more ("2d 14h") are unchanged
- [ ] Day Strip on/off, theme id, font swap, palette swap and light/dark/auto round-trip through storage under the versioned keys, with defaults on missing or corrupt data (default theme: the dark muted blue default from 02)
- [ ] Plain controls for the seconds and Day Strip settings exist on the page, so the behaviour can be checked before the design reference lands
- [ ] Starting a timer makes it the main Readout; the previous main Readout becomes a smaller one; cancel or dismiss restores the previous layout exactly, including after a reload mid-timer
- [ ] The timer taking the main spot doesn't overwrite the tab's saved layout (per-tab and "last used" layouts still hold the teacher's own arrangement)
- [ ] Tests: seconds on/off and the last-minute rule; preference round-trip and corrupt-data fallback; timer takes the main spot and restores it, across a reload
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
