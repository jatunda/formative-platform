# 03: Pages and Questions use the Slug index module

**What to build:** Page and Question Slug operations go through the Slug index module (ticket 02), deleting the two remaining copies. Backlink diffing (working out which Backlinks to add and remove when a Page's links change) is shared behind one interface instead of being copied for Page Links and Question Links. The Page module becomes the only module that writes Page records. Today the Question module reads Page records directly and writes the Page's list of Question Links itself.

Source: candidate 4 of the 2026-10-12 architecture review. Vocabulary: **Slug**, **Slug Rename**, **Page Link**, **Question Link**, **Backlink** in `CONTEXT.md`. Respect ADR-0007 (Links are static text), ADR-0008 (Backlinks as a live-maintained index) and ADR-0011 (separate namespaces).

**Blocked by:** 02 (Slug index module).

**Status:** closed

- [x] Page and Question Slug claim / rename / release / resolve go through the Slug index module; their own copies are deleted
- [x] One Backlink-diffing implementation serves both Page Links and Question Links
- [x] Only the Page module writes Page records; the Question module asks it instead
- [x] Slug Rename still rewrites every Page Link pointing at the old Slug (existing behaviour)
- [x] Page editor, Page manager and Question editor behaviour, error messages included, is unchanged
- [x] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`
