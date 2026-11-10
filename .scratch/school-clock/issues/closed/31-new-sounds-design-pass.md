# 31: Design pass for five new ring sounds

**Priority:** low

**What to build:** A creative design pass before adding five more sounds for Bells and Alarms. The clock has eight voices now, all made with Web Audio in `sound.js` (no audio files): Chime, Clock tower, Marimba, Desk bell, Wood block, School bell, Beep, Buzzer. New sounds must be clearly different from these and from each other, not variations on a chime or a beep.

1. Listen to the eight existing voices and write down what each is (pitch range, attack, length, character) so the gaps are clear. Some gaps to look into: a rising or falling melody, a soft pad or swell, something plucked or played on strings, a rhythm with no clear pitch, a playful or game-like cue, a low and calm tone, a bird or nature-like call.
2. Brainstorm about 10–12 candidates. For each, write one line on what it is, when a teacher would pick it (start of class, end of class, a quiet work-time alarm), and how it differs from the existing eight.
3. Build the candidates in a throwaway listening page using the same Web Audio approach as `sound.js`. Each should play in one click, next to the existing eight for comparison. The page is kept outside the shipped clock (e.g. under `.scratch/school-clock/mockups/sounds/`).
4. Check each candidate on laptop speakers: it can be heard in a noisy classroom, it isn't harsh or startling (the Buzzer covers that need), and it sounds right played once and on repeat.
5. Pick the five strongest and record them for ticket 32: name each one, explain why it made the cut, and note any changes from the candidate. Eric has left the choice to Claude.

**Blocked by:** none

**Status:** closed

- [x] Notes on the existing eight and the gaps, in the comments
- [x] About 10–12 candidates, each with what it is, when to use it, and how it differs
- [x] Listening page with every candidate and the existing eight, one click each, played once and on repeat
- [x] Five picks, each with its name, why it was chosen, and any changes, in the comments
- [x] Nothing in `web/clock/` changes in this ticket

## Comments

**2026-11-10: design pass done. Listening page: `.scratch/school-clock/mockups/sounds/index.html`.**

Claude can't hear audio, so the judgments below come from each voice's design (pitch, envelope, rhythm, length) plus an offline render of every voice in Chromium (OfflineAudioContext, through Playwright). Every voice, old and new, plays with no errors in all three modes (3 s preview, 5 s Bell, repeat). None is silent and none clips (the loudest peak is 0.71, the existing Wood block). All 60 Play buttons click cleanly. The page's `renderVoice(id, mode)` reports peak, RMS, how long the voice sounds, and how much of its energy falls below 400 Hz, between 400 Hz and 3 kHz, and above 3 kHz. **Eric should still listen to the five picks on laptop speakers before 32 ships**, because step 4 was checked by design only.

### The existing eight

| Voice | Pitch | Attack / timbre | Rhythm and length | Character |
|---|---|---|---|---|
| Chime | E5 to C5 (660, 520 Hz) | soft sine | two notes falling, 1.5 s loop | gentle doorbell |
| Clock tower | 490-830 Hz, bell partials up to ~3.5 kHz | struck, inharmonic | 8 notes, once per Bell (6 s) | stately |
| Marimba | C5-C6, rising C-E-G-C | struck wood, short | 4-note arpeggio, 1.5 s loop | bouncy |
| Desk bell | C6 (1050 Hz) | struck metal | one ding, 1.5 s loop | bright, simple |
| Wood block | ~1 kHz, bending down | knock | tok-tok, 1 s loop | dry, percussive |
| School bell | 880 Hz | a pure bell fluttering 10 times a second | two bursts, 3 s loop | classic, busy |
| Beep | 880 Hz square | hard on/off | beep-beep, 0.5 s loop | electronic, insistent |
| Buzzer | 140 Hz sawtooth (77% of its energy under 400 Hz) | harsh | 0.6 s buzz | the alarm-clock one, harsh on purpose |

**Gaps.** Every voice starts with a fast attack; nothing swells in. Every voice is a struck bar or bell, a plain sine, or an electronic tone: no strings, no wind, nothing from nature, and nothing unpitched except Wood block's knock. No pitch glides further than Wood block's 50 ms bend. Nothing is playful or game-like. The only melodies are Clock tower (slow) and Marimba (one arpeggio). Truly low tones (under 400 Hz) break the speaker rule, so "low and calm" here means a soft tone near the bottom of the range.

### Candidates (12)

