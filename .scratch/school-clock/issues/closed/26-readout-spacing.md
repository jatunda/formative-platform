# 26: Spacing between Readouts so each caption sits with its own number

**Priority:** medium

**What to build:** When the screen shows more than one Readout, the big Readout's caption sits so close to the small Readout under it that it reads as that Readout's label. Fix the spacing so every caption groups with its own number.

Eric confirmed the bug in two layouts: one big Readout over one small one, and one big over two small. Check every layout yourself with `npm run check:clock` (several window sizes, light and dark): one, two and three Readouts, Off-Hours, and the timer running. While the timer runs and the Readouts move to the side they don't overlap, but give the side Readouts **a little** more vertical space between them (a small increase, not a large one). The mini player is fine; leave it alone.

Built behaviour: closed tickets 11, 17 (main screen design), 22 (timer layout). Files: `readout-layout.js`, `readouts-view.js`, `clock.css`, `timer.css`.

**Blocked by:** 25 (the caption gets longer: "until end")

**Status:** closed

- [x] Big over one small, and big over two small: the big caption is clearly closer to its own digits than to the next Readout
- [x] Timer running: the side Readouts have a little more vertical spacing than now
- [x] No layout overflows or scrolls at the sizes `check:clock` covers; before/after screenshots attached in the comments
- [x] Mini player unchanged
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-10: built on `worktree-agent-a4a15665541ff048a`.**

- **Below layout** (the small Readouts in a row under the big one: portrait screens, phones, the 480 × 320 corner): the row now sits a new `--gap-lg` (`clamp(16px, 6vh, 72px)`, twice `--gap-md`) under the big Readout instead of `--gap-md`, so the big caption is clearly nearer its own digits. The short (≤ 520px tall) layout goes from 4px to 12px. The same gap applies when the Look sheet pushes the beside layout back to a row. The beside layout (wide screens) was already fine: a divider and a column, so it's unchanged.
- **Timer running:** the side column's gap goes from `--gap-md` to 1.4 × `--gap-md` (8px to 12px on the short layout), a small step.
- **Overflows found on the way** (at 1024 × 768 and 820 × 1180, not in the default sizes): the timer's side column ran off a 4:3 screen ("10:40:00 AM" cut off), and Off-Hours' two small Readouts ran off a portrait tablet. The small Readouts are now capped by width too (`--type-small` takes `min(8.5vh, 9vw)`, the timer column `min(7vh, 4.4vw)`); at 1280 × 720 and wider nothing changes size.
- **`check:clock`** gained `--layout countdown,clock,countup` (seeds the Readouts) and `--timer` (starts the first preset before the shot, since simulated time drops a saved timer).
- **Screenshots** (kept outside the repo): one, two and three Readouts in a Segment, a Passing Period and after school; Off-Hours (weekend, day off, before school) with three; the timer with two and three; dark and the Paper theme; at 1920 × 1080, 1440 × 900, 1280 × 720, 1024 × 768, 820 × 1180, 480 × 320 and 390 × 844. Before, at 820 × 1180 "UNTIL END" sat halfway between 35:00 and the 10:40:00 under it, and at 480 × 320 it nearly touched the small row; after, the caption hugs its digits with a clear gap below. Beside the timer the three small Readouts are a little further apart. Every render passes (no scroll, no page errors, 0 axe violations at the default sizes). The mini player's sheet and layout are untouched.
- **For later:** the timer on a portrait tablet (820 × 1180) fits but looks lopsided: the ring sits left of centre and the side captions wrap to two or three lines. Owned by ticket 28.
