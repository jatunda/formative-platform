# 04: UI/UX review pass on the built clock

**What to do:** Once the clock is built, review the real page (not the mockups) against the design reference and the self-review checklist, and fix what falls short. Interactive behaviour is what mockups couldn't show, so it gets the most attention: tapping Readouts, opening the drawer, a ring arriving, the sound prompt, the mini player, keyboard-only use.

Spec: `.scratch/school-clock/spec.md`. Design reference: `.scratch/school-clock/mockups/final/`.

**Blocked by:** 03, 06–23

**Status:** closed

- [x] Run the real page locally and drive it with Playwright at every checklist size, with the clock spoofed through the page's `?at=` / `&speed=` parameters (ticket 06) to land on each state (in a Period, Passing Period, Break, Assembly, before and after school, a day off, Experience Week, Summer, ringing)
- [x] Compare each screenshot to the design reference; fix visual drift
- [x] Passes the full self-review checklist in `01-design-mockups.md`, including an automated accessibility scan with no violations
- [x] Keyboard-only: every action (cycle a Readout, add a Readout, open settings, start the timer, dismiss a ring, toggle Bells) works with Tab/Enter/Space/Escape, and focus is never lost
- [x] Screen reader: the Segment and Readout have sensible accessible names, and a ring is announced without the per-second ticking being read out
- [x] Motion: the flash obeys the 3-per-second limit, and the reduced-motion variant works
- [x] Notes on what was found and fixed, recorded under Comments
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-10-30: done on `school-clock-04`.** I drove the real page with Playwright (static server on 127.0.0.1, `?at=` / `&speed=1`) at 1920×1080, 1440×900, 1280×720, 480×320 and 390×844, in a Period, Passing Period, before and after school, a day off (Thanksgiving), Summer, timer, ringing (Test ring), Undo toast and error toast, with and without the sound prompt. I looked at each screenshot next to the reference. The scripts and shots are outside the repo (`%TEMP%/sc04`).

Found and fixed:

- **Bottom-centre collisions (15, 18, 20, 22).** The "turn sound on" prompt stays until it's clicked, so it isn't a floating overlay any more. It sits in the main screen's bottom row (`.clock-bottom`, now a grid):
  - **Wide screens:** on its own line, centred above the bar. The stage and the bar make room for it.
  - **No bar** (timer, Experience Week): on the window buttons' line, centred on the page.
  - **Short screens (480×320):** in-flow, left of the floating window buttons, with `--type-digits` at 34vh while it shows.
  - **Phone:** a full-width line under the Fullscreen button, which stays visible.

  While any toast (Undo or save error) shows, the prompt is `visibility: hidden` (CSS `:has`), so it keeps its room and nothing moves. A toast never covers it. Toasts and the ring card still float bottom centre over the bar for their few seconds, as designed. `DESIGN.md`'s sound-prompt bullet notes the change. Re-checked: no overlap between the prompt and the bar, ring, Readouts, the line under them or the window buttons at any size. While the drawer is open the Undo toast sits over the drawer's scrim, with the prompt hidden.
  - The phone agenda used to spill upward out of its grid cell once the bottom row had more in it. The bar slot now stretches to its row, so the agenda scrolls inside it.
- **Open Alarm form and 12/24-hour (15).** An open Clock Alarm form now follows the 24-hour switch. The AM/PM group comes and goes, and the time typed is rewritten the new way (3:20 PM ⇄ 15:20, 07:05 → 7:05 AM). An unreadable time is left as typed. Built with TDD at Seam 2 (`clock-page-alarms.test.js`, 3 tests).
- **Line under the Readouts vs the window buttons at 480×320 (17).** Measured across states, Divisions, a long Period Label and 24-hour time. After school it was 1px away, and a long Period Label in a Passing Period overlapped by 21px. On short screens the line is now capped to clear the floating buttons on both sides (so it stays centred), and a long one wraps with `text-wrap: balance`. It now clears the buttons in every case measured.
- **Page 1px taller than the window (22).** The cause was the ring announcement's `.visually-hidden` live region, which sits after the page in normal flow. `.visually-hidden` now has the standard `margin: -1px; padding: 0; border: 0`. There's no scroll at any size.
- **Ticket 21's sweep, re-run on the current tip (after 18, 19, 20, 22, 23), with these fixes in:** axe at 1920×1080 over every font × palette × mode in a Period with the sound prompt showing (390), the Look sheet in every palette × mode (30), and every theme, native and flipped, with the timer, the ring card and the error toast (90). **510 renders, 0 axe violations, no page scroll, 0 page errors.**

Checked with no change needed:

- **Keyboard only:**
  - **Tab order:** Timer, Bells, Readouts, Look, Settings, Division chip, big Readout, Mini player, Fullscreen, Turn sound on.
  - **Readouts:** Enter cycles a Readout and keeps focus on it. Readouts → Add focuses the new Readout, and Escape returns focus to Readouts.
  - **Bells:** Space toggles it (`aria-pressed`).
  - **Timer:** Enter opens the picker on "1 min", and Escape returns to Timer. Enter starts the timer and focuses Pause; Pause goes to Resume and back. Cancel returns focus to Timer.
  - **Ring:** Settings → Test ring focuses Dismiss. Enter dismisses it, focus goes back to Test ring, and Escape returns to Settings.
  - Focus never fell to `body`.
- **Screen reader:** the heading is the Segment ("Period 3"). The big Readout is named by its value and caption ("43:00 left"). A ring is one assertive announcement ("Ringing · Test: Test ring"), and no live region holds a Readout.
- **Motion:** the flash is `clock-ring-pulse`, 1s, `steps(1)` (one flash per second). With `prefers-reduced-motion` there's no animation and the frame holds steady.
- Lint, typecheck and coverage pass in `web/`.

Left as is:

- When a ring arrives, the prompt steps aside as before. Its row closes, so the stage shifts down by about half the prompt's height until the ring is dismissed.
- The error toast (rare, stays until dismissed) and the Undo toast (6s) still float over the bar or the bottom of the stage, as the reference places toasts.