| Candidate | What it is | When a teacher picks it | How it differs from the eight | Verdict |
|---|---|---|---|---|
| **Swell** | a soft A-major chord (440-1110 Hz), each note two sines a hair apart so it shimmers; fades in over 1 s and out over 2 s | quiet work time, test days, a calm start | the only voice with no attack; a chord, not separate notes | **pick** |
| **Harp** | 8 plucked strings sweeping up C pentatonic, C5-E6, 75 ms apart; a sawtooth through a closing low-pass filter | start or end of class | strings (not bars or bells), a fast 8-note glissando, a long ring | **pick** |
| **Songbird** | 3 rising "tsee" chirps, then a 7-note falling trill; sine glides between 1.7 and 2.9 kHz | mornings, brain breaks, back from outside | nature; fast pitch glides; the highest voice, so it cuts through chatter | **pick** |
| **Clap pattern** | clap, clap, clap-clap-clap; band-passed noise, each clap three tiny bursts and a short tail | "eyes up here", end of group work | no pitch at all; a rhythm students already know as a call to attention | **pick** |
| **Level up** | an old game console's pulse wave: three quick rising arpeggios, each a step higher, then a held C6 with a wobble | a task done, a challenge timer, review games | playful and game-like; a nasal pulse, not Beep's square | **pick** |
| Singing bowl | one soft strike at 528 Hz ringing 3.5 s with a slow beat | mindfulness, calm | calm, but another struck metal tone like Clock tower and Desk bell; Swell covers calm better | cut |
| Ocarina | a breathy sine with growing vibrato, sol-mi-la-sol | a gentle end of class | wind and vibrato, but a soft-sine melody close to Chime, and its breath is lost on laptop speakers | cut |
| Music box | a 6-note tinkling tune, C6-G6, on a metal comb | end of the day | pretty, but overlaps Desk bell and pushes partials above 3 kHz | cut |
| Water drop | "bloop" sines bending up fast, in an uneven drip | calm, nature | charming, but tiny 90 ms blips with little energy: lost under room noise | cut |
| Slide whistle | a triangle wave gliding 600 to 1800 Hz and back | playful | its glide overlaps Songbird, and it can sound like a joke at a student's expense | cut |
| Steel drum | a 5-note calypso figure on a pan (partials 1, 2, 3, a small pitch drop) | Fridays, fun | happy, but another struck tuned bar, next to Marimba | cut |
| Cuckoo | two hollow triangle notes falling a major third | on the hour | the same shape and job as Chime | cut |

### The five picks for ticket 32

The ids are the proposed `SoundName`s. Each voice in the page has `sound.js`'s shape, `(ctx, out, t, track) => seconds`, and is ready to lift.

1. **Swell** (`swell`): the gentlest sound the clock can have, for when a ring shouldn't jolt anyone. Nothing else fades in. It plays once per Bell (it returns 5 s: about 3 s of sound, then rest), so on repeat it breathes slowly. Changes: none.
2. **Harp** (`harp`): the only string sound and the only glissando; warm, and clearly "something is starting" without being a bell. Two sweeps per Bell (2.5 s loop). Its filter keeps the highs under 3 kHz. Changes: none.
3. **Songbird** (`songbird`): the only nature sound and the only voice that glides. It sits at 1.7-2.9 kHz, where the ear is most sensitive, so it carries at a low level. Two calls per Bell (2.5 s loop). Change: chirp levels raised (0.28 to 0.4, the trill 0.22 to 0.32) after the first render came out the quietest of all twenty.
4. **Clap pattern** (`clapPattern`): the only voice with no pitch, and a rhythm a class already answers to. Changes: a 2.6 kHz low-pass after the band-pass (the noise had 24% of its energy above 3 kHz; now 5%), and the loop went from 2.4 to 2.5 s so a 5 s Bell gets exactly two patterns instead of a stray clap at the cut.
5. **Level up** (`levelUp`): the playful, game-like cue the set was missing. Its pulse wave keeps only 4 harmonics, so just 4% of its energy is above 3 kHz (Beep has 8%). It plays at 0, 2 and 4 s in a Bell; the third run ends at 4.9 s, before the cut. Changes: harmonics cut from 6 to 4, and levels raised (0.13/0.15 to 0.17/0.2) to match Beep's loudness.

**Gentlest-first order for `SOUND_NAMES`:** Swell, Chime, Harp, Clock tower, Marimba, Songbird, Desk bell, Wood block, Level up, Clap pattern, School bell, Beep, Buzzer. Swell goes ahead of Chime. Clap pattern comes just before School bell: it's percussive and attention-getting, but not continuous.

### Notes for 32

- Two helpers come with the picks: `pulseWave(ctx, duty, harmonics)` (Level up) and `noiseBuffer(ctx, seconds)` (Clap pattern; seeded, so every ring and every test gets the same noise). The page makes a fresh noise buffer per pattern; caching one per context (e.g. in a `WeakMap`) would be tidier.
- The fake audio context in the tests will need the new Web Audio calls: `createBiquadFilter` (Harp, Clap pattern), `createBuffer` and `createBufferSource` (Clap pattern), `createPeriodicWave` and `setPeriodicWave` (Level up), and an oscillator connected to another oscillator's `frequency` (Level up's wobble). Every source still goes through `track`, so the 5 s Bell cut and `dismiss()` cover them.
- In the render, all five keep at least 94% of their energy between 400 Hz and 3 kHz, and none peaks above 0.62.
