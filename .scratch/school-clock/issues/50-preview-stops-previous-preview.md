# 50: Previewing a sound stops the sound previewed before it

**Priority:** medium

**What to build:** When a teacher previews a sound (Bell sound, Timer sound, the Alarm editor's Sound, and Test ring if it counts as a preview), any sound still playing from an earlier preview stops first, so two previews never overlap. Only previews stop: a Bell, an Alarm or the timer that is really ringing keeps ringing, and a preview never stops one.

Eric's words: "when you start previewing a new sound, it should stop playing the previously previewed sound. Only should stop previewed sounds, not actual alarms/bells."

Built behaviour: closed tickets 12 (sound engine), 24 and 36 (what's ringing and how a Bell ends).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Starting a preview stops an earlier preview still playing, in every sound picker
- [ ] A ringing Bell, Alarm or timer is never stopped by a preview
- [ ] Tests (fake audio) cover: preview over preview, preview during a ringing Bell, preview during an Alarm
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass
