# 10: Links inside spoilers

**What to build:** A link inside a spoiler (`||see [[page]]||`) behaves sensibly. Today the first tap or click on a link inside a hidden spoiler only reveals the spoiler; a second one follows the link. That is right on a phone, where the student can't see the link before tapping, but on a mouse device the spoiler already reveals on hover, so the first click looks like it did nothing.

**Proposed behaviour:** on a device that can hover (`(hover: hover)`), a click on a link follows it straight away, since hovering has already shown the text. On a touch device the first tap still only reveals, and the next tap follows the link. Keyboard: Enter on a focused hidden spoiler reveals it, and Tab then reaches the link inside as normal.

**Blocked by:** 09 (A blank line splits two quotes), which also edits `web/content-renderer.js`.

**Status:** ready-for-agent

- [ ] Mouse: one click on a link inside a spoiler follows the link
- [ ] Touch: the first tap reveals, the second tap follows the link
- [ ] Keyboard: a link inside a revealed spoiler is reachable with Tab and opens with Enter
- [ ] Spoilers inside question options and `>>>` titles still only toggle the spoiler (code-review fix)
