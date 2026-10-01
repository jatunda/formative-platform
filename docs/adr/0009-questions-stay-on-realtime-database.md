---
status: accepted
---

# Questions and Practice Sets stay on Firebase Realtime Database, not SQL

Adding graded, reusable content with tags and (eventually) per-student results is the kind of feature that usually argues for a relational database — reporting-style questions ("which students missed this topic most") are exactly where a JSON tree struggles. We chose to stay on Realtime Database anyway: `questions/{id}`, `questionSlugIndex/{slug}`, and `practiceSets/{id}` fit the same denormalized-index shape already proven by `pages/`, `slugIndex/`, and `backlinks/` — this isn't a new pattern, just another instance of one. The querying weakness that would justify SQL (aggregating results across students and topics) belongs entirely to teacher-side reporting, which is explicitly deferred (see ADR 0012) — there's no reporting query to serve yet.

Moving to SQL now would also cost more than the feature itself: today the client talks straight to Firebase via its JS SDK, with the single Cloud Function existing only to inject SSR meta tags for link previews. SQL isn't reachable from the browser, so adopting it means standing up a real API server — ongoing infrastructure for a solo teacher-developer to run and maintain, not just a schema change.

## Consequences

If teacher reporting later needs real aggregation, the preferred path is exporting attempt data for analysis (e.g. a BigQuery or SQLite dump) rather than replacing the live delivery database — keeping the student-facing read/write path on the technology it's already proven on.
