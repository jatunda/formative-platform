# 59: One screen-words module says everything the clock writes

**Priority:** medium

**What to build:** A refactor with no visible change. What the screen says is pieced together across several modules:

- `display-text.js`'s `displayText` and `headingText`. `headingText` calls `displayText` with made-up settings and joins its result with `' · '`, which `stage-text-view.js` splits apart again.
- `mini-content.js`, which rebuilds the Readout options.
- `clock.js`'s `textFor`, and the caption rewrite while the Timer shows (around `renderReadouts`).
- `day-bar-view.js`, which re-joins `name · label` that `formatSegmentName` already joins.

There are 4 different ways of passing the settings that affect the words.

Make one pure module that takes the moment, the time, the settings and the Timer view, and returns the words for the stage, the mini player and the Readout captions as structured fields. The views only draw what it returns. The caption rule gets a pure test.

Source: architecture review, 2026-11-12, candidate 2.

**Blocked by:** 58 (both edit `clock.js`'s render path)

**Status:** closed

- [x] No string is joined in one module and split in another
- [x] One way to pass the settings that affect the words
- [x] The Timer-caption rule is tested without the DOM
- [x] Existing clock tests pass
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-12: built.** No visible change. `display-text.js` grew into `clock/screen-words.js` (git mv), and `mini-content.js` folded into it and was deleted.

Interface: one pure call, `screenWords({ now, moment, settings, timer, readouts })`, where `readouts` is the layout's modes (null when the Readouts show just the time) and `timer` the Timer's view or null. It returns `{ banner, stage, readouts, mini }`: `stage` is `{ day: { dayLabel, date }, heading: { title, tag, hidden }, under }` with `under` one of `next` (label "Up next"/"Ends", name, at), `line` (text, namesNextDay) or `none`; `readouts` the Readouts' parts, captions final (the Timer-caption rule lives here: beside the ring, a big "until end" becomes "until end of Period 3 · AP CSA"); `mini` the mini player's `MiniContent`. `stage-text-view.js` now only draws `StageWords` (no `' · '` split, no imports of words or formats); `clock.js` lost `textFor`, `renderMini`, `barFor` and all readout/caption work.

One way to pass the settings: a `WordSettings` typedef in `format.js` (`use24Hour`, `showSeconds`, `periodLabels`, `showPeriodEnd`); every module that writes words takes the settings themselves and reads what it needs. So `readoutParts`/`readoutText` take `{ use24Hour, showSeconds }` (not `{ seconds }`), `ringWords(ring, settings)` and `nextRingLines(now, schoolYears, settings)` drop the `RingText` function bundle (`ringSourceText` is now private), `ringing.advance(lastTick, now, settings)` drops its `text` argument, `createDayBarView().show(bar, settings, { editing })` drops its `time` function, and `describeBar` is handed the settings rather than a rebuilt subset. Bar blocks carry `fullName` (from `formatSegmentName`; "Until Period 1 · AP CSA" for the countdown), so `day-bar-view.js` no longer re-joins name and label.

Design choice: two shapes were sketched. (A) One call returning every word on the screen. (B) Three calls, `stageWords`, `readoutWords` and `miniWords`, with the page threading the big Readout and its mode from the second into the third. A was chosen: one entry point, and the mini player's big Readout, mode and the Timer caption are decided in one place instead of wired by `clock.js`. Left as they were (well served, or not screen words): `alarm-text.js`, the ring card, the mini player's "Ringing ·" overlay, and the Day Bar's own headings and accessible names, which `day-bar-view.js` still writes from the bar.

No new domain term, so no glossary entry.

Tests: `__tests__/unit/clock-screen-words.test.js` (was `clock-display-text.test.js`; 18 tests on the new interface, including the Timer-caption rule without the DOM), `fullName` checks in `clock-day-bar.test.js`, and `clock-readouts`/`clock-ring-words`/`clock-ringing` tests moved to the settings argument. The clock-page tests are unchanged and pass.

Checks in `web/`: `npm run lint`, `npm run typecheck` and `npm run test:coverage` clean (3543 tests; `screen-words.js`, `clock.js`, `stage-text-view.js`, `day-bar-view.js`, `ring-words.js` at 100%). No CSS, layout or markup change, so `check:clock:full` wasn't needed.
