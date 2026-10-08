# 03: Give the accordion its own CSS heading class

**What to build:** `renderAccordion`'s heading stops sharing `.robotics-card-title` with plain card headings elsewhere in the panel. It gets its own dedicated class, so a future CSS change aimed at one no longer risks leaking into the other's structurally different markup (a plain `<h3>` card heading vs. a `<span>` nested inside the accordion's toggle `<button>`).

Source: candidate 5 of the robotics architecture review (`/improve-codebase-architecture`), strength "Speculative." Not yet grilled in detail — treat the solution direction below as a starting point, not a locked design.

Context: `.robotics-card-title` is used both as a plain `<h3>` card heading (several places in `robotics.js`) and as a `<span>` inside `renderAccordion`'s toggle `<button>`. This already caused one CSS leakage bug, patched by commit `077c52f` with a scoping comment in `robotics.css` rather than a structural fix — the root cause (the accordion borrowing a generic class) is still there.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `renderAccordion`'s heading span uses a new dedicated class (e.g. `.robotics-accordion-title`) instead of `.robotics-card-title`
- [ ] `robotics.css`'s accordion-heading styling is rewritten against the new class
- [ ] The scoping comment left over from commit `077c52f` is removed once the structural ambiguity it was guarding against no longer exists (or updated if a different ambiguity still remains)
- [ ] Visual appearance of the accordion heading (Match Timeline panel, Finals setup panel) is unchanged
- [ ] `npm run test:coverage` passes clean per `CLAUDE.md`
