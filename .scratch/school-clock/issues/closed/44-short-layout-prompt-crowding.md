# 44: Short layout: the sound prompt and cycle hint crowd the line

**Priority:** low

**What to build:** On the short (landscape phone) layout, at 480 × 320 with three Readouts, while the "Sound is off" prompt and the click-to-cycle hint both show, the stage grows up into the top bar and the line under the Readouts ends up behind the prompt. It happens with "Ends 11:15" (ticket 40) during a Segment and with Up next before school, so it predates 40. Both prompts go away on their own (sound turned on, the hint after a few seconds), which is why 40 left it alone.

Make the line stay visible and the stage stay below the top bar while both show, in the short layout's existing style for the prompt (it already shrinks the digits while the prompt shows).

Found while building ticket 40 (see its `## Comments`). Built behaviour: closed tickets 25/35 (short-layout rules for the line), 27 (cycle hint), 40, 43 (phone height and the prompt).

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] At 480 × 320 with three Readouts, prompt and cycle hint showing: nothing overlaps the top bar, and the line is fully visible during a Segment (setting on) and before school
- [x] Other sizes and states are unchanged
- [x] `npm run check:clock` at 480 × 320 with three Readouts and the prompt showing looks right
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-11: built.** Cause: the short layout sizes the digits from the viewport height alone (40vh, or 34vh while the sound prompt shows), so pieces of fixed height on top of them overflow the stage's row. The stage is centred, so it spills both ways, up into the top bar and down behind the prompt. Measured at 480 × 320 with three Readouts: the cycle hint adds about 26px, the simulated-time banner about 25px, and a line wrapped to two lines about 20px.

- `clock.css` (short layout): the digits subtract `--hint-room` (30px, while the cycle hint under the first Readout shows) and `--banner-room` (28px, in simulated time). These apply whenever the hint or banner is there, with or without the prompt and with any number of Readouts, because that's the room they take. Without them nothing changes.
- While the sound prompt shows, the window buttons sit in its row rather than floating over the stage, so the line drops its narrow max-width and stays on one line (Experience Week's "It's Experience Week · back Mon, Jan 25" wrapped and spilled 9px).
- `check:clock` has a new stage check: everything in the stage must stay inside its own row. It passes 55/55 in the default layout, 55/55 with three Readouts and the setting on, 33/33 at 480 × 320, 568 × 320 and 667 × 375, 22/22 with sound on, and with the timer. Before the fix it reported 24px above and 25px below for Period 3 at 480 × 320.
- The check also found edit mode spilling, which predates this ticket (44's smaller digits reduce it). That's ticket 45.
- `clock-hosting.test.js` guards both CSS rules.
