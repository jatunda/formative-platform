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

**Status:** closed

- [x] Three new voices, built like the others (Web Audio, no files), each listed in every sound picker in A–Z order
- [x] Each plays once (preview), as a Bell that stops on its own (finishing its last pass, per 36), and on repeat as an Alarm, with scheduled rings never playing twice
- [x] None resembles a fire alarm or an emergency siren
- [x] Older saves load unchanged
- [x] Tests check each voice's shape (rhythm, pitch range) with the fake audio context, and how many times it plays in a Bell
- [x] A comment on the ticket asks Eric to listen to the three on laptop speakers
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-11: built.** Three new loud voices, all Web Audio, listed A to Z in every picker:

- **Digital alarm clock** (key `digitalAlarm`): four quick 1 kHz square-wave beeps (70 ms each, one every 0.12 s), then a pause, once a second. Five groups in a Bell.
- **Twin-bell alarm clock** (key `twinBell`): a hammer rattling 32 times a second between two bells about a semitone apart (1100 and 1180 Hz, with an out-of-tune partial each), in one 2 s trill, then a gap, once every 3 s. Two trills in a Bell.
- **Ship's klaxon** (key `klaxon`): a buzzy sawtooth-and-square horn that sweeps up from 420 to 640 Hz and holds for about a second, then a gap, once every 2 s. Three honks in a Bell. There's one rise per honk with silence after, so there's no rising-and-falling wail and it can't pass for a siren.

All three stay between about 400 Hz and 3 kHz. Every Alarm ends inside 60 s. Saves made before these voices load unchanged; the new keys only add to the list.

**For Eric:** please listen to all three on laptop speakers (Settings, Bell sound, then each one: Preview, and once as a Bell; an Alarm set to one of them for the repeat). Check each is loud but doesn't distort, that you can tell them apart from each other and from Beep, Buzzer and School bell, and that the klaxon doesn't read as an emergency siren in your room.
