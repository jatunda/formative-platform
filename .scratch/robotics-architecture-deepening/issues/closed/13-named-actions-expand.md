# 13: Named tournament actions: expand

**What to build:** Add one entry point that takes a named tournament action (e.g. "remove team", "pick partner", "decline", "set captain override") and handles it: checks the action's block reason, applies the state change, owns the related UI-state transitions such as clearing the Alliance Captain override, and triggers a render. Move the Teams tab and Alliance Selection handlers onto it. Everything else keeps using the existing closure-based dispatch for now (ticket 14 finishes the move), so nothing breaks in between.

Why: today every handler passes an arbitrary closure to dispatch and some write to the shared UI-state object directly. Stale closures firing after Reset caused two recent fixes, and tests use the same unchecked closure path, so they never exercise the guards the UI applies. Named actions give tests the same seam the UI uses.

Actions are plain data: a `type` string plus payload fields, e.g. `{ type: 'remove-team', teamId }`, handled by a single entry point. Reuse the names the block-reason queries already use (`'start-finals'`, `'set-bracket-size'`, `'set-third-place'`) where an action has one.

Source: candidate 3 ("Named tournament actions", Worth exploring) of the 2026-10-12 architecture review.

**Blocked by:** 09 (roster lock), 12 (Selection → Finals rules). Not strictly gating: they rewrite the same handlers, so landing them first avoids moving those handlers twice.

**Status:** closed

- [x] One action entry point accepts `{ type, ...payload }` action objects; it consults block reasons (roster, Alliance Selection) before applying an action
- [x] UI-state transitions (e.g. clearing the captain override after a pick) happen inside the action entry point, not in handlers
- [x] Teams tab and Alliance Selection handlers use named actions; nothing outside the entry point writes to the UI-state object for those flows
- [x] Unit tests drive Teams and Alliance Selection through named actions, including a blocked action no-oping
- [x] Existing DOM tests pass
- [x] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`

## Decisions

- **Action shape (2026-10-12, Eric):** type + payload objects through one entry point. Chosen because actions become plain data that tests can list and replay, and the block-reason queries are already keyed by the same names. One-function-per-action was rejected as a wider interface that repeats the block-reason lookup in every function.

## Comments

- **2026-10-19 (implementation):** Entry point is `applyTournamentAction(state, screen, action)` in `web/robotics/actions.js`, with `getActionBlockReason` for render-time locks. `dispatch` accepts an action object (toasts a blocked one, returns the entry point's report) or, until ticket 14, a raw closure. The block-reason keys `'move'`/`'remove'` were renamed `'move-alliance'`/`'remove-alliance'` so the one vocabulary doesn't collide with `'remove-team'`. Discard Bracket (on the Selection tab's Finals-in-progress card) also moved. Member edits now read the current Team, so they can't drop a concurrent edit.
