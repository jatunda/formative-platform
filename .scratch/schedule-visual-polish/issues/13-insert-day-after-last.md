# 13: Insert Day after the last day must add a day

**What to build:** The Insert Day "+" below the last day (Full Schedule since ticket 12, and Lesson Planning's last "+" when the Planning Window runs past the last day) adds an empty day after the last day. The add-day row moves down one, and the new day is still there after a reload.

**Why it doesn't today:** `insertDayAt(classId, maxDayIndex + 1, maxDayIndex)` shifts nothing and writes `[]` at the new index. Realtime Database stores an empty array as nothing, and a Schedule's length is its highest stored Day Index. So the write is a no-op and, after the reload, the add-day row is back where it was. An empty day *after the last stored day* can't be stored at all as things are.

**Decision needed (Eric):** how to store it. Options:
- (A) Store a schedule length per Class (e.g. `classes/<id>/scheduleEnd`). The Full Schedule's add-day row and the Planning Window read it, and insert/delete keep it up to date. This is a small data-model change, so grill it first.
- (B) Show the empty day on the client only. It disappears after a reload.
- (C) Make the "+" below the last day do what the add-day row does, and accept that no new day appears.

**Blocked by:** 12 (review fixes), Eric's decision above.

**Status:** needs-decision

- [ ] Clicking the "+" below the last day adds an empty day after it; the add-day row moves down and stays there after a reload
- [ ] lint, typecheck, test:coverage and `npm run check:schedule` pass
