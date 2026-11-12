# 50: Previewing a sound stops the sound previewed before it

**Priority:** medium

**What to build:** When a teacher previews a sound (Bell sound, Timer sound, the Alarm editor's Sound, and Test ring if it counts as a preview), any sound still playing from an earlier preview stops first, so two previews never overlap. Only previews stop: a Bell, an Alarm or the timer that is really ringing keeps ringing, and a preview never stops one.

Eric's words: "when you start previewing a new sound, it should stop playing the previously previewed sound. Only should stop previewed sounds, not actual alarms/bells."

Built behaviour: closed tickets 12 (sound engine), 24 and 36 (what's ringing and how a Bell ends).

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Starting a preview stops an earlier preview still playing, in every sound picker
- [x] A ringing Bell, Alarm or timer is never stopped by a preview
- [x] Tests (fake audio) cover: preview over preview, preview during a ringing Bell, preview during an Alarm
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

Built: the sound player has a `preview(sound)` that first silences the last preview if it is still playing, then plays the voice for about 3 s. It touches nothing else, so a Bell, Alarm or timer ringing (scheduled, or played the moment it came due) keeps ringing. Bell sound, Timer sound and the Alarm editor's Sound previews all use it. Test ring is not a preview: it shows a ring card and is dismissed like a Bell, so it stays on `play` and a preview never stops it. Dismiss still stops a preview along with everything else sounding. Spec line on preview length updated to match.
