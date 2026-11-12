# 41: "Just this Segment" in Off-Hours: a thin countdown bar

**Priority:** medium

**What to build:** Today the bar's "Just this Segment" setting only does anything while a Segment or Passing Period is on. Before school, after school and on days off there's no current Segment, so the bar falls back to the Next School Day's whole-day bar, and the setting looks ignored. Eric noticed: "regardless of the setting, it seems that the whole day version shows whenever school is over?"

With "Just this Segment" chosen, Off-Hours instead shows **one block that counts down to the Next School Day's first Segment**. It looks like the just-this-Segment bar does during a Segment: it fills as time passes, the left end is when the countdown started, and the right end shows the first Segment's start time. It's headed with the Next School Day's date and Day Label, as the whole-day bar of that day already is. The countdown starts when the last School Day's last Segment ended (after school, through days off); before school it starts at the same point, the previous School Day's end. Where no earlier School Day is known (the first day of a School Year), pick a sensible start (e.g. midnight) and note it on the ticket.

"Whole day" is unchanged. Summer, Experience Week and dates outside every School Year still show no bar. The bar still hides while the timer has the big spot. On phones, where whole day becomes the agenda list, the countdown is a bar, as just this Segment already is.

Built behaviour: closed tickets 20 (Day Strip), 34 (current block end). The rules for what the bar shows are pure and tested without a page.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Just this Segment, before school, after school and on a day off: one countdown block to the Next School Day's first Segment, filling as time passes, with its start time and the next day's heading
- [ ] Whole day, Summer, Experience Week, unknown dates and the timer-in-the-big-spot case are unchanged
- [ ] The countdown's start is the last School Day's end; the first-day-of-the-year edge case is decided and noted
- [ ] Screen-reader text for the block says what it counts down to ("Until Period 1, Mon, Nov 16 at 8:00 AM" or similar)
- [ ] Off-Hours wording that steps aside for the bar's heading (ticket 35) still behaves
- [ ] Tests cover the pure bar (each Off-Hours state, start and end, fill) and the view
- [ ] `npm run check:clock` screenshots of before school, after school and a day off at the default sizes look right
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-11: decided in grilling.** Eric picked "a thin countdown" over hiding the bar or keeping today's whole-day fallback.
