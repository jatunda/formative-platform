# 36: Bells that stop on their own finish their sound; slower Clock tower

**Priority:** medium

**What to build:** Today a Bell that stops on its own is cut off exactly 5 seconds after it starts, mid-voice. With Clock tower (about 6 s per pass) that chops off the end of the chime. Change it so that **no new pass of the voice starts after 5 s, but the pass already playing finishes naturally**. The ring card (and the mini player's ring) closes when the sound actually ends, not at 5 s. A voice shorter than 5 s still repeats until 5 s, then finishes its last pass.

Also make Clock tower slightly slower (a lower tempo): more time between strikes and between its two phrases, so it sounds like a real tower chime, not a hurried one. Its pitches and tubular-bell timbre stay the same.

Eric's words: "autodismiss alarm of 5 seconds should play until the end of the sound (most notably for the clock tower sound, i want to hear it to the end!) Also, make the clock tower sound slightly slower (lower tempo)".

Built behaviour: closed tickets 24 (Bells auto-dismiss: the audio-clock cut-off, the list of what's ringing), 12 (sound engine).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A Bell that stops on its own starts no new pass after 5 s, and the pass playing at 5 s plays to its natural end (no cut, no fade mid-note)
- [ ] The ring card and the mini player's ring close when that sound ends, still on time in a throttled background tab (worked out from the audio schedule, not a timer counting the sound)
- [ ] "Ring Bells until you dismiss them", Alarms and the timer are unchanged; Dismiss (button, Escape, mini player) still stops the sound at once
- [ ] An Alarm or the timer ringing alongside a Bell is still not cut short by it
- [ ] Clock tower is slower; one pass still plays in full on a Bell and repeats cleanly on an Alarm
- [ ] The **Bells** entry in the School Clock `CONTEXT.md` still reads true (update it if "a few seconds" no longer fits)
- [ ] Tests (fake clock, fake audio) cover: a long voice finishing past 5 s, a short voice repeating then finishing, the card closing when the sound ends, Dismiss mid-pass
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass
