# Self-review: School Clock design reference (ticket 03)

The checklist is the one in `issues/closed/01-design-mockups.md`.

## How it was checked

- `node .scratch/school-clock/mockups/final/contrast.mjs` checks every colour pair, with no browser. It covers 15 palettes × 2 modes × 26 pairs.
- `node .scratch/school-clock/mockups/final/shoot.mjs` takes 306 screenshots:
  - every main state at 1920×1080 and 1440×900, light and dark;
  - four states at 1280×720;
  - 11 states at 480×320, light and dark;
  - every state on a phone (390×844) in dark, plus three in light;
  - the mini player at 320×180 (light and dark) and 480×270;
  - seconds-off, Day Strip-off and 24-hour variants;
  - a font and palette swap;
  - every theme in Period, timer and ringing, light and dark, at 1920×1080, plus every theme in Period on a phone.
- Every shot gets an axe-core scan and layout checks: page scroll, clipping, overlapping text, decorations over text or controls, 44×44 targets on the phone, big-Readout digit height and fit, and the flash rate with and without reduced motion.
- The sweep then renders every font × palette × mode in four states, plus the theme picker in every palette × mode (1590 renders). It runs axe, the overlap, clip and fit checks, and a tabular and lining-figures check of each font.
- The screenshots go to the gitignored `shots/` folder, with contact sheets in `shots/contact/`.
- I looked at the contact sheets for every size, and at the key states full size:
  - in a Period, with several Readouts, editing, Passing, after school, a day off;
  - ringing, the timer running and paused;
  - the theme picker and the Clock Alarm editor;
  - the phone and the laptop corner;
  - the mini player;
  - the floral and navy-and-orange themes.
- Keyboard: a Tab-through script checked the tab order and took focus screenshots.

## Final run

- **axe:** 0 violations across 306 shots and 1590 sweep renders.
- **Layout:** 0 issues.
- **Contrast:** 0 failures. Every text pair is at least 4.5:1 and every control and fill at least 3:1, in all 30 palette × mode blocks. That covers every font × palette × light/dark combination, since fonts don't change colours, and the axe sweep checks each font's real size and weight.
- **Ringing:** 1 flash per second (the limit is 3). It holds steady, with no animation, under `prefers-reduced-motion`.
- **Big digits at 1920×1080 (default theme):** 26.4% of the viewport height in every main state. The timer is 26.3%. Across all fonts the Segment states are 24.2–28.1% and the timer 21.2–32.9%.

## Checklist

- **Projected readability: passes, with two exceptions noted.**
  - Digits are 26% of the viewport height, tabular in every font (checked by measuring all ten digit widths), and lining (Candara was replaced because its figures are old-style).
  - Long values ("1:15:00", "10:12:43 AM") keep the full height on 16:10 and wider screens, because the size is capped by width only.
  - Hierarchy: the number first, then the Segment, with everything else muted, small and uppercase.
  - Exceptions: edit mode shrinks the big Readout to 17.6% on purpose (it's a teacher moment), and the monospace swap's timer is 21.2%. Both are in DESIGN.md "Not settled".
- **Responsive: passes.** Nothing overflows, clips or overlaps at any size. Every control is at least 44×44 on the phone. The mini player works at 320×180 and scales up at 480×270.
- **Accessible: passes.**
  - **Contrast:** above.
  - **Not colour alone:**
    - ringing has the text "Ringing" and a bell icon;
    - Passing Period says so in text and has "Up next";
    - Breaks and Assemblies differ by pattern (hatched with a dashed border, and dotted) and, on the phone, by italics plus "· Break" or "· Assembly";
    - a paused timer says "Paused" and its ring goes dashed;
    - Bells on shows a filled bell;
    - the chosen theme or swatch has a check mark and an outline;
    - the error toast has an icon and a thick border.
  - **Names:** every control has a visible label or an accessible name, and the visible text is included in the name. axe's `label-content-name-mismatch` found the Division chip and the presets, which were fixed.
  - **Focus and tab order:** the focus ring is 3px `--focus` (yellow or orange, never the accent) and was checked with screenshots. Tab order on the main screen: Division, the big Readout, the small Readouts (and in edit mode each one's Remove), then the controls. In the drawer, the arrow keys move within each radio group.
  - **Flash:** above.
- **Visual polish: passes.**
  - One spacing scale (4–48px), plus viewport gaps on the main screen.
  - At most two typefaces per theme: the display or UI face plus the digits face. The script and hand fonts pair with a readable digits face.
  - One accent per palette.
  - Light and dark both look intentional (the theme contact sheet shows both for all 15 themes). Dark is the default for projection.
  - No default browser controls: switches, checkboxes, radios, segmented controls, the slider, the select, theme previews and swatches are all custom.
- **Wording: passes.**
  - Short and positive: "Up next", "Day 12 of Summer", "Have a great summer", "Enjoy the trips · back Mon, Jan 25", "No school calendar for this date yet", "Pick a theme", "Alarm deleted · Undo".
  - It uses the CONTEXT.md terms (Segment names, Day Label, Division, Next School Day, Period Alarm, Clock Alarm, Bells, Readout).
  - Themes are named only by their look, never by audience or subject, in visible text, accessible names and ids.
- **Clean projected view: passes.**
  - Settings, the feedback link and the explanation of sound limits stay in the drawer.
  - The sound prompt shows one short note, which ticket 18 asks for.
  - The hint and toasts are small, sit over the controls, and never cover the digits.

## Fixed during review

- **Accessible names:** axe found the Division chip's `aria-label` didn't include "HS", and the presets said "1 minute" against the visible "1 min". Both now use the visible text plus hidden text.
- **Edit mode:** the "×" overlapped the digits, so Remove is now a labelled pill under each Readout. Editing crowded the projected layout, so the big Readout steps down and the progress bar hides while editing. At 480×320 the Readouts go into one row. There it had lost its only `h1`, so the title is now visually hidden rather than removed.
- **Long values:** a fixed "long" size made "1:15:00" and "10:12:43 AM" 22%, so the size is now capped by width and they get the full height.
- **The timer ring** was 23.5%, so it now rises into the top bar's row, since a circle leaves the corners free. That gives 26.3%. On the phone that overlapped the Day Label, so the phone keeps the normal row.
- **The paused ring** lost its progress (`stroke-dasharray: none`). It now keeps the arc and dims it.
- **The "Pick a theme" hint** covered the strip's times above the Settings button. It now sits to the right of the button, above it on compact screens, and in the bottom-right corner on 480×320.
- **The 480×320 compact strip** hid the Segment name, so short screens drop the strip instead.
- **The simulated-time banner** was clipped on the phone, so its padding now follows the screen's edge tokens.
- **The error toast's** close button shrank to 26px, so it's `flex: none` now.
- **Slate dark's** control border was 2.85:1 on `--surface-2`, so it was lightened to `#7d8da4`.
- **Candara**, the humanist font, renders old-style figures, so it was replaced with Trebuchet MS.

## Not covered by the automated checks

- Only Chromium on Windows rendered the fonts. On this machine, Cascadia Mono and Arial Rounded MT Bold aren't installed (Consolas and Segoe UI were used). The macOS faces (Charter, Snell Roundhand, DIN Condensed, Seravek, Futura, SF Pro Rounded) are unseen. Ticket 05 (Eric's MacBook and the projector) covers this.
- Real projector wash-out and reading from the back of the room are ticket 05.
- The mockup is static, so focus trapping, Escape, and focus returning to the opener weren't exercised. They're specified in DESIGN.md for tickets 18, 19 and 22.
