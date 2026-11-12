# 45: In Readouts edit mode, the stage spills out of its row

**Priority:** low

**What to build:** `npm run check:clock -- --editing --layout countdown,clock,countup` fails its stage check (added in ticket 44) in several places. In edit mode the stage grows taller than its row, so it runs up into the top bar and down into the bottom row:

- 480 × 320, Off-Hours states (after school, day off, weekend, Experience Week, Summer): about 25px above and below. Before ticket 44 every state here spilled about 38px; 44's smaller digits fixed Period, Assembly and before school.
- 1280 × 720: Passing Period (11px) and before school (21px).
- 390 × 844: Experience Week (8px). Also, Passing Period and before school leave the phone agenda only 1–31px tall, so its last row can't be reached (the agenda check from ticket 43).

The cause is likely that, while the sound prompt shows, the short layout's prompt rule (`--type-digits: calc(34vh - …)`) is more specific than `.clock-screen.is-editing`'s `22vh`, so edit mode keeps the bigger digits. Edit mode also adds the add/remove buttons and the edit note. Confirm before fixing.

Edit mode is a teacher moment, not a projected one, so the digits can step down further there. Found while building ticket 44 (see its `## Comments`). Built behaviour: closed tickets 11 (edit mode), 42 (tapping the bar in edit mode), 43 (phone height), 44.

**Blocked by:** 49 (both change edit-mode styling)

**Status:** closed

- [x] `npm run check:clock -- --editing` passes with one, two and three Readouts at every default size, sound prompt showing and not
- [x] Outside edit mode, nothing changes
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-11: triaged.** Eric: yes, with smaller text in edit mode. Make room by stepping the digits (and other Readout text as needed) down further while editing, not by dropping the edit note or controls.

**2026-11-11: built.** Cause: in edit mode the Readouts kept their projected sizes in three places, because edit mode's rules lost to more specific ones.

- Short layout (480 x 320): while the sound prompt shows, `.clock-screen:has(> .clock-bottom > .clock-sound-prompt:not([hidden]))` (34vh) outranks `.clock-screen.is-editing` (22vh), so edit mode kept the bigger digits (measured `calc(34vh - 0px - 28px)` in edit mode). A big Readout too wide to share the row (after school's "17:59:59", "1d 20h") wraps the small ones under it, and with 44px Remove pills on both rows the stage needed about 249px of a 199px row. With the timer, `.clock-readouts.has-timer .clock-smalls` outranks edit mode's row rule, so the small Readouts stayed a column beside the ring, each with its Remove pill: up to 133px too tall, and the page scrolled.
- Beside layout (1280 x 720): the column of small Readouts (9.5vh digits, each with a Remove pill) was taller than the stage in Passing Period and before school.
- Phone (390 x 844): `.clock-screen.is-editing`'s 24vh lost to the agenda-and-prompt rule (12svh) and wasn't small enough for Experience Week; the Remove pills and edit note left the agenda 1-31px.

Fix (smaller text, as Eric chose; the controls and edit note stay):

- `clock.css` short layout: edit mode's digits are `calc(30vh - rooms)`, and `calc(24vh - rooms)` while the prompt shows, under a selector that repeats the prompt rule's so it wins. Remove pills are 32px tall with 13px text, like the short layout's other buttons.
- `timer.css` short layout: in edit mode the ring steps down to 34vw on the left and the other Readouts wrap in rows beside it.
- `clock.css` beside layout: edit mode's small Readout digits are `clamp(22px, 6vh, 72px)`.
- `clock.css` phone: edit mode's digits are 16vh, or 8svh with the agenda (both agenda selectors repeated so it wins); small Readouts 26px.
- `clock-hosting.test.js` guards all four (red before the fix), and the short layout's room test now counts four digit sizes.

`check:clock -- --editing` passes 55/55 for one, two and three Readouts, each with the prompt, `--sound-on` and `--timer`; also 33/33 at 480 x 320, 568 x 320 and 667 x 375 with and without the timer. Outside edit mode the default, three-Readout, `--sound-on` and `--timer` sweeps still pass 55/55.

Not fixed here: phones shorter than the default 390 x 844 (375 x 667, 360 x 740) still leave the agenda no room or spill in edit mode (375 x 667 fails one state even outside edit mode). That's ticket 52.
