# 57: One shared page driver for the clock-page tests

**Priority:** medium

**What to build:** A test-only refactor. Each of the 11 `web/__tests__/unit/clock-page*.test.js` files builds its own way of mounting the page: `open()`, `button()`, `pageText`, and in some files a fake real clock. So a new required option for `initClockApp` means editing 11 files.

Make one shared driver in `web/__tests__/helpers/` (build on `clock-dom.js`) that mounts the clock with given settings, query string, real clock, storage and sound player, and gives the common lookups. Move every clock-page test file onto it. Keep each test's assertions as they are; only the setup moves.

Source: architecture review, 2026-11-12, candidate 5.

**Blocked by:** None

**Status:** open

- [ ] One driver; no clock-page test file defines its own mount or button helpers
- [ ] The same tests pass, with the same count
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
