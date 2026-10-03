# 09: Wide layouts for the Teams and Finals tabs

**What to build:** Apply the same "use the width" treatment to the other tabs so no tab is a single stack of full-width cards. On the Teams tab, the roster sits side by side with Tournament Settings / add-team. On the Finals tab, the setup cards (Form a Playoff Alliance, Playoff Alliances, Bracket Configuration, Seeds) sit in a multi-column row, with the bracket full-bleed beneath.

**Blocked by:** 02 (Match row column grid), 08 (Results tab)

**Status:** closed

- [x] Teams tab at ≥ ~1100px: the roster column (wide) sits beside a settings/add-team column (narrow), and they stack below the breakpoint
- [x] Finals tab at ≥ ~1100px: setup cards sit in an auto-fit grid row; the bracket below spans the full width and scrolls horizontally inside its own container only if it must
- [x] Bracket round columns and cards are restyled to the arena tokens (the red/blue sides from 02 are already there)
- [x] Danger-zone actions (Reset Results / New Tournament) stay visually separated
- [x] No horizontal page scroll at any width
- [x] `cd web && npm run test:coverage` exits clean
