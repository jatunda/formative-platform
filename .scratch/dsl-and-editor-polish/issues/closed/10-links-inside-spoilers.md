# 10: Links inside spoilers

**What to build:** A link inside a spoiler (`||see [[page]]||`) behaves sensibly. Today the first tap or click on a link inside a hidden spoiler only reveals the spoiler; a second one follows the link. That is right on a phone, where the student can't see the link before tapping, but on a mouse device the spoiler already reveals on hover, so the first click looks like it did nothing.

**Proposed behaviour:** on a device that can hover (`(hover: hover)`), a click on a link follows it straight away, since hovering has already shown the text. On a touch device the first tap still only reveals, and the next tap follows the link. Keyboard: Enter on a focused hidden spoiler reveals it, and Tab then reaches the link inside as normal.

**Blocked by:** 09 (A blank line splits two quotes), which also edits `web/content-renderer.js`.

**Status:** closed

- [x] Mouse: one click on a link inside a spoiler follows the link
- [x] Touch: the first tap reveals, the second tap follows the link
- [x] Keyboard: a link inside a revealed spoiler is reachable with Tab and opens with Enter
- [x] Spoilers inside question options and `>>>` titles still only toggle the spoiler (code-review fix)

## Comments

Done. A click on a link inside a hidden spoiler follows it when the device can hover (`(hover: hover)`), unless the click came from a touch tap (`pointerType === 'touch'`), so a tap on a touch-screen laptop still reveals first. Also, Tabbing straight onto a link inside a hidden spoiler now shows the spoiler (`:has(:focus-visible)` in style.css), so keyboard users can see the link they're on. Checked in headless Chromium with mouse, touch (phone and touch-screen laptop) and keyboard.
