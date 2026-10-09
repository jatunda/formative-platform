# 07: Lock Alliance Selection once a Bracket exists, and Discard Bracket

**What to build:** Once the Finals have started, Alliance Selection is locked, so the Bracket can never point at alliances that no longer exist.
- **What stays on screen:** the Standings table and the alliance list, so the class still sees the final alliances.
- **Locked controls:** Pick, Declined, Undo, ↑/↓, Remove, Bracket Size, Third-Place. They do nothing and show an error toast: "Locked — the Finals have started. Discard Bracket to change alliances."
- **"Finals in progress" card:** replaces the Captain banner and Start Finals, with **On to Finals →** and a secondary **Discard Bracket**.
- **Discard Bracket:** asks for confirmation, naming any Elimination Match results that will be lost. It then removes the Bracket and resets the Podium reveal, and keeps the alliances, Declines, Bracket Size, and Third-Place setting. Discarding and pressing Start Finals again is how a bracket gets regenerated.

Spec: `.scratch/robotics-alliance-selection-and-finals/spec.md`, user stories 45–48, and "Locked and invalid actions explain themselves". Vocabulary: **Elimination Bracket**, **Discard Bracket** in `web/robotics/CONTEXT.md`.

**Blocked by:** 03 (Alliance Selection tab), 04 (Declines, so the lock covers Decline and Undo from the start).

**Status:** ready-for-agent

- [ ] While a Bracket exists, every Alliance Selection state action does nothing: forming, removing, and reordering alliances; Decline and Undo; Bracket Size and Third-Place
- [ ] Clicking any of those controls while locked shows the lock toast, through the block-reason query
- [ ] The Standings table and alliance list remain visible while locked
- [ ] The "Finals in progress" card shows On to Finals → (which switches to Finals) and Discard Bracket
- [ ] Discard Bracket asks a confirm naming the recorded Elimination results that will be lost. If confirmed, it clears the Bracket and the Podium reveal and keeps everything else. If cancelled, nothing changes
- [ ] After discarding, Alliance Selection is editable again, and Start Finals builds a new Bracket
- [ ] Unit tests cover every locked no-op and the discard behavior. DOM tests cover the toasts, the card, and the discard flow
- [ ] `npm run test:coverage` in `web/` passes
