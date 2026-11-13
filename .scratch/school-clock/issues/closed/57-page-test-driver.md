# 57: One shared page driver for the clock-page tests

**Priority:** medium

**What to build:** A test-only refactor. Each of the 11 `web/__tests__/unit/clock-page*.test.js` files builds its own way of mounting the page: `open()`, `button()`, `pageText`, and in some files a fake real clock. So a new required option for `initClockApp` means editing 11 files.

Make one shared driver in `web/__tests__/helpers/` (build on `clock-dom.js`) that mounts the clock with given settings, query string, real clock, storage and sound player, and gives the common lookups. Move every clock-page test file onto it. Keep each test's assertions as they are; only the setup moves.

Source: architecture review, 2026-11-12, candidate 5.

**Blocked by:** None

**Status:** closed

- [x] One driver; no clock-page test file defines its own mount or button helpers
- [x] The same tests pass, with the same count
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-12: built.** One driver, `web/__tests__/helpers/clock-page.js`, on top of `clock-dom.js` and `fake-storage.js`. It knows only `initClockApp`'s options and the DOM:

- `openClockPage({ clock, settings, storage, tabStorage, ...options })` mounts the clock: the time from `clock`, an HS device holding `settings` unless `storage` is given, an empty fake tab, and every other option (search, soundPlayer, capabilities, prefersReducedMotion, schoolYears) passed straight through. A new `initClockApp` option now means changing this one function.
- `createRealClock(start)`: `now`, `advance` (timers fire), `jump` (no timers fire), `set`. It replaces each file's `t` and `fakeRealClock`.
- Lookups: `clockMount`, `pageText`, `button(name, root)` (a shown button by accessible name), `anyButton` (shown or not), `storageWith`, `savedSettings`.

All 11 `clock-page*.test.js` files are on it. None of them calls `initClockApp` or defines its own mount, button, page-text or real-clock helper. The two tests about `initClockApp` itself (no mount, and the self-start on import) still call it directly. Each file keeps a short `open()` holding only its own defaults (the start time, its fake sound player, opening Settings first) and handing off to `openClockPage`. Assertions are unchanged; some lookups were renamed (`buttonIn(root, name)` became `button(name, root)`, `control` became `button`). Buttons are now matched by `clock-dom`'s accessible name, not `aria-label ?? text`. Every test still passes with that.

Tests: 341 clock-page tests before and after, with the same per-file counts and test names, and the same number of `expect(` calls per file. Full suite: 3514 passed. `lint`, `typecheck`, `test:coverage` clean. No change under `web/clock/`.
