# 06: Full Schedule link: open-in-new icon, new tab

**What to build:** On Lesson Planning, the ↗ after each Class name becomes a flat "open in new" icon, as in Eric's reference screenshot (`../open-in-new-reference.png`): a square outline open at the top right, with an arrow leaving that corner, in the page's text colour. The link opens Full Schedule for that Class in a new tab, scrolled to today.

**Blocked by:** 01 (Shared line-icon module), 02 (Short dates), 03 (lang and main), 04 (Lesson title tooltip). Ordering note: tickets 06–11 change the same schedule rows and stylesheet, so they run in order to avoid merge conflicts.

**Status:** closed

- [x] Icon matches the reference shape and sits neatly beside the Class name
- [x] Opens in a new tab and scrolls to today there
- [x] Tooltip "Full schedule" and the aria-label are kept; the link stays visible when the Class is collapsed
