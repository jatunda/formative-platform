---
status: accepted
---

# Pages skip a draft/publish workflow and inherit the existing (unauthenticated) write rules

Pages are meant to be shared outside the app — a syllabus linked in Google Classroom — which might suggest they need a draft/published state to avoid exposing half-written content. We chose not to build one: a Page's visibility is simply whether it has a Slug assigned. No Slug means no reachable URL; assigning one makes it live immediately, matching the instant-save behavior Lessons already have. A separate published flag would have added a second field meaning almost the same thing as "has a Slug," for a workflow (drafting privately before a big reveal) that doesn't match how this is actually used.

Separately, `database.rules.json` currently has `.write: true` with no real auth check anywhere in the app — the "teacher auth" gate (`web/teacher-auth.js`) is a client-side-only UI gate, invisible to Firebase's rules engine, since the app doesn't use real Firebase Authentication. This is a pre-existing, app-wide gap, not something Pages introduce. We chose to let the new `pages/` and slug-index trees inherit that same rule unchanged, rather than build a partial fix scoped to just this feature. Pages do make the gap more consequential — a Page's Slug is a human-guessable, publicly-shared path, unlike a Lesson's opaque random hash — but fixing it properly means introducing real Firebase Authentication across the app, which is a separate initiative and deliberately out of scope here.
