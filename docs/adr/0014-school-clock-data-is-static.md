---
status: accepted
---

# School Clock's calendar and Bell Schedules are static files, not database records

The School Clock (`web/clock/`) is a public page that could become a daily driver for the school's ~100 teachers, many of whom will leave it open all day on a projector. It needs to know every Bell Schedule, the Weekday Defaults, and every Calendar Exception for the School Year. Everything else in this repo that a teacher edits — Lessons, Pages, Questions, Practice Sets — lives in the Realtime Database and is edited through an admin screen, so the obvious move was to store the school calendar there too and give it an editor.

We rejected that. The calendar is published once a year (the district's PDF) and changes a handful of times after that, so an editor would be built for a few edits a year. Storing it in the database would put a read on every page load from every teacher's device and make the page depend on the database being reachable, for data that's effectively constant. Instead, each School Year is one hand-edited data file in `web/clock/`, shipped as part of the static hosting bundle. The page makes no database calls at all, so its only cost is hosting bandwidth (well inside the free tier at this scale), and it keeps working from the browser cache even if the backend is down.

Everything a teacher sets — Division, Period Labels, Alarms, Bells on/off, sounds, timer, Readout layout — stays on their own device (`localStorage` / `sessionStorage`). There are no accounts, so nothing follows a teacher between devices.

**Consequences**: any schedule change (a new Calendar Exception, a corrected time, next year's calendar) means editing the data file and redeploying — only Eric can make it, and it reaches teachers once their browser picks up the new deploy. A date outside every known School Year has no Bell Schedule (the clock falls back to plain time), so next year's file has to be added before the first day of school for the countdown out of Summer to work. If schedule edits ever become frequent, or someone other than Eric needs to make them, revisit this: the data shape can move into the database behind the same lookup without changing the clock's logic.
