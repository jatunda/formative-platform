# Robotics Control Panel — Arena Redesign

The control panel reads as a stretched mobile page: everything is capped at 1200px, cards span full width whether they need to or not, and nothing is built for the projector it actually runs on. This effort makes it a projected, broadcast-style tournament display that the teacher also drives.

## Decisions (from grilling, 2026-10-03)

- **Audience:** one screen. The teacher enters scores on a laptop that is projected for the class, so the panel is both tool and scoreboard. Type must read from across a room.
- **Visual direction:** "esports arena". Deep near-black/navy background, a bold condensed display face for headings, scores and times, and a subtle glow on the live match. Robotics-local tokens layer over `../style.css` (the rest of Formative is untouched).
- **Fonts:** Google Fonts (a condensed display face such as Rajdhani/Oxanium, plus Inter for body) with system-font fallbacks so the page still works offline. Scores and times use tabular numerals.
- **Alliance color:** every Match Alliance / Playoff Alliance side is red (A) or blue (B), as in VEX. This applies to match rows, the Now Playing card and bracket cards.
- **Width:** fully fluid, edge to edge with no max-width cap, keeping only small side gutters. The two-column layouts start at about 1100px and stack below that. (This was briefly capped at ~1600px, then changed to no cap.)
- **Schedule & Standings tab:**
  - Qualification Matches (left, wide) sit side by side with Standings (right, narrow, sticky).
  - Each match row is a fixed column grid, and each score input gets its own column instead of sharing one with Alliance B's names.
  - Standings show Members as a small second line under the team name, and ranks 1–3 are **not** colored or bolded.
  - The Match Timeline is compact and collapsible. It is collapsed by default into a one-line summary, and the open/closed choice is remembered.
  - A **Now Playing** hero card above the list shows the Current Match big, with an Up Next preview.
- **Header:** a live status strip shows phase, match progress, the wall clock, and Schedule Drift ("on schedule" / "4 min behind").
- **Results:** a new 4th tab, **Results**, always in the nav. It shows a "not decided yet" state until the bracket is complete. The Podium is revealed in stages: each click or Space reveals 3rd → 2nd → 1st, with confetti and a gold glow on 1st. Once revealed it stays revealed (with "Replay reveal"). The Finals tab shows a "Reveal Results →" button when every Elimination Match is complete. The Champion / 2nd / 3rd banners are removed from the bracket.

## Tickets

See `issues/`. Each ticket must leave `cd web && npm run test:coverage` passing (see repo `CLAUDE.md`).
