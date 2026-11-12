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

**Status:** ready-for-agent

- [ ] "School bell (softer)" shows in every picker in A–Z order; old saves still play it
- [ ] Ship's klaxon repeats with no gap; preview, Bell and Alarm behave as before; it never runs past the Alarm limit
- [ ] Clock tower is slower; it still plays in full on a Bell and repeats cleanly on an Alarm
- [ ] School bell is harsher and more like a real hallway bell; its shape test is updated (rattle rate, range)
- [ ] The sound engine's design comment and the spec's sound list match
- [ ] A comment on the ticket asks Eric to listen to the klaxon, Clock tower and School bell on laptop speakers
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass
