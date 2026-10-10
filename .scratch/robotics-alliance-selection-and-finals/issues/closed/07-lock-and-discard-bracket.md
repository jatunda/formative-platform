# 07: Lock Alliance Selection once a Bracket exists, and Discard Bracket

**What to build:** Once the Finals have started, Alliance Selection is locked, so the Bracket can never point at alliances that no longer exist.
- **What stays on screen:** the Standings table and the alliance list, so the class still sees the final alliances.
- **Locked controls:** Pick, Declined, Undo, ↑/↓, Remove, Bracket Size, Third-Place. They do nothing and show an error toast: "Locked — the Finals have started. Discard Bracket to change alliances."
- **"Finals in progress" card:** replaces the Captain banner and Start Finals, with **On to Finals →** and a secondary **Discard Bracket**.
- **Discard Bracket:** asks for confirmation, naming any Elimination Match results that will be lost. It then removes the Bracket and resets the Podium reveal, and keeps the alliances, Declines, Bracket Size, and Third-Place setting. Discarding and pressing Start Finals again is how a bracket gets regenerated.

Spec: `.scratch/robotics-alliance-selection-and-finals/spec.md`, user stories 45–48, and "Locked and invalid actions explain themselves". Vocabulary: **Elimination Bracket**, **Discard Bracket** in `web/robotics/CONTEXT.md`.

**Blocked by:** 03 (Alliance Selection tab), 04 (Declines, so the lock covers Decline and Undo from the start).

**Status:** closed

- [x] While a Bracket exists, every Alliance Selection state action does nothing: forming, removing, and reordering alliances; Decline and Undo; Bracket Size and Third-Place
- [x] Clicking any of those controls while locked shows the lock toast, through the block-reason query
- [x] The Standings table and alliance list remain visible while locked
- [x] The "Finals in progress" card shows On to Finals → (which switches to Finals) and Discard Bracket
- [x] Discard Bracket asks a confirm naming the recorded Elimination results that will be lost. If confirmed, it clears the Bracket and the Podium reveal and keeps everything else. If cancelled, nothing changes
- [x] After discarding, Alliance Selection is editable again, and Start Finals builds a new Bracket
- [x] Unit tests cover every locked no-op and the discard behavior. DOM tests cover the toasts, the card, and the discard flow
- [x] `npm run test:coverage` in `web/` passes

## Comments

- Implemented. Every Alliance Selection action, including Start Finals and the new `'set-third-place'` action, is blocked through `getAllianceSelectionBlockReason` while a Bracket exists, so `startFinals` can't overwrite a live Bracket. Discard Bracket followed by Start Finals is the only way to regenerate one.
- The "Finals in progress" card sits in the side column where Start Finals was, following the spec's layout bullet. The Captain banner is hidden while locked.
- While locked, the end-of-list ↑/↓ buttons stay clickable (instead of being disabled) so they show the lock toast too.
- `eliminationMatchLabel` in `bracket.js` names Elimination Matches ("Round R · Match S", "Third-Place Match", "Final") for the discard confirm. Ticket 08's "Winner of Round R · Match S" can reuse it.
