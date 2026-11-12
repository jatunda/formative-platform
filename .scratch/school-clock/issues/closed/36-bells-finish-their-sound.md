# 36: Bells that stop on their own finish their sound; slower Clock tower

**Priority:** medium

**What to build:** Today a Bell that stops on its own is cut off exactly 5 seconds after it starts, mid-voice. With Clock tower (about 6 s per pass) that chops off the end of the chime. Change it so that **no new pass of the voice starts after 5 s, but the pass already playing finishes naturally**. The ring card (and the mini player's ring) closes when the sound actually ends, not at 5 s. A voice shorter than 5 s still repeats until 5 s, then finishes its last pass.

Also make Clock tower slightly slower (a lower tempo): more time between strikes and between its two phrases, so it sounds like a real tower chime, not a hurried one. Its pitches and tubular-bell timbre stay the same.

Eric's words: "autodismiss alarm of 5 seconds should play until the end of the sound (most notably for the clock tower sound, i want to hear it to the end!) Also, make the clock tower sound slightly slower (lower tempo)".

Built behaviour: closed tickets 24 (Bells auto-dismiss: the audio-clock cut-off, the list of what's ringing), 12 (sound engine).

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] A Bell that stops on its own starts no new pass after 5 s, and the pass playing at 5 s plays to its natural end (no cut, no fade mid-note)
- [x] The ring card and the mini player's ring close when that sound ends, still on time in a throttled background tab (worked out from the audio schedule, not a timer counting the sound)
- [x] "Ring Bells until you dismiss them", Alarms and the timer are unchanged; Dismiss (button, Escape, mini player) still stops the sound at once
- [x] An Alarm or the timer ringing alongside a Bell is still not cut short by it
- [x] Clock tower is slower; one pass still plays in full on a Bell and repeats cleanly on an Alarm
- [x] The **Bells** entry in the School Clock `CONTEXT.md` still reads true (update it if "a few seconds" no longer fits)
- [x] Tests (fake clock, fake audio) cover: a long voice finishing past 5 s, a short voice repeating then finishing, the card closing when the sound ends, Dismiss mid-pass
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-11: built on `ticket-36`.**

- **Bell-ending rule (for every voice, old and new):** a `ScheduledRing`'s (and `play()`'s) `seconds` now means "start no new pass after this"; the pass already playing finishes untouched (no cut, no fade). Nothing to do per voice: a new voice just returns its period like the others. `sound.js` exports `ringLength(sound, seconds)`, worked out by running the voice on a silent stand-in context, so it always matches what the player schedules.
- **Screen:** `clock.js` asks `ringLength(sound, 5)` for how long a Bell's card (and the mini player's ring) shows, counted from when it came due, so it closes when the sound ends even in a throttled tab. School bell now shows 5.6 s, Clock tower 6.6 s, Chime 6 s. Alarms, the timer and "Ring Bells until you dismiss them" are unchanged; Dismiss still stops the sound at once.
- **Clock tower:** a strike every 0.6 s (was 0.45), the second phrase 3 s after the first (was 2.2), repeating every 7.5 s (was 6). One pass lasts 6.6 s. 7.5 rather than 8 keeps an Alarm's last pass ending inside its 60 s.
- **Wording:** the drawer hint now reads "Otherwise each Bell plays for about 5 seconds, finishes its sound, then stops on its own."; the **Bells** entry in `web/clock/CONTEXT.md` says the same.
