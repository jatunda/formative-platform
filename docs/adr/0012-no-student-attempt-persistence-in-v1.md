---
status: accepted
---

# Student attempts are not persisted in v1, despite teacher reporting being a known future want

Teacher-facing results reporting is an explicit future goal for this feature, which would normally argue for persisting student identity and Attempt data from day one — starting collection early, even before anything reads it, so historical data isn't lost. We chose the opposite: v1 writes nothing about student activity to the database at all. Delivery is fully anonymous and a Practice Set's end-of-set summary lives only in the browser for that session. This was a direct call, not an oversight: at grilling time there wasn't yet a clear answer for what shape student identity or an Attempt record should take (one name field? a per-student link? something else?), and locking in a schema now risked getting it wrong and having to migrate real data later rather than just adding a new table.

## Consequences

When reporting is eventually built, it will only have data from the point persistence is switched on — there is no retroactive history from v1 usage to report on.
