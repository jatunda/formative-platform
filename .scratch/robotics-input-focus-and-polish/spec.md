# Robotics Control Panel — Input/Focus Fixes & Live-View Polish

A grab-bag of bug fixes and small UX polish for the robotics control panel (`web/robotics/`), reported after using the arena-redesigned panel live. Distinct from `robotics-arena-redesign` (closed) — that effort was the visual overhaul; this one is input-handling bugs plus follow-on polish discovered from actually running it.

## Decisions

- **Root cause of the "BIG BUG"** (editing a field then clicking another field/button requires two clicks, and sometimes eats the input entirely — e.g. editing a team name then clicking "Add Team" for a different team does nothing): `initRoboticsApp`'s `dispatch()` in `robotics.js` commits state and then synchronously does `mount.innerHTML = ''` followed by a full rebuild. Score/name inputs commit on the `change` event, which fires during the browser's blur-handling phase of a click — i.e. *before* that click's `mouseup`/`click` fires. The synchronous rebuild destroys the actual click target (the other field, or the button) mid-interaction, so the first click is swallowed; a second click lands on the freshly-rendered replacement and works. This is one shared mechanism (`dispatch`/`render` in `robotics.js`), so the fix is centralized, not a per-call-site change.
- **Sticky Now Playing + auto-scroll** (clarified 2026-10-03): the user's original request cut off mid-sentence ("make it so that as matches ..."). Confirmed intent: as the Current Match advances (a match is marked complete), the Qualification Matches list should auto-scroll to keep the new Current Match row in view, in addition to the Now Playing hero banner itself staying pinned (sticky) while the list scrolls.
- **Long names**: shrink font size to fit on one line (not truncate-with-ellipsis), for both team names and member names, wherever they appear in width-constrained cells (match rows, Standings table).
- **Current Match indicator**: today it's a `robotics-current-label` pill reserved in a fixed `7.5rem` grid column (`--match-col-label`) on *every* match row, even when blank (`is-placeholder`). Replace with a compact indicator (e.g. a dot/icon) that doesn't reserve a full text-width column.
- **Finals tab settings**: collapse "Form a Playoff Alliance", "Playoff Alliances", and "Bracket Configuration" under one collapsible heading, mirroring the existing Match Timeline accordion pattern (`renderMatchTimeline` in `robotics.js`) already used on Schedule & Standings, so the bracket view is the primary focus once setup is done.

## Tickets

See `issues/`. Each ticket must leave `cd web && npm run test:coverage` passing (see repo `CLAUDE.md`).
