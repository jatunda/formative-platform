# 29: "20:00 timer" instead of "Timer of 20:00"

**Priority:** low

**What to build:** Say a timer's length the way people say it. The "time is up" card already says "5:00 timer" (`ring-words.js:65`). Make these match it:

- Mini player head: "Timer of 5:00" / "Timer of 5:00 · paused" → "5:00 timer" / "5:00 timer · paused" (`mini-content.js:70`)
- Under the timer ring's title: the "of 5:00" line (`timer-ring.js:61`). Pick the clearest wording, e.g. the title reads "5:00 timer" and the extra line goes away
- Screen-reader label "Timer, running, 3:00 left of 5:00" (`timer.js:203`) → e.g. "5:00 timer, running, 3:00 to go"

**Blocked by:** none

**Status:** open

- [ ] No "Timer of" / "of 5:00" text remains; a timer with no known total still just says "Timer"
- [ ] Tests updated
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
