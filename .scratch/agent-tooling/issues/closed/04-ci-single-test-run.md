# 04: CI runs the test suite once

**Priority:** low

**What to build:** In `.github/workflows/test.yml`, the `test` job runs `npm run test:run` and then `npm run test:coverage`, which runs the same suite again with coverage. Remove the plain "Run tests" step, so the suite runs once and the coverage step (which also enforces the thresholds) is the test gate. Everything else (lint, typecheck, the coverage artifact upload, the `functions` job, the Node matrix) stays as it is.

Why: halves the test time in CI and changes nothing else. From the 2026-11-12 retro.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] The `test` job runs the suite once, through `npm run test:coverage`
- [x] Lint, typecheck, the coverage upload and the `functions` job are unchanged
- [x] The workflow is still valid YAML (e.g. parse it); if it's pushed, CI goes green
