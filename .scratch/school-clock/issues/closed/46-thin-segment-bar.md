# 46: "Just this Segment" is a thin solid bar, with no name

**Priority:** medium

**What to build:** With the bar set to **Just this Segment**, the bottom of the screen shows a thin, solid bar that fills up as the Segment goes by (around 10 px thick; pick what reads well on a projector and a laptop). Today it's an empty rounded box that fills, with the Segment's name inside. The name goes, because the clock already shows it above. In Off-Hours (ticket 41's countdown) the name of the next Segment ("Until Period 1") goes too.

What stays: the times at each end (the start on the left, the end on the right, and ticket 34's end time when "Show period end time" is on) and the Off-Hours heading (the Next School Day's date and Day Label). Screen readers still hear what the bar counts down to, as they do today.

**Whole day** is unchanged. On phones, Just this Segment is still a bar, not the agenda.

Eric's words: "when showing just this segment on the bottom of the screen, don't show the name of the segment, (or, in the case of after school, the next segment to come). This is because that information is already showing elsewhere on the clock. Make it just a thin solid bar that fills up … not a empty squircle that fills up." In a follow-up he chose to keep the times and the heading.

Built behaviour: closed tickets 20 (Day Strip), 34 (end time on the current block), 41 (Off-Hours countdown), 42 (tapping the bar in edit mode).

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Just this Segment, during a Segment, a Passing Period and Off-Hours: a thin solid fill bar, about 10 px, with no Segment name and no next-Segment name
- [x] The times at each end, the period end time (setting on) and the Off-Hours heading still show
- [x] Screen-reader text and the progress bar's name still say what it counts ("Period 3 progress", "Until Period 1, …")
- [x] Whole day and the phone agenda are unchanged; the edit-mode tap (ticket 42) still works on the thin bar
- [x] `npm run check:clock` at the default sizes, for period, passing, before and after school, looks right
- [x] Tests cover the view without the name
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

Built: on Just this Segment the block draws no name text at all (no `.clock-bar__text`), and `clock.css` turns the track into a `max(10px, 1vh)` rounded bar on `--track`, filled in solid `--accent` up to `--done`, with no border, pattern or wash for any kind (Segment, Passing Period, countdown). The times at each end, the Off-Hours heading, the Now marker, the screen-reader text and the progressbar's name are as before. Whole day and the phone agenda are untouched. Checked with `npm run check:clock --settings '{"dayStrip":false}'` for period, passing, before and after at the default sizes (480x320 hides the bar, as before), and `--editing` at 1280x720.
