# 21: The theme set and the Look sheet

**What to build:** A teacher can give the clock a look that suits them. A 🎨 Look button in the top bar opens a compact Look sheet (separate from the settings drawer, keeping the clock visible and previewing live). It holds the bar's whole day / just this Segment setting and a theme picker showing every theme from the design reference as a visual preview: about 15 themes, one per subject plus the general personality themes. Each theme is a font and a palette, in light and dark.

- **No audience labels:** a theme is never labelled by who it's for. Each preview's accessible name describes its look.
- **Swaps:** after picking a theme, the teacher can optionally swap its font or its palette, only among the pre-checked options.
- **Themes own their mode:** the set mixes light and dark themes, and picking one switches to its native mode. One switch flips the current theme to its other version. There is no "auto". This replaces 16's saved light/dark/auto setting (default dark) with "follow the theme" (default) or "flipped"; migrate any saved value sensibly.
- **First visit:** a small "Pick a theme" hint shows. The default is the dark muted blue theme.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: Look; user stories 80d, 80e). Design reference: `.scratch/school-clock/mockups/final/` and its theme tokens and swap lists. Eric's theme brief: Comments of `issues/closed/02-eric-pick-direction.md`.

**Blocked by:** 17

**Status:** closed

- [x] Every theme in the design reference is available, in light and dark, using the token structure 17 set up
- [x] The picker shows visual previews only, with no audience names in visible text or accessible names
- [x] Font and palette swaps offer only the pre-checked options; the choice saves per device (16's storage) and survives reload
- [x] Picking a theme switches to its native mode; the flip switch shows its other version; 16's light/dark/auto setting is replaced by follow-theme / flipped, and old saved values migrate without errors
- [x] Big digits always use a readable face; any decorative font is used for labels only; any webfont is a small self-hosted file, and no font is loaded from a third-party server
- [x] An automated check (axe, plus a contrast script over the tokens) passes for every theme × font × palette × light/dark combination
- [x] The "Pick a theme" hint shows on first visit and not after a theme is chosen or the hint is dismissed
- [x] The Look sheet opens from the top bar, keeps the clock visible, is keyboard-operable (focus kept inside, Escape closes, focus returns)
- [x] Tests: choosing, swapping and saving; native mode and flip; the old-setting migration; the hint's first-visit behaviour
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

## Comments

**2026-10-30: built on `school-clock-21` (merged with `school-clock` at cfbafa6, tickets 19 and 20).**

- **Catalog:** `web/clock/themes.js` (`@ts-check`) is the reference's catalog as an ES module: 15 themes, 15 palettes (8 natively dark, 7 light), 13 fonts, one decoration, with `themeLook()`, `nativeMode()`, `lookAttributes(settings)` and the settings changes `pickTheme` / `pickFont` / `pickPalette`. `web/clock/themes.css` is the reference's `themes.css`, copied (decoration classes renamed `.clock-deco`); keep the two in step. Themes are named only by their look; ids are the reference's.
- **Settings (16's storage):** `colorScheme` is gone; `flipped` (default false, "follow the theme") and `themeHint` (default true) replace it. Loading migrates: `'auto'` or nothing → follow; `'light'`/`'dark'` → follow if it's the saved look's own mode, else flipped (so 16's saved `'light'` is Slate flipped, as before). 16's `theme: 'default'` and any unknown theme/font/palette id fall back to the default theme / the theme's own. The old key isn't saved again.
- **Look sheet:** `web/clock/look-sheet.js` + `look-sheet.css`. Look sits between Readouts and Settings (`aria-haspopup="dialog"`, fills with the accent while open). Focus handling is ticket 19's `modal.js`, with a **clear** scrim: no dimming, a click on the clock closes the sheet, the page behind is inert while it's open. `.has-sheet` sets `--sheet-w`, so the stage and the bar move left and the Readouts re-fit beside it; compact screens get the bottom sheet. Order: theme previews (radios, each drawn in its own version via `data-*` on the tile, accessible name = the look), the flip switch ("Light version" / "Dark version"), **Bottom bar** (whole day / just this Segment, moved here from 20's temporary drawer section, which is removed), Font (13 "Aa 42"), Colours (15 dots drawn as picking them would show, flipped or not), and "Use the theme’s own font and colours" after a swap. Radios share a name per group, so arrow keys move within each.
- **Applying:** every render puts `data-mode` / `data-palette` / `data-font` / `data-deco` on `<html>` (only what changed). The flowers decoration is two inline SVGs in the main screen, shown by CSS only with `data-deco`, behind everything, hidden under 521px. The mini player loads `themes.css` and copies the look onto its own `<html>` on every render (one small edit in `mini-player.js`; no decoration there).
- **Hint:** "Pick a theme" pill under Look (bottom left on short screens and phones), with the accent outline on Look. Shows once a Division is chosen while `themeHint` is on and the sheet is closed; picking a theme or Dismiss turns it off for good.
- **Fonts:** system stacks only. A hosting test checks there's no font file, `@font-face`, `@import`, `url(` or remote URL; the contrast test checks every font's `--font-digits` is a plain face (script and hand are display-only).
- **Checks:** `clock-theme-contrast.test.js` (adapted from the reference's `contrast.mjs`) checks that every palette sets all 17 tokens and passes all 26 pairs in both versions (780 checks, all pass). Rendered with Playwright on the real page via `?at=`: axe over every font × palette × mode (390 renders) and the open Look sheet in every palette × mode (30): **420 renders, 0 axe violations, 0 page errors**. Screenshots at 1920×1080, 1440×900, 1280×720, 480×320 and 390×844 (default, sheet open in light and dark, a swapped and flipped theme, flowers, the hint): 0 axe violations, no overflow, no page errors; keyboard: focus moves in, Tab wraps, an arrow key changes theme, Escape returns focus to Look. Shots and the script are outside the repo.
- **Tests:** `clock-themes.test.js` (catalog, choosing, migration), `clock-storage.test.js` (defaults, migration, corrupt values), `clock-page-look.test.js` (sheet open/close/focus, picking, swaps, flip, migration on the page, the hint, the mini player). `CONTEXT.md` gains **Theme**; the spec's saved-settings line names the flip and the hint.
- **As designed / for later:** at 480×320 the sheet (70vh) covers most of the clock, as in the reference. Ticket 23 (mini player) should keep `themes.css` in its stylesheet list and the look copy in `show()`.
