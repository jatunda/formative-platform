# 15: The Alarm editor

**What to build:** A teacher can create, edit, turn on/off and delete Alarms on `/clock`, and pick the timer's sound. The rules for when Alarms ring and how they're saved already exist (09, 10); what's missing is any UI to change them, so today a teacher can't add an Alarm at all. Build it to the design reference rather than as another plain control.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: Alarms, sound engine; user stories 48–57). Vocabulary: **Alarm**, **Clock Alarm**, **Period Alarm**, **Block Day**, **Period Label** in `web/clock/CONTEXT.md`. Settings shapes: `web/clock/clock-settings.js`; saving: `web/clock/clock-storage.js`; ring rules: `ringsInWindow` in `web/clock/clock-model.js`.

Found missing by the code review of 06–14: ticket 10 said the editor "waits for the design reference", but no ticket owned it.

**Blocked by:** 03, 19 (the Alarm editor lives in the settings drawer)

**Status:** closed

- [x] Add, edit and delete Clock Alarms: time of day, once or every School Day, optional Bell Schedule selection
- [x] Add, edit and delete Period Alarms: anchor (minutes from start, minutes before end, halfway), Period selection showing Period Labels, Bell Schedule selection with the Block Days shortcut
- [x] Each Alarm has an on/off toggle and its own sound, with a preview
- [x] The timer's sound can be chosen (currently fixed at beep)
- [x] Changes save immediately and show up in "next rings" and the sound schedule
- [x] Page tests with fake storage cover add, edit, toggle, delete and the Block Days shortcut

## Comments

**2026-10-30: built on `school-clock-15`.**

- **Where it lives:** `web/clock/alarm-editor.js` builds the drawer's Alarms section (between Period Labels and Next rings today; after merging 21 the temporary Bottom bar section is gone); `web/clock/alarm-text.js` (pure, `@ts-check`) holds the list's summary line, the Bell Schedule choices and turning typed values into an Alarm; styles in a new `web/clock/alarm-editor.css` (tokens only, linked after `settings-drawer.css`, covered by the hosting test). `clock.js` makes the editor and hands it to `createSettingsDrawer` as `alarms`, so the drawer doesn't import it; `switchControl` and `soundChoice` are now exported from `settings-drawer.js`. Icon `trash` added (`check` came with 21).
- **Behaviour:** the list shows name, summary ("5 min before the end · Periods 1–7 · Block Days · Chime"), Edit and an on/off switch ("<name> on"). "+ Clock Alarm" / "+ Period Alarm" open a new form under the list; Edit opens it in place of the item; one form at a time. Save Alarm, Cancel, and Delete (when editing) are in the form; the switch and Delete apply at once. Delete shows "<name> deleted · Undo" for 6 s (`role=status`, 18's `.clock-toast` look, inside the drawer so it isn't inert; focus goes to Undo, then back into the drawer). The form isn't rebuilt by the ticks, so typing survives; Period Labels typed while it's open update its Period checklist.
- **Decisions made here:** a "once" Clock Alarm gets today's date if its time is still to come, else tomorrow's; turning one back on re-dates it the same way. Bell Schedules are offered once per name (the three Finals keys are one "Finals" box); every box ticked saves `null`. A new Alarm's sound is Chime. A blank name saves no label; the list shows "Clock Alarm" / "Period Alarm". Bad input (hour, minute, 1–240 minutes, no Period, no Bell Schedule) shows a message in the form and saves nothing. The Clock Alarm switch "Only on some Bell Schedules" has a hint ("Otherwise it rings on any day.") the mockup doesn't. The Period form also has Delete when editing (the mockup only shows the new-Period form).
- **Timer sound:** already chooseable in the Sound section since 19 (`Timer sound` + Preview); nothing new needed.
- **Tests:** `__tests__/unit/clock-page-alarms.test.js` (24 page tests with fake storage and sound player): add/edit/cancel/delete/undo, once vs every School Day, 12/24-hour, Bell Schedule switch and the Block Days / Every schedule shortcuts, Period anchors, Period Labels, on/off (saved, Next rings, sound schedule), Preview, validation, focus. The settings section-order test now includes Alarms; `clock-page.test.js` reads Next rings from `#clock-settings-today` (the Alarm list is also `li`s). Both new modules at 100% coverage.
- **Screenshots** (real page, `?at=2026-10-27T10:32`, drawer open, outside the repo) at 1440×900, 1280×720, 480×320 and 390×844 for the list, new Period Alarm, edit Clock Alarm and the Undo toast, next to the reference's `#settings`, `#alarm`, `#alarm-clock`: they match apart from the data (labels, schedule order follows the School Year file) and the hint above. 0 axe violations in every shot. After merging 21, re-shot at 1440×900 and in the light version at 1280×720: same result, 0 axe violations.
- **Not done / for later:** the Undo toast shares the bottom-centre spot with the sound prompt (as 18 noted for its error toast). The editor reads 12/24-hour when the form opens; switching it while a form is open applies next time it's opened.
