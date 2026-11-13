# 03: Spoilers `||text||`

**What to build:** Authors can hide inline text with `||hidden text||`. It shows as a blocked-out span and reveals on hover, on tap (tap again hides it), or on keyboard focus, so it works on phones and Chromebooks. Literal inside code blocks and inline code.

**Blocked by:** 02 (Inline code is literal); schedule-planning-polish 07 (↗ link), so the stylesheet changes don't collide. Ordering note: edges in this folder also serialize tickets that edit the same renderer and stylesheet, to prevent merge conflicts.

**Status:** closed

- [x] `||x||` renders as a hidden span in the editor preview and the student view
- [x] Reveals on hover, tap/click toggle and keyboard focus; the hidden text is not readable before reveal
- [x] Other inline formatting works inside a spoiler
- [x] Literal inside inline code and code blocks
- [x] Added to the DSL cheat sheet and readme
