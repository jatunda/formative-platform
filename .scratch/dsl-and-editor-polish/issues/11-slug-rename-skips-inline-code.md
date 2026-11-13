# 11: Renaming a Slug leaves inline code alone

**What to build:** When a Page's or Question's Slug is renamed, the fix-up that rewrites links in other Pages (`rewriteSlugInContent` in `web/page-links.js`, `rewriteQuestionSlugInContent` in `web/question-links.js`) skips `[[old-slug]]` / `[[q:old-slug]]` inside inline code, just as rendering and the backlink scan already do. Today a lesson that shows the syntax as an example, e.g. `` `[[old-slug]]` ``, gets its example silently rewritten.

Reuse the code-span check in `web/inline-code.js` (added in the code-review fixes); don't write a second one. Code blocks are already skipped.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Renaming a Page Slug rewrites real links but not ones inside backticks
- [ ] Same for Question Slugs (`[[q:…]]`)
- [ ] Display-text forms (`[[old-slug|Text]]`) follow the same rule
- [ ] Links inside code blocks stay untouched (regression test)
