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

**Status:** ready-for-agent

- [ ] Six new voices, built like the others (Web Audio, no files), each listed in every sound picker in A–Z order
- [ ] Music box plays a public-domain melody only (name it in a code comment)
- [ ] Each plays once (preview), as a Bell that stops on its own (finishing its last pass, per 36), and on repeat as an Alarm, with scheduled rings never playing twice
- [ ] Older saves load unchanged
- [ ] Tests check each voice's shape with the fake audio context, and how many times it plays in a Bell
- [ ] A comment on the ticket asks Eric to listen to the six on laptop speakers
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass
