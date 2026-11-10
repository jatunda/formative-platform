# 29: "20:00 timer" instead of "Timer of 20:00"

**Priority:** low

**What to build:** Say a timer's length the way people say it. The "time is up" card already says "5:00 timer" (`ring-words.js:65`). Make these match it:

- Mini player head: "Timer of 5:00" / "Timer of 5:00 · paused" → "5:00 timer" / "5:00 timer · paused" (`mini-content.js:70`)
- Under the timer ring's title: the "of 5:00" line (`timer-ring.js:61`). Pick the clearest wording, e.g. the title reads "5:00 timer" and the extra line goes away
- Screen-reader label "Timer, running, 3:00 left of 5:00" (`timer.js:203`) → e.g. "5:00 timer, running, 3:00 to go"

**Blocked by:** none

**Status:** closed

- [x] No "Timer of" / "of 5:00" text remains; a timer with no known total still just says "Timer"
- [x] Tests updated
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-10: built on `worktree-agent-adc5e14db7a60c5d7`.**

- **One name:** `timer.js` has a new `timerName(totalMs)`: "5:00 timer", or just "Timer" when the length isn't known. The mini player's head, the ring's title and the "time is up" card (`ring-words.js`) all use it, so they can't drift apart.
- **Mini player head:** "5:00 timer" / "5:00 timer · paused". A saved timer from before lengths were kept says "Timer".
- **Ring title:** "5:00 timer", or (with the pause icon) "5:00 timer · paused". The muted "of 5:00" span and its `.clock-ring__of` rule are gone. `timerRingView` returns `name` in place of `total`.
- **Screen-reader label** (the ring's digits and the big Readout): "5:00 timer, running, 4:12 to go", "5:00 timer, paused, 4:00 to go". Once it has rung it's just "1:00 timer, time's up" (the old "0:00 left" said nothing new).
- **Tests:** the `timerRingView` unit tests, the ring and display page tests, and the mini player head. A new mini player test checks that a saved timer with no length says just "Timer".
- **Screenshots** (`check:clock` with a seeded running 5:00 and paused 10:00 timer, at 1920 × 1080, 480 × 320 and 390 × 844): the title fits on one line at every size; 0 axe violations, no scroll, no page errors.
