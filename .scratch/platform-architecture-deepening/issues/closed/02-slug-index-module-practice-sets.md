# 02: Slug index module, starting with Practice Sets

**What to build:** A single Slug index module owns the rules every Slug namespace shares: format validation, claiming a Slug (refusing one already taken by another entity), Slug Rename, releasing an entity's Slugs on delete, and resolving a Slug to its entity. It is scoped by namespace, so Pages, Questions and Practice Sets each keep their own Slug namespace as ADR-0011 requires. Only the code is shared. Practice Sets move onto it first, as the smallest of the three copies. Pages and Questions keep their current code until ticket 03.

Source: candidate 4 ("One Slug index module", Worth exploring) of the 2026-10-12 architecture review. Vocabulary: **Slug**, **Slug Rename**, **Practice Set** in `CONTEXT.md`. ADR-0011 (Questions have their own Slug namespace) requires separate namespaces, not separate code; consider adding a line to that ADR saying so.

**Blocked by:** 01 (Page delete clears Question Backlinks). It touches the Page delete path that ticket 03 moves onto this module.

**Status:** closed

- [x] A Slug index module, scoped by namespace, offers claim / rename / release / resolve and enforces the Slug format and "taken by another" rules
- [x] Practice Set Slug operations go through it; the Practice Set module's own copy is deleted
- [x] Practice Set editor and manager behaviour (error messages included) is unchanged
- [x] Unit tests cover the module directly against the Firebase test double: claim, conflicting claim, rename, release, resolve, two namespaces not colliding on the same Slug text
- [x] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`
