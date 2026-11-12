# 37: Sound list: rename the soft bell, add a loud School bell, sort A–Z

**Priority:** medium

**What to build:** Three changes to the list of sounds every picker shows (Bell sound, Timer sound, the Alarm editor's Sound):

1. **Rename** today's "School bell" (deliberately gentler than a hallway bell) to "Soft bell". Teachers who picked it keep the same sound under its new name. Their saved settings load unchanged.
2. **Add** a new, realistic, loud **"School bell"**: a real hallway bell, with a hard clapper hammering a metal gong fast enough to rattle, a bright metallic ring, and one long continuous ring with a short gap before it repeats. It's meant to be loud, so it's the one exception to the "nothing harsh" sound design. Keep it within what laptop and projector speakers play cleanly (no deep bass, no piercing highs that distort).
3. **Sort** every sound picker alphabetically by the name people see. This replaces the "gentlest first" order. Update the comment that explains the order.

Eric's words: "Add a loud one. Rename the softer one, and call the new loud one 'School Bell'. Also, please sort the bell sounds to be alphabetical in the drop down menu." Original request: "physical school bell (make it sound even more like an actual school bell)".

Built behaviour: closed tickets 12 (sound engine), 31/32 (how voices are built and tested, with the fake audio context).

**Blocked by:** 36 (both change the sound engine; 36 also changes how a Bell's last pass ends, which the new voice should be checked against)

**Status:** ready-for-agent

- [ ] The old gentle voice shows as "Soft bell"; a save that picked it (for Bells, the timer, or any Alarm) still plays that same voice
- [ ] A new loud "School bell" voice, built like the other voices (Web Audio, no files), plays once (preview), as a Bell that stops on its own (ticket 36's rule), and on repeat as an Alarm
- [ ] Every sound picker lists sounds A–Z by display name, and stays sorted when 38 and 39 add more
- [ ] Defaults are unchanged (the default Bell and timer sounds stay what they are today)
- [ ] Tests cover: the rename keeping old saves, the new voice's shape (its rattle rate and range), the A–Z order in every picker
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-11: decided in grilling.** Eric chose to keep the gentle bell (renamed) and add the loud one, rather than replace it. "Soft bell" is Claude's proposed name; Eric can change it when he listens.
