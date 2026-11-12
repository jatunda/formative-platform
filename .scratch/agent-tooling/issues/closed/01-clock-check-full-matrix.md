# 01: `check:clock:full` runs the whole layout matrix

**Priority:** high

**What to build:** One command, `npm run check:clock:full` in `web/`, that runs the School Clock's browser check across every combination where layout bugs have hidden, so no agent has to remember or retype the sweep. The default `npm run check:clock` stays as it is (quick).

The matrix covers, crossed with the default states:
- Readouts: one, two (`countdown,clock`) and three (`countdown,clock,countup`)
- edit mode on and off (`--editing`)
- the timer in the big spot (`--timer`)
- sound already on (`--sound-on`) and the sound prompt showing
- sizes: the defaults plus the short phones 375 × 667 and 360 × 740

Prune combinations that can't differ, so a full run stays reasonable, and say in the script header what was pruned and why. Failures already ticketed (`.scratch/school-clock/issues/52-short-phone-edit-mode.md`) are listed as known, report as "known (ticket 52)" rather than failing the run, and the run fails if a known failure starts passing (so the list can't go stale). It prints one summary across the whole matrix and exits 1 on any unexpected failure.

Then change `CLAUDE.md`'s School Clock line so that a change to clock CSS or layout runs `npm run check:clock:full` before it's done, and `check:clock` stays the tool for single screenshots and quick looks.

Why: tickets 44, 45, 49 and 52 were all layout bugs in combinations the default run skips. The default run passed 55/55 throughout, and agents retyped 4–9 sweep commands per layout ticket. From the 2026-11-12 retro.

Built behaviour: `web/scripts/clock-check.mjs` (its header lists every option; the stage-fit check is from school-clock ticket 44, the agenda check from 43, `--editing` from 42).

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] `npm run check:clock:full` runs the matrix above, prunes duplicates, prints one summary and exits 1 on any unexpected failure
- [x] Ticket 52's failures report as known; one starting to pass fails the run
- [x] The matrix lives in one place (the script), and the header documents it and what was pruned
- [x] It passes on `main` today, apart from the known failures
- [x] `CLAUDE.md` points clock CSS/layout changes at `check:clock:full`
- [x] It starts and stops its own server and browser, leaving nothing running (as `check:clock` does)
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

Built as `web/scripts/clock-check-full.mjs` (header: the matrix, the pruning, the options). The matrix (`fullMatrix()`), the known-failure list (`KNOWN_FAILURES`) and their classifying and failure wording are a pure, unit-tested module, `web/scripts/clock-check-matrix.js`; the browser driving that `check:clock` already did moved into `web/scripts/clock-check-browser.mjs`, which both scripts share (`check:clock` behaves as before). The only pruning is the date outside every School Year, which shows only the time, so it runs once per sound setting rather than under each layout, edit mode and timer: 1694 renders, 6 pages at a time (`--jobs N` to change), about 5½ minutes (323s here). Only failing renders get screenshots.

Two runs gave the same result: 1626 passed, 61 known (ticket 52), 7 known (ticket 53). The matrix found one failure no ticket covered: at 480 × 320 with sound on and the timer, the ring runs into the side Readouts. That's now school-clock ticket 53, listed as known. Ticket 52's comments record the exact failing set the full run pinned down (one Readout at 360 × 740 now passes in edit mode, and outside edit mode 375 × 667 also fails before school with two Readouts).
