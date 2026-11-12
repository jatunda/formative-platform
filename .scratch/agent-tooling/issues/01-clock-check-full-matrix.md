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

**Status:** ready-for-agent

- [ ] `npm run check:clock:full` runs the matrix above, prunes duplicates, prints one summary and exits 1 on any unexpected failure
- [ ] Ticket 52's failures report as known; one starting to pass fails the run
- [ ] The matrix lives in one place (the script), and the header documents it and what was pruned
- [ ] It passes on `main` today, apart from the known failures
- [ ] `CLAUDE.md` points clock CSS/layout changes at `check:clock:full`
- [ ] It starts and stops its own server and browser, leaving nothing running (as `check:clock` does)
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass
