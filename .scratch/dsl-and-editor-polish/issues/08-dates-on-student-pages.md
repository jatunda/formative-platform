# 08: Show the date on the student landing page and Do Now pages

**What to build:** Students can see the date without asking.

- **Landing page:** the heading names the date of the school day whose Do Nows it lists, e.g. "11/11 Do Nows", in place of "Today's Do Now". That date is not always today: the Schedule has no weekend days, so on a Saturday or Sunday the page lists Friday's Do Nows (Today's Day Index counts business days only) and the heading must say Friday's date, not the weekend date. All Classes share one date, since a Date Offset shifts which Day Index is shown, not which calendar day.
- **Individual Do Now page** (opened from the landing page): today's real calendar date, e.g. "Thu 11/12", shown at the top right, on the same row as the "← Back to Class Selection" link. That row takes noticeably less vertical space than it does now.

**Blocked by:** 07 (Rename the student landing page), which sets the heading this ticket replaces; 06 (Keyboard navigation in search lists), the last earlier ticket that edits the shared stylesheet.

**Status:** ready-for-agent

- [ ] Landing heading reads "<M/D> Do Nows" for the school day being listed, with no leading zeros and no year
- [ ] On Saturday and Sunday the heading shows Friday's date, matching the Do Nows listed
- [ ] The tab title stays "mrhsieh.app"; the loading text matches the new heading wording
- [ ] Do Now page shows today's date at the top right, on the same row as the back link, on desktop and portrait phone
- [ ] That row is more compact than before and the back link is still easy to tap
- [ ] The date logic is a pure, tested helper shared by both pages (reusing the business-day code that already exists), not two copies
