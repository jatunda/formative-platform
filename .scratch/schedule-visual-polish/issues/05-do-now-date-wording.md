# 05: Do Now date reads "November 13"

**What to build:** On the student landing page the heading reads "Do Now - November 13" (was "11/13 Do Nows") and the loading text reads "Loading Do Now...". On each Do Now page, the date beside the back link reads "November 13" (was "Fri 11/13"). Which date each page names is unchanged: the landing page names the school day whose Do Nows it lists (Friday's on a weekend); the Do Now page names today. Exact wording is Eric's.

**Blocked by:** 02 (Short dates). Ordering note: edits the same schedule pages/date files as 02, serialized to avoid merge conflicts.

**Status:** ready-for-agent

- [ ] Landing heading is "Do Now - <Month> <day>", e.g. "Do Now - November 13", with Friday's date on a weekend
- [ ] Loading text is "Loading Do Now..."
- [ ] Do Now page shows "<Month> <day>" beside the back link, still on one compact row at desktop and phone widths
- [ ] Formatting lives in the shared, tested date helper both pages already use
