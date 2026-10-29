# 01: Three non-functional mockup directions for the School Clock

**What to build:** Three clearly different visual directions for the School Clock as static, non-functional HTML/CSS mockups with hard-coded fake data. Each direction is a complete design idea, not a recolour: different type, layout and density choices. They exist so Eric can react to real pixels before anything is wired up. Mockups live under `.scratch/school-clock/mockups/` (one folder per direction, plus an index page linking them) and are never shipped in `web/`.

Spec: `.scratch/school-clock/spec.md` (whole spec; especially user stories 4–18, 29–41, 59–80). Vocabulary: `web/clock/CONTEXT.md`.

**Blocked by:** None (can start immediately).

**Status:** closed

Each direction shows every one of these screens/states, as separate frames or a state switcher:

- [x] **In a Period, projected (1920×1080):** one big Readout (time left), the Segment name with Period Label ("Period 3 · AP CSA"), Day Label ("Even Day"), Division, and the timer and Bells controls
- [x] **Several Readouts:** big time left plus small time elapsed and current time
- [x] **Passing Period:** countdown plus "Up next: Period 4 · Prep"
- [x] **Break and Assembly:** Nutrition and Chapel
- [x] **Off-Hours:** before school ("starts in 42m"), after school ("since school ended"), and a day off ("Thanksgiving Break · back Mon, Nov 30")
- [x] **Experience Week and Summer:** "HS Experience Week"; "Day 12 of Summer"
- [x] **Ringing:** an Alarm ringing with its flash/highlight and a dismiss button
- [x] **Sound blocked:** the "turn sound on" prompt
- [x] **Timer:** a running timer and the timer picker (1/2/5/10 presets, custom entry, 3 recent quick picks)
- [x] **Settings drawer:** Division, Period Labels, Bells toggle, sound and volume, and the Alarm list with the "add Period Alarm" form (from start / before end / halfway, Period checklist, Bell Schedule checklist with the Block Days shortcut)
- [x] **First visit:** the Division prompt
- [x] **Mini player (about 320×180):** big Readout, Segment, up next, dismiss
- [x] **Small screens:** phone (390×844) and a laptop-corner window (about 480×320), for the in-Period and Passing Period states
- [x] **Feedback link:** "Feedback? Email Eric" placed so it's findable but never projected large
- [x] **Self-review:** each direction passes the self-review checklist below, with screenshots at every size saved next to the mockup and short notes on what passed, what failed and what was fixed
- [x] **Index page:** a one-paragraph pitch for each direction (what it optimises for, its trade-off), with the screenshots

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

**2026-10-28: done.** The three directions are in `.scratch/school-clock/mockups/`. Start at `index.html` for each direction's pitch, live scaled frames at the checklist sizes, and links to every state.

- **A · Monument:** a giant thin centred number, a hairline progress bar and quiet controls.
- **B · Timeline:** a condensed departure-board number, an Up next card and a strip of today's Segments (an agenda list on a phone).
- **C · Dial:** a progress ring around a whole-minute countdown, with rounded tiles and a round-button dock.

Each direction is one page. Every state is addressable by hash, e.g. `b/index.html#passing&theme=light`. The fake data, the hash routing and the overlay markup (drawer, timer picker, first visit, sound prompt, ringing card) are shared in `shared/`; each direction has its own main-screen layout and styling.

**Change from the ticket: screenshot PNGs are not committed**, to keep the repo small. `node .scratch/school-clock/mockups/shoot.mjs` regenerates them into the gitignored `mockups/shots/`, along with contact sheets and a `report.json` of the axe and layout checks. The index page shows the real pages live instead of PNGs.

**Added mid-ticket (from the coordinator):** a "24-hour time" switch in the settings drawer, saved per device and off by default. `&clock=24` renders any state that way, e.g. `#readouts&clock=24`. Only clock times change; countdowns don't.

Self-review notes are in `mockups/REVIEW.md`. Final run: 0 axe violations and 0 layout issues in all three directions. One shortfall is still open: in C's Summer state, the plain four-digit clock is 22% of the viewport height (target ~25%). It's noted there for ticket 03 if C is picked.
