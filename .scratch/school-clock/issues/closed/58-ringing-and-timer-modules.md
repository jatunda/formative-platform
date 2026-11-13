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

**Status:** closed

- [x] Ringing and Timer logic tested through their own modules, with no DOM
- [x] `clock.js` no longer holds `ringing`, `timerRinging`, `rangTimer`, `savedTimer` or the stale, grace and lookahead arithmetic
- [x] Ring length is worked out in one place
- [x] Existing clock-page tests pass
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-12: built.** No visible change. Two modules, each driven by its own tests with no DOM:

- `clock/ringing.js`, `createRinging({ realNow, speed, schoolYears })`: the life of a Ring. Six calls: `soundWindow(now, settings, audioNow)` gives the sound player its coming Rings (grace and lookahead, ring keys, each Ring's length; `audioNow` null while the player isn't playing, so the window still rolls forward); `advance(lastTick, now, settings, text)` lets go of Rings whose time is up, starts the ones that came due (skipping stale ones), remembers the Timer that rang, and returns `{ rang, soundWindowDue }` (`rang` for `alarmsAfterRinging`); `testRing(bells)` rings the Settings test Bell and returns what to play; `dismiss()`; `current()`, the newest Ring still ringing (`{ words }`, compared by identity) or null; `shownTimer(timer, now)`, the Timer's view while it runs, is paused, or has rung and still rings. Ring-length policy (`ringSeconds`/`shownSeconds`, now one private `lengthOf`) and `BELL_AUTO_DISMISS_SECONDS` moved here from `sound.js`, which keeps synthesis only (`ringLength` measures a voice); the Settings drawer imports the constant from here.
- `timer.js`, `createTabTimer(loaded, { simulated })`: this tab's Timer. `settings` is what the tab starts with (no Timer in simulated time), `toSave(settings)` puts the real saved Timer back in simulated time, `settle(settings, now)` clears a Timer whose end has passed (same object back when nothing changes).

`clock.js` no longer holds `ringing`, `timerRinging`, `rangTimer`, `savedTimer` or the stale, grace and lookahead constants. It keeps one `showRinging()` that brings the ring card, the mount's ringing classes, the sound prompt and the mini player in step with `current()` whenever it changes.

Design choice: two shapes were sketched. (A) A fine-grained stack mirroring the old closures (`start`, `settle`, `stop`, `dueRings`, `needsWindow`, `isRinging`, `rangTimer`, ...): about 10 calls, and `clock.js` would still sequence settle, stale-skip and start itself. (B) A coarse one where a tick is one `advance` call returning results, and the page reads `current()` and diffs it. B was chosen: 6 calls, and `clock.js` drops all ring state. The one cost is that two Rings coming due in the same tick show the card once (with the newest) rather than twice in a row; the end state is the same.

"Ring" was used in code but not defined, so `web/clock/CONTEXT.md` gains a **Ring** entry.

Tests: `__tests__/unit/clock-ringing.test.js` (new, 18) and two `createTabTimer` tests in `clock-timer.test.js`; the `ringSeconds`/`shownSeconds` tests left `clock-sound.test.js` (now covered through `soundWindow`/`advance`/`testRing`). The clock-page tests are unchanged and pass.

Checks in `web/`: `npm run lint`, `npm run typecheck` and `npm run test:coverage` clean (3532 tests; `ringing.js`, `clock.js` and `timer.js` at 100%). No CSS or layout change, so `check:clock:full` wasn't needed.
