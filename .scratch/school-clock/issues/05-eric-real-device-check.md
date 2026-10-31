# 05: Eric checks the clock on real machines and the projector

**What to do:** This is a step only Eric can do: check the built clock on the browsers and hardware teachers actually use, which the automated review (04) can't fully cover. Do it before sharing the link with other teachers. About 45 minutes in all.

Spec: `.scratch/school-clock/spec.md`.

**Blocked by:** 04

**Status:** open

## 0. Get a URL the Mac, phone and projector can all open

The clock isn't deployed yet, and `localhost` on the PC isn't reachable from other devices. The easiest option is a Firebase **preview channel**: a temporary URL that doesn't touch the live site or the Cloud Functions.

1. On the PC, in the repo root on branch `school-clock`, run `firebase hosting:channel:deploy clock-check --expires 7d`.
2. It prints a URL like `https://<project>--clock-check-xxxx.web.app`. Add `/clock` to it. Below, **URL** means that address.

(Without a preview channel: on the Mac, run `git fetch && git switch school-clock && cd web && npm ci && npx vite`, then open `http://localhost:5173/clock/`. That only covers steps 1–3, not the phone or projector.)

**Simulated time:** add `?at=YYYY-MM-DDTHH:MM` to jump to any moment, and `&speed=N` to run N× faster. A "Simulated time" banner shows while spoofed. Each step below gives the exact URL to use. Pick **HS** at the first-visit prompt unless a step says MS. Switch with the chip in the top right.

## 1. Safari on the MacBook (most teachers use this)

Work through these in order. Write down anything that's off.

1. **First visit.** Open **URL** in a private window. ☐ The Division prompt appears and the clock is hidden behind it. ☐ After you pick HS, a "turn sound on" prompt shows near the bottom, and the "Pick a theme" hint appears once.
2. **Turn sound on.** Click the "turn sound on" prompt. ☐ It disappears. In ⚙ Settings → Sound, press Preview on each sound. ☐ Each one plays, and Volume changes the loudness.
3. **Bells around Nutrition.** Open **URL**`?at=2026-11-03T10:09&speed=20` (All Day: Period 2 → Nutrition at 10:10, Nutrition ends 10:25, Period 3 at 10:30). Turn sound on and make sure Bells are on.
   - ☐ **One** bell at 10:10, not two.
   - ☐ A bell at 10:25 and at 10:30.
   - ☐ During 10:25–10:30 it says Passing Period with "Up next: Period 3".
   - ☐ The bar along the bottom moves, and the Nutrition block reads "Nutrition" or "Nutr.", never "Nut".
4. **Late Start Passing Period.** **URL**`?at=2026-11-04T11:03&speed=30` (Late Start Even). ☐ Bells at 11:05 and 11:10, and the countdown between them is right.
5. **Assembly end bell.** Do this after the follow-up merges. **URL**`?at=2026-11-18T10:53&speed=10` (HS Even Day: Chapel ends 10:55, Period 4 at 11:00).
   - ☐ With "Bell when an Assembly ends" off in Settings → Sound, no bell at 10:55.
   - ☐ Turn it on, reload, turn sound on: a bell at 10:55, and none at Chapel's start (open `?at=2026-11-18T10:13&speed=10` to check that).
