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

**Status:** open

- [ ] Eric's 02 feedback is applied, and each point is noted as done (or explained if not)
- [ ] Every state and size from 01's list is present in the final mockup, plus: Day Strip on and off; a running timer as the main ringed Readout with the Period countdown smaller; seconds on and off; the theme picker in the settings drawer
- [ ] Every theme is shown in at least the in-Period state, in light and dark, and passes the contrast checks (all swappable font × palette combinations too)
- [ ] Passes the full self-review checklist in `01-design-mockups.md`, with screenshots and notes saved
- [ ] Design notes written: theme tokens and swap lists, type and spacing scales, breakpoints, Readout arrangement, flash spec, mini player
- [ ] Eric has signed off on the final mockup (recorded under Comments)

## Comments
