# 40: The line under the Readouts says when this Period ends

**Priority:** medium

**What to build:** With the "Show when this Period ends" setting on (ticket 34), the line under the Readouts also shows the current Segment's end during a Segment. It's styled like the "Up next" line a Passing Period shows: a small label, then the time. For example "Ends 11:15" (or "Ends 11:15 AM"), following the 24-hour setting. The Day Bar keeps showing the end on its current block as well, so this adds to 34 rather than replacing it.

With the setting off, or outside a Segment (Passing Period, Off-Hours), the line is unchanged: Up next during a Passing Period and before school, the Off-Hours line otherwise. The setting's hint in the Settings drawer is updated to say it shows in both places.

Eric's words: "show end of period setting also shows the end of period on the Line below the clock (similar to how during a passing period there is an Up Next line)".

Check it against the layouts that already crowd that line: the timer in the big spot, the short (landscape phone) layout, the phone layout, and the click-to-cycle hint under the first Readout (ticket 27 and the latest commit).

Built behaviour: closed tickets 34 (`showPeriodEnd`), 25/35 (the line's wording and short-layout rules), 27 (cycle hint).

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] During a Segment with the setting on, the line reads like "Ends 11:15", in the Up next style, following the 24-hour setting
- [x] Setting off, Passing Periods, before school and Off-Hours: the line is unchanged
- [x] The drawer hint for the setting mentions the line
- [x] Screen readers get a sensible reading ("Ends 11:15 AM")
- [x] `npm run check:clock` with the setting on looks right for period, break and assembly at every default size, with and without the timer showing, and the cycle hint doesn't overlap it
- [x] Tests cover the pure wording (on, off, each state, 24-hour) and the view
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-11: built.** With "Show when this Period ends" on, the line under the Readouts reads "Ends 11:15 AM" (24-hour: "Ends 11:15") during any Segment (Period, Break or Assembly), in the Up next style: the small accent label, then the muted time. Screen readers hear "Ends 11:15 AM". The Day Bar still shows the end on its current block.

- `display-text.js`: `DisplayText` has `ends` (the current Segment's end, or null), set only in a Segment with `showPeriodEnd` on. Passing Periods and before school keep Up next; Off-Hours keep their line. `showPeriodEnd` is required in its settings; the mini player passes it off, since its foot already says "ends 11:15 AM".
- `stage-text-view.js`: the line uses the `clock-next` style with label "Ends". No CSS change: the phone layout puts the label above the time, as it does for Up next, and a running timer hides the line, as it hides Up next.
- Drawer hint: "The line under the clock says when this Period ends. In the bar along the bottom, the block you're in shows its end time too, where there's room."
- `check:clock` with `{"showPeriodEnd":true}` passed for period, break and assembly at every default size, with and without `--timer`, and with three Readouts. The cycle hint sits above the line with no overlap. One crowding that predates this ticket: at 480x320 with three Readouts, while the "Sound is off" prompt and the cycle hint both show, the stage runs up into the top bar and the line sits behind the prompt. Before school does the same with Up next today. Both prompts go away (sound on, hint after a few seconds), so I left it.
- `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass.
