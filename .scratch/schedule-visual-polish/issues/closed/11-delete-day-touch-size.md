# 11: Delete Day is touch-sized on phones

**What to build:** On a phone, 🗑 Delete Day is at least 44px wide as well as tall, while a one-Lesson day still fits a 375px screen with no sideways scroll.

**Blocked by:** 10 (Insert Day gutter +). Ordering note: tickets 06–11 change the same schedule rows and stylesheet, so they run in order to avoid merge conflicts.

**Status:** closed

- [x] Delete Day is at least 44px by 44px on touch screens on both pages
- [x] A one-Lesson day fits 375px with no sideways scroll
- [x] `npm run check:schedule` passes with the Delete Day known failure removed