6. **Timer in a background tab.** Use the real time, with no `?at=`. Start a 1-minute timer from Timer → 1. ☐ It becomes the big number with a ring. Switch to another app (⌘-Tab) and wait. ☐ After 1 minute it rings on time even though Safari isn't in front, and when you come back the screen is flashing with a Dismiss card. ☐ Dismiss stops it.
7. **Clock Alarm in a background tab.** In Settings → Alarms, add a Clock Alarm 2 minutes from now, "once". Put another window fully over Safari. ☐ It rings on time. ☐ Afterwards it shows as turned off.
8. **Period Alarm.** Add a Period Alarm "5 min before end", Periods 1–7. Open **URL**`?at=2026-11-03T09:13&speed=10` (Period 1 ends 9:20). ☐ It rings at 9:15.
9. **Fullscreen and screen sleep.** Click the fullscreen icon in the bottom right. Leave the Mac alone longer than its display-sleep setting (System Settings → Lock Screen). ☐ The screen stays awake while the clock is fullscreen, and ☐ goes back to normal after you leave fullscreen.
10. **Fonts on a Mac.** No Mac fonts have been seen yet; the agents could only render Windows fonts. Open 🎨 Look and click through every theme. ☐ Nothing looks broken or clipped. ☐ The digits don't jiggle as they tick. ☐ The floral theme's calligraphy labels and the handwriting font look intentional. ☐ The Light/Dark switch flips each theme.
11. **Display settings.** In Settings → Time, turn seconds off and on, and 24-hour time on and off. ☐ The big number and "starts in" lines follow. In Look, switch the bar between Whole day and Just this Segment. ☐ It changes in place.
12. **Readouts.** Click the big number to cycle its mode. Use Readouts to add two more (at most three), then remove one with its Remove button. ☐ On the laptop screen, the extras sit to the right of the big one. ☐ Reload: the layout comes back. ☐ A second tab can have a different layout without changing the first.
13. **Off-Hours and special days.** Check that each looks and reads right:
    - **URL**`?at=2026-11-03T08:00` (before school)
    - `?at=2026-11-03T15:30` (after school)
    - `?at=2026-11-25T12:00` (Thanksgiving Break)
    - `?at=2026-11-07T12:00` (Weekend)
    - `?at=2027-01-20T09:50` (HS Experience Week; switch to MS and it should be a normal All Day)
    - `?at=2027-05-27T11:28&speed=10` (watch Summer begin as the last final ends)
    - `?at=2027-07-01T12:00` ("Day N of Summer")
14. **Feedback link.** In Settings → About, click "Feedback? Email Eric". ☐ Mail opens a new message to erich@villagechristian.org with subject "Clock feedback".

## 2. Chrome and Firefox on the MacBook

Repeat steps 1–3, 6 and 10 in each browser.

1. **Chrome only:** click the mini player icon in the bottom right.
   - ☐ A small always-on-top window opens.
   - ☐ Drag it over Slides or Docs: it stays on top and keeps ticking.
   - ☐ Start a timer: the mini player shows "Timer of 1:00" with a bar.
   - ☐ When it rings, Dismiss in the mini player stops it.
   - ☐ Closing the main tab closes the mini player.
2. **Firefox:** ☐ the mini player icon isn't shown at all.

## 3. The classroom projector

1. Project **URL** with no `?at=` during a real class Period, in fullscreen, using the default theme.
2. From the **back row**: ☐ you can read the big number, ☐ the Segment name ("Period 3"), and ☐ the bar along the bottom.
3. Open **URL**`?at=2026-11-03T10:08&speed=20` to make something ring soon (Nutrition at 10:10). ☐ The flash is noticeable from the back but not unpleasant, and ☐ the bell is loud enough at your usual volume.
4. Try one light theme and one dark theme from Look. ☐ Note any that wash out on the projector.

## 4. Your phone

1. Open **URL** on your phone (Safari on iPhone, or Chrome on Android).
2. ☐ The layout fits with no sideways scrolling.
3. ☐ The bar becomes an agenda list in Whole day mode.
4. ☐ Settings and Look open as sheets you can scroll and close.
5. ☐ The buttons are easy to tap.
6. ☐ Turn sound on and start a 1-minute timer with the phone unlocked and the page in front. It rings. (Phones may not ring with the screen locked; that's a browser limit, not a bug.)

## 5. Record findings

Write anything that felt off under `## Comments` below, or tell Claude in chat. Include the browser, the URL you used, and what you expected. When you're done, delete the preview channel with `firebase hosting:channel:delete clock-check`, or let it expire.

- [ ] Checked in Safari, Chrome and Firefox on the MacBook
- [ ] Mini player checked in Chrome
- [ ] Projected and readable from the back of the room
- [ ] Checked on a phone
- [ ] Findings recorded

## Comments
