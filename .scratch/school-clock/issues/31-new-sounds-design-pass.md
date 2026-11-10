# 31: Design pass for five new ring sounds

**Priority:** low

**What to build:** A creative design pass before adding five more sounds for Bells and Alarms. The clock has eight voices now, all made with Web Audio in `sound.js` (no audio files): Chime, Clock tower, Marimba, Desk bell, Wood block, School bell, Beep, Buzzer. New sounds must be clearly different from these and from each other, not variations on a chime or a beep.

1. Listen to the eight existing voices and write down what each is (pitch range, attack, length, character) so the gaps are clear. Some gaps to look into: a rising or falling melody, a soft pad or swell, something plucked or played on strings, a rhythm with no clear pitch, a playful or game-like cue, a low and calm tone, a bird or nature-like call.
2. Brainstorm about 10–12 candidates. For each, write one line on what it is, when a teacher would pick it (start of class, end of class, a quiet work-time alarm), and how it differs from the existing eight.
3. Build the candidates in a throwaway listening page using the same Web Audio approach as `sound.js`. Each should play in one click, next to the existing eight for comparison. The page is kept outside the shipped clock (e.g. under `.scratch/school-clock/mockups/sounds/`).
4. Check each candidate on laptop speakers: it can be heard in a noisy classroom, it isn't harsh or startling (the Buzzer covers that need), and it sounds right played once and on repeat.
5. Pick the five strongest and record them for ticket 32: name each one, explain why it made the cut, and note any changes from the candidate. Eric has left the choice to Claude.

**Blocked by:** none

**Status:** open

- [ ] Notes on the existing eight and the gaps, in the comments
- [ ] About 10–12 candidates, each with what it is, when to use it, and how it differs
- [ ] Listening page with every candidate and the existing eight, one click each, played once and on repeat
- [ ] Five picks, each with its name, why it was chosen, and any changes, in the comments
- [ ] Nothing in `web/clock/` changes in this ticket

## Comments
