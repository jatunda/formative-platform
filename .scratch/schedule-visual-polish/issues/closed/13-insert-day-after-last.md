# 13: Insert Day after the last day must add a day

**What to build:** The Insert Day "+" below the last day (Full Schedule since ticket 12, and Lesson Planning's last "+" when the Planning Window runs past the last day) adds an empty day after the last day. The add-day row moves down one, and the new day is still there after a reload.

**Why it doesn't today:** `insertDayAt(classId, maxDayIndex + 1, maxDayIndex)` shifts nothing and writes `[]` at the new index. Realtime Database stores an empty array as nothing, and a Schedule's length is its highest stored Day Index. So the write is a no-op and, after the reload, the add-day row is back where it was. An empty day *after the last stored day* can't be stored at all as things are.

**Decision needed (Eric):** how to store it. Options:
- (A) Store a schedule length per Class (e.g. `classes/<id>/scheduleEnd`). The Full Schedule's add-day row and the Planning Window read it, and insert/delete keep it up to date. This is a small data-model change, so grill it first.
- (B) Show the empty day on the client only. It disappears after a reload.
- (C) Make the "+" below the last day do what the add-day row does, and accept that no new day appears.

## Decision

Eric: "only have an extra row at the bottom that allows you to + or link a new lesson, and that way it will only create the day if there is a lesson in it."

So no data-model change and no empty trailing days. On Full Schedule, the gutter "+" below the last day (ticket 12, item 8) goes; the existing add-day row at the bottom, with its New Lesson "+" and Link Lesson buttons, is how a day gets added after the last one. Lesson Planning follows the same rule: no gutter "+" where inserting would only create an empty day past the last stored day (a no-op after reload). The "+" marks between real days, and above the first shown day when it is a real day, stay.

**Blocked by:** 12 (review fixes).

**Status:** closed

- [x] Full Schedule has no gutter "+" below the last day; the add-day row is how a day gets added after it
- [x] Lesson Planning shows no gutter "+" past the last stored day (above a day past it, or below the window when no stored day follows)
- [x] "+" marks between real days stay on both pages
- [x] The teacher.js comment and the check:schedule gutter-plus assertion match
- [x] lint, typecheck, test:coverage and `npm run check:schedule` pass
