# Practice Set improvements: Saved Progress, question view polish, faster first load

Status: ready-for-agent

## Problem Statement

Students working through a Practice Set lose everything the moment the page refreshes or closes: every Attempt, every Question Outcome, and their place in the set are gone, and they start again from Question 1. A student who opens the same Practice Set in a second tab gets an unrelated, independent run, which is confusing.

While working through a set, a student can't see which question they're on or how they're doing until the very end. The only forward control appears below the question after it's finished. The grayed-out Submit button stays on screen beside it, so it's easy to mistake one for the other. Options and Explanations render inline code, bold and italic as raw markup characters, which is especially bad for programming questions where Options are often code.

Finally, the time from typing a Practice Set's URL to seeing the first question is often long. Measured cold starts of the link-preview Cloud Function are about 2.3–2.7 s (warm about 0.17 s), and with the current 5-minute CDN cache many students hit one, especially when studying outside class, when traffic is sparse. After that, the browser downloads the Firebase SDK, opens a live connection, and makes three database reads, one after another, before anything appears. Links to the bare domain also pay an extra redirect to `www.`.

## Solution

Each Practice Set gets **Saved Progress**: one browser's record of the student's Attempts and Question Outcomes on that set, kept in the browser's own storage (never the database, so ADR 0012 still holds). Refreshing, closing, or coming back days later puts the student back where they were: on the Frontier, or on the end-of-set summary if they'd finished. Half-done Questions are remembered too, so a refresh can't buy a free retry. Open tabs of the same Practice Set stay in sync live. The summary offers **Reset answers & start over**, which wipes that set's Saved Progress and starts again at Question 1.

The question view shows `Question N of M` and a **Running Score** (First-Try Correct out of Questions finished so far, with a percentage) in the top bar. A top-bar Next sits beside Back; it explains itself with a toast when moving forward isn't allowed yet. At the bottom, Submit is replaced in place by a green Next of the same size once a question is finished. Options and Explanations render inline formatting the same way Lesson/Page text does.

The page frame (title, top bar, empty question area) draws instantly, with no layout shift when content arrives. The browser fetches the Practice Set and its Questions directly through the database's public REST API, two reads in a row instead of three, with no SDK. Edits still go live on a normal refresh. The link-preview function is slimmed to shrink cold starts, and its response is cached for a day because it carries only preview metadata. The bare domain becomes the primary host.

## User Stories

### Saved Progress

1. As a student, I want my answers on a Practice Set to survive a page refresh, so that an accidental reload doesn't wipe my work.
2. As a student, I want my answers to survive closing the tab or browser, so that I can stop studying and pick up later.
3. As a student, I want to return to a Practice Set days later and see my earlier answers, so that I can continue where I left off.
4. As a student returning to an unfinished Practice Set, I want to land on the first question I haven't finished (the Frontier), so that I don't have to click through questions I've already done.
5. As a student returning to a Practice Set I already finished, I want to land on the end-of-set summary, so that I see my results rather than a question.
6. As a student who got a question wrong once and then refreshed, I want the page to remember that I've already used my first Attempt, so that the Running Score and Expected Test Grade stay honest.
7. As a student who got a question wrong once and then refreshed, I want the Explanation for my wrong pick to still be showing, so that I can use it for my second Attempt.
8. As a student, I want an option I'd picked but not yet submitted to still be selected after a refresh, so that I don't lose my place mid-thought.
9. As a student reviewing an earlier finished question after a refresh, I want it shown exactly as I left it (my pick, the revealed correct Option, its Explanation), so that review works the same as before the refresh.
10. As a student, I want my Saved Progress for one Practice Set to be separate from every other Practice Set, so that working on one never affects another.
11. As a student on a different device, I understand my Saved Progress doesn't follow me, because it lives in that browser only.
12. As a student, I want no account, name, or login to be needed for Saved Progress, so that practicing stays as quick as it is today.
13. As a student who has finished a Practice Set, I want a clearly labeled **Reset answers & start over** button on the summary, so that I can practice the whole set again.
14. As a student, I want that button's label to make it obvious my answers will be erased, so that I'm not surprised when they're gone.
15. As a student pressing Reset answers & start over, I want it to happen immediately without a confirm dialog, so that retrying is one click.
16. As a student after resetting, I want to land on Question 1 with nothing answered and the Running Score back at its empty state, so that the retry starts clean.
17. As a student mid-set, I don't see a reset control, so that I can't wipe unfinished work by accident.
18. As a student using a shared computer, I can use Reset answers & start over on the summary to clear a previous student's finished run.

