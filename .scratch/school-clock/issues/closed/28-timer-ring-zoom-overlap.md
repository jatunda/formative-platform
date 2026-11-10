# 28: BUG: the timer ring overlaps the text above it at some zoom levels

**Priority:** low

**What's wrong:** At some browser zoom levels the timer's circle runs into the text at the top of the screen (the day/heading lines).

**To do:** Reproduce it with `npm run check:clock` across window sizes and device-pixel ratios (zoom levels from 67% to 200% correspond to viewport sizes), find which size rule lets the ring grow past its space, and make it fit the space that's left. Screenshot before and after.

**Also:** on a portrait tablet (820 × 1180) the timer layout fits but looks lopsided: the ring sits left of centre and the side Readouts' captions wrap to two or three lines (found in ticket 26; see its comments). Fix it here, since it's the same question of how the ring and side column share the space.

Built behaviour: closed ticket 22 (timer ring). Files: `timer-ring.js`, `timer.css`, `clock.css`.

**Blocked by:** none

**Status:** closed

- [x] The ring never overlaps the top text at any size `check:clock` covers, including short, wide windows
- [x] The ring stays as large as the space allows
- [x] Portrait tablet (820 × 1180): the ring is centred and the side captions don't wrap to several lines
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-10: built on `worktree-agent-aa0e3d712f0872b22`.**

- **Cause:** on a wide screen the ring takes the top bar's row too and is sized to that whole height (`100cqh`), trusting the circle to leave the corners free. That only holds while the controls sit far from the middle. Near 16:9 they reach in far enough: before, 19 of 110 zoom-ladder renders had the ring over a control, from 1366 × 768 and 1280 × 720 at 100% (over "Timer") to 1024 × 576 and 960 × 540 (1280 × 720 at 125%, 1920 × 1080 at 200%: over "Timer", "Bells" and "Readouts").
- **Fix (`ring-fit.js`, `@ts-check`):** while the ring shares the top bar's row, the page measures the Day Label and the top bar's buttons (a `ResizeObserver`, so zoom, resizing, font loading and a new Day Label all re-measure) and sets two numbers on the Readouts: `--ring-room`, the largest ring that stays 12px clear of them if it may sit as low as the stage goes, and `--ring-shift`, how far below the middle it then sits (as little as clears, so a ring that fits in the middle stays there). `timer.css` adds the room to the ring's size rule and moves it down by the shift. Both come from the region and the top bar, never from where the ring ends up, so nothing feeds back. Where the ring keeps to the stage (short screens, phones, the new portrait rule) nothing is set. On a 16:9 screen the ring comes out a little smaller and a little lower than before; on wider screens nothing changes.
- **Portrait tablet:** below 4:3 (and over 520px each way), the timer now does what the Readouts already do there: the ring sits centred in the stage, as large as the width and the row above the small Readouts allow, with the small Readouts in a row under it. At 820 × 1180 "UNTIL END OF PERIOD 3" is on one line; three small Readouts wrap to a second row.
- **Found on the way:** with no bar (the timer showing), the sound prompt is centred between the window buttons, which pushed the buttons off the right edge at 656 × 944 and 547 × 787 (820 × 1180 at 125% and 150%). Between 521px and 760px wide it now takes the free width left of them, as on the short layout.
- **`check:clock`:** new `--zoom 1366x768` (that screen at every browser zoom, 67% to 200%: the viewport `size / zoom`), and every render now fails if the ring's circle runs into the Day Label, a top-bar button or a small Readout.
- **Screenshots** (kept outside the repo): the period state with the timer, one Readout, at the zoom ladder of 1920 × 1080, 1366 × 768, 1280 × 720, 1536 × 864, 1024 × 768, 820 × 1180 and 1180 × 820, the same screens less browser chrome (1920 × 970, 1366 × 660), and short, wide windows (2560 × 1080, 1920 × 600, 1600 × 500, 1280 × 400): 130/130 pass. With three Readouts in a Segment, a Passing Period and the weekend at the 1920 × 1080, 1366 × 768, 820 × 1180 and 1920 × 600 ladders plus 480 × 320, 390 × 844 and 1024 × 768: 129/129 pass, 0 axe violations. The default `check:clock` run: 55/55.

