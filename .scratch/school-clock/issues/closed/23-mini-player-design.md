# 23: The mini player in the design reference's look

**What to build:** The always-on-top mini player (Document Picture-in-Picture, Chrome and Edge desktop) is laid out to the design reference at about 320 × 180 and larger. It shows the big Readout, the current Segment with its Period Label, up next, and a dismiss button while something rings. It follows the teacher's theme, 24-hour and seconds settings, and stays hidden where the browser doesn't support it.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: mini player; user stories 76, 77). Design reference: `.scratch/school-clock/mockups/final/` (mini player layout). Built behaviour: closed ticket 14.

**Blocked by:** 17

**Status:** closed

- [x] The mini player matches the design reference at 320 × 180 and scales sensibly when resized larger
- [x] It uses the same theme tokens as the main page (and picks up 21's themes once they exist, without changes here)
- [x] It shows a running timer as the main Readout when one is running
- [x] The dismiss button is reachable by keyboard and stops the ring
- [x] Tests with a fake PiP capability check the content and the dismiss button, not styling
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

## Comments

**2026-10-30: built on `school-clock-23`.**

- **Layout:** `mini-player.js` draws the design's one column of three rows into the window (320 × 180 to start): the head ("Period 3 · AP CSA", "Passing Period", "Timer", or a bell and "Ringing · Period 3 ends" in `--accent-text`), the big Readout (`min(50vh, width cap)` by the main page's unit rule; the caption is kept for screen readers only), and the foot (the just-this-Segment bar with "ends 11:15 AM"; "UP NEXT Period 4 · Prep" in a Passing Period and before school; "42:15 left in Period 3" under a timer; a full-width accent Dismiss while ringing, over a 6px flash frame that holds steady under reduced motion). Its own `mini-player.css` is loaded only in the window, after `tokens.css`, `themes.css` and `clock.css`; it names no colour (a hosting test checks it and that every sheet exists). Every size is in vh/vw, so a bigger window scales up.
- **Words:** `mini-content.js` (pure, `@ts-check`) works out the head, Readout and foot from the moment, the settings (Period Labels, 24-hour, seconds), the big Readout's parts and the timer. The ring's title comes from 18's `ringWords()`. `readouts-view.js` now exports `writeValue` so both views write digits the same way. `clock.js`'s old `statusHeading` / `upNextText` are gone.
- **Theme:** the window copies every `data-*` attribute (and `lang`) from the page's `<html>` when it opens, follows changes with a MutationObserver, and copies again on every render, so 21's look sheet previews live in it. It stops following once closed.
- **Dismiss:** a plain button that stays in place across ticks (focus isn't lost), and stops the ring like the main card.
- **Tests (Seam 2, fake PiP):** content per state (Segment with Period Label, Passing Period, before school, timer running and paused, timer in a Passing Period, before a Division, unknown date, day off), 24-hour and seconds off, ringing head, bell and Dismiss, stylesheets, theme following until closed.
- **Screenshots** (harness iframe standing in for PiP, kept outside the repo): mini, passing, ringing and timer at 320 × 180 (dark and light), 480 × 270 and 640 × 360 next to the reference, plus the Team and Paper themes. They match the reference; 0 axe violations, no scroll, no page errors.
- **Different from the reference, for later:** under a timer the head is "Timer" (or "Timer · paused") without "of 5:00", and there's no timer bar: the timer doesn't store its total yet. Ticket 22 can add both through `miniContent`'s `timer` argument. During a Segment the foot shows the bar and end time, not up next (as designed); up next shows in Passing Periods and before school.
- **After merging 22:** the head under a timer is now "Timer of 5:00" ("Timer of 5:00 · paused"), and in a Segment the foot is the timer's own bar ("Timer progress", the share left, from 22's `timerProgress`) with "42:17 left in Period 3", as the reference has it. The foot's `line` kind is gone. In a Passing Period the foot still shows up next under a timer.
