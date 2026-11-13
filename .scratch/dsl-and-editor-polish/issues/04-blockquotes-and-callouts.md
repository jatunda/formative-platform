# 04: Blockquotes and callouts

**What to build:** Obsidian-style blockquotes and callouts. `> text` lines form a blockquote (consecutive `>` lines are one block). A first line of `> [!type] Optional title` makes a callout instead, typed note, tip, warning, danger, question or example (unknown types draw as note), with an icon/colour per type and the title defaulting to the type name. Inline formatting and lists work inside; code blocks and collapsibles don't. No foldable callouts (`>>>` collapsibles already do that), and `>>>` / `<<<` keep their meaning.

**Blocked by:** 01 (Code blocks keep literal lines), 03 (Spoilers). Ordering note: edges in this folder also serialize tickets that edit the same renderer and stylesheet, to prevent merge conflicts.

**Status:** ready-for-agent

- [ ] Blockquotes and each callout type render in the editor preview and the student view
- [ ] `>>>`, `>>>!` and `<<<` still behave as collapsibles
- [ ] `>` lines inside code blocks stay literal
- [ ] Round-trip (parse then generate DSL) preserves blockquotes and callouts
- [ ] Readable in the projected/student view
- [ ] Added to the DSL cheat sheet and readme
