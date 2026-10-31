# Spec: School Clock — bell-schedule clock, timers and alarms for every teacher

Status: ready-for-agent
Labels: ready-for-agent

Domain vocabulary: `web/clock/CONTEXT.md` (School Clock context, new). Terms defined during this design: **Bell Schedule**, **Segment**, **Period**, **Break**, **Assembly**, **Period Label**, **Passing Period**, **Block Day**, **School Day**, **Day Label**, **Experience Week**, **Weekday Default**, **Calendar Exception**, **Summer**, **School Year**, **Off-Hours**, **Next School Day**, **Division**, **Readout**, **Alarm**, **Clock Alarm**, **Period Alarm**, **Bells**. **Schedule** and **Class** from the root `CONTEXT.md` are never used here.

Decisions: `docs/adr/0014-school-clock-data-is-static.md` (calendar and Bell Schedules are static files, no database). Source data: the district's "2026-27 Day and Bell Schedules for MS and HS" PDF (published 7/30/26, bell schedule updated 7/27/26).

## Problem Statement

Teachers at the school juggle several Bell Schedules: All Day, Even, Odd, Late Start Even, Finals, Convocation, Pep Rally and HS Super Seminar. MS and HS also differ on some days. Working out "how long until the bell?" or "what's next?" means remembering which day it is, finding the right column of the PDF, and doing clock arithmetic in your head mid-lesson. Today:

- There's no shared, glanceable display of where the school day stands: time left in the Period, time since it started, or how long the Passing Period has left.
- Classroom timers and alarms live in separate apps or phone timers. None of them know the Bell Schedule, so "ring 5 minutes before the end of every Period" or "ring halfway through Periods on Block Days" has to be set up by hand every day, or isn't possible at all.
- Some rooms don't hear the building's bells reliably, and nothing on the projector rings in their place.
- Off-Hours, nothing answers "when is school back?" or "what is today?" (a holiday, an in-service day, a break).

## Solution

A public page at `mrhsieh.app/clock` that any teacher can bookmark. No login. It works out today's Bell Schedule from data built into the page for the School Year. Weekday Defaults are All on Mon, Tue and Fri, Even on Wed, and Odd on Thu; every other day in the PDF is a Calendar Exception.

- **Readouts:** the screen shows one big Readout, and the teacher can add smaller ones. Each Readout cycles its mode on tap:
  - during school: time left in the current Segment, time since it started, current time;
  - Off-Hours: until the Next School Day starts, since school ended, current time.
- **What's always on screen:** the Day Label, the current Segment with its Period Label, and "up next" during Passing Periods. Experience Week and Summer ("Day N of Summer") get their own displays.
- **Timer:** a countdown classroom timer with presets and custom times.
- **Clock Alarms:** at a time of day, once or every School Day.
- **Period Alarms:** a set number of minutes from the start, a set number of minutes before the end, or halfway. They can be scoped to chosen Periods and chosen Bell Schedules (with a Block Days shortcut).
- **Bells:** one toggle; they ring at the start and end of every Period and Break.
- **Sound:** all generated in the browser, no audio files.
- **Mini player:** an always-on-top window where the browser supports it.
- **Device settings:** Division, Period Labels, Alarms, sounds and the timer are saved on the teacher's own device.
- **Feedback:** a small "Feedback? Email Eric" link.
- **Layout:** built to be projected, and scales down cleanly to a laptop corner or a phone.

## User Stories

### Knowing where the day stands

