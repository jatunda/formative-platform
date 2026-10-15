# 12: Alliance Selection → Finals rules move into state

**What to build:** The rules that govern moving from Alliance Selection into the Elimination Bracket live in the state and Alliance Selection modules, not in the render code:

- **Start Finals** reports what it did (started or not, and how many Playoff Alliances short of Bracket Size it was), and the UI only reacts to that: confirm when short, switch to the Finals tab only when the Bracket was actually built. Today the UI decides "short" itself and switches tabs even when Start Finals no-ops.
- **Bracket Size input** parsing reuses the Alliance Selection module's saved-Bracket-Size rule instead of re-encoding "2 or more" in the handler.
- **"Alliance Selection started while Qualification is incomplete"** is answered by one query instead of an inline predicate in the render code.
- **Tournament phase:** the status header keeps saying "Qualification" until every Qualification Match is complete, even if Alliance Selection has already started (decided, see Decisions). No change to the phase query's behaviour; the glossary is updated to say so.

Source: candidate 2 of the 2026-10-12 architecture review. Vocabulary: **Alliance Selection**, **Bracket Size**, **Playoff Alliance**, **Elimination Bracket**, **Standings** in `web/robotics/CONTEXT.md`.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] Start Finals returns a result describing whether it built a Bracket and the shortfall; the UI's confirm-and-switch flow uses it
- [x] Start Finals that no-ops leaves the teacher on the Alliance Selection tab
- [x] Bracket Size input validation uses the Alliance Selection module's rule (no duplicated threshold in the handler)
- [x] The early-selection warning reads from a single query
- [x] The **Alliance Selection** entry in `web/robotics/CONTEXT.md` says the status header keeps showing the Qualification Round until every Qualification Match is complete, even once Alliance Selection has begun
- [x] Unit tests cover Start Finals' result (full, short, no-op) and pin the phase query's current behaviour (picks made with Qualification incomplete → still "qualification"); DOM tests cover the short-confirm flow and the no-op not switching tabs
- [x] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`

## Decisions

- **Header phase when Alliance Selection starts early (2026-10-12, Eric):** keep current behaviour. The header says "Qualification" until every Qualification Match is complete, regardless of picks; the glossary is updated to match. Switching on the first Playoff Alliance and following the open tab were both rejected.

## Comments

- **2026-10-15 (implementation):** `startFinals(state, { confirmedShort })` now returns `{ state, started, shortBy }`, and it refuses to build a Bracket short of Bracket Size unless `confirmedShort` is set. It is the only state action that returns a result rather than the Tournament, so the UI captures that result inside the `dispatch` updater. Ticket 13's named-action entry point is the natural place to give results a proper return channel.
  - The UI dispatches the attempt and reacts in `dispatch`'s `afterRender` callback, because every render rebuilds the confirm-dialog overlay. A dialog opened before that re-render would be orphaned. So the "Start Finals Early?" dialog now appears one render after the click, and a refused attempt costs one extra save and repaint with no visible effect.
  - **New queries in `alliance-selection.js`:** `getAllianceShortfall`, which `isSelectionComplete` now uses, and `isQualificationIncomplete`, which the phase query also reuses (behaviour unchanged).
  - **Test changes:** existing test setups now pass `{ confirmedShort: true }`. A DOM test for Matches per team was also added to cover a branch-coverage gap that already existed.
