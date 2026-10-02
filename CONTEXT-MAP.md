# Context Map

This repo holds two unrelated bounded contexts. They share no vocabulary — a term in one has no meaning (or a different meaning) in the other — and are documented separately rather than in one glossary.

- **Formative Platform** (`CONTEXT.md`, root): the single-teacher lesson planning/delivery tool — Lessons, Pages, Questions, Practice Sets. Lives across `web/` (flat, one page per concern) and `functions/`.
- **Robotics Tournament** (`web/robotics/CONTEXT.md`): the in-class VEX-style tournament control panel — Teams, Matches, Alliances, Brackets. Lives in `web/robotics/`. See `docs/adr/0013-robotics-tournament-as-separate-context.md` for why this got its own context instead of a section in the root glossary.

`docs/adr/` at the root holds decisions that apply system-wide (e.g. hosting, page-rendering architecture) or that explain the relationship between the two contexts. A context-specific ADR directory under `web/robotics/docs/adr/` can be added later if that context accumulates its own internal decisions.