### Tab sync

19. As a student with the same Practice Set open in two tabs, I want answering a question in one tab to update the other, so that the two tabs never disagree about my progress.
20. As a student with two tabs open, I want each tab to keep showing whichever question I was looking at there, so that one tab doesn't yank the other to a different question.
21. As a student viewing Question 4 in tab B, I want tab B to redraw Question 4 as finished (with Next available) when I finish it in tab A, so that tab B doesn't offer a stale Submit.
22. As a student, I don't want the celebration and correct-answer sound to replay in the other tab, so that only the tab I acted in celebrates.
23. As a student, I want the Frontier and Running Score in every open tab to reflect answers made in any tab, so that navigation limits and scores are consistent.
24. As a student who resets in one tab, I want the other tabs to jump back to Question 1 with a clean slate, so that no tab keeps showing erased answers.

### Editing a Practice Set after students have Saved Progress

25. As the teacher, I want to edit a Practice Set's list of Questions without wiping students' Saved Progress on the Questions that remain, so that fixing a set mid-unit doesn't punish students.
26. As the teacher, when I remove a Question from a set, I want its saved answer silently ignored, so that the student's Running Score and summary only count Questions still in the set.
27. As the teacher, when I add a Question, I want students to see it as unfinished, so that they still have to answer it.
28. As the teacher, when I reorder Questions, I want students' answers to stay with the right Question, so that reordering doesn't scramble anyone's results.
29. As a student whose teacher inserted a new Question before my Frontier, I understand the Frontier moves back to that new Question and I must answer it before moving past it, since order is locked.
30. As the teacher, I accept that if I change a Question's Options after a student answered it, their saved pick may point at a different Option, since it's rare enough not to guard against.

### Question numbers and Running Score

31. As a student, I want to see `Question N of M` in the top bar, so that I know where I am in the set.
32. As a student reviewing an earlier question, I want the number to show the question I'm viewing, not the Frontier, so that it always matches what's on screen.
33. As a student, I want to see my Running Score (e.g. `7 / 9 first try · 78%`) in the top bar, so that I know how I'm doing as I go.
34. As a student, I want the Running Score to count only First-Try Correct, so that it matches what the Expected Test Grade on the summary is based on.
35. As a student, I want unfinished questions not to count against my Running Score, so that it reflects only what I've done.
36. As a student, I want the Running Score to update the moment a question is finished, so that I get immediate feedback.
37. As a student who hasn't finished any question yet, I want the Running Score to read `- / -`, so that it's clearly empty rather than 0%.
38. As a student, I don't want the top bar to shift or resize as numbers change, so that the interface feels stable.
39. As a student on a phone, I want the question number and Running Score to fit, wrapping below the nav buttons if needed, so that nothing is cut off.
40. As a student on the summary screen, I don't see a question number, since there's no current question.

### Navigation controls

41. As a student, I want a Next button in the top bar beside Back, so that I can move forward from the same place I move back.
42. As a student, I want the top-bar Next styled like Back, so that the green bottom button stays the main action.
43. As a student on an unfinished question, I want the top-bar Next to look grayed out, so that I can tell I can't advance yet.
44. As a student who clicks the grayed-out top-bar Next, I want a toast saying "Answer this question to move on", so that I understand why nothing happened.
45. As a student on the last question, I want the top-bar Next to read "Results →", so that I know it leads to the summary.
46. As a student on the summary, I want the top-bar Next grayed out with no toast, since there's nowhere further to go.
47. As a student, I want Back to keep working as it does today (disabled on Question 1), so that review is unchanged.
48. As a student, once I finish a question I want Submit to be replaced in the same spot by a green Next button, so that it's obvious what to do next.
49. As a student, I want the green Next to be exactly the same size as Submit, so that nothing jumps when one replaces the other.
50. As a student, I want the green Next to clearly differ from Submit by color, so that I can tell at a glance which action I'm taking.
51. As a student, I want the green Next to read "See results" on the last question, so that I know it ends the set.
52. As a student, I want the green Next to keep the `Enter ↵` key hint, so that keyboard use stays obvious.
53. As a student revisiting an earlier finished question, I want to see the green Next instead of a grayed-out Submit, so that the screen is consistent with when I first finished it.
54. As a student using only the keyboard, I want arrow keys and Enter to still drive the whole set end-to-end, so that the existing keyboard flow keeps working.
55. As a student who just finished a question, I want focus on the green Next so the same Enter key advances, as it does today.
56. As a reader of a Lesson or Page with an embedded Question Link, I want that single Question to keep its current behavior (grayed-out Submit after answering, no Next), since there's nothing to advance to.

