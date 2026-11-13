# 01: Delete Day asks with an in-app confirm dialog

**What to build:** Deleting a day on Lesson Planning or Full Schedule asks for confirmation in a dialog drawn by the page itself, not the browser's `confirm()`, which browsers can silently block (the button then looks dead). The dialog is a shared module so the other pages can adopt it (08).

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] A shared confirm dialog: message, Cancel and Confirm buttons; resolves with the choice to the caller
- [x] Esc cancels, Enter confirms; focus moves into the dialog on open and back to the triggering button on close
- [x] Delete Day on both Lesson Planning and Full Schedule uses it; Cancel changes nothing, Confirm deletes the day and shifts later days back as today
- [x] The browser's `confirm()` is no longer called by Delete Day
- [x] Works and is easy to tap on a portrait phone
