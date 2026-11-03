# 03: Refine the chosen direction into the design reference

**What to build:** Build the mix Eric chose in 02 (read its Comments: A's layout, B's Day Strip as a toggle, C's ring for the running timer only, a seconds toggle, the theme set, and the default theme) and apply his feedback. Repeat as needed: revise, self-review, show Eric, until he signs off. The result is the **design reference** that implementation tickets build against:

- one polished mockup covering every state listed in 01;
- a short design notes file in the same folder, covering:
  - colour tokens (light and dark), the type scale, the spacing scale and breakpoints;
  - how Readouts arrange as they're added;
  - the ringing flash spec (colours, timing, reduced-motion variant);
  - the mini player layout;
  - any interaction details settled along the way;
  - the **theme set**: every theme's font and light/dark palette as tokens, the list of fonts and palettes a teacher can swap between, and the contrast results for every font × palette × light/dark combination.

**Themes:**
- About 15 themes, one per subject listed in 02 plus general personality themes, including the two Eric described: a sports-team dark blue and orange with a bold condensed font, and a light pink floral look with a calligraphy font.
- Themes are never labelled by audience. The picker shows visual previews only; each preview's accessible name describes the look ("Navy and orange, bold"), never who it's for.
- Fonts must work without network font files where possible (system stacks). If a theme truly needs a webfont (e.g. the calligraphy face), it uses one small self-hosted file, and only for labels.
- Big digits always use a readable face. A decorative font like calligraphy is for labels only, never the main Readout.
- Decorations such as flowers are inline SVG and must not reduce the digits' contrast or size.

**Default theme:** A's layout with a dark muted blue background and light blue-tinted grey text, as described in 02.

The design reference lives under `.scratch/school-clock/mockups/final/`.

Spec: `.scratch/school-clock/spec.md`. Vocabulary: `web/clock/CONTEXT.md`.

**Blocked by:** 02

**Status:** closed

- [x] Eric's 02 feedback is applied, and each point is noted as done (or explained if not)
- [x] Every state and size from 01's list is present in the final mockup, plus: Day Strip on and off; a running timer as the main ringed Readout with the Period countdown smaller; seconds on and off; the theme picker in the settings drawer
- [x] Every theme is shown in at least the in-Period state, in light and dark, and passes the contrast checks (all swappable font × palette combinations too)
- [x] Passes the full self-review checklist in `01-design-mockups.md`, with screenshots and notes saved
- [x] Design notes written: theme tokens and swap lists, type and spacing scales, breakpoints, Readout arrangement, flash spec, mini player
- [x] Eric has signed off on the final mockup (recorded under Comments: he waived sign-off on the final revision)

## Comments

**2026-10-29: ready for Eric's review (not signed off yet).**

The design reference is in `mockups/final/`. You can open it from the top of `mockups/index.html`, or directly at `final/index.html`. A switcher in the bottom-left corner lists every state and theme. There are 32 states, and each has its own URL, e.g. `final/index.html#timer&mode=light&theme=team&seconds=off&strip=off&clock=24`.

- **Design notes:** `final/DESIGN.md`. It covers your 02 feedback point by point, the tokens, the type and spacing scales, the breakpoints, how Readouts arrange, the seconds rules, the Day Strip, the timer ring, the flash, the overlays, the drawer's sections, the mini player, the theme set with its swap lists, and the contrast results.
- **Self-review:** `final/REVIEW.md`. Run `node .scratch/school-clock/mockups/final/shoot.mjs` to regenerate the screenshots in the gitignored `final/shots/`.
- **Tokens:** `final/tokens.css` (the default theme and the scales) and `final/themes.css` (the other palettes and fonts) are written for the real page to copy. A theme is applied with attributes on `<html>` (`data-mode`, `data-palette`, `data-font`, `data-deco`).
- **Check results:** 0 axe violations across 306 screenshots, and across 1590 renders of every font × palette × light/dark combination. 0 layout issues. 0 contrast failures (15 palettes × 2 modes × 26 colour pairs). The big digits are 26% of the screen height at 1920×1080. The flash is 1 per second, and steady under reduced motion.

**The themes:** there are 15, each named only by its look (accessible names like "Navy and orange, bold condensed"). Swaps cover 13 fonts and 15 palettes, all system fonts with no downloads. The calligraphy and handwriting fonts are used only for labels. For your coverage check only (not written anywhere in the design files or the UI), here is the look I meant for each group:

| Group | Look |
|---|---|
| Default | Slate (dark muted blue) |
| Math | Ink and teal |
| Science | Charcoal and lime |
| English | Cream paper, book serif |
| History / Social Studies | Parchment and oxblood |
| World Languages | Ocean and coral |
| Bible | Deep plum and gold |
| Computer Science / Technology | Black and green, monospace |
| Art | Charcoal and vermilion |
| Music | Midnight and brass |
| PE / Health | Forest green and gold |
| Your sports-team look | Navy and orange, bold condensed |
| Your floral look | Blush pink with flowers, calligraphy labels |
| Other personality looks | Chalkboard (handwritten labels) and High contrast |

**For you to decide:**

1. **At most three Readouts** (one per mode). "Add Readout" goes away at three. Today the page has no limit.
2. **Removing a Readout:** the "Readouts" button switches to an edit mode, where each Readout gets a labelled Remove button and there's an Add slot. This works the same for touch, mouse and keyboard. It replaces today's always-visible ×. OK?
3. **The Day Strip hides while a timer runs and in the 480×320 laptop corner,** so the ring and the Segment name get the height. It comes back when the timer ends. OK?
4. **Seconds off:** countdowns show whole minutes rounded down ("42 min", "1h 15m", as ticket 16 built them), then switch to `0:59` for the last minute. With seconds on, clock times show the seconds small and raised ("10:12:43 AM"), so the clock stays as big as a countdown.
5. **Calligraphy font:** there's no webfont. The calligraphy (Segoe Script / Snell Roundhand) and handwriting fonts are already installed on Windows and Mac. On Chromebooks they fall back to a generic script font. Is that fine, or should we add one small self-hosted file, used for labels only?
6. **Do the 15 looks cover the groups you had in mind?** Anything to add or swap?

**Not fully met (noted in REVIEW.md):**

- In edit mode the big Readout shrinks to 18% of the screen height, on purpose.
- With the monospace font swap, the timer's digits are 21% of the screen height (26% in the default font).
- The Mac fonts haven't been seen yet. Ticket 05 covers that on your MacBook.

**Eric's review of the first design reference (2026-10-29, in chat).** Not signed off yet; one revision round needed:

- **Readouts:** at most three, and edit mode for removing them (both accepted). When the display is wide enough, extra Readouts go to the **right** of the big one rather than below it.
- **Controls:** Settings and other buttons go along the **top**, since the bottom belongs to the bar. Fullscreen and mini player become **icon-only buttons in the bottom right** (with accessible names).
- **Nutrition:** never abbreviate it to "Nut" (students would make fun of it). Use the full "Nutrition" wherever it fits, and "Nutr." where space is tight (e.g. a narrow Day Strip block).
- **One bar, two settings:** the hairline progress bar and the Day Strip merge into one element at the bottom. "Whole day": today's Segments, and the current Segment's block fills left to right with a thin "now" marker (no separate hairline); a Passing Period fills its gap and highlights the next block. "Just this Segment": the same bar collapses to the current Segment alone, stretched full width (this is the hairline). The Day Strip setting becomes this whole day / just this Segment choice.
- **Look is its own menu:** a 🎨 Look button in the top bar opens a compact sheet that keeps the clock visible and previews live. It holds the theme picker, font and palette swaps, the light/dark flip, and the bar's whole day / just this Segment setting. ⚙ Settings (the drawer) keeps what the clock *does*: Division, Period Labels, Bells, Alarms, sounds and volume, seconds, 24-hour time.
- **Themes own their mode:** the set is a mix of light and dark themes (roughly half each), and picking a theme switches to its native mode. One small switch in Look flips the current theme to its other version. Drop "auto".
- **Seconds at equal weight:** with seconds on, the seconds in a clock time are the same size and weight as the hours and minutes (no small raised seconds). Seconds off showing "42 min" / "1h 05m" is fine.
- **Accepted as is:** the Day Strip hiding while a timer runs and in the 480×320 corner; the system-font fallback for calligraphy and handwriting faces; the theme set ("good enough for now").

**2026-10-30: Revision 1 done; closed.** Every point from Eric's review is applied in `mockups/final/` and written up in `DESIGN.md` (a point-by-point table near the top). URLs now take `&flip=1` and `&bar=segment`; `&strip=off` still works.

- **Readouts:** at most three and the edit mode stay as built. On wide displays (4:3 or wider, larger than 760×520) the extra Readouts stack to the **right** of the big one; the big one keeps 26% digit height at 1920×1080. Narrower screens keep them below. **Done.**
- **Controls:** Timer, Bells, Readouts, Look, Settings and the Division chip go along the **top**. Mini player and Fullscreen are **icon-only buttons in the bottom right**, with `aria-label`s and tooltips. **Done.**
- **Nutrition:** the bar shows "Nutrition" where it fits, "Nutr." where it's tight (that's what it shows at 1920, 1440 and 1280 wide), and never "Nut". The screenshot checks now fail on any "Nut". **Done.**
- **One bar, two settings:** the hairline and the Day Strip are now one bar along the bottom. **Whole day:** the current block fills left to right, with a thin Now notch above it. A Passing Period fills its gap and highlights the next block. **Just this Segment:** the current Segment alone, full width, with its start and end times. The setting is "Bottom bar" in the Look sheet, and 16's `dayStrip` maps to it. **Done.**
- **Look is its own menu:** a Look button in the top bar (a palette icon, matching the other icons, rather than the 🎨 emoji) opens a compact sheet beside the clock. It has no scrim, and the clock re-fits next to it so every change previews live. It becomes a bottom sheet on small screens. It holds the themes, the flip switch, the bottom bar setting, and the font and colour swaps. The Settings drawer keeps Division, Time (seconds, 24-hour), Sound, Period Labels, Alarms and About. **Done.**
- **Themes own their mode:** 8 palettes are natively dark and 7 natively light (lab, paper, parchment, gallery, court, blush, contrast; their look names now describe the light version). Picking a theme shows its own version. One switch flips it, and its other version passes every contrast check too. There's no auto. DESIGN.md says how 21 migrates 16's light/dark/auto setting. **Done.**
- **Seconds at equal weight:** "10:12:43 AM" has full-size seconds, and only AM/PM stays small. A colon now counts as about half a digit in the sizing rule (measured per font), so a clock with seconds still gets about 26% digit height. **Done.**
- **Accepted as is:** the bar still hides while a timer runs and at 480×320, the calligraphy fallback is unchanged, and the theme set has the same 15 looks.

**Checks:** 0 contrast failures (15 palettes × both versions × 26 pairs). 0 axe violations and 0 layout issues across 327 screenshots and 1980 sweep renders (every font × palette × mode in 5 states, plus the Look sheet in every palette × mode). The flash is 1 per second and steady under reduced motion. Details are in `REVIEW.md`.

**Sign-off:** Eric waived approval for this final revision ("no need for approval from me for the final revision - we can always change stuff later"). This was relayed by the coordinator, so the ticket is closed without a separate review.

**Small calls made here, easy to change later (also in DESIGN.md "Not settled"):**

1. On a phone, "just this Segment" stays a single bar, and only "whole day" becomes the agenda list. Ticket 20 lists the agenda list under both settings.
2. During Off-Hours, both settings show the Next School Day's whole day, as ticket 20 asks. The alternative is hiding the bar until school starts.
3. With the Look sheet open, the 15-minute Nutrition block is too thin for any name, so it shows only its hatching.
4. With Readouts beside the big one, the monospace swap's digits drop to 19.9% of the screen height. Every other case is at least 24.2%.
