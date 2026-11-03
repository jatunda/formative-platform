# 12: Sound — generated voices, the "turn sound on" click, and Bells ringing

**What to build:** With Bells turned on, the plain `/clock` page plays a Bell on time at Segment edges, even while the tab is behind other windows.

**Sound:**
- every sound is generated in the browser from a few named voices (chime, school bell, beep, buzzer), with no audio files;
- after each page load, a visible "turn sound on" control is shown until the teacher clicks it;
- Bells play about 3 seconds and stop on their own;
- Alarms repeat until dismissed, for at most 60 seconds;
- one volume control, plus a preview for each voice.

**Visual:** when something rings, the screen flashes (under 3 flashes per second), with a steady highlight under `prefers-reduced-motion`.

**Plain page controls:** turn sound on, a Bells toggle, dismiss, and a test ring.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: sound engine, visual ringing; user stories 56, 59–71). Vocabulary: **Bells**, **Alarm** in `web/clock/CONTEXT.md`.

**Blocked by:** 09, 10

**Status:** closed

- [x] The voices are generated with Web Audio; no audio assets are added to hosting
- [x] Rings from the "rings in a window" query are scheduled ahead on the audio clock for a lookahead window, and rescheduled when settings change, when the tab becomes visible, and when the window rolls over. No ring plays twice or is skipped across a window boundary
- [x] The audio context starts suspended. The "turn sound on" control resumes it on click, and shows again whenever the context is suspended
- [x] Bells play about 3 s. Alarms repeat until dismissed or 60 s. Dismiss stops the current ring
- [x] The volume and the chosen sounds come from saved settings (10)
- [x] The flash stays under 3 per second; the reduced-motion variant is a steady highlight; colour is not the only signal
- [x] The sound player is passed into the page. Tests use a fake player: scheduled times match the rings, the prompt shows while suspended, dismiss works, the flash class toggles, and reduced motion is respected
- [x] Under simulated time (06), rings are mapped onto the audio clock using the speed factor, so `?at=…&speed=60` plays Bells at the right simulated moments
- [x] The page states plainly that the tab must stay open for sounds
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-10-29: built on `school-clock-12`.** Sound engine `web/clock/sound.js` (`createSoundPlayer`, four Web Audio voices, no files); the page schedules `ringsInWindow` for [now − 1 s, now + 5 min real) onto the audio clock (÷ `&speed=`), redone on settings change, tab shown, sound turned on and at half the window. Rings carry stable keys so the player keeps ones it has (no double play) and drops pending ones no longer wanted (Bells off). Decisions: the flash runs on page ticks (it's visual, so throttling while hidden doesn't matter) and is 1 flash/s with a thick outline plus a "Ringing: …" banner; a ring that's still going and a new one extend the same banner; Dismiss stops every sounding ring (Bells too) but not future ones; the test ring plays the Bells sound as a Bell; a "Bell sound" select sits next to the volume and previews in the settings; the Bells toggle, Turn sound on, Test ring and the "keep this tab open" note sit in a "Sound" section on the main screen; without Web Audio the page says "Sound isn't available in this browser."
