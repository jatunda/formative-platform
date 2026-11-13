# 03: Spoilers `||text||`

**What to build:** Authors can hide inline text with `||hidden text||`. It shows as a blocked-out span and reveals on hover, on tap (tap again hides it), or on keyboard focus, so it works on phones and Chromebooks. Literal inside code blocks and inline code.

**Blocked by:** 02 (Inline code is literal); schedule-planning-polish 07 (↗ link), so the stylesheet changes don't collide. Ordering note: edges in this folder also serialize tickets that edit the same renderer and stylesheet, to prevent merge conflicts.

**Status:** ready-for-agent

- [ ] `||x||` renders as a hidden span in the editor preview and the student view
- [ ] Reveals on hover, tap/click toggle and keyboard focus; the hidden text is not readable before reveal
- [ ] Other inline formatting works inside a spoiler
- [ ] Literal inside inline code and code blocks
- [ ] Added to the DSL cheat sheet and readme
