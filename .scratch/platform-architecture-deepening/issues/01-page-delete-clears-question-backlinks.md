# 01: Deleting a Page clears its Question Backlinks

**What to build:** When a Page is deleted, every Question Backlink recording that the Page links to a Question is removed too, just as its Page Backlinks already are. Today Page deletion clears the Page record, its Slugs and its Page Backlinks, but leaves its entries in the Question Backlink index. The Question editor's delete and remove confirms count those entries, so they keep warning about Pages that no longer exist.

Source: bug found during the 2026-10-12 architecture review (candidate 4 area). Vocabulary: **Page**, **Question**, **Question Link**, **Backlink** in `CONTEXT.md`. See ADR-0008 (Backlinks as a live-maintained index) and ADR-0010 (Questions are linked, not inline).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Deleting a Page removes it from the Question Backlinks of every Question it linked to, in the same atomic update as the rest of the delete
- [ ] The Question editor's delete/remove confirm no longer counts a deleted Page
- [ ] Unit test: a Page with Question Links is deleted, and the Question Backlink entries for it are gone
- [ ] A one-off cleanup script alongside the existing ones in `scripts/` removes every Question Backlink entry that points at a Page that no longer exists. It prints what it would remove and only writes when asked to (e.g. a `--apply` flag)
- [ ] The script has been run against the live database, and the result noted in Comments
- [ ] `npm run test:coverage` in `web/` passes clean per `CLAUDE.md`

## Decisions

- **Existing stale entries (2026-10-12, Eric):** clean them up once with a script. Pruning on read was rejected because it adds a database write to a read path; ignoring them was rejected because the delete confirm would keep miscounting.
