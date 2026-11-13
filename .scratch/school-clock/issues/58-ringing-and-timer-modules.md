# 58: Rings and the Timer each get a module of their own, out of clock.js

**Priority:** medium

**What to build:** A refactor with no visible change. The life of a ring (it comes due, plays, shows, then stops by itself or is dismissed) is spread across about 8 closures in `clock/clock.js`: `scheduleSounds`, `ringing`, `timerRinging`, `rangTimer`, `startRinging`, `settleRinging`, `stopRinging`, `dismiss`, `tick`'s ring loop, and `testRing` in the drawer. How long a ring lasts (`ringSeconds`/`shownSeconds`, now in `sound.js`) is worked out at 3 call sites. The stale, grace and lookahead rules mix real time and clock time inline. Timer ringing state leaks into `shownTimer`, which 3 views read.

The Timer's own rules live in the same closure: `savedTimer`, the rule that simulated time never touches the saved Timer, and `settleSavedTimer` (called from 3 places). The Timer is stored as 4 flat settings fields that `ringsInWindow` also reads.

Move these behind two modules with small interfaces that tests can drive without the DOM:

- A ringing module owns which rings are due (stale cutoff), the sound window handed to the `SoundPlayer` (grace and lookahead, ring keys, ring-length policy), the ringing stack, and the memory of the Timer that rang.
- A Timer module owns the tab's Timer state and the simulated-time rule.

`clock.js` keeps only the DOM side (the ring card, mount classes, focus). Ring-length policy moves out of `sound.js` into the ringing module. `sound.js` keeps synthesis only.

The existing clock-page tests are the safety net: they must pass unchanged. New behaviour tests go through the new modules' interfaces.

Source: architecture review, 2026-11-12, candidates 1 and 4.

**Blocked by:** None

**Status:** open

- [ ] Ringing and Timer logic tested through their own modules, with no DOM
- [ ] `clock.js` no longer holds `ringing`, `timerRinging`, `rangTimer`, `savedTimer` or the stale, grace and lookahead arithmetic
- [ ] Ring length is worked out in one place
- [ ] Existing clock-page tests pass
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
