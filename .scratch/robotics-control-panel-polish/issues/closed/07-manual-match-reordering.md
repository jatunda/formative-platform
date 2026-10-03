# 07: Replace match pinning with manual reordering

**What to build:** Remove the Pinned Match concept entirely. Current Match becomes strictly "the topmost not-yet-complete Qualification Match in schedule order" (today's Inferred Current Match, with no override). In exchange, let the teacher manually reorder Qualification Matches in the schedule — reordering is now the mechanism for controlling what plays next, instead of pinning. The Current Match row gets a clear, explicit label so it's obvious at a glance which match is live. While touching per-row schedule display, also show which Field (1, 2, ...) each match is assigned to whenever Field Count is greater than 1, since reordering changes field assignments.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] "Set as Current" and "Clear Pin" controls are removed; there is no way to override which match is current
- [x] Current Match is always the first not-yet-complete Qualification Match in schedule order
- [x] The teacher can reorder not-yet-complete Qualification Matches (e.g. drag-and-drop or up/down controls) in the Schedule tab, and the new order persists and drives Match Time and Current Match going forward
- [x] Completed matches are not reorderable
- [x] The Current Match row shows explicit text identifying it as the current match (not just a highlight color)
- [x] When Field Count > 1, each match row shows which field it's assigned to (e.g. "Field 2")
- [x] The now-resolved layout bug — where pinning a match pushed "Mark Complete" and "Clear Pin" onto an overflowing line beneath the row — no longer applies since pinning is gone; confirm the row no longer overflows
- [x] `web/robotics/CONTEXT.md`'s **Current Match**, **Inferred Current Match**, and **Pinned Match** entries are updated to reflect that Current Match is now always the topmost unplayed match, and the Pinned Match entry is removed (along with the "Up Next" entry's reference to pinning, if any)
