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

**Status:** ready-for-agent

- [ ] The voices are generated with Web Audio; no audio assets are added to hosting
- [ ] Rings from the "rings in a window" query are scheduled ahead on the audio clock for a lookahead window, and rescheduled when settings change, when the tab becomes visible, and when the window rolls over. No ring plays twice or is skipped across a window boundary
- [ ] The audio context starts suspended. The "turn sound on" control resumes it on click, and shows again whenever the context is suspended
- [ ] Bells play about 3 s. Alarms repeat until dismissed or 60 s. Dismiss stops the current ring
- [ ] The volume and the chosen sounds come from saved settings (10)
- [ ] The flash stays under 3 per second; the reduced-motion variant is a steady highlight; colour is not the only signal
- [ ] The sound player is passed into the page. Tests use a fake player: scheduled times match the rings, the prompt shows while suspended, dismiss works, the flash class toggles, and reduced motion is respected
- [ ] Under simulated time (06), rings are mapped onto the audio clock using the speed factor, so `?at=…&speed=60` plays Bells at the right simulated moments
- [ ] The page states plainly that the tab must stay open for sounds
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
