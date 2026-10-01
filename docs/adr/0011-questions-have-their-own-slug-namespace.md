---
status: accepted
---

# Questions get their own Slug namespace, separate from Pages

Reusing the existing `slugIndex`/`[[slug]]` machinery for Questions was the cheaper option — one index, one link syntax, nothing new to build. We chose a separate `questionSlugIndex` and a distinct `[[q:slug]]` link syntax instead, for two reasons: a shared namespace means a Page and a Question with the same natural name (e.g. both called `loops`) would silently collide, one clobbering the other's claim on the Slug; and a bare `[[slug]]` in DSL source gives no visual signal of what kind of thing it points to, which matters because the teacher hand-writes and re-reads this DSL daily.

## Consequences

Page and Question Slugs never collide with each other, and the two link forms are visually distinguishable at a glance in source — at the cost of Questions needing their own parallel Slug Rename / backlink-style machinery if those features are ever extended to Questions, rather than getting them for free from the Page implementation.
