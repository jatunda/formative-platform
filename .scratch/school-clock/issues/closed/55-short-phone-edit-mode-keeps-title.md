# 55: On short phones, edit mode keeps the title and shrinks further instead

**Priority:** medium

**What to build:** Ticket 52 made room on short phones (portrait, under 760 px tall, e.g. 375 × 667 and 360 × 740) by also hiding the Segment's title ("Period 3") and the Up next line while the Readouts are being edited. Eric chose to keep them: in edit mode on a short phone, the title and the line under the Readouts stay visible, and the Readouts (and their edit controls) shrink further to make the room instead. The agenda still keeps its minimum of about three rows, and nothing scrolls except the agenda.

If the line can't fit at the smallest sizes even with the digits at their floor, keep the title and drop only the line there, and say so on this ticket.

The short (landscape) layout and 390 × 844 and taller phones are unchanged: the landscape layout keeps hiding the title in edit mode, as it did before 52.

Eric's words: "shrink" (asked whether to keep hiding the title and Up next in short-phone edit mode, or keep the title and shrink further).

Built behaviour: closed tickets 45 (edit mode's stage), 52 (short phones: `--fit-h`, `--agenda-min`, the shared edit-mode hiding rule for both short layouts).

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] At 375 × 667 and 360 × 740 in edit mode, the title shows (and the line, unless noted), with one, two and three Readouts, sound prompt showing and not, timer on and off
- [x] The agenda keeps its three-row minimum; nothing but the agenda scrolls
- [x] The landscape short layout and 390 × 844+ are unchanged
- [x] `npm run check:clock:full` passes with `KNOWN_FAILURES` empty
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-12: built.** In edit mode on a short phone the title now stays, and so does the line (Up next or the plain line), except in one case named below. The landscape short layout still hides both in edit mode, so the rule that hides them moved back into the short layout's block (no longer shared with short phones).

How the room is made, as Eric chose (the Readouts shrink further):

- Short-phone edit mode counts the title in its stage room and Up next's room (`--next-room`) in edit mode too, so `--fit-h` takes both out of the digits.
- The digits' floor is a custom property, `--fit-floor`: 32px as before, 22px in short-phone edit mode.
- The gap under the title before the big Readout is one base rule reading `--edit-big-gap`: `--gap-sm` as before, 8px on a short phone in edit mode, 0 in the short layout (it hid the title there anyway).
- Found while building: edit mode's closed-up small Readouts (22px digits, 4px gap) never applied with the agenda showing, because the agenda rule (`.clock-screen:has(.clock-bar--day:not([hidden]))`) set 26px / 12px and outranked `.clock-screen.is-editing`. The agenda rule is now under `:where()`, so edit mode's sizes win as ticket 52 meant.

**The line doesn't fit at the smallest size in one case.** At 375 x 667 in edit mode with the sound prompt showing, the line can't fit even with the digits at their floor (before school with the simulated-time banner and three Readouts was about 30px over). There, and only there (`max-height: 700px`, edit mode, sound prompt showing), the line steps away and gives its room back; the title stays. With sound on, the line shows at 375 x 667 too. At 360 x 740 (and 375 x 700, 360 x 701, 375 x 720) the line always shows.

With the timer, the title is hidden in every layout (`timer.css`, as before this ticket); the line shows.

`clock-hosting.test.js` guards: only the short layout hides the title and line in edit mode; short-phone edit mode counts Up next's room; the edit floor and title gap; the 375 x 667 prompt-only line drop; the agenda rule under `:where()` (red before the fix).

Checks: `check:clock` in edit mode at 375 x 667, 360 x 740, 375 x 700, 360 x 701 and 375 x 720 with one, two and three Readouts: 55/55 each; with the timer 22/22. The landscape short layout and 390 x 844+ rules are unchanged (the short layout's big Readout gap is still 0, now set through `--edit-big-gap`).
