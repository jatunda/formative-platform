# 22: Timer UI — the ring and the timer picker

**What to build:** The classroom timer gets its designed look, built to the design reference:

- while it runs or is paused, the timer is the big Readout (16's behaviour), with C's progress ring around it;
- the timer picker offers the 1/2/5/10 presets, a custom time, and the last 3 custom times as quick picks;
- pause, resume and cancel are shown on the big Readout.

The ring appears only around the timer, and it follows reduced motion.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: Look; user stories 42–47, 80f). Design reference: `.scratch/school-clock/mockups/final/`. Mockup origin: direction C in `.scratch/school-clock/mockups/c/`.

**Blocked by:** 16, 17

**Status:** closed

- [x] The picker and the running/paused timer match the design reference at every checklist size
- [x] The ring shows the share of time left, updates smoothly, and is a steady (non-animated) ring under reduced motion
- [x] The picker opens from the main screen in one tap; presets start at once; custom entry validates; quick picks are most recent first
- [x] Keyboard: everything works with Tab, Enter and Escape; the timer's time left has an accessible name that isn't re-announced every second
- [x] The axe scan has no violations
- [x] Page tests check the behaviour (starting from a preset, a custom time, pause, resume, cancel, the ring's progress value), not styling
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-10-30: built on `school-clock-22`.**

- **Length saved:** a new setting, `timerTotalMs`, holds the length the timer was started with (null with no timer). It's kept through pause and resume, saved like the other timer fields, and dropped on load when there's no timer. A timer saved before this (no length) shows a full ring and no "of 5:00" until it ends.
- **Pure parts (`timer.js`, `@ts-check`):** `timerProgress(timer, now)` gives the share of time left (0–1, exact, not rounded to the second). **23 (mini player) can use it for the timer's own bar.** `timerRingView()` gives everything the ring shows: the time left, the length, the progress and the digits' accessible name. `parseMinutesSeconds()` reads the picker's custom row. With the seconds empty, the minutes field still takes anything 13 accepted ("7", "1.5", "7:30").
- **Ring card (18's leftover):** the timer's `Ring` now carries `totalMs`, and `ring-words.js` gives the detail line "5:00 timer". The ring shows 0:00 of that length, empty, with no buttons, until the ring is dismissed.
- **Ring (`timer-ring.js`, `timer.css`):** it's built once and handed to `readouts-view.js` as the big spot's face, so focus on Pause / Resume / Cancel survives the ticks.
  - The ring takes the top bar's row on wide screens and stays in the stage on short screens and phones.
  - While it shows, the heading is visually hidden and the line under the Readouts is hidden. The first small Readout's caption names the Segment ("left in Period 3 · AP CSA").
  - The arc eases with `--ring-tick` and doesn't under reduced motion; a hosting test checks both rules. An empty arc is hidden, so no round-cap dot is left at 12.
  - Paused: the arc goes `--line`, the track goes dashed, and the title shows a pause icon and "Paused".
  - The digits are `role="timer"`, `aria-live="off"`, named "Timer, 4:12 left of 5:00" ("Timer, paused, …", "Timer, time's up, 0:00 left of 5:00").
- **Picker (`timer-picker.js`):** "Start a timer" is a modal dialog built on 19's `modal.js`. The Timer control opens it (`aria-haspopup`, `aria-expanded`), with focus on "1 min". Escape, Close or the scrim closes it and hands focus back to the Timer control. Tab wraps.
  - Presets and Recent pills ("3:00", most recent first, hidden when there are none) start at once and close the picker. Focus then goes to the ring's Pause button.
  - A bad custom time shows its error under the row (polite live region) and marks the field with `aria-invalid`.
  - After Pause, focus goes to Resume; after Resume, to Pause; after Cancel, to the Timer control.
- **Gone:** the plain timer panel. `timer-panel.js` became `timer-picker.js`. `panelToggle` / `showPanel` and the `.clock-panel` and `.clock-readout--timer` CSS are removed, since nothing else used them after 19. `timer.css` is linked from `index.html` after `settings-drawer.css`. The mini player window doesn't load it (it has no ring).
- **Tests:** `clock-page-timer.test.js` is rewritten for the picker and ring: one-tap open, focus, Escape/Close, Tab wrap, presets, custom entry and its errors, quick picks, pause, resume, cancel, the ring's progress value through pause, resume and reload, ringing at 0:00, and simulated time. The display tests read the timer by its accessible name. There are pure tests for progress, the ring view, the custom row, storage and ring words.
- **Screenshots:** timer, paused, with Readouts, ringing and the picker, at 1920×1080, 1440×900, 1280×720, 480×320 and 390×844 via `?at=…&speed=`, next to the reference (outside the repo). They match. **0 axe violations in every shot.** The arc's `transition-duration` is 1s normally and 0s under reduced motion at every size. "4:12" digits are 369px font-size at 1920×1080, with glyphs about 24% of the height (the simulated-time banner takes a little).
- **Left as is:**
  - At 480×320 the picker scrolls inside itself, as the reference does.
  - The "Sound is off" prompt (18) sits bottom centre and can cover the bottom of the ring until sound is turned on, as transient overlays do by design.
  - The page is 1px taller than the viewport at 1920×1080. That was already so before this ticket.


**After merging 15, 18–21:**

- Tests that took the first `[role="dialog"]` to be the Settings drawer (the drawer, Look and Alarm tests) now name the drawer, because the picker comes before it on the page. The Look test "closes the plain timer panel" is gone along with the panel.
- `.clock-btn--accent` now comes from `alarm-editor.css`, and `timer.css` no longer repeats it.
- With the Look sheet open the ring is at most 60% of the stage's width, so it shrinks beside the sheet. Re-checked: 0 axe violations with the timer and the Look sheet both open.
