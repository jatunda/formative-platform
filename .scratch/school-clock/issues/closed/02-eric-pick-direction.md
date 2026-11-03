# 02: Eric picks a mockup direction and gives feedback

**What to do:** This is a step only Eric can do. Look through the three directions from 01 and pick one (or a mix: "layout from A, type from C"), with concrete feedback.

Spec: `.scratch/school-clock/spec.md`.

**Blocked by:** 01

**Status:** closed

1. Open `.scratch/school-clock/mockups/index.html` in a browser (double-click the file, or run `npx serve .scratch/school-clock/mockups` from the repo root and open the URL it prints).
2. For each direction, flip through the states and look at the screenshots at every size.
3. If you can, put the projected-size screenshot of your favourite on the classroom projector and look at it from the back of the room.
4. Write your choice and feedback under `## Comments` below (or tell Claude in chat): what to keep, what to drop, anything that felt confusing.

- [x] A direction (or a mix) is chosen
- [x] Feedback is recorded in this file

## Comments

Eric's choice (2026-10-29, in chat). All three looked good; the mix is:

- **Layout:** A (Monument) is the base: centred big Readout, quiet labels and controls.
- **Day Strip from B:** B's strip of today's Segments along the bottom, with a toggle to turn it on or off (default on). During Off-Hours it shows the Next School Day's Segments, labelled with that day; it hides during Summer and Experience Week.
- **Ring from C, for the timer only:** the ring appears only while a timer is running, and the running timer becomes the main (big) Readout; the Period countdown drops to a smaller Readout until the timer is cancelled or dismissed.
- **Seconds toggle:** one setting for every display (current time and countdowns), default on. The last minute of a countdown always shows seconds, and the timer always shows seconds.
- **Themes:** a set of themes, each a font plus a colour scheme, aimed at covering the major groups of teachers in an American school. Themes are **not labelled** by audience anywhere: they're shown as visual previews only.
  - One theme per main subject: Math, Science, English, History / Social Studies, World Languages, Bible, Computer Science / Technology, Art, Music, PE / Health.
  - Plus general personality themes outside the subjects, including a sports-team look (dark blue and orange, bold condensed font) and a soft floral look (light pink, flower decoration, a calligraphy font).
  - A teacher picks a theme, then can optionally swap its font or colour scheme separately, but only among pre-checked fonts and palettes, so every combination passes contrast. Light / dark / auto stays a separate setting, and every theme has a light and a dark version.
- **Default theme:** A's look, with a dark muted blue background and light grey text with a slight blue tint. Reference: Google's dark-mode timer crossed with the Godot-style theme on mrhsieh.app (the site's own `--bg-primary` #2d3748 / `--bg-dark` #1a202c, `--text-primary` #e2e8f0, `--accent-blue-godot` #57b3ff in `web/style.css`). A small "Pick a theme" hint shows on first visit.

