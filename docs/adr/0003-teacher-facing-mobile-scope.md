---
status: accepted
---

# Scope teacher-facing mobile support to "usable", not redesigned

The schedule table (used by `teacher.html` and `lesson-planning.html`) has a `min-width: 600px` and non-wrapping day cells, so a day with multiple Lessons cannot fit a phone-width screen without either horizontal scrolling or a card-based redesign; separately, moving a Lesson to a different Day Index or Class relies on native HTML5 drag-and-drop, which doesn't fire on touch at all, and the existing left/right button fallback only reorders within a day.

We chose to accept horizontal scroll on the schedule table and to ship no touch equivalent for cross-day/cross-class Lesson moves in this pass — on mobile, moving a Lesson to another day or Class is simply not possible yet. Both gaps are deliberately deferred to a planned future rework that makes the Lesson cluster controls more compact and redesigns the left/right/delete buttons; a real touch "move to another day/class" action belongs in that redesign rather than bolted onto the current button layout. Building either fix now (a card-based table, or a touch-drag/move-to picker) would be a substantial standalone effort in a UI that's already scheduled to change shape.