1. As a teacher, I want the clock to know today's Bell Schedule automatically, so that I never have to look up which column of the PDF applies.
2. As a teacher, I want Mon, Tue and Fri to default to All Day, Wed to Even and Thu to Odd, so that ordinary weeks need no special data.
3. As a teacher, I want Late Start Even days, Wed/Thu All days, Finals days, the Convocation day, Pep Rally days and HS Super Seminar day to use their own Bell Schedules, so that the clock is right on unusual days too.
4. As a teacher, I want to see the name of the current Segment (e.g. "Period 3", "Nutrition", "Chapel"), so that I and my students know what we're in.
5. As a teacher, I want a Readout showing time left in the current Segment, so that I can pace the end of class.
6. As a teacher, I want a Readout showing time since the current Segment started, so that I can track how long an activity has run.
7. As a teacher, I want a Readout showing the current time, so that the page also works as a plain wall clock.
8. As a teacher, I want to tap a Readout to cycle its mode, so that switching takes one tap and no menus.
9. As a teacher, I want to show several Readouts at once (one big, others smaller), so that I can see time left and the current time together.
10. As a teacher, I want each Readout to switch mode independently, so that I can mix modes freely.
11. As a teacher, I want different tabs to keep different Readout layouts without changing each other, so that I can have a projector tab and a laptop tab set up differently.
12. As a teacher, I want a tab's layout to survive reloading that tab, so that an accidental refresh doesn't undo my setup.
13. As a teacher, I want a new tab to open with the layout I last used, so that I don't rebuild it every morning.
14. As a teacher, I want a Passing Period to count down its own remaining time, so that I know when the next Segment starts.
15. As a teacher, I want a Passing Period to say what's up next ("Up next: Period 3 · AP CSA"), so that students know where they're headed.
16. As a teacher, I want Breaks (Nutrition, Lunch) counted down like any other Segment, so that I know when students are due back.
17. As a teacher, I want Assemblies (Chapel, Convocation, Pep Rally) shown and counted down, so that the display stays accurate during them.
18. As a teacher, I want back-to-back Segments with no gap (Period 2 into Nutrition) to go straight from one to the next with no zero-length Passing Period, so that the display doesn't flicker.

### Divisions

19. As an MS teacher, I want the clock to follow MS Bell Schedules (e.g. MS Even: Period 4 before Chapel), so that the times match my day.
20. As an HS teacher, I want the clock to follow HS Bell Schedules (e.g. HS Even: Chapel before Period 4; HS Super Seminar on 4/28), so that the times match my day.
21. As a first-time visitor, I want to be asked my Division once, so that the clock is right from the start.
22. As a teacher who teaches both Divisions, I want to switch Division in one tap, so that I can follow whichever group I'm with.
23. As a teacher, I want the current Division shown next to the Segment name, so that I can tell at a glance which Division's times I'm seeing.
24. As an HS teacher during HS Experience Week (1/19–22), I want the clock to say it's Experience Week instead of showing Segments, so that it doesn't invent a day that isn't happening.
25. As an MS teacher during that same week, I want the clock to follow the All Day schedule, so that my normal day is still tracked.

### Labels and personalisation

26. As a teacher, I want to give my Periods my own labels ("AP CSA", "Prep"), so that the clock speaks in terms of my day.
27. As a teacher, I want my Period Labels shown wherever that Period is named (current Segment, up next, Alarm Period selection), so that the labels are useful everywhere.
28. As a teacher, I want my Period Labels and Division saved on my device, so that I set them up once.

### Off-Hours, days off, and Summer

29. As a teacher before school on a School Day, I want the default Readout to count down to the first Segment, so that I know how long until school starts.
30. As a teacher after school, I want the default Readout to show time since school ended, so that I can see how long I've stayed.
31. As a teacher in Off-Hours, I want to cycle between "until school starts", "since school ended" and the current time, so that I can pick what I care about.
32. As a teacher, I want "since school ended" before school to count from the end of the previous School Day (e.g. since Friday 3:10 PM), so that the number means something before the first bell.
33. As a teacher, I want the Off-Hours display to say when the Next School Day is ("Mon, Nov 2 · starts in 2d 14h"), so that I know when school resumes.
34. As a teacher, I want every day off labelled with what it is (Weekend, Labor Day, Teacher In-Service, Thanksgiving Break, Christmas Break, MLK Jr. Day, Presidents Day Winter Break, Easter Break, School Holiday, No School), so that I know why there's no school.
35. As a teacher, I want NSO (8/17) and "Done!" (5/28) treated as days off, so that the countdown doesn't point at a day without classes.
36. As a teacher, I want each School Day labelled with its Bell Schedule's name ("Even Day", "Late Start Even", "Finals"), so that I know what kind of day it is.
37. As an HS teacher before Experience Week, I want the Next School Day countdown to skip Experience Week, so that it points at the next day with classes.
38. As a teacher once the last class of the year ends, I want the clock to show "Day N of Summer", with positive wording, so that the page stays friendly all summer.
39. As a teacher in Summer, I want a countdown to the first day of school once next year's data exists, so that the page becomes useful again before school starts.
40. As a teacher in Summer before next year's data exists, I want a plain clock with no broken countdown, so that the page never shows nonsense.
41. As a teacher on a date outside every known School Year, I want a plain clock, so that the page still works.

### Classroom timer

