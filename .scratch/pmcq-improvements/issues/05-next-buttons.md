# 05: Top-bar Next and green Next replacing Submit

**What to build:** A Next button sits in the top bar beside Back, styled like Back. When the student can't move forward yet, it looks grayed out but still responds to a click with a toast, "Answer this question to move on". It reads "Results →" on the last Question and is grayed out with no toast on the summary. At the bottom, once a Question is finished, Submit is replaced in the same spot by a green Next ("See results" on the last Question). It's exactly the same size and keeps the `Enter ↵` hint, so nothing jumps. Revisiting a finished Question shows the green Next, not a grayed-out Submit. A single Question embedded in a Lesson/Page keeps today's behavior: a grayed-out Submit after answering and no Next.

See the spec (`../spec.md`): user stories 41–56.

**Blocked by:** 04 (Question numbers and Running Score), which owns the top-bar layout this adds to.

**Status:** ready-for-agent

- [ ] The question widget takes a caller option meaning "a caller-owned Next replaces Submit once finished". Practice Set delivery sets it; Question Link embeds don't.
- [ ] The green Next takes Submit's exact place and box size with the same key-hint pill, distinguished by a green color. Focus moves to it after finishing, so Enter advances (as today).
- [ ] The top-bar Next uses `aria-disabled` styling (not the `disabled` attribute) when advancing isn't allowed. Clicking it then shows the toast, which fades after a few seconds and doesn't stack on repeated clicks. When it's allowed, it advances exactly like the green Next. Whether advancing is allowed comes from the Navigable step.
- [ ] Labels: "Results →" on the last Question for the top-bar Next, "See results" for the green Next. On the summary the top-bar Next is grayed out with no toast.
- [ ] Back is unchanged, and the full keyboard-only flow still works end-to-end.
- [ ] Controller tests cover:
  - top-bar Next states (unfinished, finished, last Question, summary)
  - the toast on click when not allowed, and no toast on the summary
  - Submit replaced by the green Next after finishing and on revisit
  - "See results" on the last Question
  - focus after finishing
- [ ] Widget tests confirm an embed still shows a grayed-out Submit after finishing.
- [ ] Lint, typecheck and `test:coverage` are clean.
