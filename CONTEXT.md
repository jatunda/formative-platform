# Formative Platform

A single-teacher tool for planning and delivering class content: a teacher arranges Lessons into a per-Class Schedule, and students view that Schedule's content by day.

## Language

**Class**:
A course/section the teacher teaches. Owns a Schedule and a Date Offset. There is exactly one teacher, so "all Classes" is always the complete, unscoped set — there is no per-teacher ownership to filter by.

**Lesson**:
A piece of content (text/activity) that can be placed into a Class's Schedule. A Lesson exists independently of any placement — the same Lesson can be referenced by day, and moved between days, without being copied. Editing "a lesson" always means editing this content, not a placement of it.
_Avoid_: Content, Content Page — these leak the underlying storage shape (lessons are technically stored under a `content` tree, but nothing in the domain should be described that way). Do not confuse with **Page** (below) — a Page is a distinct concept, not a synonym for Lesson.

**Page**:
A standalone piece of DSL-authored content reachable directly by URL, independent of any Class's Schedule. Unlike a Lesson, a Page is never placed into a Schedule or tied to a Day Index — it exists to be linked to directly (e.g. shared in Google Classroom, linked from a nav menu). A Page with no Slug assigned still exists and can be edited, but is not reachable by any URL. Deleting a Page frees its Slug(s) for immediate reuse.
_Avoid_: Static Page (redundant — "Page" already implies this), Content (same reasoning as Lesson — leaks storage shape).

**Slug**:
The human-chosen identifier that makes a Page, Question, or Practice Set reachable at a URL. Each kind keeps its own Slug namespace — a Page and a Question may validly share the same Slug text, since each is only ever resolved within its own kind's URL space and Link syntax. A Page (or Question, or Practice Set) can have more than one Slug pointing to it; each Slug resolves to exactly one of that kind. Distinct from a Lesson's id, which is an opaque generated hash the teacher never chooses or sees. A Page Link or Question Link (below) elsewhere in the app can embed a Slug's text directly; removing that Slug without a Slug Rename leaves those links pointing nowhere — they still render as normal links, they just lead to a "not found" page on click.
_Avoid_: URL, path, permalink — Slug refers specifically to the chosen identifier, not the resulting address.

**Slug Rename**:
Changing a Slug's text while keeping it pointing at the same Page, as one action — distinct from removing one Slug and separately adding another, which the system has no way to tell apart from two unrelated changes. A Slug Rename uses the Backlink index (below) to find every Page Link pointing at the old Slug text and rewrites them to the new text, so links elsewhere in the app don't silently break.

**Page Link**:
An `[[slug]]` or `[[slug|Display Text]]` reference inside one Page's content pointing at another Page — written and stored as plain text embedding the target's *current* Slug, not the target Page's id, and not resolved against the database at render time. Because it's just static text, a Slug change would silently break every Page Link pointing at the old value unless done through a Slug Rename, which rewrites them all in place.
_Avoid_: link, hyperlink — those cover any `<a>` tag rendered from ordinary `[text](url)` markdown, which isn't a domain concept; Page Link means specifically the `[[...]]` form pointing at another Page.

**Section Link**:
An `[[#Header Text]]` or `[[#Header Text|Display Text]]` reference to a header within the *same* Page, matched by the header's own text at render time rather than by any separately-maintained identifier. Same-page only — there is no cross-Page form (that would be `[[slug#Header Text]]`, deliberately not supported). Renaming the referenced header's wording breaks the Section Link silently; unlike a Slug Rename, there is no rewrite mechanism for headers.

**Backlink**:
A record that one Page's content currently contains a Page Link to another Page, indexed by the two Pages' ids rather than by Slug — a Slug Rename doesn't change which Backlinks exist, only which Slug text the Page Links pointing through them contain. Maintained continuously (recalculated whenever a Page containing a Page Link is saved), not just recomputed on demand, so it stays accurate between Slug Renames too.

