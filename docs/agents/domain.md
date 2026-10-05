# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root: points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`CONTEXT.md`** at the repo root: the Formative Platform context (Lessons, Pages, Questions, Practice Sets), spanning `web/` (excluding `web/robotics/`) and `functions/`.
- **`web/robotics/CONTEXT.md`**: the Robotics Tournament context (Teams, Matches, Alliances, Brackets), confined to `web/robotics/`.
- **`docs/adr/`**: system-wide decisions, or ones explaining the relationship between the two contexts. Read ADRs that touch the area you're about to work in.
- **`web/robotics/docs/adr/`**: context-specific decisions for Robotics Tournament, if that directory exists yet (see ADR 0013 — it may be added later as that context accumulates its own decisions).

If any of these files don't exist, proceed silently — don't flag their absence or suggest creating them upfront. The `/domain-modeling` skill creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT.md                 ← Formative Platform context
├── CONTEXT-MAP.md
├── docs/adr/                  ← system-wide decisions
├── functions/
└── web/                       ← Formative Platform UI
    └── robotics/
        ├── CONTEXT.md         ← Robotics Tournament context
        └── docs/adr/          ← context-specific decisions (not yet created)
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant context's `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids, and don't carry vocabulary across contexts — a term in one has no meaning (or a different meaning) in the other.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-000X, but worth reopening because…_
