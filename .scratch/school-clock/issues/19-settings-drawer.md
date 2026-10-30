# 19: The settings drawer

**What to build:** Every plain settings control on `/clock` moves into one drawer, built to the design reference:

- Division;
- Period Labels;
- Bells on/off;
- sound choices and volume, with a preview;
- 24-hour time and seconds.

Look settings (theme, font and palette swaps, the light/dark flip, and the bar's whole day / just this Segment setting) are **not** in this drawer: they live in their own Look sheet (21), per Eric's review in 03's Comments.

The timer and Bells stay one tap away on the main screen, and the projected view shows no settings. The Alarm editor (15) is added to this drawer by its own ticket.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: device storage, Look; user stories 22, 26–28, 56, 63, 67, 68, 79, 80a–80c). Design reference: `.scratch/school-clock/mockups/final/`. Vocabulary: `web/clock/CONTEXT.md`.

**Blocked by:** 16, 17

**Status:** ready-for-agent

- [ ] Every setting above is in the drawer, saves as before, and takes effect at once
- [ ] The drawer matches the design reference at every checklist size, including the phone
- [ ] Keyboard: it opens from a labelled button, focus moves into it and is kept inside while open, Escape closes it, and focus returns to the button
- [ ] Every control has a visible label; the axe scan has no violations
- [ ] The drawer is laid out so 15 (Alarms) can add its section without restructuring it
- [ ] Page tests check that each setting changes what the page shows and what's saved
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
