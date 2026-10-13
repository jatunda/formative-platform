# 09: Roster lock enforced by the state module

**What to build:** Once the Pairing Draw has produced Qualification Matches, the Team roster can't gain or lose Teams. Remove Team is locked the same way Add Team already is, and the lock is enforced by the state actions themselves, not just by which buttons the Teams tab shows. Today Remove Team is never locked: removing a Team mid-Tournament leaves its id in Qualification Matches (which then show "(unknown team)") and in any Playoff Alliance.

Follow the pattern Alliance Selection already uses: a single block-reason query (e.g. "roster is locked: Reset Results first") that both the Teams tab and the add/remove actions consult. Renaming a Team and editing its Members stay allowed at any time (Members are display-only).

Source: candidate 2 of the 2026-10-12 architecture review, plus the Remove Team bug found in that review. Vocabulary: **Team**, **Member**, **Pairing Draw**, **Reset Results** in `web/robotics/CONTEXT.md`.

**Blocked by:** None (can start immediately).

**Status:** closed

- [x] A roster block-reason query answers whether adding or removing a Team is allowed, and why not
- [x] Add Team and Remove Team state actions no-op when blocked (matching how other blocked actions behave)
- [x] The Teams tab disables or hides Remove the same way it does Add, and shows the lock hint text from one place (the duplicated hint string goes away)
- [x] Renaming a Team and adding/removing Members still work while the roster is locked
- [x] Reset Results and New Tournament unlock the roster again
- [x] Unit tests cover the block reason and both actions no-oping when blocked; a DOM test covers Remove being unavailable after Generate Matchups
- [x] A Tournament already saved with a dangling Team id loads unchanged: no upgrade or cleanup code (see Decisions)
- [x] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`

## Decisions

- **Saved Tournaments with a dangling Team id (2026-10-12, Eric):** leave as-is. Only one Tournament exists at a time and the case is rare. Those matches keep showing "(unknown team)", and Reset Results clears it. Cleaning up on load was rejected because it would silently drop a Team from recorded match results; a load-time warning toast was judged not worth the code.

## Comments

- **2026-10-13 (implementation):** The lock fires once Qualification Matches exist, following the first sentence and the DOM-test criterion, not the old Add Team trigger (which waited for a completed Qualification Match). As a result, adding a late Team after Generate Matchups now needs Reset Results, which also clears Matches per Team and the Match Timeline settings. Open follow-up for Eric: a lighter unlock that keeps those settings.
