# 34: Setting: show when the current Period ends, in the schedule

**Priority:** medium

**What to build:** A new setting, off by default, named something like "Show when this Period ends". When it's on, the current block in the Day Bar (the schedule along the bottom) shows its end time next to the start time it already shows. For example "10:25" becomes "10:25–11:15", following the 24-hour setting. The other blocks keep their start time only. This applies to Periods, and to Breaks and Assemblies when the block is wide enough. If the current block is too narrow for both times, it falls back to the start time alone. The agenda list view (`clock-agenda`), where it shows, gets the same treatment for its current row. The block's screen-reader text already says "10:25 to 11:15", so it doesn't change.

This is Eric's request: "shows the end time of each period as we are in it", placed "in the schedule, near where each period shows the start time", for "whatever can fit it (probably periods only)". Reading "as we are in it" to mean only the current block is an interpretation; record it in the comments.

The "just this Segment" bar setting already shows the end under the bar's right end, so the new setting changes nothing there. The mini player is unchanged: its foot already says "ends 11:15 AM".

Files: `day-bar.js` (`BarBlock`, pure), `day-bar-view.js`, `clock-settings.js`, `settings-drawer.js`, `clock.css`. Built behaviour: closed tickets 20 (Day Strip), 19 (settings drawer), 10 (saved settings).

**Blocked by:** none

**Status:** closed

- [x] New setting, off by default; old saved settings load with it off
- [x] When it's on, the current block shows "start–end" in the bar, and in the agenda when that shows
- [x] Too narrow for both times: the current block shows only its start, with no overflow or overlap with neighbouring times
- [x] Follows the 24-hour setting; Off-Hours and the "just this Segment" bar are unchanged
- [x] Tests (pure `day-bar.js` and the view) cover on, off, too narrow, and old settings; `check:clock` screenshots at the default sizes look right
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-10: built.** I read "shows the end time of each period as we are in it" as **the current block only**: the Segment you're in shows "10:30–11:15", and every other block keeps just its start. Showing every block's end would crowd the bar and repeat times (one block's end sits beside the next one's start).

- The setting is `showPeriodEnd` (off by default; a save without it, or with a non-boolean value, loads with it off). It's the switch "Show when this Period ends", the last one in the Settings drawer's Time section, under 24-hour time. Its hint: "In the bar along the bottom, the block you're in shows its end time too, where there's room."
- `day-bar.js`: each `BarBlock` has `showEnd`, true only for the current Segment on whole day when the setting is on. So it's never on just this Segment (its end already shows under the bar), in Off-Hours (nothing is current), or on a Passing Period's gap (it has no time of its own) or the block up next after it.
- `day-bar-view.js`: the end is its own `.clock-bar__until` span ("–11:15") inside the start time. `clock.css` hides it with a container query when the block is under 6.2em wide (at the block's font size). "10:30–11:15" is about 4.5em, so the extra keeps it clear of the next block's start. jsdom can't run container queries, so the tests check the end is a separate part; the fallback itself was checked in `check:clock`. In the default screenshots, Periods, Lunch and Chapel show both times; Nutrition (15 minutes) falls back to its start alone.
- The agenda's current row shows "10:30–11:15 AM", saying AM or PM once when both times share it ("11:20 AM–12:05 PM" across noon; "14:25–15:10" in 24-hour time). Its time column is now a minimum width, so that one row runs wider.
- The screen-reader text is unchanged.
- `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass. `check:clock` with `{"showPeriodEnd":true}` passes for period, break, assembly, passing and before, at every default size.
