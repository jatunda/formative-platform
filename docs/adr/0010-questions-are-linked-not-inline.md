---
status: accepted
---

# Questions are a separate entity referenced by Question Link, never authored inline

The obvious way to let a Lesson "contain" MCQ practice questions is to extend the DSL with an inline question block — stem, options, explanations, all typed directly into the Lesson's content, the same way a code block or a collapsible section is today. We rejected this: a question needs to be reusable across many Practice Sets, and inline authoring makes every instance of a question an independent copy with no shared identity to reuse.

Instead, a Question is its own entity with its own Slug, and a Lesson or Page embeds one via a Question Link (`[[q:slug]]`) — reference by id, not by value, the same relationship a Page Link already has to a Page. This also keeps the two authoring surfaces clean: the full MCQ-authoring grammar (options, per-option explanations, mistake categories) only needs to exist in the Question authoring surface, so the Lesson/Page DSL cheat sheet only ever needs to document the one-line link syntax, not the whole question grammar.

## Consequences

A Question can't be tweaked "just for this one Lesson" without affecting every other place it's linked from — same trade-off a Page Link already makes, now applied to Questions.
