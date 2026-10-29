# 01: Three non-functional mockup directions for the School Clock

**What to build:** Three clearly different visual directions for the School Clock as static, non-functional HTML/CSS mockups with hard-coded fake data. Each direction is a complete design idea, not a recolour: different type, layout and density choices. They exist so Eric can react to real pixels before anything is wired up. Mockups live under `.scratch/school-clock/mockups/` (one folder per direction, plus an index page linking them) and are never shipped in `web/`.

Spec: `.scratch/school-clock/spec.md` (whole spec; especially user stories 4–18, 29–41, 59–80). Vocabulary: `web/clock/CONTEXT.md`.

**Blocked by:** None (can start immediately).

**Status:** open

Each direction shows every one of these screens/states, as separate frames or a state switcher:

- [ ] **In a Period, projected (1920×1080):** one big Readout (time left), the Segment name with Period Label ("Period 3 · AP CSA"), Day Label ("Even Day"), Division, and the timer and Bells controls
- [ ] **Several Readouts:** big time left plus small time elapsed and current time
- [ ] **Passing Period:** countdown plus "Up next: Period 4 · Prep"
- [ ] **Break and Assembly:** Nutrition and Chapel
- [ ] **Off-Hours:** before school ("starts in 42m"), after school ("since school ended"), and a day off ("Thanksgiving Break · back Mon, Nov 30")
- [ ] **Experience Week and Summer:** "HS Experience Week"; "Day 12 of Summer"
- [ ] **Ringing:** an Alarm ringing with its flash/highlight and a dismiss button
- [ ] **Sound blocked:** the "turn sound on" prompt
- [ ] **Timer:** a running timer and the timer picker (1/2/5/10 presets, custom entry, 3 recent quick picks)
- [ ] **Settings drawer:** Division, Period Labels, Bells toggle, sound and volume, and the Alarm list with the "add Period Alarm" form (from start / before end / halfway, Period checklist, Bell Schedule checklist with the Block Days shortcut)
- [ ] **First visit:** the Division prompt
- [ ] **Mini player (about 320×180):** big Readout, Segment, up next, dismiss
- [ ] **Small screens:** phone (390×844) and a laptop-corner window (about 480×320), for the in-Period and Passing Period states
- [ ] **Feedback link:** "Feedback? Email Eric" placed so it's findable but never projected large
- [ ] **Self-review:** each direction passes the self-review checklist below, with screenshots at every size saved next to the mockup and short notes on what passed, what failed and what was fixed
- [ ] **Index page:** a one-paragraph pitch for each direction (what it optimises for, its trade-off), with the screenshots

## Self-review checklist

Used by this ticket, 03 and 04. Take screenshots with Playwright (pre-installed Chromium) at 1920×1080, 1440×900, 480×320, 390×844 and 320×180, look at every one, and fix problems before calling anything done.

- **Projected readability:** the main Readout's digits are at least ~25% of viewport height at 1920×1080 and readable at 1280×720 shrunk to a quarter. Use tabular (fixed-width) digits so numbers don't jiggle as they tick. Hierarchy is obvious in under a second: number first, Segment second, everything else quiet.
- **Responsive:** nothing overflows, clips or overlaps at any size. Controls stay at least 44×44 px touch targets on the phone. The mini player still works at 320×180.
- **Accessible:**
  - text contrast is at least 4.5:1 (3:1 for very large digits), and controls are at least 3:1 against their background;
  - colour is never the only signal for state (ringing, Passing Period);
  - every control has a visible label or accessible name and a visible focus ring, and the tab order is logical;
  - the ringing flash stays under 3 flashes per second, with a steady-highlight variant for `prefers-reduced-motion`;
  - run an automated scan (axe-core via Playwright) where it can be loaded, and fix every violation.
- **Visual polish:** consistent spacing scale and alignment; at most two typefaces; one accent colour used purposefully; both light and dark themes look intentional (projectors wash out light themes, so check the dark theme on the projected size). No default browser-styled controls left showing.
- **Wording:** student-visible text is positive and short ("Up next", "Day 12 of Summer"), and uses `CONTEXT.md` terms consistently (Segment names, Day Labels).
- **Clean projected view:** the projected view shows nothing a class doesn't need. Settings, feedback and the explanation of sound limits stay out of the way.

## Comments
