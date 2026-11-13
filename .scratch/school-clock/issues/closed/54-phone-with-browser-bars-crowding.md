# 54: On a short phone with its browser bars showing, two or three Readouts still crowd the agenda

**Priority:** low

**What to build:** Ticket 52 kept the phone agenda at three rows on 375 × 667 and 360 × 740. With the browser bars showing, a phone's visible height is shorter still (375 × 567 or 375 × 611 on an iPhone SE in Safari, 360 × 640). There, `npm run check:clock -- --size 375x567 --size 375x611 --size 360x640 --layout countdown,clock,countup` still fails in some states. In school-day states the agenda's last rows run under the window button or the sound prompt. In Experience Week the stage spills out of its row. With one Readout (the default) these sizes pass.

These sizes failed before ticket 52 as well (17 of 44 renders then, 13 after). At 375 × 567 the simulated-time banner and the sound prompt together take about 150px. That leaves the big Readout's digits below 52's 32px floor, so the stage grows into the agenda. Decide with Eric whether this matters outside simulation (`?at=` shows the banner; a real morning doesn't), and if so what steps down next: the banner or the sound prompt on a phone, the floor, or the two small Readouts' row.

Built behaviour: closed tickets 43 (the phone's visible height, `--bars`), 52 (the short phone's height budget, `--fit-h` in `web/clock/clock.css`).

**Blocked by:** None (can start immediately)

**Status:** closed (won't do)

- [ ] Eric has decided what gives at these heights
- [ ] `npm run check:clock -- --size 375x567 --size 375x611 --size 360x640 --layout countdown,clock,countup` passes, with and without `--editing`
- [ ] Other sizes are unchanged (`npm run check:clock:full` passes)
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

Found while building ticket 52 (see its `## Comments`).

**2026-11-12: closed, won't do.** Eric decided not to pursue this: small phones with the browser's toolbars showing may still crowd in some states with two or three Readouts. `check:clock:full` does not cover these sizes, so nothing tracks it.
