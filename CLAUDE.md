# Formative Platform

Single-teacher tool for planning/delivering class content. See `CONTEXT.md` for domain language (Lesson, Page, Slug, etc.) and `readme.md` for the DSL and dev/test commands.

## Before considering any `web/` change complete

Run coverage, not just the test suite:

```
cd web
npm run test:coverage
```

`npx vitest run` alone can pass while coverage silently regresses — `vitest.config.js`'s `coverage.thresholds` is a hard gate (currently lines 86% / functions 84% / branches 89% / statements 86%) and only `test:coverage` evaluates it. A change is not done until this command exits clean.

If it fails:

- **Your diff introduced the gap** (new `if`/`&&`/`||`/ternary with a path never exercised) — add a test for the missing branch. Don't rationalize it away as "trivial" or "obviously correct"; untested branches are exactly where regressions hide.
- **The gap predates your diff** (pre-existing file was already short) — still fix it rather than lowering the threshold. The comment above `thresholds` in `vitest.config.js` calls it "a ratcheting floor, not an aspirational target": numbers only move up as real coverage work lands, never down to accommodate a shortfall. Finding uncovered branches: `npx vitest run --coverage` prints uncovered line numbers per file in the text summary; `coverage/coverage-final.json`'s `branchMap`/`b` fields give exact branch-level locations if the line numbers aren't precise enough (a branch's "not taken" location is often attributed to the line *after* a one-line `if` with no `else`).
- **Truly unreachable defensive code** (a guard whose caller already prevents the condition) is the one legitimate exception — don't contort a test around it. Leave it uncovered and say so, rather than lowering the threshold to paper over it.

Lowering `coverage.thresholds` to make a failing run pass is not an acceptable fix on its own — raising it is reserved for when coverage has genuinely improved.

## Agent skills

### Issue tracker

Issues/specs live as markdown files under `.scratch/<feature-slug>/`; closing moves the file into `issues/closed/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Multi-context: root `CONTEXT.md` (Formative Platform) + `web/robotics/CONTEXT.md` (Robotics Tournament), mapped from `CONTEXT-MAP.md`. See `docs/agents/domain.md`.
