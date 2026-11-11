# 35: The Off-Hours line repeats the schedule's heading

**Priority:** medium

**What's wrong:** After school, the screen says the same thing twice (Eric, Nov 10, on the live site):

> Next: Wed, Nov 11 · All School Convocation · starts in 10:35:25
>
> Next School Day · Wed, Nov 11 · All School Convocation

Ticket 25 already drops "starts in …" (on `clock-polish`, not live yet). The line under the Readouts ("Next: Wed, Nov 11 · All School Convocation") still repeats the Day Bar's heading ("Next School Day · Wed, Nov 11 · All School Convocation"). On a day off it's the same: "Back Mon, Nov 30 · All Day" sits over "Next School Day · Mon, Nov 30 · All Day".

**What to build:** Whenever the Day Bar shows the Next School Day's heading, drop the line under the Readouts. Keep the line where there's no bar to say it: Experience Week ("It's Experience Week · back …"), Summer, and an unknown date. Check whether any setting or screen size hides the Day Bar or its heading (e.g. the short 480 × 320 layout). If one does, keep the line in that case so the Next School Day is still named somewhere.

Files: `display-text.js` (pure; `line`), `day-bar.js` / `day-bar-view.js` (when the heading shows), `clock.js`. Built behaviour: closed tickets 08 (Off-Hours), 20 (Day Strip), 25 (this line's wording).

**Blocked by:** none

**Status:** closed

- [x] After school and on a day off, the Next School Day is named once, in the Day Bar heading
- [x] Experience Week, Summer and unknown-date lines are unchanged
- [x] Wherever the bar or its heading is hidden, the line still shows
- [x] Tests cover each Off-Hours state; `check:clock` after-school and day-off renders look right
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-11-10: built on `worktree-agent-a20f500c1c7f69cdd`.**

- **Rule:** `displayText` marks the after-school and day-off lines `namesNextDay` (they only name the Next School Day). `clock.js` works out the bar before the stage words; when the bar shows the Next School Day (so its heading does too), `stage-text-view.js` gives the line `clock-line--in-bar`, and `clock.css` hides that class only at `min-height: 521px`.
- **Where the line stays:** Experience Week, Summer and an unknown date (no bar). While a timer runs (the bar is hidden for the ring), the line is back. The short layout (height 520 px or less, e.g. 480 × 320) hides the whole bar, so the CSS keeps the line there. The phone layout shows the bar heading above its agenda, so the line goes there too. The mini player has no bar and keeps its line.
- **Tests:** after school, day off, a timer hiding the bar and its return, and Experience Week / Summer / unknown date (`clock-page.test.js`); the CSS rule and its short-layout exception (`clock-hosting.test.js`).
- **Checks:** lint, typecheck and coverage pass. `check:clock` (after, dayoff, weekend, experience at 1920×1080, 1280×720, 480×320, 390×844) passed 16/16. Noticed, not changed: at 480 × 320 the "Click to change what this shows" hint sits over the line on a first visit; that was already so.
