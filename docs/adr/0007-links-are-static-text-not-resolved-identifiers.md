---
status: accepted
---

# Page Links and Section Links are static text, not resolved identifiers

The obvious design for "link from one Page to another that survives a rename" is to store a reference to the target Page's durable id, and resolve that id to the target's current Slug at render time. We built most of the way toward this (see the "resolved at render time" direction discussed before this ADR) before rejecting it: `content-renderer.js` is currently a pure, synchronous, zero-dependency module, and making it resolve ids means giving it a database dependency and making every render call site (`editor.js`, `page-editor.js`, `page-view.js`, `view.js`) async — a real, cascading architectural change, purely to save a page-content author from having to fix a link after a rename event that, in practice, is rare.

We chose the opposite: a Page Link (`[[slug]]`) stores the target's Slug as plain static text, rendered synchronously exactly like today's `[text](url)` markdown links — no database call, no async cascade. To still survive a rename, Slug Rename (a new single-step action) uses the Backlink index to find every Page Link pointing at the old Slug and rewrites them in place at rename time, rather than resolving them lazily at every view. This moves the cost from "every page view, forever" to "the rare moment a Slug is renamed" — the same trade Obsidian itself makes for `[[wikilinks]]` between local files.

Section Links (`[[#Header Text]]`) follow the same philosophy one step further: no stored identifier at all, not even a rewritable one. They're matched against the actual header text at render time. A reworded header breaks any Section Link pointing at it, with no rewrite mechanism to fix it automatically — accepted because a Section Link only ever points within the single Page you're actively editing, where you'd notice and fix it in the same sitting, unlike a Page Link that might live in content you wrote weeks ago.

## Consequences

A Page Link or Section Link can go stale outside of a Slug Rename: removing a Slug outright (no replacement), deleting a Page, or rewording a header all produce a Broken Link, rendered as plain non-clickable text rather than a dead link or a crash.