**Broken Link**:
A Section Link whose header text no longer matches any header in the Page — rendered as plain, non-clickable, visually distinct text. Section Links can be checked for free at render time (matching against headers already in memory, no database access needed), so this detection is real. Page Links deliberately do *not* get this treatment: checking whether a Slug still resolves would mean a database call on every render, which the Page Link design (see `docs/adr/0007`) specifically avoids — a Page Link whose target is gone still renders as a normal link, leading to the site's "Page not found" page on click instead.

**Schedule**:
The ordered sequence of Lessons for one Class, indexed by Day Index. A Day Index can hold zero, one, or many Lessons — both an empty day (a gap) and a day with multiple Lessons are normal, valid states, not an error or a missing day.

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

**Question**:
A single multiple-choice item — one stem and a set of Options, exactly one of which is correct — stored as its own entity, independent of any Lesson or Practice Set that references it. Reachable by its own Slug so the same Question can be linked from many places without being copied. Tagged with a Class and a free-text topic for organization. Unlike a Lesson (placed into a Schedule) or a Page (linked directly), a Question is never viewed on its own — it's only ever encountered embedded in a Lesson/Page via a Question Link, or as part of a Practice Set.
_Avoid_: MCQ, quiz question — "Question" is the canonical noun; the multiple-choice shape is a property of it, not a different concept.

**Option**:
One selectable choice within a Question. Exactly one Option per Question is correct. Every Option, correct or not, carries its own Explanation; incorrect Options additionally carry a Mistake Category.

**Explanation**:
The text shown after a student picks a given Option, specific to that Option rather than the Question as a whole — a Question with four Options has four Explanations, not one. Explains why that particular choice is right, or why it's wrong.

**Mistake Category**:
A short label on an incorrect Option classifying the kind of error it represents (e.g. calculation error, misconception, skill gap), recorded at authoring time alongside that Option's Explanation. Not used anywhere in the delivery flow today — it exists so a future per-student breakdown ("what kind of mistakes is this student making") doesn't require retroactively re-editing every Question.

**Question Link**:
A `[[q:slug]]` reference inside a Lesson or Page's DSL content pointing at a Question, the Question equivalent of a Page Link. Uses the Question Slug namespace, kept separate from Page Slugs, and is visually distinct from a Page Link in the DSL source. A Question is never authored inline in Lesson/Page content — only ever linked to by Question Link.
_Avoid_: embedded question, inline question — Questions are always separate entities; nothing about them is inline.

**Practice Set**:
An ordered list of Questions, reachable directly by URL like a Page, that a student works through in order via a Question Link-free, student-facing delivery flow. A Practice Set holds no question content of its own — only an ordered list of references — so the same Question can appear in many Practice Sets. Assembled by picking existing Questions, not authored as DSL content.
_Avoid_: Quiz, Assessment, Practice Quiz — "Practice Set" is the canonical term for this delivered, ordered collection.

**Attempt**:
One submitted Option selection for a Question, made by a student working through a Practice Set. A student gets at most two Attempts per Question: a correct Attempt finishes the Question immediately, and a second wrong Attempt also finishes it, auto-revealing the correct Option and its Explanation.

**Frontier**:
For a student working through a Practice Set, the first Question they have not yet finished (see Attempt). A student may freely navigate back and forth among every Question up to and including the Frontier, but cannot advance past it; finishing the Frontier's Question advances the Frontier to the next Question in the set.
_Avoid_: current question, progress — Frontier specifically names the forward boundary of what's navigable, not simply whichever Question happens to be on screen (a student can be reviewing an earlier one while the Frontier sits further ahead).

**Question Outcome**:
The one of three results a Question ends in for a given student, once finished: First-Try Correct (right on the first Attempt), Second-Try Correct (wrong once, then right), or Missed (wrong twice, auto-revealed). Tallied into a Practice Set's end-of-set summary; held only in the browser for that session, never written to the database.
