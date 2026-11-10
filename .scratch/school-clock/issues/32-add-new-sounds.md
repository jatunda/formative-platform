# 32: Add the five new sounds

**Priority:** low

**What to build:** Add the five voices picked in ticket 31 to the sound engine so they can be chosen for Bells, Alarms and the timer. Put each one in the right place in `SOUND_NAMES`, which is ordered gentlest first.

Files: `sound.js` (`SOUND_NAMES`, the voice table), `clock-settings.js` (`SoundName`). Built behaviour: closed ticket 12 (sound engine).

**Blocked by:** 31

**Status:** open

- [ ] Five new voices in `sound.js`, built the way the existing voices are (Web Audio, no files), matching ticket 31's picks and changes
- [ ] `SoundName` and `SOUND_NAMES` updated; every sound picker (Bells, Alarm editor, timer) lists them
- [ ] Each plays correctly once (preview) and on repeat, and scheduled rings still never play twice
- [ ] Settings saved with an older sound list still load unchanged
- [ ] Tests cover the new names in the picker lists and voice scheduling
- [ ] The listening page from 31 is deleted
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
