# 33: A more inviting feedback link

**Priority:** medium

**What to build:** The feedback link reads "Feedback? Email Eric" in both places it appears (`feedbackLink()` in `controls.js`). Change it to Eric's chosen wording:

- **Settings drawer** (`settings-drawer.js`): "Eric loves feedback! Bugs? New ideas? Random comments? Email him here."
- **Division picker**, the first-visit screen where a teacher chooses MS or HS (`overlays.js`): "Feedback? Email Eric here."

The link target stays the same (`FEEDBACK_HREF`, a new email with the subject filled in). Keep one `feedbackLink` helper that takes the text (or a variant), not two copies of the link. The link should still read clearly as a link, and the longer drawer text should wrap neatly at narrow widths.

Built behaviour: closed tickets 18 (overlays), 19 (settings drawer).

**Blocked by:** none

**Status:** closed

- [x] The drawer shows the long text; the Division picker shows the short one; both open the same email
- [x] One shared link helper in `controls.js`
- [x] The drawer text wraps without overflow at 390 × 844 and 480 × 320 (`check:clock`, or a one-off screenshot if `check:clock` can't open the drawer)
- [x] Tests updated for the new text
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**Built.** `feedbackLink(text)` in `controls.js` now takes its wording; the Settings drawer passes the long line and the Division picker the short one, both to the same `FEEDBACK_HREF`. No CSS change was needed: the link keeps the accent colour and the browser's underline, and the drawer text wraps to two lines inside its section (one-off Playwright screenshots at 390 × 844 and 480 × 320, link width equal to its section's, no page overflow). Tests in `clock-page-screen.test.js` and `clock-page-overlays.test.js` check the new text, and the picker's test now checks its link opens the same email.