### Styled text in Options and Explanations

57. As a student, I want inline code in an Option to render as code, so that code answers are readable.
58. As a student, I want bold and italic in an Option to render as formatting rather than raw markup characters, so that emphasis is clear.
59. As a student, I want links in an Option or Explanation to render as links, consistent with Lesson/Page text.
60. As a student, I want Explanations to render the same inline formatting, so that an Explanation quoting code looks like the Option it explains.
61. As a reader of an embedded Question in a Lesson or Page, I want the same formatting there, since the widget is shared.
62. As the teacher, I want Option and Explanation text to stay safe against stray HTML (escaped like Lesson/Page text), so that a `<` in a code answer can't break the page.

### Load speed and loading display

63. As a student, I want the page frame (title, top bar, empty question area) to appear immediately, so that the page feels responsive.
64. As a student, I don't want anything to jump or shift when the first question fills in, so that the page feels stable.
65. As a student on a fast load, I don't want to see a flash of spinner or shimmer, so that fast loads feel instant.
66. As a student on a slow load (over about 1 s), I want a subtle pulse on the question area, so that I know it's still working.
67. As a student, I want the first question to appear as quickly as possible after I open the link, so that studying starts without waiting.
68. As a student who lands on Saved Progress, I want the page to open straight to my Frontier or summary, without first flashing Question 1.
69. As the teacher, I want edits to a Practice Set or its Questions to reach students on a normal refresh, so that fixing a typo mid-class works immediately.
70. As the teacher, I want Practice Set links shared in Google Classroom to keep showing the set's real title in the link preview, so that students can tell links apart.
71. As the teacher, I accept that a renamed Practice Set's link-preview title may lag by up to a day, since the on-page title and tab title come from live data.
72. As the teacher, I want a link shared before its Practice Set exists to start working as soon as I create the set, so that a "not found" response is never cached.
73. As the teacher, I want the bare domain to be the primary address with `www.` redirecting to it, so that the short link I paste and students type is the fast one.
74. As the teacher, I want the browser tab title to show the Practice Set's live title, so that renames show up immediately on screen.
75. As a developer testing locally, I want the `?slug=` dev page to keep working without the server function, so that Practice Sets can still be previewed without deploying.
76. As a student opening a Page (`/p/<slug>`), I also benefit from the slimmed, longer-cached preview function, since both routes share it.

### Future-proofing (not built now)

77. As the teacher, I may later want to let students skip ahead past the Frontier, while keeping locked order as the default, so the "which questions can be viewed" rule is one swappable rule.
78. As the teacher, I may later want each student's question order shuffled at the start of a set and kept until they reset, so "this student's order" is its own step and Saved Progress has room to hold an order.
79. As the teacher, I may later want teacher-facing reporting, so Saved Progress is recorded per Question in a shape a future database record could mirror.

## Implementation Decisions

### Saved Progress store (new module)

- A small, deep module owns Saved Progress for one Practice Set, keyed by Practice Set id. Interface, roughly: load the current Saved Progress; record one Question's state; clear (for reset); subscribe to changes made elsewhere (another tab). `startPracticeSet` receives a store instance; production uses a browser-storage-backed implementation, and tests use an in-memory one that notifies other subscribers on the same store (simulating tabs).
- Browser-storage backing uses `localStorage`, one entry per Practice Set, under a namespaced key. Cross-tab updates come from the browser's `storage` event. Every read and write is wrapped so a blocked, full, or corrupt storage falls back to in-memory behavior rather than breaking delivery.
- Saved Progress is keyed **by Question id**, never by position. Each Question's entry holds the existing widget state: selected Option, Attempt count, last-submitted-wrong Option, finished flag, Question Outcome. Unsubmitted selections are saved too. Which question a tab is *viewing* is not saved.
- The stored record carries a version number so a future shape change (e.g. a saved shuffled order) can be read alongside or migrated from today's.
- Writes happen on every widget state change (selection, submit), not only on finishing, so a half-done Question survives a refresh.
- Reset clears the whole Practice Set's entry; other tabs see the clear through the subscription and return to Question 1.

