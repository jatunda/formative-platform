# 01: Arena theme tokens and fluid page shell

**What to build:** The visual foundation for the redesign. Robotics-local design tokens give the "esports arena" look (deep near-black/navy surfaces, red and blue alliance colors, gold accent, glow shadow), and the page shell goes edge to edge instead of being a centered 1200px column. Every later ticket builds on these tokens.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Robotics-local CSS custom properties are scoped to the robotics page so the rest of Formative is unaffected: surfaces, text, red alliance, blue alliance, gold/silver/bronze (used by the Podium only), live-glow
- [ ] Google Fonts load a condensed display face (e.g. Rajdhani or Oxanium) for headings, tab labels, scores and times, plus Inter for body text, each with a system-font fallback stack so the page renders fine offline
- [ ] Scores, times and ranks use tabular numerals
- [ ] The page is fully fluid with no `max-width` cap at any width, keeping only small side gutters (overriding both the shared stylesheet's narrow body width and the current 1200px cap)
- [ ] Header, tab bar, cards, buttons, inputs, toast and confirm dialog are restyled to the new tokens; base type size goes up so it reads on a projector
- [ ] No functional or DOM-contract changes, so existing tests pass unchanged
- [ ] `cd web && npm run test:coverage` exits clean