42. As a teacher, I want a countdown timer with 1, 2, 5 and 10 minute presets, so that I can start a common timer in one tap.
43. As a teacher, I want to type a custom duration, so that I can time anything.
44. As a teacher, I want my last 3 custom durations kept as quick picks, so that my usual times are one tap away.
45. As a teacher, I want a running timer to survive a page reload, so that an accidental refresh doesn't lose it.
46. As a teacher, I want to pause, resume, and cancel the timer, so that I can adjust to the class.
47. As a teacher, I want the timer one tap away from the main screen, so that I don't have to open settings mid-lesson.

### Alarms

48. As a teacher, I want to set a Clock Alarm for a time of day, so that I'm reminded at that time.
49. As a teacher, I want a Clock Alarm to ring once or every School Day (every School Day by default), so that routine reminders don't need resetting.
50. As a teacher, I want to set a Period Alarm a number of minutes from the start of a Period ("at minute 40"), so that I can mark a point in the lesson.
51. As a teacher, I want to set a Period Alarm a number of minutes before a Period ends ("5 minutes before the end"), so that I have time to wrap up.
52. As a teacher, I want to set a Period Alarm at the halfway point of a Period, so that one Alarm works on both 45- and 85-minute Periods.
53. As a teacher, I want to choose which Periods a Period Alarm applies to (Periods 1–7 by default; Seminar and Super Seminar can be ticked), so that it only rings when I'm teaching.
54. As a teacher, I want Period Alarms never to apply to Breaks or Assemblies, so that nothing rings during Lunch or Chapel.
55. As a teacher, I want to limit any Alarm to chosen Bell Schedules, with a Block Days shortcut (Even, Odd, Late Start Even, HS Super Seminar Even), so that my mid-period walk only rings on Block Days.
56. As a teacher, I want to choose a sound for each Alarm from a few options (e.g. chime, school bell, beep, buzzer), so that different Alarms sound different.
57. As a teacher, I want to turn an Alarm off without deleting it, so that I can pause it for a while.
58. As a teacher, I want my Alarms saved on my device, so that I set them up once.

### Bells

59. As a teacher, I want one toggle for Bells, so that my room gets a bell even if the building's is hard to hear.
60. As a teacher, I want Bells to ring at the start and end of every Period and Break, but not Assemblies, so that every Passing Period starts and ends with a bell.
61. As a teacher, I want Bells to ring once where one Segment ends exactly as the next begins, so that there's no double ring.
62. As a teacher, I want Bells to play a short sound (about 3 seconds) that stops on its own, so that I don't have to dismiss them.
63. As a teacher, I want the Bells toggle one tap away from the main screen, so that I can turn them on for the day quickly.
84. As a teacher, I want the option of Bells at the end of each Assembly (never its start), so that my room hears when Chapel, Convocation or a Pep Rally is over. (A follow-up, numbered after the rest so earlier numbers stay put.)

### Ringing

64. As a teacher, I want Alarms and the timer to ring until I dismiss them, for at most 60 seconds, so that I don't miss them but they don't ring forever.
65. As a teacher, I want the screen to flash visibly when something rings, so that a muted or noisy room still notices.
66. As a student, I want the flash to be safe and not strobing, so that it doesn't hurt to look at.
67. As a teacher, I want one volume control, so that I can match the room.
68. As a teacher, I want to preview a sound before choosing it, so that I know what it'll sound like.
69. As a teacher, I want a clear "turn sound on" prompt when sound is still blocked, so that I know one click is needed after each load.
70. As a teacher, I want Bells and Alarms to ring on time while the clock tab is in the background behind my slides, so that I can keep working in other tabs.
71. As a teacher, I want to be told the tab must stay open for sounds to play, so that I don't close it and miss a Bell.

### Projection, mini player, and screens

72. As a teacher projecting the clock, I want the big Readout readable from the back of the room, so that students can see it.
73. As a teacher, I want a fullscreen button, so that the projected view shows nothing but the clock.
74. As a teacher, I want the screen kept awake while the clock is fullscreen, so that the projector doesn't go to sleep mid-class.
75. As a teacher on a phone or a small window, I want the layout to scale down cleanly, so that the clock works in a corner of my screen.
76. As a teacher on Chrome or Edge, I want a mini player that stays on top of other windows (showing the big Readout, the current Segment, up next, and a dismiss button), so that I can watch the clock while working in slides.
77. As a teacher on a browser without mini player support (Safari, Firefox), I want the mini player button hidden, so that I don't hit a dead control.
78. As a teacher, I want the clock to work in current Safari, Chrome and Firefox on a MacBook, and in other modern browsers, so that whatever I use works.
79. As a teacher, I want all settings in one drawer, out of the way, so that the projected view stays clean.

