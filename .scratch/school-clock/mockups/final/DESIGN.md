# School Clock design reference: design notes

The design reference for tickets 15 and 17–23. It builds Eric's mix from ticket 02: A's layout, B's Day Strip as a setting, C's ring around a running timer only, a seconds setting, and a set of themes. The default theme is a dark muted blue.

- **Look at it:** open `final/index.html`. A switcher in the bottom-left corner lists every state and theme. Each state also has its own URL: `index.html#<state>&mode=light&theme=<id>&font=<id>&palette=<id>&seconds=off&strip=off&clock=24` (every part after the state is optional).
- **Contract vs suggestion:** the tokens (`tokens.css`, `themes.css`), the theme catalog (`themes.js`) and the rules in this file are the contract. The markup and class names in `app.js` and `style.css` are a working suggestion. The real page can restructure them as long as it follows the rules.
- **Files:**
  - `tokens.css`: the default palette and font, the derived colours, and the type, spacing and motion scales. The real page copies this file.
  - `themes.css`: the other 14 palettes and 12 fonts, plus the flower decoration.
  - `themes.js`: the theme catalog: which palette, font and decoration each theme uses, the swap lists, and the look descriptions used as accessible names.
  - `style.css`, `app.js`, `data.js`: the mockup itself.
  - `contrast.mjs`: checks every colour pair, no browser needed.
  - `shoot.mjs`: screenshots and the automated checks. Its output goes to the gitignored `shots/` folder.
  - `REVIEW.md`: the self-review.

## States

There are 32 states, each with its own URL. Every main-screen state works in light and dark, with seconds on or off, with the Day Strip on or off, in 12- or 24-hour time, and in every theme.

