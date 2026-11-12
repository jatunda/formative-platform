# 44: Short layout: the sound prompt and cycle hint crowd the line

**Priority:** low

**What to build:** On the short (landscape phone) layout, at 480 × 320 with three Readouts, while the "Sound is off" prompt and the click-to-cycle hint both show, the stage grows up into the top bar and the line under the Readouts ends up behind the prompt. It happens with "Ends 11:15" (ticket 40) during a Segment and with Up next before school, so it predates 40. Both prompts go away on their own (sound turned on, the hint after a few seconds), which is why 40 left it alone.

Make the line stay visible and the stage stay below the top bar while both show, in the short layout's existing style for the prompt (it already shrinks the digits while the prompt shows).

Found while building ticket 40 (see its `## Comments`). Built behaviour: closed tickets 25/35 (short-layout rules for the line), 27 (cycle hint), 40, 43 (phone height and the prompt).

**Blocked by:** None (can start immediately)

**Status:** needs-triage

- [ ] At 480 × 320 with three Readouts, prompt and cycle hint showing: nothing overlaps the top bar, and the line is fully visible during a Segment (setting on) and before school
- [ ] Other sizes and states are unchanged
- [ ] `npm run check:clock` at 480 × 320 with three Readouts and the prompt showing looks right
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass
