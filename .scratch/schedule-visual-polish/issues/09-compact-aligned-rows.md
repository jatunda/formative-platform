# 09: Compact, aligned day rows

**What to build:** Each day row in a schedule table takes less height: less space above and below each Lesson in its cell, so the 🗑 Delete Day button is shorter too (Eric is fine with that). Every cell of a day row (Day Index, Date, Lessons, 🗑) shares one top and one bottom line; today they end at different heights.

**Blocked by:** 08 (Text "+"). Ordering note: tickets 06–11 change the same schedule rows and stylesheet, so they run in order to avoid merge conflicts.

**Status:** ready-for-agent

- [ ] Rows are visibly shorter than before on both pages
- [ ] At 1280, 800 and 375 wide, a day row's cell borders form straight lines
- [ ] Days with 0, 1 and several Lessons all line up
- [ ] Touch-screen tap targets in the row stay at least 44px tall
