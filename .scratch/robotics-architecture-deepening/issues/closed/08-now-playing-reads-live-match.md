# 08: Now Playing and Up Next read from the Live Match query

**What to build:** The Now Playing card and Up Next display, in both the Qualification Round and the Finals live view, get everything they show from the Live Match query (ticket 07) instead of each phase assembling its own "current + up next + side labels + schedule entry" bundle in the render code. What the class sees on the projector is unchanged. A future change to how a side is labelled, or which match is current, then lands in one place.

Source: candidate 1 of the 2026-10-12 architecture review (second half). Vocabulary: **Current Match**, **Up Next**, **Playoff Alliance** in `web/robotics/CONTEXT.md`.

**Blocked by:** 07 (Live Match query).

**Status:** closed

- [x] Qualification and Finals Now Playing / Up Next render from the Live Match query alone; no per-phase bundle code or label fallbacks remain in the render code
- [x] The pass-through Current Match index helper (which only forwards to the Inferred Current Match helper) is deleted, with callers using the Live Match query or the underlying helper directly
- [x] Rendered output is unchanged: existing Now Playing and Finals live view DOM tests pass, changed only where the DOM structure intentionally changes
- [x] Behaviour that was only reachable through DOM tests (side labels, Up Next selection) is now covered by the query's pure tests from 07, so DOM tests can be trimmed to wiring checks if wanted
- [x] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`

## Comments

- 2026-10-13: Implemented. Notes:
  - `live-match.js` now also exports `getQualificationLiveMatch` and `getEliminationLiveMatch`, and `getLiveMatch` picks one of them by whether a Bracket exists. The Schedule tab uses the Qualification one, so it keeps showing the Qualification Current Match even if a Bracket was built while Qualification was incomplete. It always did that before this change.
  - DOM tests weren't trimmed. They all pass unchanged.
  - The bracket card's `is-current` class still calls `getEliminationCurrentMatchId` directly, which the "underlying helper" criterion allows. Moving it to the Live Match would mean passing the result down through the bracket render functions.
  - Follow-up for ticket 12: auto-scroll uses `getLiveMatch` on every tab. If a Bracket exists while Qualification is incomplete, the Schedule tab scrolls when the Elimination Current Match changes, not the Qualification one. This was already true before this change.
  - "Live Match" is still a term used only in code. It now also appears in `robotics.js` comments. Add it to `web/robotics/CONTEXT.md` if it turns out to be domain language.
