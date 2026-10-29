# Self-review: School Clock mockups (ticket 01)

How it was checked: `node .scratch/school-clock/mockups/shoot.mjs` takes 118 screenshots per direction (every main state at 1920×1080 and 1440×900 in both themes; period/passing/readouts at 1280×720; the in-Period, Passing, readouts, ringing, timer and sound states at 480×320 in both themes; every state at 390×844 dark, plus period/passing light; the three mini-player states at 320×180 in both themes; and three 24-hour states). Each shot also gets an axe-core scan and some layout checks: page scroll, elements clipped outside the viewport, overlapping text on the main screen, touch targets under 44×44 on the phone, digit height of the big Readout, and the ringing flash rate with and without reduced motion. I looked at every shot through the per-size contact sheets in `shots/contact/`, and at the key ones full size. Screenshots aren't committed: run the script to make them.

Final run: **0 axe violations, 0 layout issues, in all three directions.** Ringing flash: 1 flash per second (limit 3), and steady (no animation) under `prefers-reduced-motion`. Tab order follows the visual order (Division, Readout, controls, or the reverse where the controls sit first), and every control shows a focus ring (checked with keyboard Tab screenshots).

Shared across all three:

- **Colour is never the only signal.** Ringing has the text "Ringing", a bell icon and a Dismiss button. A Passing Period is named in text, and B and C also change shape (B's Up next card gets a heavy border, C's ring goes dashed). Bells on/off shows as a filled vs outline bell as well as colour.
- **No default browser controls.** Checkboxes, radios (as segmented controls), switches, range, select and number fields are all custom-styled.
- **Wording.** Labels are short and positive ("Up next", "Day 12 of Summer", "Have a great summer", "Enjoy the trips · back Mon, Jan 25"). The CONTEXT.md terms are used throughout (Segment names, Day Labels, Division, Period Alarm, Bells).
- **Clean projected view.** Settings, the feedback link and the note about sound limits ("Keep this tab open…") live only in the drawer. The feedback link sits in the drawer's About section and on the first-visit prompt. The projected "Sound is off" prompt is one short line plus a button.
- **24-hour time (added mid-ticket):** a "24-hour time" switch in the drawer's Display section, off by default. `&clock=24` renders any state that way. Only clock times change (current time, Segment start/end, "starts at", the timeline, Clock Alarm times); countdowns don't.
- **Fake data:** the in-Period/Passing states use an All Day (Tue, Oct 27) so that Period 3 → Period 4 is realistic. The ticket's "Even Day" example is used for the Nutrition and Chapel states (HS Even: Chapel before Period 4).

## A · Monument

- **Passed:** big digits are 27.9% of viewport height at 1920×1080 in every state. Hierarchy reads as number, then Segment, then everything else quiet. Both themes look intentional; the dark theme is the projected default.
- **Fixed during review:**
  - axe found `page-has-heading-one` on the timer and mini states, and `aria-allowed-role` on the drawer (`<aside role=dialog>`). Fixed with real `h1`s and a `div` dialog.
  - Phone: the segmented controls and small buttons were under 44 px; they're 44 px now.
  - 480×320: the ringing card covered the digits, so it's now a one-line bottom bar. The timer state's top line overlapped the title, so it's hidden on small screens (the Period still shows as a small Readout).
  - The sound prompt overlapped the date on small screens; it moved to the bottom.
  - On days off, the top line repeated the Day Label. It now shows only the date when the headline already names the day.
  - The mini player says "Up next" instead of "Next".
- **Watch:** the thin (200-weight) digits are the most likely of the three to wash out on a weak projector in the light theme. Check this on the real projector (ticket 05).

## B · Timeline

- **Passed:** big digits are 32.3% of viewport height (the condensed face allows the largest number). Long values (`1:15:00`, `4d 17h`) step down to 24.8%, which is within "~25%". The day strip tells Breaks (hatched, dashed) and Assemblies (dotted) apart by pattern, not colour.
- **Fixed during review:**
  - The vertical Now line ran through the current Segment's label and start time. It's now a tick above the strip, with the elapsed part of the current Segment shaded.
  - `1:15:00` ran into the Up next card, so long values get a smaller size.
  - Phone agenda: break rows picked up the strip's thick dashed border and looked highlighted. They now use their own classes (italic name only).
  - axe found `scrollable-region-focusable` on the phone agenda; it's now focusable.
  - The kind line repeated the headline ("Passing Period / Passing Period"). It now shows the Passing Period's times, or nothing.
  - The ring flash's 14 px frame covered text on small windows; it's 6 px below 520 px.
- **Watch:** the busiest projected view. On a phone, the agenda scrolls when there are several Readouts. Bahnschrift is Windows-only (DIN Alternate on Mac); anywhere else it falls back to a condensed or system face, so check it on Eric's MacBook.

## C · Dial

- **Passed:** 29.7% for two-digit minute counts ("42 minutes left") and 25.0% for m:ss values (`2:40`, `9:12`, timer `4:12`) and for `1:15` "hours since school ended". Days off show "4" with "days, 17 hours until Mon, Nov 30".
- **Failed, accepted for now:** the Summer state's plain clock (`10:12`, four digits) is **22.3%**. Four digits at full size would touch the ring. Nobody is projecting the clock in summer, but if C is picked, ticket 03 should decide whether the ring shrinks or the number escapes it for four-digit values.
- **Fixed during review:**
  - axe found `color-contrast` (4.14:1) on the hot Up next tile label in the light theme; the light accent text is darkened to `#076441`.
  - Off-Hours and day-off values (`1h 15m`, `4d 17h`) were only 17.6%, so they became `1:15` and a whole-day count.
  - 480×320: the dock overflowed, so it's 3×2 icons now. On short screens and phones the timer state hides the Up next tile, and the Pause/Cancel tile spans the full width (it was clipping "Cancel").
  - Dock icons were tiny at 1080p; they're 22 px now.
- **Watch:** long countdowns show whole minutes; seconds only appear under 10 minutes. That's a deliberate trade-off for Eric to react to. The rounded face falls back to Segoe UI on Windows unless Arial Rounded MT Bold is installed, so C looks rounder on the Mac.

## Not covered by the automated checks

- Real projector wash-out and reading from the back of the room are ticket 05.
- The checks run in Chromium only; Safari and Firefox rendering (`:has()`, container units, range styling) hasn't been seen.
