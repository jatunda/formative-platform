# Formative Platform

A single-teacher tool for planning and delivering class content: a teacher arranges Lessons into a per-Class Schedule, and students view that Schedule's content by day.

## Language

**Class**:
A course/section the teacher teaches. Owns a Schedule and a Date Offset. There is exactly one teacher, so "all Classes" is always the complete, unscoped set — there is no per-teacher ownership to filter by.

**Lesson**:
A piece of content (text/activity) that can be placed into a Class's Schedule. A Lesson exists independently of any placement — the same Lesson can be referenced by day, and moved between days, without being copied. Editing "a lesson" always means editing this content, not a placement of it.
_Avoid_: Content, Page, Content Page — these leak the underlying storage shape (lessons are technically stored under a `content` tree, but nothing in the domain should be described that way).

**Schedule**:
The ordered sequence of Lessons for one Class, indexed by Day Index. A Schedule can have gaps (a Day Index with zero Lessons) — an empty day is a normal, valid state, not an error or a missing day.

**Day Index**:
A zero-based integer identifying a day's position within a Class's Schedule (0, 1, 2, ...). It is sequence position, not a calendar date, and not tied to weekdays — Day Index 3 doesn't inherently mean "the fourth school day" in the calendar sense until it's converted via the Date Offset.
_Avoid_: Day, day number — plain "day" is ambiguous between this and a calendar day; prefer "Day Index" whenever the sequence-position meaning is intended, and "calendar date" whenever an actual date is intended.

**Date Offset**:
A per-Class integer, in business days, applied when converting a Day Index to a calendar date (and back). It exists so that a real-world disruption (a snow day, a holiday) can be absorbed without renumbering every Lesson in the Schedule — the Day Index sequence stays untouched; only its mapping onto the calendar shifts. A Date Offset is a property of the Class, not of any one Day Index or Lesson.

**Today's Day Index**:
For a given Class, the Day Index whose calendar date (Day Index + that Class's Date Offset, in business days from the Class's start date) equals today. Each Class computes this independently, since each has its own Date Offset — two Classes can disagree on which Day Index "today" is.

**Bulk Offset Shift**:
The act of changing every Class's Date Offset by the same signed amount in one action (e.g. "shift everything forward by 2 business days" after a multi-day closure). Distinct from setting a single Class's Date Offset to a specific value — a Bulk Offset Shift is always relative, applied uniformly, and affects every Class at once.

**Planning Window**:
For a given Class, the small run of consecutive Day Indices — starting at Today's Day Index — shown together in the Lesson Planning view. The window's length is a fixed setting, not a per-Class or per-session value; every Class is shown the same number of days.

**Prompt Profile**:
Per-Class configuration used only when generating AI-assisted questions in the Content Editor: subject, grade level, and (optionally) class-specific prompting instructions and example questions. Hard-coded in `ai-generator.js`, keyed by Class id. Distinct from the Class record itself in Firebase — a new Class has no Prompt Profile until one is added there, and generation falls back to generic subject/grade-level defaults in that case (surfaced as a notice in the AI Generation modal, not a silent guess).
