# 10: Insert Day as a "+" beside the row break

**What to build:** The "+ Insert Day Here" rows go away. In their place, a small text "+" sits in the left gutter, just outside the table beside the Day Index column, centred on each line between two days, plus one above the first day and one below the last. It is always visible (it must work on touch screens), and inserts a day at that point exactly as "+ Insert Day Here" does today. Its tooltip and accessible name are "Insert day here". On touch screens its tap area is 44px and may overlap the two rows beside it; the "+" itself stays small.

**Blocked by:** 03 (lang and main), 09 (Compact rows). Ordering note: tickets 06–11 change the same schedule rows and stylesheet, so they run in order to avoid merge conflicts.

**Status:** closed

- [x] No Insert Day rows remain on Lesson Planning or Full Schedule
- [x] A "+" sits in the left gutter at each break between days and at both ends, and inserts a day in the right place
- [x] Tooltip and accessible name "Insert day here"; reachable by keyboard
- [x] 44px tap area on touch screens; `npm run check:schedule` passes with the Insert Day known failure removed
