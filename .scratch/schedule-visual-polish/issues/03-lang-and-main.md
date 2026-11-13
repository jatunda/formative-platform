# 03: lang and main landmark on the schedule pages

**What to build:** Lesson Planning and Full Schedule set `lang="en"` on `<html>` and wrap the page content in a `<main>` element, with no layout change. In the schedule layout check, the two contrast failures (red Logout, green Go to Today) and the 🗑 column's empty header stay as known failures, with notes saying Eric accepted them.

**Blocked by:** 02 (Short dates). Ordering note: edits the same schedule pages/date files as 02, serialized to avoid merge conflicts.

**Status:** ready-for-agent

- [ ] axe no longer reports html-has-lang, landmark-one-main or region on either page
- [ ] The fixed known failures are removed; the accepted ones' notes say "accepted by Eric"
- [ ] `npm run check:schedule` passes
