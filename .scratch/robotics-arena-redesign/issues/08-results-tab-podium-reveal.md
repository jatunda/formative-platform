# 08: Results tab with staged Podium reveal

**What to build:** A 4th tab, **Results**, shows the Placements on a podium for the class. The teacher reveals them in stages (3rd → 2nd → 1st, each on click or Space). 1st place gets a confetti burst and a gold glow. The Champion / 2nd / 3rd banners are removed from the bracket on the Finals tab, which shows a "Reveal Results →" button once every Elimination Match is complete.

**Blocked by:** 01 (Arena theme tokens and fluid page shell)

**Status:** ready-for-agent

- [ ] A Results tab with its own icon is added after Finals; it is always in the nav
- [ ] Before the bracket is fully decided, Results shows a "Results not decided yet" state (with how many Elimination Matches remain)
- [ ] When decided, the Podium shows 2nd | 1st | 3rd blocks at stepped heights with gold/silver/bronze treatment, each listing the Playoff Alliance's Teams and their Members. With no Third-Place Match only 1st and 2nd appear, and the reveal sequence skips 3rd
- [ ] Staged reveal: blocks start covered, and each click on the podium or Space press reveals the next (3rd → 2nd → 1st). 1st triggers confetti and the gold glow. Respects `prefers-reduced-motion` (no confetti or rise animation, instant reveal)
- [ ] Reveal progress is stored in Tournament state, so revisiting the tab shows everything already revealed. A "Replay reveal" button re-covers the blocks and restarts. Reset Results and New Tournament clear it
- [ ] Champion / 2nd / 3rd place banners are removed from the bracket
- [ ] The Finals tab shows a prominent "Reveal Results →" button that switches to the Results tab, only when every Elimination Match (including the Third-Place Match if included) is complete
- [ ] Confetti is self-contained (canvas or CSS, no external script)
- [ ] Copy Placements to Clipboard moves to the Results tab
- [ ] New state functions (reveal step, replay) and an "is the bracket complete" helper have unit tests; the robotics glossary is updated if behavior diverges from the Placement / Podium entries
- [ ] `cd web && npm run test:coverage` exits clean
