# 06: Keyboard navigation in search lists

**What to build:** Every list under a search box can be driven from the keyboard: the lesson search popup (Link Lesson), the page link picker, the question link picker and the question picker. The first result is selected as soon as the list appears and again whenever the search text changes; ↓/↑ move the selection (no wrap-around) and keep it scrolled into view; Enter picks it; Esc closes. Typing keeps going into the search box throughout. The mouse doesn't move the keyboard selection, and clicking still works. One shared helper, four callers.

**Blocked by:** 05 (Remove AI generation); schedule-planning-polish 08 (Move the other confirm() callers), which also touches the editors. Ordering note: edges in this folder also serialize tickets that edit the same renderer and stylesheet, to prevent merge conflicts.

**Status:** ready-for-agent

- [ ] First result selected on open and after every change to the search text
- [ ] First ↓ moves to the second result; ↓ at the last and ↑ at the first do nothing
- [ ] Enter selects the highlighted item with the same effect as clicking it
- [ ] Esc closes the popup
- [ ] Selection is visible (styled) and announced to screen readers (aria-activedescendant or equivalent)
- [ ] Works in all four lists through one shared helper
