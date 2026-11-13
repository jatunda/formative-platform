# 05: Remove AI generation

**What to build:** The broken AI generation feature is gone from the Content Editor: no Generate Lesson with AI button or modal, and its generator module, config template, setup doc and tests are deleted. The editor otherwise works as before. Git history keeps the old code.

**Blocked by:** 04 (Blockquotes and callouts), so it runs after the renderer/editor work in this folder. Ordering note: edges in this folder also serialize tickets that edit the same renderer and stylesheet, to prevent merge conflicts.

**Status:** closed

- [x] Button, modal and all wiring removed from the Content Editor
- [x] Generator module, config template, root AI setup doc and their tests deleted; the `.gitignore` entry for the local config file removed
- [ ] The local, untracked config file is deleted too, and Eric is told it may hold an API key worth revoking
- [x] Coverage thresholds still pass after the deletion (fix real gaps rather than lowering them)
- [x] The Prompt Profile glossary entry is already removed; nothing else references it

## Comments

- Done: removed the button, modal, wiring and their CSS (`#aiClassSelect`, `#learningObjectives`, `.radio-group`, `.radio-label`); deleted `web/ai-generator.js`, `web/ai-config.template.js`, `AI-SETUP.md`, the generator test, the editor test's AI mocks, `vitest.config.js`'s ai-config fallback alias and coverage excludes, and the `.gitignore` entry. Coverage rose (lines 95.61%), all gates clean.
- Not done by the agent: the untracked `web/ai-config.js` in the main checkout was left in place (the agent was sandboxed to its worktree, and the main checkout's editor still imports it until this merges). Eric: delete it after merging, and revoke the Anthropic API key it may hold.
