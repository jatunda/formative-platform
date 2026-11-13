# 02: Inline code is literal

**What to build:** Text inside backticks renders exactly as typed: `[[asdf]]` shows as `[[asdf]]`, not a Page Link. The same goes for Section Links, Question Links, `[text](url)` links, bold and italic, which today are all applied before inline code is split out.

**Blocked by:** 01 (Code blocks keep literal lines), so the two DSL fixes land in order.

**Status:** closed

- [x] `[[asdf]]`, `[[#Header]]`, `[[q:slug]]`, `[a](b)`, `**x**` and `_x_` inside backticks all render as literal code
- [x] Formatting and links outside backticks on the same line still work
- [x] HTML in inline code is still escaped
