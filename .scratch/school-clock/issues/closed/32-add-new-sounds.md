# 32: Add the five new sounds

**Priority:** low

**What to build:** Add the five voices picked in ticket 31 to the sound engine so they can be chosen for Bells, Alarms and the timer. Put each one in the right place in `SOUND_NAMES`, which is ordered gentlest first.

Files: `sound.js` (`SOUND_NAMES`, the voice table), `clock-settings.js` (`SoundName`). Built behaviour: closed ticket 12 (sound engine).

**Blocked by:** 31

**Status:** closed

- [x] Five new voices in `sound.js`, built the way the existing voices are (Web Audio, no files), matching ticket 31's picks and changes
- [x] `SoundName` and `SOUND_NAMES` updated; every sound picker (Bells, Alarm editor, timer) lists them
- [x] Each plays correctly once (preview) and on repeat, and scheduled rings still never play twice
- [x] Settings saved with an older sound list still load unchanged
- [x] Tests cover the new names in the picker lists and voice scheduling
- [x] The listening page from 31 is deleted
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-10: built.** The five voices from 31 are in `sound.js` as picked, with 31's changes and nothing else: Swell, Harp, Songbird, Level up, Clap pattern. `SOUND_NAMES` is in 31's gentlest-first order (Swell, Chime, Harp, Clock tower, Marimba, Songbird, Desk bell, Wood block, Level up, Clap pattern, School bell, Beep, Buzzer), and `SoundName` matches. All three pickers (Bell sound, Timer sound, the Alarm editor's Sound) build from `SOUNDS`, so they list all thirteen. Saved settings are checked against `SOUNDS`, so saves from before still load as they were (tested).

- `pulseWave` and `noiseBuffer` sit next to `tone` and `strike`. `noiseBuffer` keeps one buffer per audio context and length (a `WeakMap`), so every clap on every ring reuses the same seeded noise.
- The fake audio context in `__tests__/helpers/fake-audio.js` now has biquad filters, buffers and buffer sources, periodic waves, and records every param change (`param.events`). Tests use that to check each new voice's shape: Swell's one-second fade-in, Harp's rising strings and closing filter under 3 kHz, Songbird's glides within 1.7-2.9 kHz, Level up's 4-harmonic wave and its wobble driving the held note's pitch, Clap pattern's five claps of filtered noise. Each also has a check of how many times it plays in a 5 s Bell.
- Every voice is tested on repeat (an Alarm, up to 60 s) and cut off at a set length. That cut test now cuts at 3 s, not 5 s: Swell plays once per Bell and is silent by 3.6 s, so a 5 s cut never reached it.
- The listening page from 31 (`.scratch/school-clock/mockups/sounds/`) is deleted.
- Eric still needs to listen to the five on laptop speakers, as 31 said. 31 checked them by design and by an offline render only.
- `npm run lint`, `npm run typecheck`, `npm run test:coverage` pass (`sound.js` 100%).