### Practice Set delivery controller (modified)

- Two explicit, swappable steps feed the controller:
  - **Order**: (Practice Set's Question list, Saved Progress) → this student's ordered Questions. Today it returns the set's current order filtered to Questions that still exist. Later, randomization would generate an order once and store it in Saved Progress.
  - **Navigable**: (ordered Questions, Saved Progress) → which indexes may be viewed. Today: everything up to and including the Frontier (locked order). Later, skip-ahead would swap this rule.
- The Frontier is derived, never stored: the first Question in the student's order with no finished state in Saved Progress. Saved answers for Questions no longer in the set are ignored when computing the Frontier, Running Score, and summary.
- On mount, the controller opens on the Frontier, or on the summary if every Question is finished.
- On a change from another tab, the controller recomputes the Frontier and Running Score. If the viewed Question's state changed, it re-renders that Question from saved state without celebration or sound. If the change was a reset, it jumps to Question 1.
- The question widget gains a way to restore state silently (no celebration, no sound, no focus steal) and a caller option saying "a caller-owned Next replaces Submit once finished". Practice delivery sets it; embedded Question Links don't, keeping today's grayed-out Submit.
- The bottom green Next occupies Submit's exact slot and size: same box dimensions and key-hint pill, distinguished by a green color. On the last Question it reads "See results".
- The top bar holds: Back, a secondary-styled Next, `Question N of M`, and the Running Score. On phone widths the score area wraps below the buttons. Numbers use tabular figures and the score area reserves its width, so values never shift layout. The empty state is `- / -`.
- The top-bar Next uses `aria-disabled` styling rather than the `disabled` attribute, so a click on it can still show the toast. The toast reads "Answer this question to move on" and fades after a few seconds; on the summary there's no toast. The existing keyboard hint stays.
- Running Score is First-Try Correct ÷ finished Questions (count and percentage), computed from the same Question Outcome tally that feeds the summary. Percentage display follows the summary's existing floor-not-round rule so it never overstates.
- The summary's reset button is labeled **Reset answers & start over**, with no confirm. There is no reset control mid-set.

### Inline formatting in Options and Explanations (modified)

- The shared content renderer exposes its existing inline formatter (HTML-escape first, then links, bold/italic, inline code) for single-line text. The question widget uses it for Option labels and Explanations instead of plain text nodes. Page/Section Link resolution follows whatever the formatter already does with no heading map.

### Data loading in the browser (modified)

- Practice Set delivery no longer uses the Firebase SDK. It reads through the Realtime Database REST API (`.json` endpoints; the database is already publicly readable), so it doesn't download the SDK or open a live connection.
- The server-rendered shell includes the resolved Practice Set id (a data attribute or small inline JSON). The browser reads the Practice Set by id, then fetches every referenced Question in parallel: two reads in a row. Without an id (the local `?slug=` dev page), it resolves the Slug first, as today.
- The shell includes `preconnect` hints for the database host.
- The shell's static frame (title, top bar with `Question - of -`, `- / -`, an empty question area at its usual height) is in the HTML or drawn before any fetch, so nothing moves when data arrives. A subtle pulse on the question area appears only if loading runs past ~1 s.
- The document title is set from the live Practice Set title once loaded.
- Saved Progress is read before the first render, so a returning student never sees Question 1 flash before their Frontier.

### Link-preview function (modified)

- `pageSSR` and `practiceSetSSR` stay on Firebase Cloud Functions. Their request handling becomes a pure function: request path plus an injected JSON-fetch function in, status + headers + HTML body out. A thin adapter wires it to the Cloud Functions request/response.
- The function drops `firebase-admin` and reads the slug index and title through the database's REST API with plain `fetch`, to shrink cold starts.
- Found responses are cached for a day at the CDN. "Not found" responses send a no-store/no-cache header.
- The Practice Set shell embeds the Practice Set id alongside the escaped title. All interpolated values stay HTML-escaped.
- Merging the two exports into one function is **not** required by this spec. It only matters if an always-on minimum instance is later chosen; see ADR 0004's update.
- If the slimmed function's measured cold start is still over ~1 s, a follow-up (outside this spec) moves the handler to a Cloudflare Worker with its own ADR. The pure handler is designed so it can move unchanged.

### Domain and hosting

- The bare domain `mrhsieh.app` becomes the primary host and `www.` redirects to it. This is a Firebase Hosting console change done by Eric, not code.

### Docs

- `CONTEXT.md` already defines Saved Progress and Running Score and has updated Frontier and Question Outcome entries.
- ADR 0004 and ADR 0012 already have dated updates recording these decisions.
- The CLAUDE.md "before considering done" checklist gains the `functions/` test command.

## Testing Decisions

- Good tests here drive behavior the way a student or browser would: mount, click options, press Enter, click Back/Next, remount, and assert on what's rendered. They don't reach into controller internals or assert on storage key names. The Order and Navigable steps are tested through the controller, not separately.
- **Practice Set delivery controller** (existing jsdom seam, extended with an injected in-memory Saved Progress store):
  - resume at the Frontier
  - resume on the summary
  - a half-done Question survives a remount, including a used Attempt and a sticky wrong Explanation
  - an unsubmitted selection survives a remount
  - reset from the summary
  - two controllers on one store stay in sync: an answer in one, a reset in one, no celebration replay, each keeping its own viewed Question
  - a Practice Set whose Question list changed (removed, added, reordered Questions)
  - question numbers
  - Running Score values and the `- / -` empty state
  - top-bar Next states and the toast
  - Submit replaced by the green Next, including on revisits
  - keyboard flow still working end-to-end

  Prior art: the existing Frontier navigation tests for this controller.
- **Page initialization** (existing seam; mocks `fetch` instead of the database modules):
  - reads by embedded id: two requests, Questions in parallel
  - the `?slug=` fallback resolves first
  - the frame is drawn before data resolves
  - the pulse appears only after ~1 s (fake timers)
  - not-found and empty-set messages
  - a missing Question is skipped

  Prior art: the existing initialization tests for this page.
- **Question widget** (existing seam):
  - inline code, bold, italic and links render in Options and Explanations
  - HTML in Option text stays escaped
  - silent restore doesn't celebrate or play sound
  - with no caller-owned Next, the widget keeps today's grayed-out Submit after finishing

  Prior art: the existing widget tests and the content renderer's inline-formatting tests.
- **Browser-storage Saved Progress adapter** (new, small):
  - save/load round-trip per Practice Set
  - isolation between Practice Sets
  - a `storage` event from another tab reaches subscribers
  - clear
  - corrupt JSON and storage that throws on access both fall back gracefully

  Prior art: the robotics storage tests.
- **Link-preview handler** (new; Node's built-in test runner inside `functions/`, wired into the CLAUDE.md checklist):
  - found → 200, a day-long cache header, the escaped title, and the embedded Practice Set id
  - not found / no slug → 404, no-cache
  - a title containing `<`, `"` or `&` is escaped
  - the Page route behaves the same as before apart from caching
- Coverage thresholds in the web suite must not drop. New branches get tests.
- Real-world checks that tests can't cover go in Eric's tickets: a post-deploy curl of status, `Cache-Control`, and cold vs warm timing, plus a two-tab manual check on a real device.

## Out of Scope

- Writing any student activity to the database, student identity, and teacher-facing reporting (ADR 0012 still holds).
- Correctness streaks.
- A mid-set reset control.
- Skip-ahead navigation past the Frontier (designed for, not built).
- Randomized question order (designed for, not built).
- Detecting that a Question's Options changed after a student answered it.
- An always-on minimum instance for the preview function, and merging the two function exports.
- Moving the preview function to a Cloudflare Worker (a follow-up only if the measured cold start is still over ~1 s).
- A service worker / offline shell cache.
- Bundling Question content into the Practice Set record or the server response.

## Further Notes

- Measured baseline on 2026-10-22, run with a cache-busting query against the live site: preview function cold ~2.3 s (`/practice`) and ~2.7 s (`/p`), warm ~0.16–0.18 s, and a static CDN file ~0.11 s. The bare domain added a 301 redirect to `www.`. Re-measure the same way after the slimmed function deploys to decide on the Worker follow-up.
- Always-on cost reference if it's revisited: ~$3/month at the `gcf_gen1` CPU size, ~$8/month at the default 1 vCPU (Firebase docs).
- `mrhsieh.app` DNS is already on Cloudflare (DNS-only), which keeps the Worker follow-up cheap if it's needed.
- Eric's own tickets (to be created alongside the implementation tickets):
  - switch the primary domain to the bare domain in Firebase Hosting
  - deploy the slimmed function and run the timing check
  - a manual two-tab check and phone-width check on a real device
