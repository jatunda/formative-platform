# 15: The Alarm editor

**What to build:** A teacher can create, edit, turn on/off and delete Alarms on `/clock`, and pick the timer's sound. The rules for when Alarms ring and how they're saved already exist (09, 10); what's missing is any UI to change them, so today a teacher can't add an Alarm at all. Build it to the design reference rather than as another plain control.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: Alarms, sound engine; user stories 48–57). Vocabulary: **Alarm**, **Clock Alarm**, **Period Alarm**, **Block Day**, **Period Label** in `web/clock/CONTEXT.md`. Settings shapes: `web/clock/clock-settings.js`; saving: `web/clock/clock-storage.js`; ring rules: `ringsInWindow` in `web/clock/clock-model.js`.

Found missing by the code review of 06–14: ticket 10 said the editor "waits for the design reference", but no ticket owned it.

**Blocked by:** 03

**Status:** open

- [ ] Add, edit and delete Clock Alarms: time of day, once or every School Day, optional Bell Schedule selection
- [ ] Add, edit and delete Period Alarms: anchor (minutes from start, minutes before end, halfway), Period selection showing Period Labels, Bell Schedule selection with the Block Days shortcut
- [ ] Each Alarm has an on/off toggle and its own sound, with a preview
- [ ] The timer's sound can be chosen (currently fixed at beep)
- [ ] Changes save immediately and show up in "next rings" and the sound schedule
- [ ] Page tests with fake storage cover add, edit, toggle, delete and the Block Days shortcut

## Comments
