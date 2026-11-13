# 01: Code blocks keep `# ` and `---` lines

**What to build:** Inside a fenced code block, a line like `# comment here` (a Python comment) or `---` renders as a literal code line. Today the parser checks for the title and the question separator before it checks whether it is inside a code block, so `# comment` vanishes into the Lesson title and `---` would split the question.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] A multi-line code block containing `# comment here` renders that line in the code block, and the Lesson title is unchanged
- [x] A `---` line inside a code block stays in the code block
- [x] Round-trip (parse then generate DSL) preserves both
- [x] Indented `# ` lines inside code are preserved verbatim
