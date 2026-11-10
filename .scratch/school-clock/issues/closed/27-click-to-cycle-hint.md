# 27: Show that a Readout can be clicked, without the mode dots

**Priority:** medium

**What to build:** Remove the mini player's three mode dots. They move every time the text changes, so it's hard to see them change, and Eric doesn't want them taking up space. Instead:

- A Readout you can click to change its mode gets a pointer cursor and a light hover outline, in the mini player and on the full page. The caption changing on each click ("until end", "since start", the current time) is the feedback.
- A one-time tooltip ("Click to change what this shows", or similar) appears the first time on each device. Show it once in the mini player and once on the full page, each tracked separately in local storage, so it doesn't come back after that. It goes away on click, on Escape, or after a few seconds.

Built behaviour: closed tickets 11 (modes), 23 (mini player); commit cfdfbb2 (click the mini player to cycle). Files: `mini-player.js` (`modeDots`), `mini-player.css`, `readouts-view.js`, `clock-storage.js`.

**Blocked by:** none

**Status:** closed

- [x] The mode dots and their CSS are gone
- [x] Hover outline and pointer cursor on every clickable Readout; keyboard focus shows the same outline
- [x] The first-time tooltip shows once per device on the full page and once in the mini player, then never again; it doesn't block clicks and is reachable by screen readers
- [x] Tests cover: tooltip shown the first time, not shown once remembered, storage unavailable (fails quietly, shows the tooltip)
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-10: built on `worktree-agent-a607191beb4c90253` (from `clock-polish`).**

- **Dots gone:** `modeDots` and the `.clock-mini__mode` / `__modes` / `__dot` CSS are removed. The mini caption keeps its line when empty, so the digits don't jump when cycling to the time.
- **Clickable look:** a clickable Readout (`button.clock-readout__face`, `.clock-mini__readout` when enabled) gets a light `--line` outline on hover, in the same place as the keyboard focus ring (`--focus` colour, same offset). In the mini the whole window counts as hover, since the Readout's `::after` covers it.
- **Tooltip:** new `cycle-hint.js` (`createCycleHint`), one for the page (`'page'`) and one for the mini player (`'mini'`). It's a `role="note"` pill placed right after the Readout (outside its button, so the button's name is unchanged), with `pointer-events: none`. It shows the first time a Readout can be clicked (after the Division is chosen; not in edit mode, not while ringing or with just the time in the mini). It's remembered **as soon as it shows**, so a reload doesn't bring it back. It goes on any click (a capture-phase listener, so the click that chooses a Division doesn't also put it away), on Escape, or after 6 seconds of real time (checked on the page's ticks, so no extra timers). On the page it sits just under the first Readout, clear of the Segment name; in the mini it sits over the head line.
- **Storage:** `createHintStore` in `clock-storage.js`, its own key `school-clock-hints-v1` over the shared quiet adapter. It's kept out of the settings so showing the tip doesn't save the settings or set off the "Couldn't save" toast. If storage is blocked, the tip shows and is simply not remembered.
- **Tests:** `clock-page-cycle-hint.test.js` covers the page and the mini: shown the first time, not after a reopen, click / Escape / time-out, waiting for a Division and hiding in edit mode, storage blocked, the mini remembered apart from the page, and no dots. The once-Alarm tests in `clock-page.test.js` now count settings saves only. Spec line about the dots updated.
- **Checked** with `check:clock` (period and passing at 1920, 1280, 480×320 and 390×844: all pass, 0 axe violations) and a throwaway harness for hover, focus and the mini player. Nothing was kept.

