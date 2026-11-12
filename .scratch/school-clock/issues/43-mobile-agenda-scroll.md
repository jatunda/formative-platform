# 43: Bug: on phones the agenda doesn't scroll to the bottom

**Priority:** high

**What to build:** On a phone (narrow portrait), whole day becomes the agenda list, which scrolls on its own. Eric reports it "doesn't scroll all the way down. Schedule view pane too big?" The last rows can't be reached. Find out why and fix it so every row, including the last, can be scrolled fully into view, with the window button and the sound prompt (when it shows) still visible below it.

Likely suspects, unconfirmed: the agenda's grid or flex chain letting it grow taller than its row (a missing `min-height: 0` somewhere), the bottom area's rows when the sound prompt shows, the simulated-time banner's extra row, or the phone's browser bars (`100vh` versus the visible height). Reproduce it first, at real phone sizes (e.g. 375 × 667, 390 × 844, 360 × 740), with long Bell Schedules (All Day) and short ones, the sound prompt showing and not, and with `?at=` (the banner). Then fix the cause, not the symptom.

Built behaviour: closed ticket 20 (Day Strip, the phone agenda).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The cause is found and written in a comment on this ticket
- [ ] At phone sizes the agenda scrolls until its last row is fully visible, with nothing overlapping it, with and without the sound prompt and the simulated-time banner
- [ ] The rest of the phone layout (Readouts, line, window button) doesn't shift or overflow; tablet and desktop are unchanged
- [ ] `npm run check:clock` at the phone sizes above shows the bottom of the agenda reachable (screenshot scrolled to the end)
- [ ] A test guards it where jsdom can (e.g. the structure or classes the fix relies on); the rest is checked in `check:clock`
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass
