# 51: Sound tweaks: School bell (softer), a gapless klaxon, a slower Clock tower, a harsher School bell

**Priority:** medium

**What to build:** Four changes to the voices.

1. **Rename** "Soft bell" to **"School bell (softer)"**, in sentence case like the other names. It sorts A–Z right after "School bell". Saves that picked it (and older ones from before ticket 37) still play it.
2. **Ship's klaxon** loops with no break: each pass runs straight into the next, as one continuous blare. It still plays once as a preview, finishes its last pass as a Bell (ticket 36's rule), and stops within the Alarm limit.
3. **Clock tower** is slightly slower again (a lower tempo than ticket 36 left it). Its pitches and sound stay the same, and its last Alarm pass must still end inside the limit.
4. **School bell** (the loud one from ticket 37) is more annoying and more like a real school hallway bell: a hard, fast, harsh electric ring with plenty of rattle and metallic clang, and less "ding". Keep it within what laptop and projector speakers play cleanly (no deep bass, nothing piercing enough to distort).

Eric's words: "rename soft bell to School Bell (Softer)" (he chose sentence case: "School bell (softer)"); "make ship's klaxon loop without break in between"; "make clock tower slightly slower tempo"; "make the School bell sound more annoying, and more like a real school bell sound."

Built behaviour: closed tickets 12, 31/32 (voices and their tests), 36 (Bell ending, ring length), 37 (School bell, Soft bell, A–Z), 38 (klaxon), 50 (previews).

**Blocked by:** 50 (both change the sound engine)

**Status:** closed

- [x] "School bell (softer)" shows in every picker in A–Z order; old saves still play it
- [x] Ship's klaxon repeats with no gap; preview, Bell and Alarm behave as before; it never runs past the Alarm limit
- [x] Clock tower is slower; it still plays in full on a Bell and repeats cleanly on an Alarm
- [x] School bell is harsher and more like a real hallway bell; its shape test is updated (rattle rate, range)
- [x] The sound engine's design comment and the spec's sound list match
- [x] A comment on the ticket asks Eric to listen to the klaxon, Clock tower and School bell on laptop speakers
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

Built:

- **Rename:** the gentle bell shows as "School bell (softer)" in every picker, right after "School bell". Its saved key stays `softBell`, so saves that picked it (and the older `schoolBell` ones from before ticket 37) still play it with no migration.
- **Ship's klaxon:** one honk is now 1.25 s (the same 420 to 640 Hz sweep up, then a hold), and the next honk starts the moment it ends, its 12 ms fade-out under the next one's start, so there's no break. A preview is three honks (about 3.75 s); a Bell is four honks and ends at about 5 s; an Alarm's last honk ends at 60 s.
- **Clock tower:** a strike every 0.7 s (was 0.6), the second phrase 3.5 s after the first (was 3), repeating every 8.6 s (was 7.5). Same pitches and tubular bells. One pass lasts 7.4 s (was 6.6), so a Bell's card now stays up 7.4 s. An Alarm's last pass starts at 51.6 s and ends at 59 s, inside the minute (review fix: it first repeated every 8.8 s, which ended the last pass at 60.2 s).
- **School bell:** 26 hammer hits a second (was 20), each one hard, with the gong choked almost silent between hits (so it clatters, not dings), and it stops dead 0.2 s after the last hit (was a 0.4 s ring-out). Six clashing metal partials from 700 Hz to 2.9 kHz (was four, up to 3 kHz), each a pair 10 Hz apart so they beat roughly, plus band-passed noise around 2 kHz on every hit for the metallic clang. Still 3 s of ring and a short gap, every 4 s. `rattlingBell()` gained an optional `clatter` for the noise.
- The sound engine's design comment, the spec's story 56 and its Sound engine list now match.

**For Eric:** please listen on laptop speakers (Settings, Bell sound, then Preview; once as a Bell; and an Alarm set to each for the repeat) to **Ship's klaxon**, **Clock tower** and **School bell**. Check that the klaxon now blares on with no break and still doesn't read as an emergency siren in your room; that Clock tower feels a little slower but not draggy; and that School bell sounds like a real hallway bell, harsh and annoying, without distorting or getting piercing at full volume. If the School bell's clang is too much (or too little), its noise level is one number (`clatter.mix`) in `web/clock/sound.js`.
