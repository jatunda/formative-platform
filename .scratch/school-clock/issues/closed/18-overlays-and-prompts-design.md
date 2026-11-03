# 18: Overlays and prompts in the design reference's look

**What to build:** Everything that appears on top of the main screen, built to the design reference:

- the first-visit Division prompt;
- the "turn sound on" prompt, including the plain note that the tab must stay open;
- the ringing state: the flash (under 3 per second, steady highlight under reduced motion) and the dismiss card, with the ring's source named ("Period Alarm · 5 min before end");
- any confirmation or error toast the page shows.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: visual ringing, sound engine; user stories 21, 64–66, 69, 71). Design reference: `.scratch/school-clock/mockups/final/`. Vocabulary: `web/clock/CONTEXT.md`.

**Blocked by:** 17

**Status:** closed

- [x] Each overlay matches the design reference at every checklist size
- [x] The Division prompt and the dismiss card take keyboard focus when shown and return it afterwards; Escape dismisses a ring
- [x] A ring is announced to screen readers once (live region), without the ticking Readouts being read out
- [x] The flash obeys the 3-per-second limit and the reduced-motion variant; colour is never the only signal
- [x] Playwright screenshots of each overlay (reached via `?at=`) are compared against the design reference; the axe scan has no violations
- [x] Page tests check the behaviour (focus, dismiss, announce), not styling
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-10-30: built on `school-clock-18`.**

- **Where it lives:** `web/clock/overlays.js` builds the four overlays (Division prompt, sound prompt, ring flash + ring card + live region, error toast) and owns their focus; `web/clock/ring-words.js` (pure, `@ts-check`) turns a ring into the card's kind / title / detail and the announcement. `clock.js` only decides when each shows. The CSS is a new "overlays" section at the end of `clock.css` with its own breakpoints (buttons are `clock-overlay-btn`, so they can't clash with 19's or 22's buttons). Icons `sound`, `soundOff`, `warn` were added to `icons.js`.
- **Ring card words:** "RINGING · PERIOD ALARM / Wrap-up time / 5 min before the end of Period 3". An unnamed Period Alarm is titled by its Period ("halfway through Period 3", "minute 10 of Period 3"); a Clock Alarm by its label, else its time ("11:00 AM · every School Day" / "once"); a Bell by the Segment it starts ("Nutrition starts", detail "Period 2 ends") or ends ("Period 3 ends"); the timer is "Time is up" (no "5:00 timer" detail: the ring doesn't know the duration; 22 can add it); Test ring is "Test ring". The mini player still gets a one-line string ("Ringing: Period Alarm · Wrap-up time") for 23 to restyle. "Next rings today" still uses the old one-line `ringSourceText`.
- **Behaviour:** the card is an `alertdialog` (named by the title, described by the detail) that moves focus to Dismiss and, when it goes (Dismiss, Escape anywhere on the page, or on its own), hands focus back to where it was, unless the teacher has moved focus elsewhere meanwhile. A separate `aria-live="assertive"` region says "Ringing · Period Alarm: Wrap-up time, 5 min before the end of Period 3" once per ring and is cleared after; no live region contains a Readout. The flash is now its own `aria-hidden` `.clock-ring-flash` layer (14px inset frame + wash, 6px on compact screens), animated `var(--flash-period)` (1 s) with `steps(1)` under `.clock-ringing--flash`, steady under `.clock-ringing--steady` or `prefers-reduced-motion`; the mount classes are unchanged. Escape dismisses a ring before it leaves Readouts edit mode.
- **First visit:** a `dialog` (`aria-modal`) over the near-solid scrim, "Which Division are you with?", two large choices and the feedback link. It focuses Middle School when shown; `main` is `inert` while it's up, and after a choice focus goes back where it was (nowhere, on a real first visit). The big "MS"/"HS" is CSS `content: attr(data-short) / ""`, so each choice is named just "Middle School" / "High School" (axe flagged a label/content mismatch with the first approach).
- **Sound prompt:** the pill ("Sound is off", "Keep this tab open for Bells and Alarms", accent "Turn sound on"); the note drops on short screens; with no Web Audio it reads "Sound isn't available in this browser." with no button. It waits until the Division is chosen and steps aside while the ring card is up.
- **Toasts:** the page's only toast today is the error one. `createSettingsStore().save` now returns false when storage throws, and the page shows "Couldn't save on this device. Changes last until this tab closes." (`role=alert`, warning icon, 6px left border, Dismiss) once per load; it stays until dismissed rather than timing out, since it's an error. The confirmation toast ("Alarm deleted · Undo", `role=status`, 6 s) belongs to 19's Delete; the `.clock-toast` base styles are already here for it.
- **Screenshots:** first, sound, ringing (Period Alarm via `?at=2026-10-27T11:09:58` and a saved Alarm) and toast-error at 1920×1080, 1440×900, 1280×720, 480×320 and 390×844, next to the reference's same states (kept outside the repo). They match apart from what other tickets add (bar, Look button, Period Label) and the "Simulated time" banner; the one visible difference by design is the focus ring on the focused Dismiss / Middle School button. 0 axe violations in every shot; the flash animation reads `clock-ring-pulse`, 1000 ms; with reduced motion it has no animation.
- **Not done / for later:** the toast and the sound prompt share the bottom-centre spot, so a save error covers the sound prompt until dismissed (rare). Light mode wasn't screenshotted (themes are 21's); every colour used is a token with a light value.
- **After merging 19 (Settings drawer):** a ring now shows over the drawer (flash z 40, card z 41) and is left out of the drawer's `inert` set, so a Test ring from the drawer is seen and dismissed there, and focus goes back to Test ring. With the drawer open, Escape closes the drawer first (its capture handler), a second Escape dismisses the ring. `DIVISIONS` and `FEEDBACK_HREF` are now exported from `settings-drawer.js` and shared with the Division prompt; the first-visit scrim is `.clock-first-scrim` (the drawer owns `.clock-scrim`), and the prompt's link reuses the drawer's `.clock-feedback`, centred.
- **After merging 20 (the bar):** the ring card, sound pill and toasts sit over the bar, bottom centre, as designed (1920×1080 ringing now matches the reference, bar included); 0 axe violations in every shot after both merges. `clock-page-bar.test.js` now finds the ring card by `role="alertdialog"`.
