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

**Status:** open

- [ ] After school and on a day off, the Next School Day is named once, in the Day Bar heading
- [ ] Experience Week, Summer and unknown-date lines are unchanged
- [ ] Wherever the bar or its heading is hidden, the line still shows
- [ ] Tests cover each Off-Hours state; `check:clock` after-school and day-off renders look right
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
