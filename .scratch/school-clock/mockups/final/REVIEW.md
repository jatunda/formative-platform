# Self-review: School Clock design reference (ticket 03, revision 1)

The checklist is the one in `issues/closed/01-design-mockups.md`. This is the review after applying Eric's review of the first design reference: controls along the top, window buttons bottom right, extra Readouts beside the big one, one bar (whole day / just this Segment) instead of the Day Strip and hairline, the Look sheet, themes that own their mode (8 dark, 7 light) with a flip switch, full-size clock seconds, and never "Nut".

## How it was checked

- `node .scratch/school-clock/mockups/final/contrast.mjs` checks every colour pair, with no browser. It covers 15 palettes × 2 versions (native and flipped) × 26 pairs.
- `node .scratch/school-clock/mockups/final/shoot.mjs` takes 327 screenshots:
  - every main state at 1920×1080 and 1440×900, light and dark;
  - four states at 1280×720;
  - 12 states at 480×320 (including the Look sheet), light and dark;
  - every state on a phone (390×844) in dark, plus three in light;
  - the mini player at 320×180 (light and dark) and 480×270;
  - seconds-off, 24-hour, and bar-on-just-this-Segment variants (1920, 1440, phone, 480×320);
  - a font and palette swap and the flowers theme, each with the Look sheet open, native and flipped;
  - every theme in Period, timer and ringing, native and flipped, at 1920×1080, plus every theme in Period on a phone in its own version.
- Every shot gets an axe-core scan and layout checks: page scroll, clipping, overlapping text, decorations over text or controls, 44×44 targets on the phone, big-Readout digit height and fit, the flash rate with and without reduced motion, and (new) any "Nut" in visible or hidden text.
- The sweep then renders every font × palette × mode in five states (readouts, passing, timer, ringing, a Break with the bar on just this Segment), plus the Look sheet in every palette × mode: 1980 renders, with axe, overlap, clip and fit checks, and a tabular and lining-figures check of each font.
- Colon widths were measured in every face to set `--colon-units` (the new sizing rule counts a colon as a fraction of a digit, so "10:12:43 AM" keeps its height).
- Screenshots go to the gitignored `shots/`, contact sheets to `shots/contact/`.
- I looked at the contact sheets for every size, and full size at: in a Period, several Readouts (beside, at 1920 and 1440), Passing (the gap fill and the next block), the Look sheet (wide and phone), the bar on just this Segment (Period, Passing, Break, before school), the timer, the 480×320 corner, the flowers theme native and flipped, and 1280×720 for the "Nutr." label.

## Final run

- **axe:** 0 violations across 327 shots and 1980 sweep renders.
- **Layout:** 0 issues (no scroll, clipping, overlaps, decoration overlaps, small phone targets, or "Nut").
- **Contrast:** 0 failures in all 30 palette × version blocks.
- **Ringing:** 1 flash per second (limit 3), steady under `prefers-reduced-motion`.
- **Big digits at 1920×1080 (default theme):** 26.4% in every Segment and Off-Hours state, including with two Readouts beside it; 25.9% for "10:12:43 AM" (Summer, unknown date, seconds on); 25.8% for the timer. Across all fonts: 24.2–28.1% with one Readout, 19.9–27.5% with Readouts beside, 20.9–27.5% for the timer.

## Checklist

- **Projected readability: passes, with three exceptions noted.**
  - Digits are about 26% of the viewport height, tabular and lining in every font.
  - Clock seconds are now full size, and the colon-aware sizing rule keeps "10:12:43 AM" at about 26%.
  - Hierarchy: the number first, then the Segment; the controls are small and muted along the top, the bar quiet along the bottom.
  - Exceptions (DESIGN.md "Not settled"): edit mode at 17.6% on purpose; the monospace swap at 19.9% with Readouts beside and 20.9% in the timer.
- **Responsive: passes.** Nothing overflows, clips or overlaps at any size. Every phone control is at least 44×44. Short screens use 36px controls (mouse windows, not phones). The mini player works at 320×180 and scales at 480×270.
- **Accessible: passes.**
  - **Contrast:** above, for both versions of every palette.
  - **Not colour alone:** ringing has "Ringing" and a bell; Passing says so and has "Up next", and in the bar the next block gets a thicker border; Breaks are hatched with a dashed border, Assemblies dotted (italic plus "· Break"/"· Assembly" on the phone); the current block fills with a wash and a solid rule, and a Now notch marks the moment; a paused timer says "Paused" and its ring goes dashed; Bells on shows a filled bell; the chosen theme or swatch has a check mark and an outline; the error toast has an icon and a thick border.
  - **Names:** the icon-only window buttons have `aria-label`s ("Mini player", "Fullscreen") and tooltips; Look has `aria-haspopup`/`aria-expanded`; each bar block has hidden text ("Period 3 · AP CSA, 10:05 to 10:55, now"); the current block's fill is a named `progressbar`.
  - **Focus and tab order:** top bar first (Timer, Bells, Readouts, Look, Settings, Division), then the Readouts (and Remove buttons in edit mode), then the bar's agenda list on a phone, then the window buttons. The focus ring is 3px `--focus`, never the accent.
  - **Flash:** above.
- **Visual polish: passes.**
  - One spacing scale, viewport gaps on the main screen.
  - At most two typefaces per theme.
  - One accent per palette.
  - Both versions of every theme look intentional. The light natives (lab, paper, parchment, gallery, court, blush, contrast) were picked from palettes whose light version already read as a designed look; their look names now describe that version ("Pale sage and leaf green", "Gallery white and vermilion", "Pale mint and forest green", "High contrast, black on white").
  - No default browser controls.
- **Wording: passes.**
  - "Nutrition" in full where it fits, "Nutr." where tight, never "Nut" (checked automatically).
  - Themes are named only by their look, never by audience or subject.
  - "Light version" / "Dark version", "Bottom bar: Whole day / Just this Segment", "Pick a theme".
- **Clean projected view: passes.** Settings, feedback and sound notes stay in the drawer. The controls are quiet along the top; the window buttons are two small icons in a corner. Transient overlays sit bottom centre, over the bar, never over the digits.

## Fixed during this review

- **Timer digits in bold condensed** poked out of the ring once the colon counted as half a digit, so the ring's digits are also capped at `40cqh`.
- **Flowers** (left edge low) overlapped the big Readout once small Readouts moved beside it. Both decorations now sit in the upper corners under the top bar, a little smaller (`min(18vh, 13vw)`).
- **The phone hint** overlapped the Day Label under the Look button, and on 480×320 it covered the title. On both it now sits in the free bottom-left corner, and the Look button wears its accent outline so the two connect.
- **The timer ring at 480×320** rose into the controls now that they're along the top. On short screens it stays in the stage.
- **The Passing Period gap's time** collided with the next block's start time, so the gap's time is hidden in whole day.
- **Nutrition at 1440×900 and 1280×720**: "Nutr." didn't fit at full size, so slivers under 3.6em set the short name at 0.8em with tight padding.

## Not covered by the automated checks

- Only Chromium on Windows rendered the fonts (Cascadia Mono and Arial Rounded MT Bold aren't installed here). The macOS faces are unseen. Ticket 05 covers it.
- Real projector wash-out, and how the light-native themes read on the projector, are ticket 05.
- The mockup is static, so focus trapping, Escape and focus return (drawer, Look sheet, dialogs) weren't exercised. They're specified in DESIGN.md for tickets 18, 19, 21 and 22.
