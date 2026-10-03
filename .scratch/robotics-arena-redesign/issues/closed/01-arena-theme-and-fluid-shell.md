# 01: Arena theme tokens and fluid page shell

**What to build:** The visual foundation for the redesign. Robotics-local design tokens give the "esports arena" look (deep near-black/navy surfaces, red and blue alliance colors, gold accent, glow shadow), and the page shell goes edge to edge instead of being a centered 1200px column. Every later ticket builds on these tokens.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Robotics-local CSS custom properties are scoped to the robotics page so the rest of Formative is unaffected: surfaces, text, red alliance, blue alliance, gold/silver/bronze (used by the Podium only), live-glow
- [x] Google Fonts load a condensed display face (e.g. Rajdhani or Oxanium) for headings, tab labels, scores and times, plus Inter for body text, each with a system-font fallback stack so the page renders fine offline
- [x] Scores, times and ranks use tabular numerals
- [x] The page is fully fluid with no `max-width` cap at any width, keeping only small side gutters (overriding both the shared stylesheet's narrow body width and the current 1200px cap)
- [x] Header, tab bar, cards, buttons, inputs, toast and confirm dialog are restyled to the new tokens; base type size goes up so it reads on a projector
- [x] No functional or DOM-contract changes, so existing tests pass unchanged
- [x] `cd web && npm run test:coverage` exits clean

## Comments

**2026-10-03 — implemented.** Robotics-local `--arena-*` tokens live on `:root` in `robotics.css` (only `robotics.html` loads it). Rajdhani + Inter come from Google Fonts with system fallbacks, and the base size is `html { font-size: 112.5% }`. `body` overrides the shared 800px cap, and the page is edge to edge with a `--arena-gutter`. Coverage exits clean.

- Added during review: the third-place match checkboxes (Teams tab "Estimated…", Finals tab "Include…") got a custom themed box and a clickable chip label.
- Medal tokens still color standings ranks 1–3 (`tr:nth-child` rules). Ticket 03 removes those rules, which leaves the tokens used by the Podium only.
- `--arena-red`, `--arena-red-soft`, `--arena-live` and `--arena-glow` are defined but unused until tickets 02 and 06.
