# 17: The main screen in the design reference's look

**What to build:** `/clock` stops being a plain page. The main screen is built to the design reference from 03 in the default theme, across every state at every checklist size:

- A's layout: one big Readout and smaller Readouts arranged as the design specifies, with adding, removing and cycling them;
- the Day Label, the current Segment with its Period Label, up next during a Passing Period, and the Division;
- the Off-Hours, day-off, Experience Week, Summer and unknown-date displays;
- the main-screen controls: Settings, Look and the other buttons along the top; fullscreen and mini player as icon-only buttons in the bottom right; the feedback link placement;
- extra Readouts to the right of the big one when the display is wide enough (at most three);
- clock-time seconds at the same size and weight as hours and minutes;
- the "Simulated time" banner;
- the extra plain time line at the top, which duplicates a current-time Readout, is removed.

Overlays and prompts are ticket 18; the drawer is 19.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: Look, Readout modes; user stories 4–18, 29–41, 72–75, 79, 80). Design reference: `.scratch/school-clock/mockups/final/` and its design notes. Vocabulary: `web/clock/CONTEXT.md`. Deferred from 11's Comments: big-Readout styling and the duplicate time line.

**Blocked by:** 03

**Status:** closed

- [x] The default theme's tokens, type scale and spacing scale from the design notes are the page's styling source, set up so 21's themes can swap them
- [x] Every state (in a Period, Passing Period, Break, Assembly, before school, after school, day off, Experience Week, Summer, unknown date, simulated time) matches the design reference at every checklist size
- [x] Adding, removing and cycling Readouts works with mouse, touch and keyboard, with touch targets of at least 44 × 44 px; removing a Readout follows 03's design
- [x] The big Readout uses tabular digits and meets the checklist's size rule at 1920 × 1080
- [x] The duplicate plain time line is gone
- [x] Playwright screenshots of every state, reached via `?at=`, are compared against the design reference; differences are fixed or explained under Comments
- [x] The axe scan has no violations
- [x] The existing page tests are updated to the new markup and still check behaviour, not styling
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-10-30: built on `school-clock-17`.**

- **Tokens:** `web/clock/tokens.css` is the design reference's `tokens.css`, copied as is; `index.html` loads it before `clock.css` and sets `<html data-mode="dark">`. `clock.css` names no colour or face of its own (a hosting test checks), so 21 swaps the look by adding `themes.css` and setting `data-mode` / `data-palette` / `data-font` / `data-deco` on `<html>`. The mini player window loads both stylesheets too.
- **Structure for 18–23:** `#clockApp > main.clock-screen` (banner, `header.clock-top`, `section.clock-stage`, `footer.clock-bottom`), then the plain panels and prompts as siblings. The top bar's controls are built with `topControl()` in `clock.js`; **Look (21)** goes between Readouts and Settings, and gets `clock-control--fills` so it fills with the accent while `aria-expanded`. **The bar (20)** goes in `.clock-bar-slot`, left of `.clock-corner` (mini player, fullscreen). `.has-sheet` and `--sheet-w` on `.clock-screen` are already wired into the Readouts' size rule for the Look sheet.
- **Plain panels:** Timer and Settings open plain panels (`aria-expanded` / `aria-controls`, one at a time). The Settings panel holds every old setting, the Bells checkbox, sound previews, Test ring, the sound note, "Next rings today" and the feedback link (so the projected view shows none of them). The Division chip opens it and focuses the Division select. 19 replaces the panel with the drawer, 22 the timer panel with the picker and ring. The first-visit prompt, the "turn sound on" pill and the ringing card are plain and placed bottom centre (or over a scrim); 18 designs them. The flash keeps its classes, recoloured with `--ring` / `--ring-wash`.
- **Readouts:** `readout-layout.js` caps a layout at three (`MAX_READOUTS`, `canAddReadout`; saved layouts load as their first three). **Add picks the first mode no Readout shows yet**, going round the cycle from the default, so three Adds give left / since start / now. Captions follow the design: "left", "since start", "now", "until Period 3" (Passing Period), "until school starts", "since school ended", "until Mon, Nov 30". `readoutParts()` splits a value into pieces (letters small) with the glyph counts for the size rule; `readouts-view.js` draws them and rebuilds only when the arrangement changes. Edit mode follows 03: the Readouts control (`aria-pressed`, "Done"), Remove pills named "Remove Readout: since start" (only with more than one), an Add slot below three, the note, Escape to leave; after Remove, focus goes to the next Remove button or to Done; after Add, to the new Readout. Edit mode isn't saved.
- **Words:** `display-text.js` (pure, `@ts-check`) gives the Day Label line, heading and the line under the Readouts. Days off, Experience Week, Summer and unknown dates show just the date top left. Before school uses the same "UP NEXT Period 1 8:30 AM" line as a Passing Period (the mock's "Period 1 starts in 42m · 8:00 AM" repeated the Readout). Summer with next year known reads "Have a great summer · back Mon, Aug 16". The old "School ended at", "since school ended" and "Next school day … starts in" lines are gone: the Readouts cycle through those. The Off-Hours line's "starts in" never shows seconds.
- **Before a Division and on an unknown date:** the big Readout is just the time ("now"), not a button, and the Readouts control is hidden (nothing to arrange). Before a Division the Timer, Bells, Settings and chip are hidden too.
- **Screenshots:** every state at 1920×1080, 1440×900, 1280×720, 480×320 and 390×844 via `?at=`, next to the reference (kept outside the repo). The stage, top bar and Readouts match; 0 axe violations in every shot, including the open panels and the first visit. Big digits: 25.9% at 1920×1080 (25.4% for "10:12:05 AM"); 17.3% in edit mode, as designed.
- **Differences, on purpose or for later tickets:** no bar (20), no Look button (21), the timer is plain text in the big spot (22), the sound prompt / ringing card / first visit are plain (18), the mini player's contents are unchanged (23). With Readouts beside the big one at 1440×900, "42:17" is 24% (the 60% width cap binds; the reference's rule gives the same). With the "Simulated time" banner at 480×320 the Off-Hours line can touch the floating window buttons; the real (unsimulated) view matches the reference. The 480×320 controls are 36 px, as the design allows for short screens.
