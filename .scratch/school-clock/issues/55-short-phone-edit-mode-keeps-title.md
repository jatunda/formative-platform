# 55: On short phones, edit mode keeps the title and shrinks further instead

**Priority:** medium

**What to build:** Ticket 52 made room on short phones (portrait, under 760 px tall, e.g. 375 × 667 and 360 × 740) by also hiding the Segment's title ("Period 3") and the Up next line while the Readouts are being edited. Eric chose to keep them: in edit mode on a short phone, the title and the line under the Readouts stay visible, and the Readouts (and their edit controls) shrink further to make the room instead. The agenda still keeps its minimum of about three rows, and nothing scrolls except the agenda.

If the line can't fit at the smallest sizes even with the digits at their floor, keep the title and drop only the line there, and say so on this ticket.

The short (landscape) layout and 390 × 844 and taller phones are unchanged: the landscape layout keeps hiding the title in edit mode, as it did before 52.

Eric's words: "shrink" (asked whether to keep hiding the title and Up next in short-phone edit mode, or keep the title and shrink further).

Built behaviour: closed tickets 45 (edit mode's stage), 52 (short phones: `--fit-h`, `--agenda-min`, the shared edit-mode hiding rule for both short layouts).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] At 375 × 667 and 360 × 740 in edit mode, the title shows (and the line, unless noted), with one, two and three Readouts, sound prompt showing and not, timer on and off
- [ ] The agenda keeps its three-row minimum; nothing but the agenda scrolls
- [ ] The landscape short layout and 390 × 844+ are unchanged
- [ ] `npm run check:clock:full` passes with `KNOWN_FAILURES` empty
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass
