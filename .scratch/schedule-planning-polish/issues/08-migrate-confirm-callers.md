# 08: Move the other confirm() callers to the in-app dialog

**What to build:** Every remaining browser `confirm()` in the teacher pages switches to the shared in-app dialog from 01, so none can be silently blocked: the Content Editor's discard-unsaved-changes and delete-lesson prompts, and the slug-removal and delete prompts in the Page, Question and Practice Set editors.

**Blocked by:** 01 (In-app confirm dialog); 07 (↗ link), so it runs after the rest of this folder; dsl-and-editor-polish 05 (Remove AI generation), which also edits the Content Editor.

**Status:** ready-for-agent

- [ ] No `confirm(` calls remain in the app's own code
- [ ] Each prompt keeps its current message text and its cancel/confirm behaviour
- [ ] Callers that were synchronous handle the dialog being async correctly (e.g. the unsaved-changes guard still blocks navigation until answered)
