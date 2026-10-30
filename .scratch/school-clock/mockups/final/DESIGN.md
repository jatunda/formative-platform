# School Clock design reference: design notes

The design reference for tickets 15 and 17–23. It builds Eric's mix from ticket 02 (A's layout, B's Day Strip, C's ring around a running timer only, a seconds setting, a set of themes) and Eric's review of the first version (revision 1, in ticket 03's Comments): controls along the top, one bar along the bottom, extra Readouts beside the big one, a separate Look sheet, themes that own their light or dark mode, and clock seconds at full size. The default theme is a dark muted blue.

- **Look at it:** open `final/index.html`. A switcher in the bottom-left corner lists every state and theme. Each state also has its own URL: `index.html#<state>&theme=<id>&font=<id>&palette=<id>&flip=1&seconds=off&bar=segment&clock=24` (every part after the state is optional). `flip=1` shows the theme's other version. `mode=dark|light` forces a version; only the checks use it.
- **Contract vs suggestion:** the tokens (`tokens.css`, `themes.css`), the theme catalog (`themes.js`) and the rules in this file are the contract. The markup and class names in `app.js` and `style.css` are a working suggestion. The real page can restructure them as long as it follows the rules.
- **Files:**
  - `tokens.css`: the default palette and font, the derived colours, and the type, spacing and motion scales. The real page copies this file.
  - `themes.css`: the other 14 palettes (each in both versions) and 12 fonts, plus the flower decoration.
  - `themes.js`: the theme catalog: which palette, font and decoration each theme uses, each palette's native mode, the swap lists, and the look descriptions used as accessible names.
  - `style.css`, `app.js`, `data.js`: the mockup itself.
  - `contrast.mjs`: checks every colour pair, no browser needed.
  - `shoot.mjs`: screenshots and the automated checks. Its output goes to the gitignored `shots/` folder.
  - `REVIEW.md`: the self-review.

## States

There are 32 states, each with its own URL. Every main-screen state works in both versions of every theme, with seconds on or off, with the bar on whole day or just this Segment, and in 12- or 24-hour time.

