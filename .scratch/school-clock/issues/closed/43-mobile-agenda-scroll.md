# 43: Bug: on phones the agenda doesn't scroll to the bottom

**Priority:** high

**What to build:** On a phone (narrow portrait), whole day becomes the agenda list, which scrolls on its own. Eric reports it "doesn't scroll all the way down. Schedule view pane too big?" The last rows can't be reached. Find out why and fix it so every row, including the last, can be scrolled fully into view, with the window button and the sound prompt (when it shows) still visible below it.

Likely suspects, unconfirmed: the agenda's grid or flex chain letting it grow taller than its row (a missing `min-height: 0` somewhere), the bottom area's rows when the sound prompt shows, the simulated-time banner's extra row, or the phone's browser bars (`100vh` versus the visible height). Reproduce it first, at real phone sizes (e.g. 375 × 667, 390 × 844, 360 × 740), with long Bell Schedules (All Day) and short ones, the sound prompt showing and not, and with `?at=` (the banner). Then fix the cause, not the symptom.

Built behaviour: closed ticket 20 (Day Strip, the phone agenda).

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] The cause is found and written in a comment on this ticket
- [x] At phone sizes the agenda scrolls until its last row is fully visible, with nothing overlapping it, with and without the sound prompt and the simulated-time banner
- [x] The rest of the phone layout (Readouts, line, window button) doesn't shift or overflow; tablet and desktop are unchanged
- [x] `npm run check:clock` at the phone sizes above shows the bottom of the agenda reachable (screenshot scrolled to the end)
- [x] A test guards it where jsdom can (e.g. the structure or classes the fix relies on); the rest is checked in `check:clock`
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**Cause (two parts, both found with `npm run check:clock`, which now scrolls the agenda to its end and checks its last row is wholly on screen and uncovered, with the window button and sound prompt on screen too):**

1. **`.clock-screen { height: 100vh }`.** On a phone, 100vh is the height with the browser bars *hidden*, but the page never scrolls (`body { overflow: hidden }`), so the bars stay shown and the screen ran its bottom under them: the agenda's last rows, the window button and the sound prompt sat below the visible area with no way to reach them ("pane too big"). Headless Chromium has no browser bars, so the new `--bars N` option fakes them the way a phone does (html's `100%`, the initial containing block, shrinks by N px; 100vh stays the full screen). At 375×667, 390×844 and 360×740 with `--bars 100 --sound-on` every All Day render went red (e.g. last row at 595 on a 567 visible height). Fix: the screen is `height: 100%` (the chain html → body → #clockApp is already 100%, i.e. the visible height). The dialog's and Look sheet's `max-height: calc(100vh - …)` had the same flaw and are now `100dvh`.
2. **The sound prompt on a short phone.** Once the screen fit, short visible heights (e.g. 375×567, an iPhone SE in Safari with its bars) with the sound prompt showing left the agenda 1–28px tall: the stage (banner, controls, title, width-capped digits, hint, Up next) plus the three-line prompt took everything, so not even one row fit. Fix: on a phone, while the whole-day agenda *and* the sound prompt show, `--type-digits: 12svh` (svh: the visible height with the bars shown), the same move the short layout already makes for the prompt. Without the prompt the digits are as before.

**Checked:** `check:clock` passes at 375×667, 390×844, 360×740 and at their visible heights with bars (375×567, 375×611, 390×744, 360×640), every default state, with and without the prompt (`--sound-on`), all with the simulated-time banner (`?at=`), axe clean; `--bars 56` passes at the three sizes. `--bars 100` without `--sound-on` still flags `before` at 375×667 only because desktop Chromium can't shrink svh along with the fake bars (the header says so); the same layout at `--size 375x567` passes. Default sizes (desktop/tablet, 480×320) 55/55, unchanged. Guard: `clock-hosting.test.js` checks the screen is `height: 100%` down the chain, the prompt rule's digits are in `svh`, and no page sheet sizes anything to `100vh`.
