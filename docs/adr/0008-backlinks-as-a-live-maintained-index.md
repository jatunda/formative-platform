---
status: accepted
---

# Backlinks are a continuously-maintained index, not a rename-time scan

Slug Rename (ADR 0007) only needs to know, at the moment of a rename, which Pages currently link to the one being renamed — a question a one-off full scan of every Page's content could answer well enough at today's scale. We chose to build a real Backlink index instead (`backlinks/{targetPageId}/{sourcePageId}`, updated incrementally on every Page save by diffing against that Page's previously-known outgoing links), specifically because the user wants a future "show backlinks at the bottom of a page" feature, and a scan-only approach only ever answers "who links here" at the moment of a rename — it would go stale the instant any other Page's links changed, making it useless for a live "view backlinks now" feature without a rebuild step.

Building the live index now, while there's only a handful of Pages, means that future feature needs no migration or backfill: the data has been accurate since the first Page Link was ever saved. The cost is real, ongoing complexity — every Page save must parse out its Page Links, resolve them to target ids, and reconcile the diff against the index — taken on before there's a second consumer of the data to justify it beyond Slug Rename alone.