### Display options

80b. As a teacher, I want to turn seconds on or off for the clock and countdowns, while the last minute of a countdown and the timer always show seconds, so that the display is as busy as I like but the end of a Period stays exact.
80c. As a teacher, I want a strip of today's Segments along the bottom that I can turn off, so that I can see the shape of the day, or keep the view minimal.
80d. As a teacher, I want to pick a look from a set of themes (each a font and colours) shown as previews, so that the clock suits me and my room.
80e. As a teacher, I want to swap a theme's font or colours separately, so that I can fine-tune it without making it unreadable.
80f. As a teacher, I want a running timer to become the big Readout with a progress ring around it, so that the whole room can see it.

### Time format

80a. As a teacher, I want a 24-hour (military) time toggle, saved on my device, so that every clock time on the page (current time, Segment times, "starts at", Alarm times) shows the way I read time.

### Feedback

80. As a teacher, I want a small "Feedback? Email Eric" link that opens a new email to erich@villagechristian.org with the subject "Clock feedback", so that sending a suggestion takes no effort.

### Maintenance (Eric)

81. As Eric, I want each School Year's data in one hand-edited file, so that next year's calendar is a single, reviewable change.
82. As Eric, I want an automated check that every Bell Schedule's Segments are in order and don't overlap, so that a typo like the Pep Rally Period 5 time is caught before deploy.
83. As Eric, I want the page to make zero database reads, so that 100 teachers leaving it open all day costs nothing beyond static hosting.

## Implementation Decisions

- **New bounded context and folder.** The School Clock lives in its own folder under `web/` with its own `CONTEXT.md`, listed in `CONTEXT-MAP.md`, following the Robotics precedent (ADR 0013). It imports nothing from the Formative Platform's database modules.
- **Hosting.** A rewrite serves the clock page at `/clock`. It must sit above the catch-all `**` → `index.html` rewrite. The existing build copies `web/` wholesale, so no build change is needed. No Cloud Function, no database rules change.
- **Static School Year data (ADR 0014).** One data module per School Year declares:
  - the date range;
  - the Bell Schedules, each with a name and an ordered list of Segments. A Segment has a name, a kind (Period, Break or Assembly) and local wall-clock start/end times. A Bell Schedule can have a different Segment list per Division, or a shared list where the Divisions agree;
  - the Weekday Defaults (Mon–Fri → Bell Schedule);
  - the Calendar Exceptions (date → a Bell Schedule, a day off with its Day Label, or Experience Week). An exception can apply to one Division only, e.g. HS Experience Week, or HS Super Seminar vs MS Even on 4/28.

  A registry lists every School Year, so the next year is added without touching clock logic.
- **2026–27 data corrections, confirmed with Eric:**
  - Pep Rally Period 5 is 11:45–12:25. The PDF says 11:15–11:55, which is a typo.
  - The Pep Rally schedule overrides "All" on 9/11/26, 1/29/27 and 4/16/27.
  - Semester 2 finals (5/25–27) follow the Semester 1 order: Periods 2 and 3 / Periods 4, 5 and 6 / Periods 1 and 7, with the same times and Nutrition Breaks as 12/16–18.
  - NSO (8/17) and "Done!" (5/28) are days off labelled "No School".
  - The 11/11 Convocation day uses the All School Convocation schedule.
  - HS Experience Week applies to HS only; MS is on All Day.
- **Clock model (deep pure module, `// @ts-check`).** The single place every rule lives. Two queries over (time, School Year registry, device settings):
  - **Describe a moment**: the Day Label; the state (in a Segment, Passing Period, Off-Hours before or after school, day off, Experience Week, Summer, or unknown date); the current Segment with its Period Label and its start/end; up next; the Next School Day and its first Segment's start; the end of the previous School Day; the day count of Summer, and the next first day if known. Readout values are derived from this.
  - **Rings in a window**: every ring (Bell, Clock Alarm, Period Alarm, timer end) in a half-open time range, each with its source and sound. Scoping by Division, Bell Schedule and Period selection is applied, and Bells at a shared Segment edge are merged into one.

  - **Bells at the end of Assemblies** (follow-up). A saved setting inside the Bells settings, `bells.assemblyEnds`, default off (missing or corrupt → off, so earlier saves behave as before). When on, and only while Bells are on, Bells also ring at each Assembly's end, never its start; that end merges into one ring with any Bell edge at the same moment (Convocation ending as Nutrition starts). The switch "Bell when an Assembly ends" sits under the Bells switch in the drawer's Sound section.

  All times use the device's local time zone with wall-clock Segment times, so daylight-saving changes (e.g. 11/1/26) need no special handling beyond building dates in local time.
