# 21: The theme set and theme picker

**What to build:** A teacher can give the clock a look that suits them. The settings drawer gets a theme picker showing every theme from the design reference as a visual preview: about 15 themes, one per subject plus the general personality themes. Each theme is a font and a palette, in light and dark.

- **No audience labels:** a theme is never labelled by who it's for. Each preview's accessible name describes its look.
- **Swaps:** after picking a theme, the teacher can optionally swap its font or its palette, only among the pre-checked options.
- **Light / dark / auto:** this setting (19) applies to every theme, and auto follows the system setting.
- **First visit:** a small "Pick a theme" hint shows. The default is the dark muted blue theme.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: Look; user stories 80d, 80e). Design reference: `.scratch/school-clock/mockups/final/` and its theme tokens and swap lists. Eric's theme brief: Comments of `issues/closed/02-eric-pick-direction.md`.

**Blocked by:** 19

**Status:** ready-for-agent

- [ ] Every theme in the design reference is available, in light and dark, using the token structure 17 set up
- [ ] The picker shows visual previews only, with no audience names in visible text or accessible names
- [ ] Font and palette swaps offer only the pre-checked options; the choice saves per device (16's storage) and survives reload
- [ ] Auto follows the system's light/dark setting live
- [ ] Big digits always use a readable face; any decorative font is used for labels only; any webfont is a small self-hosted file, and no font is loaded from a third-party server
- [ ] An automated check (axe, plus a contrast script over the tokens) passes for every theme × font × palette × light/dark combination
- [ ] The "Pick a theme" hint shows on first visit and not after a theme is chosen or the hint is dismissed
- [ ] Tests: choosing, swapping and saving; auto mode; the hint's first-visit behaviour
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
