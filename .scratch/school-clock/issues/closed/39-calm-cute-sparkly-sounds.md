# 39: Calm, cute and sparkly sounds

**Priority:** low

**What to build:** More voices for teachers the current sounds don't suit, in every sound picker (A–Z, per 37):

Calm:
- **Singing bowl**: one struck meditation bowl. A low-mid fundamental with slightly out-of-tune partials that beat slowly ("wah-wah"), and a long, slow fade. Once per Bell.
- **Music box**: a short, soothing melody on music-box tines (bright, plucked metal, a little detuned). Use a public-domain tune (e.g. Brahms' Lullaby or Twinkle Twinkle), never a copyrighted song.

Cute and sparkly:
- **Sparkle**: a twinkling run of high, bell-like notes that shimmer and fade, like fairy dust.
- **Cuckoo clock**: the two-note "cuck-oo" (a falling minor third on a soft, hollow, flute-like tone), two or three times.
- **Bubble pops**: a few quick, bubbly pops rising in pitch, playful and soft.
- **Ta-da**: a cheerful little xylophone flourish that ends on a bright chord.

The names describe the sound, never who it's for. That's the same rule as Themes ("named only by what they look like, never by who they're for"), so it's "Sparkle", not "Girly". Keep each voice inside the sound design in the sound engine's header comment: roughly 400 Hz to 3 kHz, no lingering harsh tone, its own rhythm, and a gap before it repeats.

Eric's words: "a few more alarms for the types of people that existing alarms don't satisfy. for example, something really calm (meditation bell?) Something soothing like a nice song, a few things that are cute, a couple things that are girly". Eric chose to have these built straight away and to listen afterward.

Built behaviour: closed tickets 12, 31/32.

**Blocked by:** 38 (same sound list; one at a time avoids clashing edits to the voice table)

**Status:** closed

- [x] Six new voices, built like the others (Web Audio, no files), each listed in every sound picker in A–Z order
- [x] Music box plays a public-domain melody only (name it in a code comment)
- [x] Each plays once (preview), as a Bell that stops on its own (finishing its last pass, per 36), and on repeat as an Alarm, with scheduled rings never playing twice
- [x] Older saves load unchanged
- [x] Tests check each voice's shape with the fake audio context, and how many times it plays in a Bell
- [x] A comment on the ticket asks Eric to listen to the six on laptop speakers
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-11: built.** Six new voices, all Web Audio, listed A to Z in every picker:

- **Singing bowl** (key `singingBowl`): one struck bowl at 420 Hz with partials at 2.71 and 5.2 times up, each two sines 0.8 Hz apart so they beat slowly, fading over 6 s. Once per Bell; on an Alarm, once every 7.5 s.
- **Music box** (key `musicBox`): the first line of "Twinkle, Twinkle, Little Star" (the public-domain French tune "Ah! vous dirai-je, maman"), in C5, on plucked tines: a sine, a twin 1.2 Hz sharp and a short partial three times up. About 6 s; once per Bell, every 7.5 s on an Alarm.
- **Sparkle** (key `sparkle`): ten high pentatonic bell notes (E6 to E7) skipping about, 80 ms apart, each ringing into the next with a shimmering twin, quieter and quieter. Twice per Bell.
- **Cuckoo clock** (key `cuckoo`): "cuck-oo", F#5 down to D#5 (a minor third) on a filtered triangle wave with a soft attack, three times, then a long gap. Three calls per Bell; every 5.5 s on an Alarm.
- **Bubble pops** (key `bubblePops`): five quick, soft sine bloops, each gliding up fast and each higher than the last (starting from 480 up to 1200 Hz), in an uneven rhythm. Four times per Bell.
- **Ta-da** (key `taDa`): a quick xylophone flourish (G5, A5, B5) up to a C-major chord (C5, G5, C6, E6). Twice per Bell.

All six stay between about 400 Hz and 3 kHz, and every Alarm ends inside 60 s. Saves made before these voices load unchanged; the new keys only add to the list.

**For Eric:** please listen to all six on laptop speakers (Settings, Bell sound, then each one: Preview, and once as a Bell; an Alarm set to one of them for the repeat). Check that Singing bowl and Music box feel calm and the other four cute and playful, that none is shrill or tinny, that the bowl's slow "wah-wah" beat comes through, and that you can tell all six apart from each other and from Chime, Harp, Marimba and Desk bell.
