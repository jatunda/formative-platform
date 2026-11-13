# 07: ↗ link to the full schedule, scrolled to today

**What to build:** On Lesson Planning, a small ↗ icon after each Class name (tooltip "Full schedule") opens Full Schedule for that Class and scrolls it to today, overriding the restored scroll position it would otherwise use.

**Blocked by:** 06 (Collapse a Class). Ordering note: the tickets in this folder are deliberately serial because they edit the same schedule-rendering code and stylesheet rules; the edge prevents merge conflicts, not a logical dependency.

**Status:** closed

- [x] ↗ sits next to the Class name without taking much room, and stays visible when the Class is collapsed
- [x] Opens Full Schedule in the same tab with that Class selected
- [x] Full Schedule scrolls to today's row when arriving from this link, even if a saved scroll position exists; arriving any other way behaves as it does now
- [x] Accessible label on the link