| Group | States |
|---|---|
| School Day | `period`, `readouts` (big plus two small), `edit` (editing Readouts), `passing`, `break` (Nutrition), `assembly` (Chapel) |
| Off-Hours | `before`, `after`, `dayoff` (Thanksgiving Break), `experience` (HS Experience Week), `summer`, `unknown` (a date outside every known School Year) |
| Page | `simulated` (the "Simulated time" banner) |
| Ringing and sound | `ringing`, `timer-ringing`, `sound` (the "turn sound on" prompt) |
| Timer | `timer`, `timer-paused`, `timer-readouts` (timer plus two other Readouts), `picker` |
| Settings | `settings`, `look` (the theme picker), `alarm` (new Period Alarm), `alarm-clock` (editing a Clock Alarm) |
| First visit | `first` (the Division prompt), `hint` (the "Pick a theme" hint) |
| Toasts | `toast` (Alarm deleted, with Undo), `toast-error` (couldn't save) |
| Mini player | `mini`, `mini-passing`, `mini-ringing`, `mini-timer` |

## Eric's 02 feedback, point by point

| Point | Done | Notes |
|---|---|---|
| A's layout as the base | Yes | A centred big Readout with the Segment name above it, a hairline progress bar, and quiet controls along the bottom. The Division chip moved to the top right, so the Segment heading holds only the Segment and its Period Label. |
| B's Day Strip, as a toggle (default on) | Yes | It runs above the controls. During Off-Hours it shows the Next School Day, headed "→ Next School Day · Wed, Oct 28 · Even Day". It's hidden in Summer, in Experience Week and on an unknown date. On a phone it becomes an agenda list. Turn it off with "Day Strip" in Settings → Display (`&strip=off`). Exceptions are under [Day Strip](#day-strip). |
| C's ring, for the timer only | Yes | While a timer runs or is paused, it is the big Readout inside a ring. The ring shows the share of time left. The Period countdown moves to a small Readout beside the ring (below it on a phone). Cancel or dismiss restores the layout. |
| Seconds toggle (default on) | Yes | "Show seconds" in Settings → Display (`&seconds=off`). Countdowns become whole minutes ("42m", "1h 15m"). Clock times drop their small seconds. The last minute and the timer always show seconds. Rules are under [Seconds and time text](#seconds-and-time-text). |
| A set of themes, one per subject plus personality themes, never labelled by audience | Yes | 15 themes. Each is a font plus a palette, in light and dark. The picker shows previews only, and each preview's accessible name describes its look. The theme set includes the two Eric described: "Navy and orange, bold condensed" and "Blush pink and rose with flowers, calligraphy labels". |
| Swap a theme's font or palette, only among pre-checked options | Yes | There are 13 fonts and 15 palettes, and every combination passes (see [Contrast results](#contrast-results)). |
| Light / dark / auto stays a separate setting | Yes | It's in Settings → Look. Every theme has both modes. |
| Default theme: A's look, dark muted blue, light blue-grey text | Yes | "Slate": background `#1e2836`, text `#e2e8f0` (the site's `--text-primary`), accent `#57b3ff` (the site's `--accent-blue-godot`). The digits are weight 300, not A's 200, which REVIEW.md flagged as likely to wash out on a projector. |
| "Pick a theme" hint on first visit | Yes | A small pill beside the Settings button, with its own dismiss button (`#hint`). It shows after the Division is chosen. |

## Colour tokens

Every colour the clock uses is one of these custom properties. A palette sets the first 17. The derived ones come from `tokens.css` and are never set by a palette.

| Token | Role | Slate dark | Slate light |
|---|---|---|---|
| `--bg` | Page background | `#1e2836` | `#eef2f7` |
| `--surface` | Drawer, dialogs, cards, strip Segments | `#273343` | `#ffffff` |
| `--surface-2` | Tiles inside a surface, hover | `#303d50` | `#e3e9f1` |
| `--fg` | Main text | `#e2e8f0` | `#1a202c` |
| `--muted` | Labels, captions, times, the Period Label | `#a3b1c4` | `#4a5568` |
| `--line` | Control borders (3:1 on every background) | `#7d8da4` | `#718096` |
| `--line-soft` | Hairline dividers (decorative) | `#3a4759` | `#cfd8e3` |
| `--accent` | Progress fill, checked controls, the timer ring, the current Segment's border | `#57b3ff` | `#1f6fd1` |
| `--accent-text` | Accent used as text ("Up next", "Timer") | `#7cc4ff` | `#1a5fb4` |
| `--on-accent` | Text and ticks on an accent fill | `#0a1b2e` | `#ffffff` |
| `--focus` | Focus ring (never the accent) | `#ffd166` | `#b45309` |
| `--ring` | Ringing frame, ring card | `#57b3ff` | `#1f6fd1` |
| `--on-ring` | Text on the ring card | `#0a1b2e` | `#ffffff` |
| `--track` | Empty part of progress bars and the ring | `#3a4759` | `#cfd8e3` |
| `--digits` | Readout digits | `#e2e8f0` | `#1a202c` |
| `--deco`, `--deco-2` | Decoration fills (only with `data-deco`) | `#57b3ff`, `#a3b1c4` | `#1f6fd1`, `#4a5568` |
| `--input-bg` (derived) | Text fields, unchecked boxes | `--bg` | `--surface` |
| `--accent-soft` (derived) | Elapsed part of the current Segment, pressed buttons | accent at 16% | accent at 12% |
| `--ring-wash` (derived) | The ringing flash's fill | ring at 14% | ring at 10% |
| `--hatch` (derived) | Break hatching in the strip | fg at 9% | fg at 8% |
| `--scrim`, `--shadow` (derived) | Behind dialogs and the drawer | dark scrim | light scrim |

## Type

**Faces.** A theme's font sets three faces, and they never add up to more than two typefaces:

- `--font-digits`: every Readout and the timer. It is always a plain face with lining, tabular figures.
- `--font-display`: the Segment name, the Day Label, the ring card title and the timer title. A decorative face (calligraphy or handwriting) is allowed here and nowhere else.
- `--font-ui`: everything else (captions, controls, the drawer, the strip). It matches either the digits face or the display face.

Digits always use `font-variant-numeric: tabular-nums lining-nums`. The font tokens also set `--digits-weight`, `--digits-tracking`, `--display-weight`, `--display-tracking` and `--display-scale`. Script and handwriting faces run small, so they scale display text up by 1.12–1.15. `--digits-fit` drops below 1 for wide faces like monospace.

**Main-screen scale.** These sizes follow the viewport, so the projected view and a laptop corner are one design.

| Token | Value | Used for |
|---|---|---|
| `--type-digits` | `36vh` (`40vh` short, `24vh` while editing) | Big Readout, capped to the width (below) |
| `--type-small` | `clamp(26px, 8.5vh, 100px)` | Small Readouts |
| `--type-segment` | `clamp(20px, 5.4vh, 64px)` | Segment name · Period Label |
| `--type-line` | `clamp(16px, 3.8vh, 46px)` | Up next, Off-Hours lines |
| `--type-meta` | `clamp(14px, 2.3vh, 28px)` | Day Label · date (uppercase, tracking 0.08em), progress times |
| `--type-caption` | `clamp(12px, 2.3vh, 28px)` | Readout captions (uppercase, tracking 0.12em) |
| `--type-strip` / `--type-strip-small` | `clamp(12px, 2vh, 24px)` / `clamp(11px, 1.7vh, 20px)` | Day Strip names / times |

**Big Readout sizing rule.** `font-size = min(--type-digits, usable width × 0.94 × --digits-fit ÷ (units × --glyph-em))`. The usable width is `100vw − 2 × --edge-x`, and `--glyph-em` is 0.56. To count units, each digit or colon is 1 and each small glyph (a unit letter, small seconds, AM/PM) is 0.42. Spaces count 0.

- On screens 16:10 and wider, every value up to "1:15:00" or "10:12:43 AM" gets the full 36vh, which is about 26% digit height.
- On a phone, the width sets the size.
- There is no "long value" step. The width cap handles long values.

**UI scale (fixed px).** 13 (drawer section headings, uppercase), 14 (hints, notes, field labels), 16 (body, controls), 18 (form titles), 22 (dialog and drawer titles), 28 (the first-visit question).

## Spacing, radii, targets, motion

- **UI spacing:** `--s1`…`--s7` = 4, 8, 12, 16, 24, 32, 48 px.
- **Main-screen gaps:** `--gap-xs`, `--gap-sm` and `--gap-md` are `clamp(4px, 1vh, 12px)`, `clamp(6px, 2vh, 24px)` and `clamp(8px, 3vh, 36px)`. The screen padding is `--edge-y: clamp(8px, 3vh, 36px)` and `--edge-x: clamp(12px, 3vw, 64px)`. It's 6/12 px on short screens and 16 px on a phone.
- **Radii:** `--radius` 12px (dialogs, cards), `--radius-sm` 6px (buttons, fields, strip Segments). Pills are 999px.
- **Targets and focus:** `--tap` is 44px, the minimum for every control. `--focus-width` is 3px, drawn in `--focus` with a 3px offset.
- **Motion:** `--flash-period` 1s (the ringing flash) and `--ring-tick` 1s (the timer ring's transition).

## Breakpoints

| Name | Query | What changes |
|---|---|---|
| wide (default) | none | The full layout. |
| compact | `(max-width: 760px), (max-height: 520px)` | Control labels collapse to icons (the names stay as accessible names). The ring card drops its detail line. The flash frame is 6px. The "Pick a theme" hint sits above the Settings button. |
| short | `(max-height: 520px)` | The laptop corner (480×320). Uses `--type-digits: 40vh`. The progress bar and **the Day Strip are hidden**. The sound prompt, ring card and toast sit just above the controls. In edit mode the Readouts sit in one row. |
| narrow | `(max-width: 520px) and (min-height: 521px)` | Phone, portrait. The controls are a 6-column icon grid. The Day Strip becomes a scrolling agenda list. Overlays sit above the controls. The timer ring sits on top with the other Readouts under it. Theme previews are 2 per row. |
| mini | `<main class="mini">` in the Picture-in-Picture window | See [Mini player](#mini-player). |

## Main screen

A grid of five rows, top to bottom:

1. **Simulated time banner** (only with `?at=`): full width, `--surface`, dashed bottom border, a clock icon and "Simulated time · Tue, Oct 27, 10:12:43 AM · this tab only".
2. **Top bar:** the Day Label · date on the left (uppercase, muted, display face), and the Division chip on the right (`HS`; its accessible name is "Division: HS, switch Division"). On days off, Experience Week and Summer the headline already names the day, so the top bar shows only the date.
3. **Stage**, centred:
   - the Segment name · Period Label (`h1`, display face; the label is muted);
   - the big Readout;
   - the progress bar ("10:05 ━━━─── 10:55"), during Segments and Passing Periods;
   - one of these lines:
     - "UP NEXT Period 4 · Prep 11:00" during a Passing Period;
     - an Off-Hours line ("Next: Wed, Oct 28 · Even Day · starts in 15h 35m", "Back Mon, Nov 30 · All Day", "Enjoy the trips · back Mon, Jan 25", "Have a great summer", "No school calendar for this date yet");
   - the small Readouts.
4. **Day Strip** (when on and the state has one).
5. **Controls**, centred: Timer, Bells (pressed, filled bell), Readouts, Mini player, Fullscreen, Settings. They are quiet muted text buttons, and full colour on hover. The Mini player button is hidden where Document PiP doesn't exist.

The projected view shows nothing a class doesn't need. Settings, the feedback link and the note about sound limits stay in the drawer.

## Readouts: how they arrange

- **One big, up to two small (three Readouts in all).** There are three modes, so a fourth Readout could only repeat one. "Add Readout" goes away at three. The model (`readout-layout.js`) has no limit today, so ticket 17 adds this cap. **Eric to confirm.**
- **Small Readouts** sit in one centred row under the big one. A hairline (`--line-soft`) separates them, with a gap of `clamp(16px, 4vw, 80px)`. They appear in layout order: the second Readout in the layout is the first small one. On a phone the row stays a row (two fit at 34px).
- **Captions** name the mode under every Readout: "left", "since start", "now", "until Period 4", "until school starts", "since school ended", "until Mon, Nov 30". They're uppercase and muted.
- **Tap a Readout to cycle its mode.** Each Readout is a button, with a focus ring around the value and caption.
- **Adding and removing (all input types alike).** The "Readouts" control toggles edit mode. It is `aria-pressed`, filled with the accent, and its label becomes "Done".
  - Every Readout shows a dashed outline, with a labelled **Remove** pill under it (44px tall). Its accessible name is "Remove Readout: since start". It shows only when there is more than one Readout. Removing the big one promotes the first small one.
  - While there are fewer than three Readouts, a dashed **Add Readout** slot follows the last small one. It adds a Readout in the default mode for now.
  - A note reads "Tap a Readout to change what it shows". Tapping still cycles.
  - The big Readout drops to `24vh` and the progress bar hides, to make room. Editing is a teacher moment, not a projected one. On short screens all the Readouts sit in one row.
  - Done or Escape leaves edit mode. After a Remove, focus moves to the next Remove button, or to Done if none is left.
  - Edit mode isn't saved, and a reload leaves it.
  - This replaces today's always-visible "×".
- **Timer running or paused:** the timer takes the big spot inside the ring (see [Timer](#timer-ring-and-picker)). The previous big Readout and the small ones stack in a column to the right of the ring, centred vertically, at `clamp(24px, 7vh, 84px)`. On a phone they sit under the ring. The first one's caption names the Segment: "left in Period 3 · AP CSA".

## Seconds and time text

What the shared formatter shows (ticket 16). Only the look is set here.

| Value | Seconds on (default) | Seconds off |
|---|---|---|
| Countdown or count-up under 1 hour | `42:17` | `42m` (whole minutes, rounded down) |
| Countdown or count-up of 1 hour or more | `1:15:00` | `1h 15m` |
| Under one minute | `0:42` | `0:42` (always) |
| Timer | `4:12` | `4:12` (always) |
| A day or more | `4d 17h` | `4d 17h` |
| Clock time, 12-hour | `10:12` plus small raised `:43`, then a small `AM` | `10:12` plus a small `AM` |
| Clock time, 24-hour | `10:12` plus small raised `:43` | `10:12` |

Letters ("m", "h", "d", "AM") and clock seconds are set at 0.42em in `--muted`. The seconds are raised (`vertical-align: 0.95em`), so the hour and minute stay the big number. The strip, the progress bar and Up next always show clock times without seconds.

## Day Strip

B's strip, placed above the controls:

- **Segments** are laid out in proportion to their length, and a Passing Period is a gap. Each Segment shows its short name ("P3", "Nut", "Lunch", "Chapel") in bold, then its Period Label in muted text, then its start time under it. The day's end time sits at the far right.
- **Kinds are told apart by pattern, not colour.**
  - A Period has a solid 1.5px border on `--surface`.
  - A Break is hatched (45° stripes of `--hatch`) with a dashed border.
  - An Assembly has a dotted 2.5px border on `--bg`.
- **Now:**
  - The current Segment has a 3px `--accent` border, and its elapsed part is shaded `--accent-soft`.
  - Past Segments fade to a `--line-soft` border with muted text.
  - A "NOW" pill (`--fg` on `--bg`) and a tick sit *above* the track, so they never cross the text.
- **Off-Hours:** the strip shows the Next School Day's Segments, with no Now marker. A heading above it reads "→ Next School Day · Wed, Oct 28 · Even Day". Before school it reads "Today · All Day".
- **Hidden:** in Summer, in Experience Week, on an unknown date, while a timer runs (the ring takes the height), on short screens (480×320), and when the setting is off. The screen reflows: the stage takes the space.
- **Phone:** a scrolling agenda list (`tabindex=0`). Each row shows the start time and "Period 3 · AP CSA". Breaks and Assemblies are italic with a muted "· Break" or "· Assembly" after the name. The current row has a 3px accent border, a soft fill and a "NOW" pill. The page should scroll the current row into view.
- **Accessibility:** a `section` labelled "Today's Segments" (or "Segments on Mon, Nov 30"). Each item has hidden text: "Period 3 · AP CSA, 10:05 to 10:55, now". It isn't a live region, so nothing is re-announced each tick.

## Timer: ring and picker

- **Ring:** an SVG circle with `pathLength=100` and a 2.4-unit stroke. The track is `--track`. The arc is `--accent` with round caps and starts at 12 o'clock. Its length is the share of time *left*, so it drains back toward 12.
  - Diameter: `min(100vh − 1.6 × edge-y − tap − gap, 56vw)`. The ring may rise into the top bar's row, because a circle leaves the corners free for the Day Label and Division.
  - The arc's length changes with a `--ring-tick` (1s) linear transition. Under `prefers-reduced-motion` there's no transition: the ring steps once a second and never animates.
- **Inside the ring:**
  - the title "Timer of 5:00" (display face, accent, at 5cqh);
  - the digits, sized `90cqw × --digits-fit ÷ (units × --glyph-em)`, which is about 26% of the viewport height for "4:12" at 1920×1080;
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

- **Ringing flash:**
  - **Normal:** an inset frame of `--ring` (14px, or 6px below 521px either way) plus a `--ring-wash` fill over the whole screen. It switches on for 0.5s and off for 0.5s with `steps(1)`: **1 flash per second** (the limit is 3).
  - **Reduced motion:** the same frame and wash, held steady with no animation.
  - **Not just colour:** the ring card names it in text ("RINGING · PERIOD ALARM") with a bell icon. The digits stay `--digits` on the wash, which passes 4.5:1 in every palette.
- **Ring card:**
  - **Wide screens:** it sits bottom centre, just above the controls, filled with `--ring` and text in `--on-ring`. It shows the kind line, the title (display face, 30px), the detail ("5 min before the end of Period 3") and a large Dismiss button (`--on-ring` fill).
  - **Compact screens:** the detail line goes.
  - **Short screens:** it becomes one line: "Ringing · Wrap-up time [Dismiss]".
  - It is an `alertdialog` that takes focus. Escape dismisses it. The page announces the ring once through a live region.
- **Sound prompt:** a pill at top centre with a muted-speaker icon, "Sound is off", the note "Keep this tab open for Bells and Alarms" in small muted text, and a "Turn sound on" accent button. On short screens and phones it moves above the controls and the note goes.
- **First visit:** a near-solid scrim (`--bg` at 94%) behind a dialog that asks "Which Division are you with?". It offers two large choices (MS / HS) and shows the feedback link.
- **"Pick a theme" hint:**
  - a pill with an accent border, "Pick a theme" and a 44px dismiss button;
  - an arrow points to the Settings button. The pill sits to the button's right, or above it on compact screens;
  - it shows on the first visit after the Division prompt, and stops after a theme is picked or the hint is dismissed.
- **Toasts:**
  - **Where:** bottom centre, just above the controls, never over the digits. They stay about 6 seconds.
  - **Confirmation:** `role=status`, a check icon, short text and an optional Undo ("Alarm deleted · Undo"). Destructive actions use Undo instead of a confirm dialog.
  - **Error:** `role=alert`, a warning icon, a 6px `--fg` left border and a Dismiss button ("Couldn't save on this device. Changes last until this tab closes.").

## Settings drawer

The drawer slides in from the right as a `dialog` (`aria-modal`), `min(480px, 100vw)` wide on `--surface`.

- **Head:** "Settings" and a Close button.
- **Body:** one scrolling column of `<section class="drawer__section" id="…" aria-labelledby>`, each with an uppercase muted `h3` and a hairline between sections.
- **Adding to it:** a new feature adds a section. It never restructures the drawer.

| Order | `id` | Section | Contents |
|---|---|---|---|
| 1 | `division` | Division | Segmented control: Middle School / High School |
| 2 | `look` | Look (ticket 21) | **Theme** (15 previews, 3 per row; 2 on a phone) · **Font** (13 "Aa 42" swatches) · **Colours** (15 palette dots) · "Use the theme's own font and colours" (only after a swap) · **Light or dark** (Dark / Light / Auto) |
| 3 | `display` | Display | Show seconds · 24-hour time · Day Strip (switches with a one-line hint) |
| 4 | `sound` | Sound | Bells switch · Volume slider · Timer sound (select plus Preview) · the note about keeping the tab open |
| 5 | `labels` | Period Labels | Two-column grid of text fields, one per Period plus Seminar |
| 6 | `alarms` | Alarms (ticket 15) | List: name, a hint line ("5 min before the end · Periods 1–7 · Block Days · Chime"), Edit, an on/off switch · "+ Clock Alarm" and "+ Period Alarm" buttons · the editor form (below) |
| 7 | `about` | About | Mini player browser note · "Feedback? Email Eric" |

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
- Swatches and previews are radio groups, so arrow keys move between them.
- The focus ring is drawn around the visible tile, not the hidden input.

## Mini player

The Document Picture-in-Picture window, about 320×180. It's one column of three rows, centred, with 8px/12px padding:

1. **Head:** "Period 3 · AP CSA" (display face, muted, 14–28px).
   - While ringing: a bell icon and "Ringing · Wrap-up time" in `--accent-text`, bold.
   - While a timer runs: "Timer of 5:00" in `--accent-text`.
2. **Big Readout:** `min(50vh, width-capped)` with the same unit rule, so "42:17" fills about half the height.
3. **Foot**, 44px minimum. One of these:
   - a hairline progress bar plus "ends 10:55" (in a Segment);
   - "UP NEXT Period 4 · Prep" (Passing Period);
   - the timer's own bar plus "42:17 left in Period 3" (timer running; there's no ring at this size);
   - a full-width **Dismiss** accent button (ringing). The flash frame is 6px.

It uses the page's tokens unchanged, so it follows the theme, the mode, 24-hour time and seconds. Every size is in vh/vw, so a larger window just scales up (shots at 480×270).

## Theme set

**Rules:**

- A theme is a palette plus a font, and sometimes a decoration.
- The page applies a theme by setting attributes on `<html>`: `data-mode` (dark or light; "auto" is resolved with `matchMedia('(prefers-color-scheme: light)')` and followed live), `data-palette`, `data-font` and `data-deco`. `themes.js`'s `themeAttributes({ theme, font, palette, mode })` returns exactly those attributes.
- The same attributes on any element re-theme that element and its children. That is how each picker preview draws itself.
- **No audience labels, anywhere.**
  - The picker shows previews only: the theme's colours, "Period 3" in its display face, "42:17" in its digits face, a progress bar, and the decoration if it has one.
  - Each preview's accessible name is the look from `themeLook()`, for example "Navy and orange, bold condensed".
  - Theme ids and look names describe colours and type, never a subject or a person.
- **Swaps:** the Font list is every entry in `FONTS` and the Colours list every entry in `PALETTES`, so any theme can take any of them. Each swatch's accessible name is its look, plus "(the theme's own)" on the theme's default. The choice is saved per device (ticket 16's storage).
- **Fonts are system stacks only.**
  - No font file is downloaded, and nothing loads from a third-party server.
  - Each stack lists the Windows face first, then macOS/iOS, then ChromeOS/Android, then a generic.
  - The calligraphy face (Segoe Script / Snell Roundhand / Apple Chancery) and the handwriting face (Ink Free / Chalkboard SE / Bradley Hand) are installed on Windows and Mac, so no webfont is needed. Other systems fall back to `cursive`. **Eric to decide** whether that fallback is fine or whether one small self-hosted script file (labels only) is worth adding.
- **Big digits always use a readable face.** Script and hand set only `--font-display`. Their digits use a serif or rounded face.
- **Decorations** are inline SVG in two edge positions: right edge high and left edge low, `min(22vh, 15vw)` wide, at 55% opacity, coloured with `--deco` and `--deco-2`.
  - They sit behind the content (`z-index: 0`, no pointer events), and the check confirms they never overlap text or controls.
  - They're hidden under 521px in either direction and in the mini player.
  - Swapping the palette recolours them, and swapping the font keeps them.

| Theme id | Palette | Font | Decoration | Accessible name (`themeLook`) |
|---|---|---|---|---|
| `slate` (default) | slate | system | none | Slate blue and sky blue, clean sans |
| `ink` | ink | din | none | Deep ink and teal, engineered sans |
| `lab` | lab | rounded | none | Charcoal and lime, rounded sans |
| `paper` | paper | serif | none | Cream paper and ink blue, book serif |
| `parchment` | parchment | slab | none | Parchment and oxblood, slab serif |
| `coast` | coast | humanist | none | Ocean blue and coral, humanist sans |
| `vesper` | vesper | classic | none | Deep plum and gold, old-style serif |
| `terminal` | terminal | mono | none | Black and green, monospace |
| `gallery` | gallery | geometric | none | Charcoal and vermilion, geometric sans |
| `stage` | stage | serif | none | Midnight and brass, book serif |
| `court` | court | heavy | none | Forest green and gold, heavy sans |
| `team` | team | condensed | none | Navy and orange, bold condensed |
| `bloom` | blush | script | flowers | Blush pink and rose with flowers, calligraphy labels |
| `chalk` | chalk | hand | none | Chalkboard green, handwritten labels |
| `contrast` | contrast | heavy | none | High contrast black and white, heavy sans |

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

**Palettes (the swap list):**

| Palette id | Look | Dark bg / fg / accent | Light bg / fg / accent |
|---|---|---|---|
| `slate` | Slate blue and sky blue | `#1e2836` / `#e2e8f0` / `#57b3ff` | `#eef2f7` / `#1a202c` / `#1f6fd1` |
| `ink` | Deep ink and teal | `#10202a` / `#e6f1f3` / `#3cc9c0` | `#f2f7f7` / `#0f2027` / `#0b7a74` |
| `lab` | Charcoal and lime | `#161a16` / `#eef3e8` / `#a3e04a` | `#f5f7f0` / `#171c12` / `#3f7a10` |
| `paper` | Cream paper and ink blue | `#1b1a22` / `#f1ece0` / `#8fb1ff` | `#f7f1e3` / `#1d1b2e` / `#2a4aa8` |
| `parchment` | Parchment and oxblood | `#1f1914` / `#f2e8d8` / `#e0866e` | `#f4ead6` / `#2a1c12` / `#8c2a1c` |
| `coast` | Ocean blue and coral | `#0f1d33` / `#eaf1fb` / `#ff8a73` | `#f0f5fb` / `#0f1d33` / `#c2412d` |
| `vesper` | Deep plum and gold | `#1f1527` / `#f3ecf6` / `#e8c062` | `#f7f2f8` / `#24162e` / `#6b2f8f` |
| `terminal` | Black and green | `#0b0f0c` / `#d8f5dc` / `#4ee07a` | `#f2f6f2` / `#0d1a10` / `#11743a` |
| `gallery` | Charcoal and vermilion | `#1a1a1c` / `#f4f1ec` / `#ff6b4a` | `#f7f5f1` / `#1a1a1c` / `#c2361a` |
| `stage` | Midnight and brass | `#121428` / `#eeeaf7` / `#d9a441` | `#f4f3f8` / `#141629` / `#8a5a00` |
| `court` | Forest green and gold | `#0f2318` / `#edf7f0` / `#f5c542` | `#f1f7f3` / `#0f2318` / `#17703f` |
| `team` | Navy and orange | `#0d1b3d` / `#f2f5fb` / `#ff7a1a` | `#f2f5fb` / `#0d1b3d` / `#c24e00` |
| `blush` | Blush pink and rose | `#2a1820` / `#fbe9ef` / `#f59ab5` | `#fbeef1` / `#3a1a26` / `#b03a62` |
| `chalk` | Chalkboard green | `#1f3a32` / `#f1f4ee` / `#f2e27a` | `#eef3ef` / `#183029` / `#2a6b56` |
| `contrast` | High contrast black and white | `#000000` / `#ffffff` / `#ffd400` | `#ffffff` / `#000000` / `#0033cc` |

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

**Rendered sweep** (`node shoot.mjs --sweep`): every font × palette × mode in four states (readouts, passing, timer, ringing), plus the theme picker in every palette × mode: **1590 renders, 0 axe violations, 0 overlaps or clipping, every big Readout fits** (inside the ring for the timer). The big-digit height at 1920×1080 is 24.2–28.1% across fonts in the Segment states and 21.2–32.9% for the timer. The lowest is the monospace font in the timer, because its digits are wide.

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
- **At most three Readouts:** the limit is one per mode (**Eric to confirm**).
- **Division chip:** in the top right, a 44px button showing "HS"/"MS". It opens the drawer at the Division section.
- **The Day Strip hides while a timer runs and on short screens.** The ring and the Segment name need the height.
- **Clock seconds are small and raised**, so a clock Readout stays as big as a countdown.
- **Seconds-off countdowns round down** ("42m" means 42 to 43 minutes left), then switch to `0:59` for the last minute.
- **Destructive actions apply at once with an Undo toast**, never a confirm dialog.
- **The focus ring is yellow or orange (`--focus`), never the accent**, so focus never looks like a selected state.
- **The ring card sits bottom centre over the strip**, never over the digits.

## Not settled / for Eric

- The three-Readout limit (above).
- Whether to add one small self-hosted script font, so the calligraphy labels look the same on ChromeOS and Linux (today they fall back to the system `cursive`).
- Inside the ring, the timer's digits are 26% of the viewport height in the default font, but as low as 21% with the monospace swap (its digits are wide). A larger ring would crowd the controls.
- Edit mode shrinks the big Readout to about 18%. That's fine while a teacher edits, but it shows on the projector if they edit while projecting.
- Only Chromium on Windows has rendered these faces. The Mac faces (Charter, Snell Roundhand, DIN Condensed, Seravek, Futura) haven't been seen. That's for ticket 05 on Eric's MacBook.
