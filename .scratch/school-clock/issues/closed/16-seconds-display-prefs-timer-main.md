# 16: Seconds toggle, saved display preferences, and the running timer as the main Readout

**What to build:** Three behaviour changes from Eric's mockup choice (ticket 02's Comments), built ahead of the design reference because none of them depends on how the page looks:

- **Seconds toggle:** a setting (default on) for whether clock times and countdowns show seconds. The last minute of a countdown always shows seconds, and the timer always shows seconds.
- **Saved display preferences:** Day Strip on/off (default on), theme id, optional font and palette swaps, and light/dark/auto are saved per device. Applying them visually waits for the design reference: the Day Strip, the themes and the ring are later UI tickets blocked by 03.
- **The running timer is the main Readout:** while a timer is running or paused it takes the big Readout's place, and the previous main Readout moves to a smaller one. Cancelling or dismissing the timer puts the layout back exactly as it was.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: Seconds, Look, device storage; user stories 80b–80f). Vocabulary: **Readout** in `web/clock/CONTEXT.md`. This extends what 10 (settings, the shared formatter), 11 (Readout layout) and 13 (timer) built.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] The seconds setting is saved per device (default on). The shared time formatter applies it to clock times and countdowns everywhere on the page and in the mini player
- [x] A countdown under one minute always shows seconds; the timer always shows seconds; durations of a day or more ("2d 14h") are unchanged
- [x] Day Strip on/off, theme id, font swap, palette swap and light/dark/auto round-trip through storage under the versioned keys, with defaults on missing or corrupt data (default theme: the dark muted blue default from 02)
- [x] Plain controls for the seconds and Day Strip settings exist on the page, so the behaviour can be checked before the design reference lands
- [x] Starting a timer makes it the main Readout; the previous main Readout becomes a smaller one; cancel or dismiss restores the previous layout exactly, including after a reload mid-timer
- [x] The timer taking the main spot doesn't overwrite the tab's saved layout (per-tab and "last used" layouts still hold the teacher's own arrangement)
- [x] Tests: seconds on/off and the last-minute rule; preference round-trip and corrupt-data fallback; timer takes the main spot and restores it, across a reload
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-10-29: built on `school-clock-16`.**

- **Storage:** the new settings live in `school-clock-settings-v1`. Adding fields needs no version bump. They are `showSeconds` (default true), `dayStrip` (true), `theme` ('default'), `fontSwap` and `paletteSwap` (null), and `colorScheme` ('light' | 'dark' | 'auto', default **dark**). A bad value falls back to its own default. Until ticket 21 defines the theme set, any non-empty string is accepted as a theme, font or palette id.
- **Why dark by default:** a first visit gets 02's dark muted blue look whatever the device is set to. If Eric would rather have auto, it's a one-word change in `DEFAULT_SETTINGS`.
- **Seconds off:**
  - Countdowns show whole minutes, rounded down: "42 min left", "1h 05m", "14h 22m until school starts".
  - Any duration under a minute still shows seconds ("0:59").
  - "2d 14h" is unchanged.
  - Clock times (the time line, the clock Readout, the mini player, the simulated-time banner) drop their seconds.
- **The timer always shows seconds,** both in its panel and as a Readout.
- **The timer's big spot:**
  - It sits on top of the layout; it isn't part of the saved layout. While it shows, all the layout's Readouts become small ones after it. They can still be cycled and removed, and those changes are saved to the layout as usual.
  - The timer keeps the spot while it runs, while it's paused, and while it rings ("Time's up"), until it's dismissed or hits the 60 s cap.
  - A reload while it rings gives the spot back, because the ended timer is cleared (as in 13).
- **Controls:** plain "Show seconds" and "Day Strip" checkboxes are in the settings panel. The Day Strip, themes and colour scheme are saved but not drawn yet (tickets 20 and 21).
