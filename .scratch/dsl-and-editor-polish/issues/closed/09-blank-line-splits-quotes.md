# 09: A blank line splits two quotes

**What to build:** Two `>` blockquotes or callouts with only a blank line between them render as two separate blocks, as in Obsidian. Today `parseDSL` drops blank lines, so they merge into one quote, and the readme tells authors to separate quotes with a non-quote line instead (ticket 04's known gap).

The fix keeps a quote boundary through the parse. Only a blank line *between two quote lines* needs to survive; blank lines elsewhere can keep being dropped. Saved content written before this change has no such boundary, so it must render exactly as it does today, and a parse → generate round trip must keep the split.

**Blocked by:** None (can start immediately). Ordering note: 10 also edits `web/content-renderer.js`, so it waits for this one.

**Status:** closed

- [x] `> a` / blank line / `> b` renders as two quotes in the editor preview and the student view
- [x] Same for two callouts (`> [!tip]` …) and for a quote followed by a callout
- [x] Consecutive `>` lines with no blank line between them are still one quote
- [x] Existing saved content renders unchanged
- [x] Round trip (`parseDSL` → `generateDSLFromContent`) keeps the split
- [x] Readme line about "separate two quotes with a non-quote line" updated
