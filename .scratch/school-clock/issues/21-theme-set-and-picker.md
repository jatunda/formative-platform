# 21: The theme set and the Look sheet

**What to build:** A teacher can give the clock a look that suits them. A 🎨 Look button in the top bar opens a compact Look sheet (separate from the settings drawer, keeping the clock visible and previewing live). It holds the bar's whole day / just this Segment setting and a theme picker showing every theme from the design reference as a visual preview: about 15 themes, one per subject plus the general personality themes. Each theme is a font and a palette, in light and dark.

- **No audience labels:** a theme is never labelled by who it's for. Each preview's accessible name describes its look.
- **Swaps:** after picking a theme, the teacher can optionally swap its font or its palette, only among the pre-checked options.
- **Themes own their mode:** the set mixes light and dark themes, and picking one switches to its native mode. One switch flips the current theme to its other version. There is no "auto". This replaces 16's saved light/dark/auto setting (default dark) with "follow the theme" (default) or "flipped"; migrate any saved value sensibly.
- **First visit:** a small "Pick a theme" hint shows. The default is the dark muted blue theme.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: Look; user stories 80d, 80e). Design reference: `.scratch/school-clock/mockups/final/` and its theme tokens and swap lists. Eric's theme brief: Comments of `issues/closed/02-eric-pick-direction.md`.

**Blocked by:** 17

**Status:** ready-for-agent

- [ ] Every theme in the design reference is available, in light and dark, using the token structure 17 set up
- [ ] The picker shows visual previews only, with no audience names in visible text or accessible names
- [ ] Font and palette swaps offer only the pre-checked options; the choice saves per device (16's storage) and survives reload
- [ ] Picking a theme switches to its native mode; the flip switch shows its other version; 16's light/dark/auto setting is replaced by follow-theme / flipped, and old saved values migrate without errors
- [ ] Big digits always use a readable face; any decorative font is used for labels only; any webfont is a small self-hosted file, and no font is loaded from a third-party server
- [ ] An automated check (axe, plus a contrast script over the tokens) passes for every theme × font × palette × light/dark combination
- [ ] The "Pick a theme" hint shows on first visit and not after a theme is chosen or the hint is dismissed
- [ ] The Look sheet opens from the top bar, keeps the clock visible, is keyboard-operable (focus kept inside, Escape closes, focus returns)
- [ ] Tests: choosing, swapping and saving; native mode and flip; the old-setting migration; the hint's first-visit behaviour
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
