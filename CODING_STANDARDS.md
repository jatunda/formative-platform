# Coding standards

Judgement calls for review. Mechanical rules live in tooling (ESLint, `tsc`, coverage thresholds) and the gates in `CLAUDE.md`.

## One source of truth

- A constant, list or rule that more than one module uses (a set of names, a limit, a predicate like "rings until dismissed") is defined once and imported everywhere else. A parallel map keyed by the same values (e.g. display names for a list) lives beside that list.
- Code that two contexts share (e.g. Robotics and the School Clock) goes into an extracted module at the `web/` root with a thin wrapper per context (`web/storage.js` ← `robotics/storage.js`), rather than a copy.

## Page controllers coordinate

A page controller (e.g. `initClockApp` in `web/clock/clock.js`) wires state, the tick loop and feature sections together. Each feature section with its own DOM and behaviour (a timer panel, a mini player) is a small factory in its own module that the controller calls. When a ticket adds a section, it adds a module.

## On-screen wording is Eric's

Domain terms from the `CONTEXT.md` files govern code, comments and docs. Text people see on screen keeps the wording Eric gave, even where it bends a domain term, since he picks words for the teachers and students reading them (see the "Show period end time" setting in `web/clock/CONTEXT.md`'s Period entry). A reviewer or fixer who wants a label or caption changed proposes the new wording in the report and leaves the text as it is.

## A state sets a custom property the base rule reads

When a state (edit mode, the sound prompt showing, a short layout) needs a different size, the base rule reads a custom property and the state sets it, as `web/clock/clock.css` does with `--edit-room`, `--edit-cap`, `--hint-room` and `--banner-room`. This keeps each size in one rule; a selector repeated only to win specificity is the smell to replace.
