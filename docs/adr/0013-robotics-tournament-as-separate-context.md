---
status: accepted
---

# Robotics Tournament as a separate bounded context, not a section in the root CONTEXT.md

The new in-class robotics tournament control panel (Teams, Matches, Alliances, Brackets) needed to go somewhere. The repo had exactly one `CONTEXT.md` and no `CONTEXT-MAP.md`, and `web/` is otherwise flat — one HTML page + same-named `.js` controller per concern, no per-feature subfolders. The obvious low-ceremony option was a new `## Tournament Language` section at the bottom of the existing root `CONTEXT.md`, alongside `robotics.html`/`robotics.js` dropped directly into `web/` like every other page.

We rejected that. The root glossary already defines **Schedule** as "the ordered sequence of Lessons for one Class, indexed by Day Index" — a direct collision with the tournament feature's own need for a match-timing concept. Beyond that one collision, the two domains share no vocabulary at all (Team/Match/Alliance/Bracket vs. Lesson/Page/Question/Practice Set); this isn't an extension of the existing glossary, it's an unrelated one bolted on next to it.

Instead: a new `CONTEXT-MAP.md` at the root names both contexts, the tournament feature's code lives under `web/robotics/` (its own folder, breaking the otherwise-flat `web/` convention), and it gets its own `web/robotics/CONTEXT.md`.

We deliberately did *not* generalize this into a speculative "classroom control panel" context/folder name, despite there being a plausible future where more live-control-panel-style features get added. There's only one such feature today; naming the boundary after a hypothetical second one would be guessing at a shape we don't need yet. If a second control-panel feature materializes, that's the point to decide whether it joins this context or gets its own, and whether `web/robotics/` should be renamed/generalized then.

**Consequence**: the root `CONTEXT.md` and `web/robotics/CONTEXT.md` must be kept independently coherent — a term resolved in one does not apply to the other, and `_Avoid_` callouts in one don't protect against collisions in the other. `CONTEXT-MAP.md` is the only place that names both and should be updated if a third context is ever added.
