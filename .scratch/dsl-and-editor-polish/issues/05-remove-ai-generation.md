# 05: Remove AI generation

**What to build:** The broken AI generation feature is gone from the Content Editor: no Generate Lesson with AI button or modal, and its generator module, config template, setup doc and tests are deleted. The editor otherwise works as before. Git history keeps the old code.

**Blocked by:** 04 (Blockquotes and callouts), so it runs after the renderer/editor work in this folder. Ordering note: edges in this folder also serialize tickets that edit the same renderer and stylesheet, to prevent merge conflicts.

**Status:** ready-for-agent

- [ ] Button, modal and all wiring removed from the Content Editor
- [ ] Generator module, config template, root AI setup doc and their tests deleted; the `.gitignore` entry for the local config file removed
- [ ] The local, untracked config file is deleted too, and Eric is told it may hold an API key worth revoking
- [ ] Coverage thresholds still pass after the deletion (fix real gaps rather than lowering them)
- [ ] The Prompt Profile glossary entry is already removed; nothing else references it
