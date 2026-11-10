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

**Status:** closed

- [x] Click (or Enter on) the title to edit; Enter or blur saves, Escape cancels
- [x] Name stored on the quick pick; old saved quick picks without names still load
- [x] Name shown in the ring title (incl. paused), mini player, ring card and picker
- [x] 40-character cap; long names shrink and wrap without overflow at the `check:clock` sizes
- [x] `web/clock/CONTEXT.md` mentions that a timer can carry a name saved with its quick pick
- [x] Tests cover editing, saving with the quick pick, paused title, cap, old data
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-10: built on `worktree-agent-ac67e66d7674f4476`.**

- **Editing:** the ring's title is now a button ("Name this timer" on hover). Click or Enter turns it into a text field (`maxLength` 40) holding the current name; Enter or leaving the field saves, Escape keeps the old name (and closes nothing else). Focus goes back to the title. Enter's default action is stopped, or the title (focused again by then) would click itself open. The title is also raised over the digits, whose tall glyphs were taking its clicks in Chromium. While the timer rings the title is disabled.
- **Data:** settings gain `timerLabel` (kept through pause and resume, gone on cancel; only loaded while there's a timer). `recentDurations: number[]` became `quickPicks: { ms, label? }[]`; an older save's `recentDurations` loads as unnamed quick picks. Names are trimmed and cut to 40 on save and on load. Helpers live in `timer.js`: `timerName(totalMs, label)` (builds on 29's), `cleanTimerLabel`, `nameTimer`, `nameQuickPick`, `quickPickLabel`, `rememberQuickPick` (was `rememberDuration`, now keeps a pick's name).
- **Where it shows:** ring title "Quiz" / "Quiz · paused"; digits' label "Quiz · 20:00 timer, running, 4:12 to go"; mini player head "Quiz · 20:00 timer" (· paused); ring card detail "Quiz · 20:00 timer" (the timer ring now carries `label`); picker quick pick "20:00 · Quiz".
- **Decided (the ticket left these open):** one name per length, so typing 20 again also starts "Quiz". Naming a preset (5 min) adds a "5:00 · Warm-up" quick pick, since the name is what's new; tapping the 5 min preset still starts unnamed, and clearing a preset's name removes its quick pick. Naming a timer moves its quick pick to the front. A saved timer of unknown length can be named, but has no quick pick to save it on.
- **Long names:** 16+ characters set the ring title at 0.72× and it wraps within 56cqw; quick pick pills wrap; the mini player head wraps to 2 lines a little smaller (clamped) under a timer.
- **Screenshots:** `check:clock` with a running timer named "Read chapter 4 and answer the questions" at all 5 sizes: 5/5 passed (no scroll, 0 axe violations, no errors). A scratch Playwright run covered paused, editing, the picker, the ring card and the mini player (via a stand-in Picture-in-Picture popup) at 1920 × 1080, 480 × 320 and 390 × 844: all fit, 0 axe violations.
