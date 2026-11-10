# 24: Bells dismiss themselves after 5 seconds

**Priority:** high

**What to build:** By default a Bell's ring (the flash, the ring card and the sound) ends on its own 5 seconds after it starts. A new setting next to the Bells switch in the settings drawer, worded like "Ring Bells until you dismiss them" and off by default, brings back today's behaviour of ringing until Dismiss. This applies to Bells only. Clock Alarms, Period Alarms and the classroom timer still ring until dismissed. Dismissing early (button, Escape, mini player) still works the same way.

Built behaviour: closed tickets 09, 12, 18 (ring card, `overlays.js`), 19 (settings drawer, `settings-drawer.js`). Settings shape: `BellsSettings` in `clock-settings.js`.

**Blocked by:** none

**Status:** closed

- [x] `BellsSettings` gains the new option. Saved settings without it read as "auto-dismiss on" (the new default)
- [x] With auto-dismiss on, a Bell's ring stops (sound included) 5 s after it starts, on the main page and in the mini player
- [x] An Alarm or timer ring that is showing alongside or after a Bell is not cut short by the Bell's auto-dismiss
- [x] The setting sits under the Bells switch and is disabled or hidden while Bells are off
- [x] `web/clock/CONTEXT.md`'s **Bells** entry says they end on their own unless the teacher keeps them ringing
- [x] Tests (fake clock) cover: auto-dismiss at 5 s, the setting off (rings until Dismiss), Alarms unaffected, old saved settings
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-10: built on `worktree-agent-a4b1fc0101305d6ce`.**

- **Setting:** `BellsSettings.untilDismissed` (off by default; missing or not a boolean in an older save reads as off, so Bells stop on their own). The drawer's switch "Ring Bells until you dismiss them" sits right under Bells, with the hint "Otherwise each Bell stops on its own after 5 seconds. Alarms and the timer always ring until dismissed." It is disabled (dimmed, `cursor: not-allowed`) while Bells are off, and keeps its value.
- **Sound:** `sound.js` has `BELL_AUTO_DISMISS_SECONDS = 5`, and a `ScheduledRing` (and `play()`) takes an optional `seconds`: the ring is cut off exactly then on the audio clock, with a 50 ms fade so it doesn't click, even mid-voice. The voices now start and stop their oscillators through one `track` callback that applies the cut. The page asks for `seconds: 5` on Bell rings only (not with the setting on), so a throttled background tab still stops the sound on time.
- **Screen:** `clock.js` keeps a list of what's ringing (each with its own end) instead of one `ringingUntil`. The card and mini player show the newest; when a Bell stops on its own and an Alarm or the timer is still ringing, the card goes back to that one (the timer keeps the big spot at 0:00). A Bell's 5 s count from when it came due, like its sound; Alarms and the timer still get their minute from when the page saw them, as before. Dismiss (button, Escape, mini player) still stops everything at once.
- **Decided:** the drawer's Test ring follows the setting too (it rings "like a Bell"), so it stops after 5 s by default.
- **Tests:** sound player cut-off for every voice and for `play()`; page: Bell stops at 5 s on screen and in the mini player, its schedule carries `seconds: 5` while an Alarm's doesn't, dismissing early, an Alarm ringing alongside a Bell and a timer rung before it aren't cut short, the setting on rings up to 60 s, Test ring both ways; drawer switch placement, saving and disabling; old saved settings.
- **Screenshot** (drawer at 1280 × 900, Bells on and off; one-off, deleted): the switch reads clearly and dims when Bells are off.

