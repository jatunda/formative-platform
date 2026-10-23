# 11: Re-check the Slug against the cached Practice Set id

**What to build:** The server shell for `/practice/<slug>` is cached at the CDN for a day and carries the Practice Set id it resolved (ticket 06). If Eric points that Slug at a different Practice Set, or removes it, students could get the old set for up to a day. The browser already knows the Slug from the URL, so it reads the Slug's current Practice Set id at the same time as the Practice Set it was handed. They normally match, so this adds no wait. If they differ, it loads the Slug's current Practice Set instead. If the Slug no longer names any Practice Set, it shows "not found".

Raised in review of the pmcq-improvements branch, after ticket 07.

**Blocked by:** 06, 07

**Status:** closed

- [x] With an embedded id and a Slug in the path, the Slug index read and the Practice Set read start together, with no extra round trip when they agree.
- [x] When the Slug now names a different Practice Set, that set is loaded and its Saved Progress is used.
- [x] When the Slug names no Practice Set, the page shows "Practice set not found".
- [x] The `?slug=` dev path is unchanged.
- [x] Lint, typecheck and `test:coverage` are clean.

## Comments

Implemented as `readNamedPracticeSet` in `web/practice-view.js`. When the Slug check disagrees with the embedded id, the browser reads the Slug's Practice Set, which costs one extra round trip only in that case. Saved Progress is keyed to the Practice Set actually loaded. The link-preview title can still lag by up to a day (story 71); only what the student sees on the page is corrected.
