---
status: accepted
---

# Page authoring gets a new screen instead of extending the Lesson editor

`editor.js`/`editor.html` is tightly coupled to the Lesson save/load flow — it assumes every save is a write to `content/{hash}` and is wired to DOM ids specific to that flow. Pages need different fields (Slug, no Class/Schedule concepts) and a different save target (the `pages/` tree). The reusable parts — DSL parsing and rendering (`dsl.js`, `content-renderer.js`) — are already factored out and used by both `editor.js` and `view.js`.

We chose to build a new, separate screen for Page authoring (plus a Page-manager list screen for creating/finding Pages) that imports the shared DSL modules directly, rather than adding a "type: Page" branch inside `editor.js`. Branching the existing editor would mean threading Page-specific logic through code that currently assumes "this is always a Lesson" everywhere, at the cost of the working Lesson editor's simplicity, for the sake of sharing a save-flow that isn't actually shared between the two concepts.
