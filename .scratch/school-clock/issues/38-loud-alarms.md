# 38: Loud alarm sounds

**Priority:** low

**What to build:** Three more loud voices for teachers who want an Alarm nobody can miss. They're available in every sound picker (in A–Z order, per 37):

- **Digital alarm clock**: the bedside alarm from the movies. A square-wave beep in quick groups of four ("beep-beep-beep-beep"), a short pause, then again.
- **Twin-bell alarm clock**: the wind-up clock with two bells on top. A hammer rattling very fast between two small, slightly different-pitched bells: a metallic, jangling trill.
- **Ship's klaxon**: a general-alarm horn like on a navy ship. A harsh, buzzy horn note (a "ah-OO-gah" rising sweep, or a pulsing honk), repeated with gaps.

Leave out anything that sounds like a building fire alarm or an emergency siren (the rising-falling wail or the fire-alarm horn-and-strobe pattern). On a projector in a school, that could set off a real panic.

Like ticket 37's School bell, these are meant to be loud. Keep them within what laptop and projector speakers play cleanly. Each needs its own rhythm, so they can be told apart from each other and from Beep and Buzzer.

Eric's words: "a series of loud alarms - old school digital alarm clock like in all the movies, the classic alarm clock with two bells on it, physical school bell, blaring alarm like on a military vessel. Any other ideas you might have." (The school bell is ticket 37.) Eric chose to have these built straight away and to listen afterward, with no listening page first.

Built behaviour: closed tickets 12, 31/32 (sound engine, voice tests).

**Blocked by:** 37 (same sound list and A–Z order)

**Status:** ready-for-agent

- [ ] Three new voices, built like the others (Web Audio, no files), each listed in every sound picker in A–Z order
- [ ] Each plays once (preview), as a Bell that stops on its own (finishing its last pass, per 36), and on repeat as an Alarm, with scheduled rings never playing twice
- [ ] None resembles a fire alarm or an emergency siren
- [ ] Older saves load unchanged
- [ ] Tests check each voice's shape (rhythm, pitch range) with the fake audio context, and how many times it plays in a Bell
- [ ] A comment on the ticket asks Eric to listen to the three on laptop speakers
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass
