# 27: Show that a Readout can be clicked, without the mode dots

**Priority:** medium

**What to build:** Remove the mini player's three mode dots. They move every time the text changes, so it's hard to see them change, and Eric doesn't want them taking up space. Instead:

- A Readout you can click to change its mode gets a pointer cursor and a light hover outline, in the mini player and on the full page. The caption changing on each click ("until end", "since start", the current time) is the feedback.
- A one-time tooltip ("Click to change what this shows", or similar) appears the first time on each device. Show it once in the mini player and once on the full page, each tracked separately in local storage, so it doesn't come back after that. It goes away on click, on Escape, or after a few seconds.

Built behaviour: closed tickets 11 (modes), 23 (mini player); commit cfdfbb2 (click the mini player to cycle). Files: `mini-player.js` (`modeDots`), `mini-player.css`, `readouts-view.js`, `clock-storage.js`.

**Blocked by:** none

**Status:** open

- [ ] The mode dots and their CSS are gone
- [ ] Hover outline and pointer cursor on every clickable Readout; keyboard focus shows the same outline
- [ ] The first-time tooltip shows once per device on the full page and once in the mini player, then never again; it doesn't block clicks and is reachable by screen readers
- [ ] Tests cover: tooltip shown the first time, not shown once remembered, storage unavailable (fails quietly, shows the tooltip)
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
