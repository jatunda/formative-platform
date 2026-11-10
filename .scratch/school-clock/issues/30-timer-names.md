# 30: Name a timer

**Priority:** low

**What to build:** Click the "Timer" title on the timer ring to type a name for the running timer ("Quiz"). The name is saved with that duration's quick pick, so choosing "20:00 · Quiz" next time starts it already named. The name shows wherever the timer is named:

- the ring title: "Quiz" / "Quiz · paused" (paused keeps the name, not a bare "Paused")
- the mini player head: "Quiz · 20:00 timer"
- the "time is up" card: e.g. "Quiz · 20:00 timer"
- the quick pick in the timer picker

Names are capped at about 40 characters. A long name shrinks a little and wraps rather than overflowing; check this with `check:clock` on the ring, the mini player and the ring card. Leaving the name empty clears it.

Built behaviour: closed tickets 13, 22 (timer, picker, quick picks: `timer.js`, `timer-picker.js`, `clock-settings.js`). Wording from 29.

**Blocked by:** 29

**Status:** open

- [ ] Click (or Enter on) the title to edit; Enter or blur saves, Escape cancels
- [ ] Name stored on the quick pick; old saved quick picks without names still load
- [ ] Name shown in the ring title (incl. paused), mini player, ring card and picker
- [ ] 40-character cap; long names shrink and wrap without overflow at the `check:clock` sizes
- [ ] `web/clock/CONTEXT.md` mentions that a timer can carry a name saved with its quick pick
- [ ] Tests cover editing, saving with the quick pick, paused title, cap, old data
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