- **School Day rules in the model:**
  - Weekends are never School Days unless an exception says so.
  - Experience Week and days off are not School Days for the Next School Day.
  - Summer begins at the end of the last Segment of a School Year's last School Day.
  - Off-Hours on a School Day means before the first Segment's start or after the last Segment's end.
  - A Passing Period is any non-zero gap between consecutive Segments.
- **Readout modes:**
  - In-school modes: time left, time elapsed, current time.
  - Off-Hours modes: until Next School Day, since school ended, current time.
  - During a Passing Period, both countdown modes show the Passing Period's remaining time.
  - Defaults: "until school starts" before school on a School Day; "since school ended" after school; "until Next School Day" on days off.
  - A Readout keeps its position in the mode cycle as the day moves between in-school and Off-Hours.
- **Device storage.** A small storage adapter (Robotics' `createLocalStorageAdapter` is the precedent) with versioned keys, falling back to defaults on missing or corrupt data.
  - **Saved in `localStorage`:** Division, the 24-hour time setting (default off, i.e. 12-hour), the seconds setting (default on), the Day Strip on/off (default on), the theme with any font or palette swap, whether it is flipped to its other version (ticket 21 replaced light/dark/auto), whether the "Pick a theme" hint is done, Period Labels, Alarms, Bells on/off, sound choices, volume, the running timer's end time, the recent custom durations, and the "last used" Readout layout.
  - **Per tab:** the layout lives in `sessionStorage` and is read from `localStorage` only when a tab with no session layout opens. The page never listens for cross-tab storage events, so open tabs never change each other.
- **Sound engine.** Web Audio synthesis only, with no audio assets: a few named voices (e.g. chime, school bell, beep, buzzer), each a short function of an audio context and a start time.
  - Upcoming rings are scheduled ahead on the audio clock for a lookahead window, so they play on time even when timers in a background tab are throttled. The schedule is recomputed whenever settings change, the tab becomes visible, or the window rolls over.
  - The engine starts suspended. A visible "turn sound on" control resumes it after any user click, and is shown again whenever the audio context is suspended (after every load).
  - Bells play about 3 s and stop on their own. Alarms and the timer repeat until dismissed, for at most 60 s.
- **Time format.** One formatter turns a clock time into text according to the 24-hour setting, and every clock time on the page and in the mini player goes through it. Durations and countdowns ("12:04 left", "2d 14h") are not affected.
- **Seconds.** The same formatter applies the seconds setting to clock times and countdowns. The last minute of a countdown and the timer always show seconds.
- **Look (from tickets 02 and 03; Eric's review of the first design reference, in 03's Comments, revises the details: one bar at the bottom with whole day / just this Segment settings instead of a separate Day Strip and hairline; a separate Look menu; themes that own their light or dark mode, with no auto; controls along the top; seconds at equal weight).**
  - A's layout, with B's Day Strip (a toggle, default on). Off-Hours, the strip shows the Next School Day; it hides in Summer and Experience Week.
  - C's ring is used only around a running timer, which becomes the big Readout while it runs.
  - Themes, never labelled by audience, each a font plus a light and dark palette. A teacher can swap the font or palette only among pre-checked options.
  - The default theme is a dark muted blue with light blue-grey text.
  - Design tokens come from ticket 03's design reference.
- **Ticking.** The display recomputes from the current time on each tick. It never counts up or down by adding ticks, so a throttled or sleeping tab is correct the moment it renders again.
- **Visual ringing.** The flash must stay under 3 flashes per second (WCAG 2.3.1) and fall back to a steady highlight under `prefers-reduced-motion`.
- **Mini player.** Document Picture-in-Picture, used only when the API exists. It mirrors the big Readout, current Segment, up next, and a dismiss button from the main tab's state. The button is hidden when the API is unavailable. No video-PiP fallback.
- **Wake Lock.** Requested while fullscreen and released on exit; it fails silently where unsupported.
- **Simulated time.** The page's clock source honours `?at=<local date-time>` (start the clock at that moment, then tick forward) and `&speed=<n>` (run n times faster), for manual testing and design review on the real page. A visible "Simulated time" banner shows while it's active, and invalid values fall back to real time. It affects only that tab. Settings still save normally, but a "once" Clock Alarm that rings in simulated time is not turned off. Sound scheduling maps simulated time onto the audio clock using the speed factor.
- **Page controller.** A thin DOM layer. Time, the sound player, storage and the PiP/Wake Lock/fullscreen capabilities are passed in, so the page can be driven entirely by tests. It renders the clock model's output and turns settings-drawer input into device-settings changes.
- **UI design comes first** (see Further Notes): implementation follows the design reference from the design tickets.
- **Student-facing wording is positive** throughout (e.g. "Day 12 of Summer", "Up next").

## Testing Decisions

- **Good tests check external behaviour only.** They give the clock model a time, a School Year and settings, and check what it describes or what rings. They never reach into internal helpers. Page tests act like a teacher (tap, type, toggle) and check what's on screen or sent to the fake sound player, never internal state.
- **Seam 1: the clock model (most of the tests).** Plain dates, no DOM, timers or audio. It covers every rule above, including:
  - Weekday Defaults and each kind of Calendar Exception;
  - MS vs HS Even Days and the HS-only exceptions;
  - Passing Period with up next, and no zero-length Passing Period at Period 2 → Nutrition;
  - the Off-Hours defaults before and after school;
  - "since school ended" crossing a weekend;
  - Next School Day skipping holidays and Experience Week;
  - Summer starting at the last Segment's end;
  - an unknown date;
  - the daylight-saving weekend;
  - Bells merging at shared edges and skipping Assemblies;
  - Period Alarms (from start, before end, halfway) never landing on Breaks or Assemblies;
  - Bell Schedule scoping and the Block Days shortcut;
  - Clock Alarm "once" vs "every School Day";
  - half-open ring windows (no double ring at a window edge).
- **Data integrity test.** For every School Year file:
  - every Bell Schedule's Segments, for each Division, are in order and don't overlap;
  - every Calendar Exception's date is inside the year and names a known Bell Schedule;
  - every Segment has a valid kind.
- **Seam 2: the page controller, in jsdom, with fake clock, sound player and storage.** It covers:
  - tapping cycles a Readout;
  - adding Readouts;
  - a tab's layout staying separate from other tabs, and a new tab opening with the last layout;
  - the first-visit Division prompt and the one-tap switch;
  - the settings drawer saving to storage;
  - the timer surviving a reload and its presets and quick picks;
  - the "turn sound on" prompt;
  - a ring reaching the fake player and flashing the screen, and dismissing it;
  - the mini player button hidden without Document PiP;
  - the feedback link's `mailto:` target.
- **Prior art:**
  - Robotics' pure-module tests (`robotics-standings`, `robotics-match-timeline`, `robotics-pairing-draw`) for Seam 1;
  - `robotics.test.js` and `robotics-render-loop.test.js` for jsdom page tests;
  - `robotics-storage.test.js` for the storage adapter.
- **Gates:** `npm run lint`, `npm run typecheck` and `npm run test:coverage` in `web/` must pass. New pure modules carry `// @ts-check`, and the coverage thresholds must not drop.

## Out of Scope

- Stopwatch.
- System notifications.
- Clock-drift correction or a "bells are N seconds off" adjustment.
- Any database use, accounts, or syncing settings between devices.
- An in-app editor for Bell Schedules or the calendar (edits are code changes plus a redeploy, per ADR 0014).
- A video-PiP fallback mini player for Safari and Firefox.
- Elementary school schedules.
- The 2027–28 School Year data (added when the district publishes it).
- An offline service worker or PWA install.
- Any change to the Formative Platform or Robotics pages.

## Further Notes

- **Design before build.** Eric wants deliberate UI/UX iteration: several non-functional mockups in different visual directions, a choice and refinement round, and self-review against a checklist covering responsiveness, accessibility, projected readability and visual polish. These are tickets under `issues/`: 01 mockups, 02 Eric picks a direction, 03 design reference, 04 UI/UX review of the built page, 05 Eric's check on real devices and the projector. Implementation tickets are written from this spec once 03 is signed off, and slot in between 03 and 04.
- **Browser reality.**
  - Sound needs one click per page load.
  - The tab must stay open; minimizing it is fine.
  - The mini player is Chrome and Edge desktop only.
  - The page should say so plainly rather than hide it.
- **Cost.** About 100 teachers each loading about 100 KB a day is about 0.3 GB a month of hosting, inside Firebase Hosting's free 10 GB, with zero database reads.
- **Yearly upkeep (Eric).** Add the 2027–28 data file before the first day of school, so the Summer countdown appears.
