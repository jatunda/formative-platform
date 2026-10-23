# 07: Fast load path in the browser

**What to build:** Opening a Practice Set link shows the page frame instantly: title, top bar with `Question - of -` and `- / -`, and an empty question area at its usual height. The student's Question (their Frontier, or the summary) then fills in without anything moving, and Question 1 never flashes first. Loading skips the Firebase SDK entirely. It reads the Practice Set by the id the server put in the page, then fetches all its Questions in parallel through the database's REST API: two reads in a row. A subtle pulse on the question area appears only if loading takes over about 1 s. The tab title shows the live Practice Set title. The local `?slug=` dev page still works by resolving the Slug first.

See the spec (`../spec.md`): user stories 63–75, and "Data loading in the browser".

**Blocked by:** 01 (Saved Progress, read before the first render), 04 (the top-bar layout the frame mirrors), 06 (how the id appears in the page)

**Status:** closed

- [x] Practice Set delivery no longer imports the Firebase SDK or the SDK-based database modules. It reads with `fetch` against the database's REST endpoints.
- [x] With an embedded Practice Set id: 1 Practice Set read, then all Question reads in parallel. Without one (`?slug=`): resolve the Slug first, then the same.
- [x] `preconnect` hints for the database host in both the server shell and the local dev page.
- [x] The frame is drawn before any fetch and matches the final top-bar layout, so there's no layout shift when data arrives. The pulse appears only after ~1 s of loading and is removed on render.
- [x] Saved Progress is loaded before the first render: a returning student goes straight to the Frontier or summary.
- [x] The document title is set from the live Practice Set title.
- [x] The not-found, empty-set and missing-Question behaviors are unchanged.
- [x] Initialization tests mock `fetch` instead of the database modules, and cover:
  - the embedded-id path (2 sequential steps, Questions in parallel)
  - the `?slug=` path
  - the frame present before fetch resolves
  - the pulse only after ~1 s (fake timers)
  - resume without a Question 1 flash
  - the tab title
  - not found, empty set, and a skipped missing Question
- [x] Lint, typecheck and `test:coverage` are clean.

## Comments

- REST reads live in `web/database-rest.js` (`restUrl`, `readPath`; `// @ts-check`, listed in `jsconfig.json`). Like `firebase-config.js`, on localhost/127.0.0.1 it reads from the Database emulator (`http://<host>:9000/<path>.json?ns=formative-platform-default-rtdb`), so the local `?slug=` dev page needs the emulator running, as before. `firebase-config.js` now takes `DATABASE_URL` from it.
- Frame: `drawFrame` in `practice-view.js` is shared by `initializePage` (drawn before any read) and `startPracticeSet` (redraws the same layout), so the two can't drift. The question area is `.practice-question-area` with a 22rem min-height; the pulse is `.practice-question-area-loading`, added after 1 s and cleared when loading settles.
- Server shell: the Practice Set shell now also fills `<h1 id="practiceSetTitle">` with the escaped stored title (empty when not found or untitled), so the title is in the frame from first paint, and carries `<link rel="preconnect" ... crossorigin>` (`crossorigin` because `fetch` makes anonymous CORS requests). The Page shell is unchanged.
- Not deployed; ticket 09 covers deploy and timing.
