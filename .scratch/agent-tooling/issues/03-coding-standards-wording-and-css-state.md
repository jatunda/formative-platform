# 03: Coding standards: user-facing wording, and CSS state through custom properties

**Priority:** medium

**What to build:** Two judgement rules added to `CODING_STANDARDS.md` (read at review), each short and in the file's style (a heading, then the rule and its reason in a sentence or two):

1. **User-facing wording is Eric's.** The domain terms in the `CONTEXT.md` files govern code, comments and docs. Text people see on screen follows the wording Eric gave, even where it bends a domain term. A reviewer or fixer who thinks a label or caption should change *proposes* it in the report and leaves the text as it is. Point to the "Show period end time" exception in `web/clock/CONTEXT.md` as the example.
2. **A state adjusts a size through a custom property the base rule reads.** When a state (edit mode, the sound prompt showing, a short layout) needs a different size, the base rule reads a custom property and the state sets it (the School Clock's `--edit-room`, `--edit-cap`, `--hint-room` and `--banner-room`). A rule that repeats another rule's selector only to outrank it is the smell this replaces.

Why: in the last session a review fix renamed a setting against Eric's wording ("Show when this Segment ends"), and he then asked for "Show period end time". And twice (school-clock tickets 43 and 45) CSS repeated selectors just to win specificity, and the first review missed it. From the 2026-11-12 retro.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Both rules are in `CODING_STANDARDS.md`, each with its reason and one concrete pointer
- [ ] Nothing else in the file changes, and the file stays short
- [ ] Docs only: no code changes, so no checks to run