| Group | States |
|---|---|
| School Day | `period`, `readouts` (big plus two small), `edit` (editing Readouts), `passing`, `break` (Nutrition), `assembly` (Chapel) |
| Off-Hours | `before`, `after`, `dayoff` (Thanksgiving Break), `experience` (HS Experience Week), `summer`, `unknown` (a date outside every known School Year) |
| Page | `simulated` (the "Simulated time" banner) |
| Ringing and sound | `ringing`, `timer-ringing`, `sound` (the "turn sound on" prompt) |
| Timer | `timer`, `timer-paused`, `timer-readouts` (timer plus two other Readouts), `picker` |
| Look and Settings | `look` (the Look sheet), `settings` (the drawer), `alarm` (new Period Alarm), `alarm-clock` (editing a Clock Alarm) |
| First visit | `first` (the Division prompt), `hint` (the "Pick a theme" hint) |
| Toasts | `toast` (Alarm deleted, with Undo), `toast-error` (couldn't save) |
| Mini player | `mini`, `mini-passing`, `mini-ringing`, `mini-timer` |

## Eric's feedback, point by point

**From 02:**

| Point | Done | Notes |
|---|---|---|
| A's layout as the base | Yes | A centred big Readout with the Segment name above it. Revision 1 moved the controls to the top and merged the hairline into the bar. |
| B's Day Strip, as a toggle (default on) | Yes, reworked | It's now the bar's "whole day" setting. See [The bar](#the-bar-whole-day-or-just-this-segment). |
| C's ring, for the timer only | Yes | While a timer runs or is paused, it is the big Readout inside a ring. The Period countdown moves to a small Readout beside the ring (below it on a phone). |
| Seconds toggle (default on) | Yes | "Show seconds" in Settings → Time. See [Seconds and time text](#seconds-and-time-text). |
| A set of themes, one per subject plus personality themes, never labelled by audience | Yes | 15 themes, named only by their look. |
| Swap a theme's font or palette, only among pre-checked options | Yes | 13 fonts and 15 palettes, every combination checked. |
| Light / dark / auto stays a separate setting | Replaced | Revision 1: themes own their mode, one flip switch, no auto (below). |
| Default theme: A's look, dark muted blue, light blue-grey text | Yes | "Slate": background `#1e2836`, text `#e2e8f0`, accent `#57b3ff`. Digits weight 300. |
| "Pick a theme" hint on first visit | Yes | Now points at the Look button. |

**From the review of the first design reference (revision 1):**

| Point | Done | Where |
|---|---|---|
| At most three Readouts; edit mode for removing them | Kept as built | [Readouts](#readouts-how-they-arrange) |
| Extra Readouts go to the right of the big one when the display is wide enough | Yes | Wide displays (4:3 or wider, over 760×520) stack them to the right; narrower ones keep them below. |
| Settings and other buttons along the top | Yes | Timer, Bells, Readouts, Look, Settings and the Division chip, top right. |
| Fullscreen and mini player as icon-only buttons, bottom right | Yes | Named by `aria-label` and a tooltip. |
| Never "Nut": "Nutrition" where it fits, "Nutr." where tight | Yes | The bar's blocks pick the full name, then the short one, by the block's width. The checks fail on any "Nut". |
| The hairline and the Day Strip merge into one bar with two settings | Yes | [The bar](#the-bar-whole-day-or-just-this-segment) |
| Look is its own menu: a compact sheet that keeps the clock visible and previews live | Yes | [Look sheet](#look-sheet). The drawer keeps what the clock does. |
| Themes own their mode: about half light, half dark; picking one switches to its native mode; one flip switch; no auto | Yes | 8 dark, 7 light. [Theme set](#theme-set) |
| Clock seconds at the same size and weight as hours and minutes | Yes | "10:12:43 AM", with only AM/PM small. |
| Accepted as is: the bar hides while a timer runs and at 480×320; system-font calligraphy; the theme set | Kept | |

## Colour tokens

Every colour the clock uses is one of these custom properties. A palette sets the first 17, in both its versions. The derived ones come from `tokens.css` and are never set by a palette.

| Token | Role | Slate dark | Slate light |
|---|---|---|---|
| `--bg` | Page background | `#1e2836` | `#eef2f7` |
| `--surface` | Look sheet, drawer, dialogs, cards, the bar's blocks | `#273343` | `#ffffff` |
| `--surface-2` | Tiles inside a surface, hover | `#303d50` | `#e3e9f1` |
| `--fg` | Main text, the Now marker | `#e2e8f0` | `#1a202c` |
| `--muted` | Labels, captions, times, the Period Label | `#a3b1c4` | `#4a5568` |
| `--line` | Control borders (3:1 on every background) | `#7d8da4` | `#718096` |
| `--line-soft` | Hairline dividers (decorative) | `#3a4759` | `#cfd8e3` |
| `--accent` | The bar's fill, checked controls, the timer ring, the current and next blocks' borders | `#57b3ff` | `#1f6fd1` |
| `--accent-text` | Accent used as text ("Up next", "Timer") | `#7cc4ff` | `#1a5fb4` |
| `--on-accent` | Text and ticks on an accent fill | `#0a1b2e` | `#ffffff` |
| `--focus` | Focus ring (never the accent) | `#ffd166` | `#b45309` |
| `--ring` | Ringing frame, ring card | `#57b3ff` | `#1f6fd1` |
| `--on-ring` | Text on the ring card | `#0a1b2e` | `#ffffff` |
| `--track` | Empty part of the bar's fill rule and the ring | `#3a4759` | `#cfd8e3` |
| `--digits` | Readout digits | `#e2e8f0` | `#1a202c` |
| `--deco`, `--deco-2` | Decoration fills (only with `data-deco`) | `#57b3ff`, `#a3b1c4` | `#1f6fd1`, `#4a5568` |
| `--input-bg` (derived) | Text fields, unchecked boxes | `--bg` | `--surface` |
| `--accent-soft` (derived) | Elapsed part of the current block, pressed buttons | accent at 16% | accent at 12% |
| `--ring-wash` (derived) | The ringing flash's fill | ring at 14% | ring at 10% |
| `--hatch` (derived) | Break hatching in the bar | fg at 9% | fg at 8% |
| `--scrim`, `--shadow` (derived) | Behind dialogs and the drawer (the Look sheet has no scrim) | dark scrim | light scrim |

## Type

**Faces.** A theme's font sets three faces, and they never add up to more than two typefaces:

- `--font-digits`: every Readout and the timer. It is always a plain face with lining, tabular figures.
- `--font-display`: the Segment name, the Day Label, the ring card title and the timer title. A decorative face (calligraphy or handwriting) is allowed here and nowhere else.
- `--font-ui`: everything else (captions, controls, the sheet, the drawer, the bar). It matches either the digits face or the display face.

Digits always use `font-variant-numeric: tabular-nums lining-nums`. The font tokens also set `--digits-weight`, `--digits-tracking`, `--display-weight`, `--display-tracking`, `--display-scale`, `--digits-fit` and `--colon-units`. Script and handwriting faces run small, so they scale display text up by 1.12–1.15. `--digits-fit` drops below 1 for wide faces like monospace.

**Main-screen scale.** These sizes follow the viewport, so the projected view and a laptop corner are one design.

| Token | Value | Used for |
|---|---|---|
| `--type-digits` | `36vh` (`40vh` short, `24vh` while editing) | Big Readout, capped to the width (below) |
| `--type-small` | `clamp(26px, 8.5vh, 100px)` (`clamp(26px, 9.5vh, 112px)` beside the big one) | Small Readouts |
| `--type-segment` | `clamp(20px, 5.4vh, 64px)` | Segment name · Period Label |
| `--type-line` | `clamp(16px, 3.8vh, 46px)` | Up next, Off-Hours lines |
| `--type-meta` | `clamp(14px, 2.3vh, 28px)` | Day Label · date (uppercase, tracking 0.08em) |
| `--type-caption` | `clamp(12px, 2.3vh, 28px)` | Readout captions (uppercase, tracking 0.12em) |
| `--type-strip` / `--type-strip-small` | `clamp(12px, 2vh, 24px)` / `clamp(11px, 1.7vh, 20px)` | The bar's block names / times and heading |

**Big Readout sizing rule.** `font-size = min(--type-digits, fit width × 0.94 × --digits-fit ÷ (units × --glyph-em))`, where `--glyph-em` is 0.56.

- **Fit width:** the usable width (`100vw − 2 × --edge-x`, less the Look sheet while it's open beside the clock). With small Readouts beside the big one, the big one gets 60% of it.
- **Units:** each digit is 1, each colon is `--colon-units` (0.55; 0.7 for the humanist face, 1 for monospace, measured from each face's colon), and each small letter ("min", "h", "AM") is 0.42. Spaces count 0. The page passes the counts as `--d`, `--c` and `--u`.
- On screens 16:10 and wider, every countdown gets the full 36vh, which is about 26% digit height. "10:12:43 AM" (seconds on, Summer or an unknown date) is width-capped to about 26% at 1920×1080.
- On a phone, the width sets the size. There is no "long value" step.

**UI scale (fixed px).** 13 (drawer section headings, uppercase), 14 (hints, notes, field labels), 15 (top-bar controls), 16 (body), 18 (form and sheet titles), 22 (dialog and drawer titles), 28 (the first-visit question).

## Spacing, radii, targets, motion

- **UI spacing:** `--s1`…`--s7` = 4, 8, 12, 16, 24, 32, 48 px.
- **Main-screen gaps:** `--gap-xs`, `--gap-sm` and `--gap-md` are `clamp(4px, 1vh, 12px)`, `clamp(6px, 2vh, 24px)` and `clamp(8px, 3vh, 36px)`. The screen padding is `--edge-y: clamp(8px, 3vh, 36px)` and `--edge-x: clamp(12px, 3vw, 64px)`. It's 6/12 px on short screens and 16 px on a phone.
- **Radii:** `--radius` 12px (dialogs, cards, the sheet), `--radius-sm` 6px (buttons, fields, the bar's blocks). Pills are 999px.
- **Targets and focus:** `--tap` is 44px, the minimum for every control (36px on short screens, which are mouse windows, never phones). `--focus-width` is 3px, drawn in `--focus` with a 3px offset.
- **Motion:** `--flash-period` 1s (the ringing flash) and `--ring-tick` 1s (the timer ring's transition).

## Breakpoints

| Name | Query | What changes |
|---|---|---|
| wide (default) | none | The full layout. |
| beside | `(min-aspect-ratio: 4/3) and (min-width: 761px) and (min-height: 521px)` | Small Readouts stack to the right of the big one. |
| compact | `(max-width: 760px), (max-height: 520px)` | Control labels collapse to icons (the names stay as accessible names). The ring card drops its detail line. The flash frame is 6px. The Look sheet becomes a bottom sheet. |
| short | `(max-height: 520px)` | The laptop corner (480×320). `--type-digits: 40vh`, 36px controls. **The bar is hidden.** The window buttons float in the bottom-right corner. The timer ring stays below the top bar. The hint sits bottom left. In edit mode the Readouts sit in one row. |
| narrow | `(max-width: 520px) and (min-height: 521px)` | Phone, portrait. The controls fill the first row and the Day Label the second. "Whole day" becomes a scrolling agenda list. No Mini player button. Overlays and the hint sit at the bottom. The timer ring sits on top with the other Readouts under it. With the Look sheet up, the clock keeps the top 44%. |
| mini | `<main class="mini">` in the Picture-in-Picture window | See [Mini player](#mini-player). |

## Main screen

A grid of three rows (four with the banner), top to bottom:

1. **Simulated time banner** (only with `?at=`): full width, `--surface`, dashed bottom border, a clock icon and "Simulated time · Tue, Oct 27, 10:12:43 AM · this tab only".
2. **Top bar:**
   - left: the Day Label · date (uppercase, muted, display face). On days off, Experience Week and Summer the headline already names the day, so it shows only the date;
   - right: the controls **Timer, Bells** (pressed, filled bell), **Readouts, Look, Settings**, then the Division chip (`HS`; its accessible name is "Division: HS, switch Division"). They are quiet muted text buttons with icons, full colour on hover. Readouts (in edit mode) and Look (while open) fill with the accent.
3. **Stage**, centred:
   - the Segment name · Period Label (`h1`, display face; the label is muted);
   - the Readouts (big, plus small ones beside or below);
   - one of these lines:
     - "UP NEXT Period 4 · Prep 11:00" during a Passing Period;
     - an Off-Hours line ("Next: Wed, Oct 28 · Even Day · starts in 15h 35m", "Back Mon, Nov 30 · All Day", "Enjoy the trips · back Mon, Jan 25", "Have a great summer", "No school calendar for this date yet").
4. **Bottom row:** [the bar](#the-bar-whole-day-or-just-this-segment), then two **icon-only** buttons in the bottom-right corner: **Mini player** and **Fullscreen** (each named by `aria-label` and a `title` tooltip). The Mini player button is hidden where Document PiP doesn't exist (every phone).

There's no separate progress bar in the stage: the bar is the progress. The projected view shows nothing a class doesn't need. Settings, the feedback link and the note about sound limits stay in the drawer.

## Readouts: how they arrange

- **One big, up to two small (three Readouts in all).** There are three modes, so a fourth could only repeat one. "Add Readout" goes away at three. Ticket 17 adds this cap to `readout-layout.js`.
- **Beside (wide displays):** on screens 4:3 or wider and larger than 760×520, the small Readouts stack in a column to the **right** of the big one, separated by a vertical hairline (`--line-soft`), centred together as one group. The big one's size cap uses 60% of the usable width, so "42:17" keeps the full 36vh at 16:9 and 16:10. Small Readouts there are `clamp(26px, 9.5vh, 112px)`.
- **Below (everything else):** a centred row under the big one with hairline dividers, at `--type-small`. On a phone the row stays a row (two fit at 34px). While the Look sheet is open beside the clock, they go below too.
- **Order:** layout order. The second Readout in the layout is the first small one (top of the column, left of the row).
- **Captions** name the mode under every Readout: "left", "since start", "now", "until Period 4", "until school starts", "since school ended", "until Mon, Nov 30". They're uppercase and muted.
- **Tap a Readout to cycle its mode.** Each Readout is a button, with a focus ring around the value and caption.
- **Adding and removing (all input types alike).** The "Readouts" control toggles edit mode. It is `aria-pressed`, filled with the accent, and its label becomes "Done".
  - Every Readout shows a dashed outline, with a labelled **Remove** pill under it (44px tall). Its accessible name is "Remove Readout: since start". It shows only when there is more than one Readout. Removing the big one promotes the first small one.
  - While there are fewer than three Readouts, a dashed **Add Readout** slot follows the last small one (under it in the column, after it in the row).
  - A note reads "Tap a Readout to change what it shows". Tapping still cycles.
  - The big Readout drops to `24vh` to make room. Editing is a teacher moment, not a projected one. On short screens all the Readouts sit in one row.
  - Done or Escape leaves edit mode. After a Remove, focus moves to the next Remove button, or to Done if none is left. Edit mode isn't saved.
- **Timer running or paused:** the timer takes the big spot inside the ring (see [Timer](#timer-ring-and-picker)). The previous big Readout and the small ones stack in a column to the right of the ring, at `clamp(24px, 7vh, 84px)`. On a phone they sit under the ring. The first one's caption names the Segment: "left in Period 3 · AP CSA".

## Seconds and time text

What the shared formatter shows (ticket 16). Only the look is set here.

| Value | Seconds on (default) | Seconds off |
|---|---|---|
| Countdown or count-up under 1 hour | `42:17` | `42 min` (whole minutes, rounded down) |
| Countdown or count-up of 1 hour or more | `1:15:00` | `1h 15m` (`1h 05m` padded) |
| Under one minute | `0:42` | `0:42` (always) |
| Timer | `4:12` | `4:12` (always) |
| A day or more | `4d 17h` | `4d 17h` |
| Clock time, 12-hour | `10:12:43` then a small `AM` | `10:12` then a small `AM` |
| Clock time, 24-hour | `10:12:43` | `10:12` |

- **Clock seconds are digits like the rest:** the same size, weight and colour as the hours and minutes. No small or raised seconds.
- Letters ("min", "m", "h", "d") and AM/PM are set at 0.42em in `--muted`.
- The bar, Up next and the Off-Hours lines always show clock times without seconds.

## The bar: whole day or just this Segment

One element along the bottom, left of the window buttons. It replaces both the old hairline progress bar and the Day Strip. Its setting is in the Look sheet ("Bottom bar": **Whole day**, the default / **Just this Segment**). 16's saved `dayStrip` maps over: `true` → whole day, `false` → just this Segment.

**Whole day:**

- Today's Segments as blocks in proportion to their length. A Passing Period is a gap.
- Each block shows its name in bold, then its Period Label in muted text; its start time sits under it; the day's end time sits at the far right.
- **Names by width** (CSS container queries on each block, in `em` of the block's font):
  - wider than 6.5em: the full name ("Period 3", "Nutrition", "Lunch", "Chapel", "Seminar");
  - narrower: the short name ("P3", **"Nutr."**). The short name is never cut further: "Nutrition" never reads "Nut";
  - narrower than 3.6em: the short name at 0.8em with tight padding, no Period Label;
  - narrower than 2em (a sliver, like a Passing Period gap): no visible name. The hidden text still names it, and the agenda list on a phone names it in full.
  - At 1920×1080 Nutrition reads "Nutr."; with the Look sheet open beside the clock its block drops under 2em and shows only its hatching.
- **Kinds by pattern, not colour:** a Period has a solid 1.5px border on `--surface`; a Break is hatched (45° stripes of `--hatch`) with a dashed border; an Assembly has a dotted 2.5px border on `--bg`.
- **Now:**
  - The current block has a 3px `--accent` border and **fills left to right**: its elapsed part is washed `--accent-soft`, and a 5px rule along its bottom edge fills `--accent` on `--track`.
  - A thin **Now marker** (a 10px `--fg` notch pointing down) sits above the track at the current moment, so it never crosses text.
  - Past blocks fade to a `--line-soft` border with muted text.
- **Passing Period:** the gap between the two blocks fills the same way (wash plus rule, no border), the Now marker sits over it, and the **next block is highlighted** with a 3px accent border. The gap's own time is hidden (the blocks either side show it).
- **Off-Hours:** the Next School Day's Segments, with no Now marker, under a heading "→ Next School Day · Wed, Oct 28 · Even Day". Before school it reads "Today · All Day".

**Just this Segment:**

- The same bar collapses to the current Segment (or Passing Period) alone, stretched full width: one block, its name and Period Label on one line ("Period 3 · AP CSA"), filling left to right the same way, the Now marker above, the start time under its left end and the end time under its right. This is what the old hairline was.
- A Passing Period here is a bordered block named "Passing Period", from the end of one Segment to the start of the next.
- **Off-Hours has no current Segment, so both settings show the Next School Day** (whole day). Ticket 20 asks for that in both settings.

**Both settings:**

- **Hidden:** in Summer, in Experience Week, on an unknown date, while a timer runs (the ring takes the height), and on short screens (480×320). The stage takes the space.
- **Phone:** whole day becomes a scrolling agenda list (`tabindex=0`): each row shows the start time and "Period 3 · AP CSA". Breaks and Assemblies are italic with a muted "· Break" or "· Assembly". The current row has a 3px accent border, a soft fill and a "NOW" pill; during a Passing Period the next row has the accent border and an "UP NEXT" pill. Just this Segment stays the single block on a phone (it fits). The page should scroll the current row into view.
- **Accessibility:** a `section` labelled "Today's Segments", "Segments on Mon, Nov 30", or (just this Segment) the Segment's name. Each block has hidden text: "Period 3 · AP CSA, 10:05 to 10:55, now" (or ", up next"). The current block's fill is a `role=progressbar` named "Period 3 progress". Nothing is a live region, so nothing is re-announced each tick.

## Timer: ring and picker

- **Ring:** an SVG circle with `pathLength=100` and a 2.4-unit stroke. The track is `--track`. The arc is `--accent` with round caps and starts at 12 o'clock. Its length is the share of time *left*, so it drains back toward 12.
  - Diameter: `min(100vh − 2 × edge-y − tap − gap, 56vw)`. On wide screens the ring may rise into the top bar's row: at the top, a circle is narrow, and the Day Label and controls sit in the corners. On short screens and phones it stays in the stage.
  - The arc's length changes with a `--ring-tick` (1s) linear transition. Under `prefers-reduced-motion` there's no transition: the ring steps once a second and never animates.
- **Inside the ring:**
  - the title "Timer of 5:00" (display face, accent, at 5cqh);
  - the digits, sized `min(90cqw × --digits-fit ÷ (units × --glyph-em), 40cqh)`, about 26% of the viewport height for "4:12" at 1920×1080. The `40cqh` cap keeps narrow faces (bold condensed) inside the circle;
  - Pause and Cancel (or Resume and Cancel) as 44px buttons.
  - The digits have `role="timer"` and an accessible name ("Timer, 4:12 left of 5:00"), which is never live.
- **Paused:** the title becomes a pause icon plus "Paused". The arc turns `--line` and the track goes dashed. Resume is the accent button. So paused isn't shown by colour alone.
- **Done:** the ring empties at 0:00 and the ring card says "Ringing · Timer / Time is up / 5:00 timer".
- **Picker** (a dialog, 520px):
  - "Start a timer" with a Close button;
  - four square presets (1, 2, 5, 10 min) that start at once;
  - "Recent" quick picks as pills, most recent first, at most three;
  - a custom row (Minutes : Seconds and a Start accent button), separated by a hairline.

## Overlays

Everything transient (ring card, sound prompt, toasts) sits **bottom centre, over the bar**, never over the digits, because the top belongs to the controls.

- **Ringing flash:**
  - **Normal:** an inset frame of `--ring` (14px, or 6px on compact screens) plus a `--ring-wash` fill over the whole screen. It switches on for 0.5s and off for 0.5s with `steps(1)`: **1 flash per second** (the limit is 3).
  - **Reduced motion:** the same frame and wash, held steady with no animation.
  - **Not just colour:** the ring card names it in text ("RINGING · PERIOD ALARM") with a bell icon. The digits stay `--digits` on the wash, which passes 4.5:1 in every palette.
- **Ring card:**
  - **Wide screens:** bottom centre, filled with `--ring` and text in `--on-ring`. It shows the kind line, the title (display face, 30px), the detail ("5 min before the end of Period 3") and a large Dismiss button (`--on-ring` fill).
  - **Compact screens:** the detail line goes. **Short screens:** one line: "Ringing · Wrap-up time [Dismiss]".
  - It is an `alertdialog` that takes focus. Escape dismisses it. The page announces the ring once through a live region.
- **Sound prompt:** a pill, bottom centre, with a muted-speaker icon, "Sound is off", the note "Keep this tab open for Bells and Alarms" in small muted text, and a "Turn sound on" accent button. On short screens the note goes.
- **First visit:** a near-solid scrim (`--bg` at 94%) behind a dialog that asks "Which Division are you with?". It offers two large choices (MS / HS) and shows the feedback link.
- **"Pick a theme" hint:**
  - a pill with an accent border, "Pick a theme" and a 44px dismiss button;
  - the Look button wears the same accent outline while the hint shows;
  - wide screens: under the Look button, right-aligned, with an arrow pointing up at it. Short screens and phones: in the free bottom-left corner;
  - it shows on the first visit after the Division prompt, and stops after a theme is picked or the hint is dismissed.
- **Toasts:**
  - bottom centre, about 6 seconds;
  - **Confirmation:** `role=status`, a check icon, short text and an optional Undo ("Alarm deleted · Undo"). Destructive actions use Undo instead of a confirm dialog.
  - **Error:** `role=alert`, a warning icon, a 6px `--fg` left border and a Dismiss button ("Couldn't save on this device. Changes last until this tab closes.").

## Look sheet

What the clock **looks like** (ticket 21). It opens from **Look** in the top bar (`aria-haspopup="dialog"`, `aria-expanded`).

- **Wide screens:** a panel `min(400px, 40vw)` wide, under the top bar on the right, on `--surface` with `--radius` and a shadow, **no scrim**. The stage and the bar move left by the sheet's width, so the whole clock stays visible and re-fits beside it; every change previews live on the real clock.
- **Compact screens:** a bottom sheet, up to 56vh. On a phone the clock keeps the top of the screen above it.
- It's a `dialog` (`aria-modal`): focus moves in and stays in, Escape closes it, and focus returns to the Look button. Clicking the clock also closes it.
- **Head:** "Look" and a Close button. **Body**, scrolling, in this order:
  1. **Theme:** 15 previews, 3 per row (5 on compact screens), each drawn in its **own** version. A check mark and an outline mark the chosen one.
  2. **Flip switch:** "Light version" for a dark theme ("Dark version" for a light one), with the hint "Flips this theme. Picking a theme shows its own version again."
  3. **Bottom bar:** Whole day / Just this Segment.
  4. **Font:** 13 "Aa 42" swatches.
  5. **Colours:** 15 palette dots, each drawn as picking it would show (its own version, or its other one while flipped).
  6. "Use the theme's own font and colours" (only after a swap).
- Swatches and previews are radio groups: arrow keys move within each.

## Settings drawer

What the clock **does** (ticket 19). The drawer slides in from the right as a `dialog` (`aria-modal`), `min(480px, 100vw)` wide on `--surface`, over a scrim.

- **Head:** "Settings" and a Close button.
- **Body:** one scrolling column of `<section class="drawer__section" id="…" aria-labelledby>`, each with an uppercase muted `h3` and a hairline between sections.
- **Adding to it:** a new feature adds a section. It never restructures the drawer.

| Order | `id` | Section | Contents |
|---|---|---|---|
| 1 | `division` | Division | Segmented control: Middle School / High School |
| 2 | `time` | Time | Show seconds · 24-hour time (switches with a one-line hint) |
| 3 | `sound` | Sound | Bells switch · Volume slider · Timer sound (select plus Preview) · the note about keeping the tab open |
| 4 | `labels` | Period Labels | Two-column grid of text fields, one per Period plus Seminar |
| 5 | `alarms` | Alarms (ticket 15) | List: name, a hint line ("5 min before the end · Periods 1–7 · Block Days · Chime"), Edit, an on/off switch · "+ Clock Alarm" and "+ Period Alarm" buttons · the editor form (below) |
| 6 | `about` | About | Mini player browser note · "Feedback? Email Eric" |

**Alarm editor (ticket 15).**

- **Form:** a card on `--surface-2` with an accent border. A new Alarm's form opens under the list. Edit opens it in place of that item.
- **Clock Alarm:**
  - Name;
  - Time (Hour : Minute, plus AM/PM unless 24-hour);
  - Repeats (Once / Every School Day);
  - Bell Schedules: a switch "Only on some Bell Schedules", then the Block Days / Every schedule shortcuts and the checklist;
  - Sound (select plus Preview);
  - Delete (left), then Cancel and Save Alarm (right).
- **Period Alarm:**
  - Name;
  - When it rings (From the start / Before the end / Halfway, plus a minutes field reading "10 minutes before the end");
  - Periods (a checklist using Period Labels: "Period 3 · AP CSA");
  - Bell Schedules (Block Days / Every schedule shortcuts plus a checklist);
  - Sound plus Preview;
  - Cancel and Save Alarm.
- **Delete** applies at once and shows the "Alarm deleted · Undo" toast.

**Keyboard:**

- Focus moves into the drawer when it opens and stays inside while it's open.
- Escape closes it, and focus returns to the Settings button.
- Radio groups move with the arrow keys.
- The focus ring is drawn around the visible control, not the hidden input.

## Mini player

The Document Picture-in-Picture window, about 320×180. It's one column of three rows, centred, with 8px/12px padding:

1. **Head:** "Period 3 · AP CSA" (display face, muted, 14–28px).
   - While ringing: a bell icon and "Ringing · Wrap-up time" in `--accent-text`, bold.
   - While a timer runs: "Timer of 5:00" in `--accent-text`.
2. **Big Readout:** `min(50vh, width-capped)` with the same unit rule, so "42:17" fills about half the height. Clock seconds are full size here too.
3. **Foot**, 44px minimum. One of these:
   - a just-this-Segment bar (4px) plus "ends 10:55" (in a Segment);
   - "UP NEXT Period 4 · Prep" (Passing Period);
   - the timer's own bar plus "42:17 left in Period 3" (timer running; there's no ring at this size);
   - a full-width **Dismiss** accent button (ringing). The flash frame is 6px.

It uses the page's tokens unchanged, so it follows the theme and its version, 24-hour time and seconds. Every size is in vh/vw, so a larger window just scales up (shots at 480×270).

## Theme set

**Rules:**

- A theme is a palette plus a font, and sometimes a decoration.
- **Themes own their mode.** Every palette has a native mode (`native` in `themes.js`): **8 are dark and 7 light**. A theme shows its palette's native version. Every palette also has its other version, fully token-checked, which the **flip** switch shows. There is no "auto".
  - Picking a theme switches to its native version (it clears the flip).
  - Swapping the palette shows the new palette's native version, or its other one if the theme is flipped (the flip stays).
  - **Saved setting (ticket 21):** 16's `colorScheme` (`'light' | 'dark' | 'auto'`) becomes a flip flag, "follow the theme" (default) or "flipped". Migration: `'auto'` → follow; `'light'` or `'dark'` → follow if it equals the saved theme's native mode, else flipped. Since only Slate (native dark) exists before 21, a saved `'light'` becomes Slate flipped, which looks exactly as before.
- The page applies a theme by setting attributes on `<html>`: `data-mode` (dark or light, already resolved), `data-palette`, `data-font` and `data-deco`. `themes.js`'s `themeAttributes({ theme, font, palette, flip })` returns exactly those attributes, and `nativeMode(palette)` gives a palette's own mode.
- The same attributes on any element re-theme that element and its children. That is how each picker preview draws itself.
- **No audience labels, anywhere.**
  - The picker shows previews only: the theme's colours (in its own version), "Period 3" in its display face, "42:17" in its digits face, a bar, and the decoration if it has one.
  - Each preview's accessible name is the look from `themeLook()`, for example "Navy and orange, bold condensed". A palette's look describes its native version.
  - Theme ids and look names describe colours and type, never a subject or a person.
- **Swaps:** the Font list is every entry in `FONTS` and the Colours list every entry in `PALETTES`, so any theme can take any of them. Each swatch's accessible name is its look, plus "(the theme's own)" on the theme's default. The choice is saved per device (ticket 16's storage).
- **Fonts are system stacks only.**
  - No font file is downloaded, and nothing loads from a third-party server.
  - Each stack lists the Windows face first, then macOS/iOS, then ChromeOS/Android, then a generic.
  - The calligraphy face (Segoe Script / Snell Roundhand / Apple Chancery) and the handwriting face (Ink Free / Chalkboard SE / Bradley Hand) are installed on Windows and Mac. Other systems fall back to `cursive`, which Eric accepted.
- **Big digits always use a readable face.** Script and hand set only `--font-display`. Their digits use a serif or rounded face.
- **Decorations** are inline SVG in the two upper corners, just under the top bar (`top: 9vh`, mirrored), `min(18vh, 13vw)` wide, at 55% opacity, coloured with `--deco` and `--deco-2`.
  - They sit behind the content (`z-index: 0`, no pointer events), and the check confirms they never overlap text or controls (including small Readouts beside the big one).
  - They're hidden under 521px in either direction and in the mini player.
  - Swapping the palette recolours them, and swapping the font keeps them.

| Theme id | Palette | Native | Font | Decoration | Accessible name (`themeLook`) |
|---|---|---|---|---|---|
| `slate` (default) | slate | dark | system | none | Slate blue and sky blue, clean sans |
| `ink` | ink | dark | din | none | Deep ink and teal, engineered sans |
| `lab` | lab | light | rounded | none | Pale sage and leaf green, rounded sans |
| `paper` | paper | light | serif | none | Cream paper and ink blue, book serif |
| `parchment` | parchment | light | slab | none | Parchment and oxblood, slab serif |
| `coast` | coast | dark | humanist | none | Ocean blue and coral, humanist sans |
| `vesper` | vesper | dark | classic | none | Deep plum and gold, old-style serif |
| `terminal` | terminal | dark | mono | none | Black and green, monospace |
| `gallery` | gallery | light | geometric | none | Gallery white and vermilion, geometric sans |
| `stage` | stage | dark | serif | none | Midnight and brass, book serif |
| `court` | court | light | heavy | none | Pale mint and forest green, heavy sans |
| `team` | team | dark | condensed | none | Navy and orange, bold condensed |
| `bloom` | blush | light | script | flowers | Blush pink and rose with flowers, calligraphy labels |
| `chalk` | chalk | dark | hand | none | Chalkboard green, handwritten labels |
| `contrast` | contrast | light | heavy | none | High contrast, black on white, heavy sans |

**Fonts (the swap list).** Digits are weight 400 unless noted.

| Font id | Look | Digits face (first choices) | Display face | Notes |
|---|---|---|---|---|
| `system` | clean sans | Segoe UI, system-ui, Helvetica Neue | same | Digits weight 300 |
| `condensed` | bold condensed | Bahnschrift Condensed, DIN Condensed, Roboto Condensed, Arial Narrow | same | Digits weight 700. `--digits-fit` 1.25 (narrow glyphs) |
| `din` | engineered sans | Bahnschrift, DIN Alternate, Roboto | same | |
| `serif` | book serif | Cambria, Charter, Noto Serif | same | Lining figures (Georgia is avoided: its figures are old-style) |
| `classic` | old-style serif | Palatino Linotype, Palatino, Book Antiqua | same | |
| `slab` | slab serif | Rockwell, Roboto Slab, American Typewriter | same, weight 700 | |
| `mono` | monospace | Cascadia Mono, SF Mono, Menlo, Consolas | same | `--digits-fit` 0.88 |
| `rounded` | rounded sans | Arial Rounded MT Bold, ui-rounded, SF Pro Rounded | same | UI in Segoe UI |
| `humanist` | humanist sans | Trebuchet MS, Seravek, Gill Sans | same | |
| `geometric` | geometric sans | Century Gothic, Futura, Avenir Next | same | |
| `heavy` | heavy sans | Segoe UI (800), system-ui | Segoe UI Black, Arial Black | |
| `script` | calligraphy labels | Cambria, Charter (serif digits) | Segoe Script, Snell Roundhand, Apple Chancery | Display only, scaled 1.15 |
| `hand` | handwritten labels | Arial Rounded MT Bold, ui-rounded | Ink Free, Chalkboard SE, Bradley Hand, Comic Sans MS | Display only, scaled 1.12 |

`--colon-units` is 0.55 for every font except `humanist` (0.7) and `mono` (1), from each face's measured colon width.

**Palettes (the swap list).** The native version is in **bold**; the other is what the flip switch shows.

| Palette id | Look (native version) | Dark bg / fg / accent | Light bg / fg / accent |
|---|---|---|---|
| `slate` | Slate blue and sky blue | **`#1e2836` / `#e2e8f0` / `#57b3ff`** | `#eef2f7` / `#1a202c` / `#1f6fd1` |
| `ink` | Deep ink and teal | **`#10202a` / `#e6f1f3` / `#3cc9c0`** | `#f2f7f7` / `#0f2027` / `#0b7a74` |
| `lab` | Pale sage and leaf green | `#161a16` / `#eef3e8` / `#a3e04a` | **`#f5f7f0` / `#171c12` / `#3f7a10`** |
| `paper` | Cream paper and ink blue | `#1b1a22` / `#f1ece0` / `#8fb1ff` | **`#f7f1e3` / `#1d1b2e` / `#2a4aa8`** |
| `parchment` | Parchment and oxblood | `#1f1914` / `#f2e8d8` / `#e0866e` | **`#f4ead6` / `#2a1c12` / `#8c2a1c`** |
| `coast` | Ocean blue and coral | **`#0f1d33` / `#eaf1fb` / `#ff8a73`** | `#f0f5fb` / `#0f1d33` / `#c2412d` |
| `vesper` | Deep plum and gold | **`#1f1527` / `#f3ecf6` / `#e8c062`** | `#f7f2f8` / `#24162e` / `#6b2f8f` |
| `terminal` | Black and green | **`#0b0f0c` / `#d8f5dc` / `#4ee07a`** | `#f2f6f2` / `#0d1a10` / `#11743a` |
| `gallery` | Gallery white and vermilion | `#1a1a1c` / `#f4f1ec` / `#ff6b4a` | **`#f7f5f1` / `#1a1a1c` / `#c2361a`** |
| `stage` | Midnight and brass | **`#121428` / `#eeeaf7` / `#d9a441`** | `#f4f3f8` / `#141629` / `#8a5a00` |
| `court` | Pale mint and forest green | `#0f2318` / `#edf7f0` / `#f5c542` | **`#f1f7f3` / `#0f2318` / `#17703f`** |
| `team` | Navy and orange | **`#0d1b3d` / `#f2f5fb` / `#ff7a1a`** | `#f2f5fb` / `#0d1b3d` / `#c24e00` |
| `blush` | Blush pink and rose | `#2a1820` / `#fbe9ef` / `#f59ab5` | **`#fbeef1` / `#3a1a26` / `#b03a62`** |
| `chalk` | Chalkboard green | **`#1f3a32` / `#f1f4ee` / `#f2e27a`** | `#eef3ef` / `#183029` / `#2a6b56` |
| `contrast` | High contrast, black on white | `#000000` / `#ffffff` / `#ffd400` | **`#ffffff` / `#000000` / `#0033cc`** |

The full 17-token values are in `themes.css`.

## Contrast results

**Colour pairs** (`node contrast.mjs --table`): 15 palettes × 2 modes × 26 pairs, **0 failures**.

- **Text pairs (need 4.5:1):**
  - fg and muted on bg, surface and surface-2;
  - digits on bg, and on the ringing wash;
  - fg on the current Segment's soft fill;
  - accent-text on all three backgrounds;
  - on-accent on accent, and on-ring on ring;
  - the "Now" pill.
- **Non-text pairs (need 3:1):**
  - control borders and accent fills on all three backgrounds;
  - the progress fill on its track;
  - the focus ring on all three backgrounds;
  - the ringing frame on bg.

A font doesn't change a colour ratio, so these hold for every font. The rendered sweep below checks each font's actual size and weight.

| Palette | Mode | Text on page | Muted (lowest) | Digits | Accent text (lowest) | On accent | Ring card | Lowest text pair | Lowest non-text pair |
|---|---|---|---|---|---|---|---|---|---|
| slate | dark | 12.06 | 5.05 | 12.06 | 5.87 | 7.69 | 7.69 | 5.05 (muted on surface-2) | 3.26 (control border on surface-2) |
| slate | light | 14.52 | 6.16 | 14.52 | 5.15 | 4.94 | 4.94 | 4.94 (text on accent fill) | 3.29 (control border on surface-2) |
| ink | dark | 14.45 | 5.87 | 14.45 | 6.98 | 8.38 | 8.38 | 5.87 (muted on surface-2) | 3.3 (control border on surface-2) |
| ink | light | 15.46 | 5.66 | 15.46 | 5.43 | 5.18 | 5.18 | 5.18 (text on accent fill) | 3.22 (control border on surface-2) |
| lab | dark | 15.6 | 6.25 | 15.6 | 9.37 | 10.32 | 10.32 | 6.25 (muted on surface-2) | 3.33 (control border on surface-2) |
| lab | light | 16.05 | 6.16 | 16.05 | 5.09 | 5.25 | 5.25 | 5.09 (accent text on surface-2) | 3.5 (control border on surface-2) |
| paper | dark | 14.63 | 6.13 | 14.63 | 7.37 | 8.12 | 8.12 | 6.13 (muted on surface-2) | 3.38 (control border on surface-2) |
| paper | light | 14.94 | 6.21 | 14.94 | 6.4 | 7.94 | 7.94 | 6.21 (muted on surface-2) | 3.75 (control border on surface-2) |
| parchment | dark | 14.34 | 6.11 | 14.34 | 6.18 | 6.7 | 6.7 | 6.11 (muted on surface-2) | 3.29 (control border on surface-2) |
| parchment | light | 13.81 | 6.37 | 13.81 | 6.46 | 8.53 | 8.53 | 6.37 (muted on surface-2) | 3.56 (control border on surface-2) |
| coast | dark | 14.85 | 6.29 | 14.85 | 6.31 | 7.92 | 7.92 | 6.29 (muted on surface-2) | 3.42 (control border on surface-2) |
| coast | light | 15.4 | 5.85 | 15.4 | 4.9 | 5.14 | 5.14 | 4.9 (accent text on surface-2) | 3.35 (control border on surface-2) |
| vesper | dark | 15.18 | 6.66 | 15.18 | 8.95 | 9.53 | 9.53 | 6.66 (muted on surface-2) | 3.5 (control border on surface-2) |
| vesper | light | 15.47 | 6.6 | 15.47 | 6.94 | 8.65 | 8.65 | 6.6 (muted on surface-2) | 3.48 (control border on surface-2) |
| terminal | dark | 16.56 | 6.94 | 16.56 | 10.32 | 10.08 | 10.08 | 6.94 (muted on surface-2) | 3.5 (control border on surface-2) |
| terminal | light | 16.41 | 6.71 | 16.41 | 5.67 | 5.86 | 5.86 | 5.67 (accent text on surface-2) | 3.58 (control border on surface-2) |
| gallery | dark | 15.42 | 6.13 | 15.42 | 5.87 | 6.58 | 6.58 | 5.87 (accent text on surface-2) | 3.26 (control border on surface-2) |
| gallery | light | 15.96 | 6.25 | 15.96 | 5.24 | 5.47 | 5.47 | 5.24 (accent text on surface-2) | 3.55 (control border on surface-2) |
| stage | dark | 15.35 | 6.34 | 15.35 | 7.52 | 7.79 | 7.79 | 6.34 (muted on surface-2) | 3.37 (control border on surface-2) |
| stage | light | 16.17 | 6.58 | 16.17 | 5.72 | 5.93 | 5.93 | 5.72 (accent text on surface-2) | 3.6 (control border on surface-2) |
| court | dark | 15.04 | 6.41 | 15.04 | 8.09 | 9.92 | 9.92 | 6.41 (muted on surface-2) | 3.59 (control border on surface-2) |
| court | light | 15.18 | 6.17 | 15.18 | 6.02 | 6.13 | 6.13 | 6.02 (accent text on surface-2) | 3.36 (control border on surface-2) |
| team | dark | 15.49 | 6.31 | 15.49 | 5.71 | 6.87 | 6.87 | 5.71 (accent text on surface-2) | 3.45 (control border on surface-2) |
| team | light | 15.49 | 6.93 | 15.49 | 4.59 | 4.79 | 4.79 | 4.59 (accent text on surface-2) | 3.26 (progress fill on track) |
| blush | dark | 14.4 | 6.58 | 14.4 | 7.36 | 8.03 | 8.03 | 6.58 (muted on surface-2) | 3.61 (control border on surface-2) |
| blush | light | 13.72 | 6.25 | 13.72 | 5.25 | 5.79 | 5.79 | 5.25 (accent text on surface-2) | 3.4 (control border on surface-2) |
| chalk | dark | 11.06 | 5.49 | 11.06 | 6.89 | 11.69 | 11.69 | 5.49 (muted on surface-2) | 3.31 (control border on surface-2) |
| chalk | light | 12.52 | 6.07 | 12.52 | 6 | 6.3 | 6.3 | 6 (accent text on surface-2) | 3.06 (control border on surface-2) |
| contrast | dark | 21 | 9.96 | 21 | 11.65 | 14.67 | 14.67 | 9.96 (muted on surface-2) | 5.92 (control border on surface-2) |
| contrast | light | 21 | 9.89 | 21 | 7.79 | 8.95 | 8.95 | 7.79 (accent text on surface-2) | 4.5 (focus ring on surface-2) |

Every palette is checked in both versions, native and flipped (8 palettes are natively dark, 7 natively light).

**Rendered sweep** (`node shoot.mjs --sweep`): every font × palette × mode in five states (readouts, passing, timer, ringing, and a Break with the bar on just this Segment), plus the Look sheet in every palette × mode: **1980 renders, 0 axe violations, 0 overlaps or clipping, every big Readout fits** (inside the ring for the timer). The big-digit height at 1920×1080 is 24.2–28.1% across fonts in the single-Readout states and 20.9–27.5% for the timer. With small Readouts beside the big one it's 19.9–27.5%; the lowest is the monospace font, whose wide digits hit the 60% width cap.

**Fonts as rendered on Windows (Chromium):**

| Font | Digits face used here | Tabular | Lining |
|---|---|---|---|
| system | Segoe UI | yes | yes |
| condensed | Bahnschrift Condensed | yes | yes |
| din | Bahnschrift | yes | yes |
| serif | Cambria | yes | yes |
| classic | Palatino Linotype | yes | yes |
| slab | Rockwell | yes | yes |
| mono | Consolas (Cascadia Mono not installed here) | yes | yes |
| rounded | Segoe UI (Arial Rounded MT Bold not installed here) | yes | yes |
| humanist | Trebuchet MS | yes | yes |
| geometric | Century Gothic | yes | yes |
| heavy | Segoe UI | yes | yes |
| script | Cambria (digits; labels Segoe Script) | yes | yes |
| hand | Segoe UI (digits; labels Ink Free) | yes | yes |

Candara was the first humanist choice, but it renders old-style figures, so it was replaced with Trebuchet MS.

## Interaction details settled here

- **Removing a Readout on touch:** the Readouts control toggles an edit mode with labelled Remove pills. There's no long-press, swipe or hover-only ×. See [Readouts](#readouts-how-they-arrange).
- **At most three Readouts**, one per mode (Eric accepted).
- **Extra Readouts beside the big one** on displays 4:3 or wider and over 760×520, below it otherwise.
- **Controls along the top, window buttons bottom right.** The bottom belongs to the bar.
- **Division chip:** at the end of the top bar, a 44px button showing "HS"/"MS". It opens the drawer at the Division section.
- **Look vs Settings:** the Look sheet holds how it looks (theme, flip, bar, font, colours) and keeps the clock visible; the Settings drawer holds what it does.
- **Themes own their mode;** picking a theme resets the flip; no auto.
- **The bar hides while a timer runs and on short screens** (Eric accepted). The ring and the Segment name need the height.
- **"Nutrition" is never "Nut":** full name where it fits, "Nutr." where tight, nothing in a sliver.
- **Clock seconds are full size and weight**, like the hours and minutes.
- **Seconds-off countdowns round down** ("42 min" means 42 to 43 minutes left), then switch to `0:59` for the last minute.
- **Destructive actions apply at once with an Undo toast**, never a confirm dialog.
- **The focus ring is yellow or orange (`--focus`), never the accent**, so focus never looks like a selected state.
- **Transient overlays sit bottom centre over the bar**, never over the digits.

## Not settled / for Eric

- **Just this Segment on a phone:** ticket 20 lists "an agenda list on a phone" under both settings. Here only whole day becomes the agenda list; just this Segment stays the single bar (a one-row list would be the same thing, bigger). Easy to change in 20.
- **Just this Segment during Off-Hours** shows the Next School Day's whole day, as ticket 20 asks, since there is no current Segment. The other choice is hiding the bar until school starts.
- **The Nutrition block in a sliver:** at 1920×1080, 1440×900 and 1280×720 it reads "Nutr.", but with the Look sheet open beside the clock the 15-minute block is too thin for any name and shows only its hatching. Its hidden text and the phone's agenda list still name it.
- **Monospace with Readouts beside:** the big Readout's 60% width share takes the monospace font down to 19.9% digit height at 1920×1080 (with one Readout every font, monospace included, is at least 24.2%). Giving monospace a bigger share would squeeze its small Readouts. Fine for a swap nobody gets by default?
- Inside the ring the timer's digits are 25.8% in the default font, 20.9% with the monospace swap (as in the first version).
- Edit mode shrinks the big Readout to about 18%. That's fine while a teacher edits, but it shows on the projector if they edit while projecting.
- Only Chromium on Windows has rendered these faces. The Mac faces (Charter, Snell Roundhand, DIN Condensed, Seravek, Futura) haven't been seen. That's for ticket 05 on Eric's MacBook.
