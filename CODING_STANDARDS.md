# Coding standards

Judgement calls for review. Mechanical rules live in tooling (ESLint, `tsc`, coverage thresholds) and the gates in `CLAUDE.md`.

## One source of truth

- A constant, list or rule that more than one module uses (a set of names, a limit, a predicate like "rings until dismissed") is defined once and imported everywhere else. A parallel map keyed by the same values (e.g. display names for a list) lives beside that list.
- Code that two contexts share (e.g. Robotics and the School Clock) goes into an extracted module at the `web/` root with a thin wrapper per context (`web/storage.js` ← `robotics/storage.js`), rather than a copy.

## Page controllers coordinate

A page controller (e.g. `initClockApp` in `web/clock/clock.js`) wires state, the tick loop and feature sections together. Each feature section with its own DOM and behaviour (a timer panel, a mini player) is a small factory in its own module that the controller calls. When a ticket adds a section, it adds a module.
