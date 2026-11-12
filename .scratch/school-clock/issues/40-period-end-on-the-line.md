# 40: The line under the Readouts says when this Period ends

**Priority:** medium

**What to build:** With the "Show when this Period ends" setting on (ticket 34), the line under the Readouts also shows the current Segment's end during a Segment. It's styled like the "Up next" line a Passing Period shows: a small label, then the time. For example "Ends 11:15" (or "Ends 11:15 AM"), following the 24-hour setting. The Day Bar keeps showing the end on its current block as well, so this adds to 34 rather than replacing it.

With the setting off, or outside a Segment (Passing Period, Off-Hours), the line is unchanged: Up next during a Passing Period and before school, the Off-Hours line otherwise. The setting's hint in the Settings drawer is updated to say it shows in both places.

Eric's words: "show end of period setting also shows the end of period on the Line below the clock (similar to how during a passing period there is an Up Next line)".

Check it against the layouts that already crowd that line: the timer in the big spot, the short (landscape phone) layout, the phone layout, and the click-to-cycle hint under the first Readout (ticket 27 and the latest commit).

Built behaviour: closed tickets 34 (`showPeriodEnd`), 25/35 (the line's wording and short-layout rules), 27 (cycle hint).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] During a Segment with the setting on, the line reads like "Ends 11:15", in the Up next style, following the 24-hour setting
- [ ] Setting off, Passing Periods, before school and Off-Hours: the line is unchanged
- [ ] The drawer hint for the setting mentions the line
- [ ] Screen readers get a sensible reading ("Ends 11:15 AM")
- [ ] `npm run check:clock` with the setting on looks right for period, break and assembly at every default size, with and without the timer showing, and the cycle hint doesn't overlap it
- [ ] Tests cover the pure wording (on, off, each state, 24-hour) and the view
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass
