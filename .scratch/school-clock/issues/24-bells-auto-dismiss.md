# 24: Bells dismiss themselves after 5 seconds

**Priority:** high

**What to build:** By default a Bell's ring (the flash, the ring card and the sound) ends on its own 5 seconds after it starts. A new setting next to the Bells switch in the settings drawer, worded like "Ring Bells until you dismiss them" and off by default, brings back today's behaviour of ringing until Dismiss. This applies to Bells only. Clock Alarms, Period Alarms and the classroom timer still ring until dismissed. Dismissing early (button, Escape, mini player) still works the same way.

Built behaviour: closed tickets 09, 12, 18 (ring card, `overlays.js`), 19 (settings drawer, `settings-drawer.js`). Settings shape: `BellsSettings` in `clock-settings.js`.

**Blocked by:** none

**Status:** open

- [ ] `BellsSettings` gains the new option. Saved settings without it read as "auto-dismiss on" (the new default)
- [ ] With auto-dismiss on, a Bell's ring stops (sound included) 5 s after it starts, on the main page and in the mini player
- [ ] An Alarm or timer ring that is showing alongside or after a Bell is not cut short by the Bell's auto-dismiss
- [ ] The setting sits under the Bells switch and is disabled or hidden while Bells are off
- [ ] `web/clock/CONTEXT.md`'s **Bells** entry says they end on their own unless the teacher keeps them ringing
- [ ] Tests (fake clock) cover: auto-dismiss at 5 s, the setting off (rings until Dismiss), Alarms unaffected, old saved settings
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
