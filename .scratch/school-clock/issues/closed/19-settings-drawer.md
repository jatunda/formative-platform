# 19: The settings drawer

**What to build:** Every plain settings control on `/clock` moves into one drawer, built to the design reference:

- Division;
- Period Labels;
- Bells on/off;
- sound choices and volume, with a preview;
- 24-hour time and seconds.

Look settings (theme, font and palette swaps, the light/dark flip, and the bar's whole day / just this Segment setting) are **not** in this drawer: they live in their own Look sheet (21), per Eric's review in 03's Comments.

The timer and Bells stay one tap away on the main screen, and the projected view shows no settings. The Alarm editor (15) is added to this drawer by its own ticket.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: device storage, Look; user stories 22, 26–28, 56, 63, 67, 68, 79, 80a–80c). Design reference: `.scratch/school-clock/mockups/final/`. Vocabulary: `web/clock/CONTEXT.md`.

**Blocked by:** 16, 17

**Status:** closed

- [x] Every setting above is in the drawer, saves as before, and takes effect at once
- [x] The drawer matches the design reference at every checklist size, including the phone
- [x] Keyboard: it opens from a labelled button, focus moves into it and is kept inside while open, Escape closes it, and focus returns to the button
- [x] Every control has a visible label; the axe scan has no violations
- [x] The drawer is laid out so 15 (Alarms) can add its section without restructuring it
- [x] Page tests check that each setting changes what the page shows and what's saved
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

## Comments

**2026-10-30: built on `school-clock-19`.**

- **Where it lives:** `web/clock/settings-drawer.js` builds the drawer (once, so typing survives the ticks; `render()` brings its controls in step with the settings each tick, since the top bar's Bells button and the chip change them too). `web/clock/modal.js` is the generic modal part: scrim, the rest of `#clockApp` made `inert`, focus into the drawer on open (the Close button, or the checked Division radio from the chip), Tab / Shift+Tab wrap inside, Escape (captured, so Readouts edit mode doesn't also take it), Close or the scrim close it, and focus goes back to whatever opened it. 18 can reuse `createModal` for its dialogs. Styles are in a new `web/clock/settings-drawer.css` (linked from `index.html` after `clock.css`; tokens only, and the hosting test now checks it too).
- **Sections, in order** (`<section id="clock-settings-<key>" aria-labelledby>` with an uppercase `h3`): Division (segmented radios, arrow keys move), Time (Show seconds, 24-hour time: switches with hints; the 24-hour hint follows the setting), Sound (Bells switch, Volume slider with its %, Bell sound + Preview, Timer sound + Preview, Test ring, the keep-this-tab-open note), Period Labels (two-column grid, 9 fields incl. Super Seminar, "Add a label" placeholder), Next rings today (hidden when nothing is left today), About (mini player browser note, feedback link).
- **Differences from the mockup, on purpose:** the mockup's Sound section only has Timer sound; the page also keeps the Bell sound choice (an existing saved setting) and Test ring. "Next rings today" (from 09) has its own section, since the mockup had nowhere for it. Timer sound is new UI for the existing saved `timerSound`.
- **Not here:** the Day Strip checkbox is gone from Settings (it's the Look sheet's "Bottom bar", ticket 21). Until 21 merges there's no control for `dayStrip`; the saved value is untouched. The plain timer panel still uses `.clock-panel` (22).
- **Tests:** `clock-page-settings.test.js` covers opening/closing, focus, Tab wrapping, the sections, and each setting changing what the page shows and what's saved. A new `__tests__/helpers/clock-dom.js` finds controls by accessible name (`field('Show seconds')`, `toggle`, `setValue`); the older page tests now use it rather than label text.
- **Screenshots:** the real page via `?at=2026-10-27T10:32` with the drawer open at 1920×1080, 1440×900, 1280×720, 480×320 and 390×844 (top and scrolled to the bottom), plus light mode at 1280×720, next to the reference's `#settings`. They match apart from the extra controls above and the bar (20). 0 axe violations in every shot. Focus goes to Close on open and back to Settings on Escape; from the chip, arrow keys switch Division.

**Notes for ticket 15 (Alarms):**

- Add the section with `drawerSection('alarms', 'Alarms', [...])` (exported from `settings-drawer.js`) and put it in the `sections` array right after `labels` (there's a comment marking the place). Its id is `clock-settings-alarms`. Don't restructure the drawer.
- The design's form controls are already in `settings-drawer.css` as `.clock-switch` (+ `__track`, `__text`), `.clock-segmented` / `.clock-segment` (radios), `.clock-field` (+ `__label`, `__value`), `.clock-field-row`, `.clock-input`, `.clock-select`, `.clock-btn` (+ `--small`, `--icon`), `.clock-hint`, `.clock-note`. `switchControl()` and `soundChoice()` in `settings-drawer.js` build a named switch with a hint and a voice select with Preview; export them if the editor needs them. Still to add: the Alarm list items, the editor card on `--surface-2` with an accent border, checkboxes (`.check` in the mockup), and the Undo toast.
- `update()` saves and redraws; `render()` runs on every tick, so anything you mirror from settings goes there, but don't rebuild inputs a teacher may be typing in.
- Name every control so `field('<name>')` in the test helper finds it (`aria-labelledby` on the name, `aria-describedby` on the hint, as the switches do).
