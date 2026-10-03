# 10: Self-alliance confirmation (single-team Playoff Alliance)

**What to build:** Today, selecting the same Team in both Team A and Team B when forming a Playoff Alliance silently does nothing. Instead, show a confirmation dialog explaining the teacher is about to form a single-team alliance, and if confirmed, form a Playoff Alliance containing just that one Team (rather than requiring exactly two).

**Blocked by:** 02 (Confirmation dialogs for Reset Results and New Tournament) — reuses its confirm-dialog component

**Status:** closed

- [x] Selecting the same Team for both alliance slots and clicking Form Alliance opens a confirmation dialog instead of silently failing
- [x] Confirming forms a Playoff Alliance with exactly one Team
- [x] Canceling leaves the selection untouched and forms nothing
- [x] A single-team Playoff Alliance displays correctly everywhere alliances are shown (alliance list, seed assignment, bracket) without assuming exactly two Team names are present
- [x] `web/robotics/CONTEXT.md`'s **Playoff Alliance** entry is updated if its "two-Team pairing" wording no longer holds universally
