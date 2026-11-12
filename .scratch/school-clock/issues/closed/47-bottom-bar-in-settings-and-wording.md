# 47: Bottom bar choice moves to Settings → Time; Settings wording

**Priority:** medium

**What to build:** Two changes to the Settings drawer.

1. **Move the Bottom bar choice.** The Whole day / Just this Segment choice leaves the Look sheet and goes in Settings, in the **Time** section. It is the same saved setting, so older saves load unchanged. Tapping the bar in Readouts edit mode (ticket 42) still switches it, and Settings shows the new value. Look keeps only how the clock looks: theme, font, colours.
2. **Wording.**
   - **Show seconds** and **24-hour time**: no explanation under them. The names say enough.
   - **"Show when this Segment ends"** is renamed **"Show period end time"**, with no caption. The saved key and what it does are unchanged (it still shows during any Segment).
   - **Ring Bells until you dismiss them**: the caption becomes exactly "By default, bells stop after 5 seconds. Alarms and timers always ring until dismissed."
   - **Bell when an Assembly ends**: "Never when one starts." becomes "Bells never ring at the start of an assembly." The rest of the caption (which Assemblies) stays.

Update anything that names the moved setting's place (code comments, the School Clock `CONTEXT.md`, test names), and any wording tests.

Eric's words: "choosing which schedule version setting should not be in look, it should be with the other settings. Put it under the TIME section" (he confirmed this means the Bottom bar choice); "remove the explanation text for Show Seconds and 24-hour time"; "change 'Show when this segement ends' setting to be called 'Show period end time', and remove the caption"; and the two captions above, word for word.

Built behaviour: closed tickets 21 (Look sheet), 34 and 40 (the period end setting), 36 (the Ring Bells caption), 42 (tap the bar), and the code review's rename of that setting to "Segment" (merged with 36–44).

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] The Bottom bar choice is in Settings → Time and no longer in Look; it saves the same setting; edit-mode tapping and Settings stay in step
- [x] Show seconds and 24-hour time have no explanation
- [x] "Show period end time" with no caption; older saves keep their choice
- [x] The Ring Bells and Assembly captions read exactly as above
- [x] Settings still reads well for screen readers (the moved choice is a labelled radio group)
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-11: built.** The Bottom bar choice is the last thing in Settings → Time: a fieldset with the legend "Bottom bar" round a radio group of the same name (Whole day / Just this Segment, from `BAR_SETTING_NAMES`). It saves the same `dayStrip` key, so older saves load unchanged, and the drawer's render keeps it in step with a tap on the bar in edit mode. The Look sheet now holds only theme (with its flip), font and colours.

- `segmented()` moved from `alarm-editor.js` to `controls.js` so the drawer and the Alarm editor share it.
- `switchControl()` with an empty hint now has no hint and no `aria-describedby`. Show seconds, 24-hour time and Show period end time use that. The old 24-hour hint ("Clock times show as 1:05.") is gone with it.
- "Show period end time" keeps the `showPeriodEnd` key. Comments that named it the old way are renamed.
- The Ring Bells and Assembly captions read word for word as above.
