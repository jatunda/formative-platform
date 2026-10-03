# 02: Confirmation dialogs for Reset Results and New Tournament

**What to build:** Reset Results and New Tournament both currently take effect instantly with no confirmation, per the existing glossary. Add a confirmation dialog to each (distinct wording per action, since one preserves the Team roster and the other doesn't) and rename the "New Tournament" button so it's unambiguous that it wipes the roster too, not just results. Build the confirmation as a small reusable dialog component other tickets (self-alliance) will also use.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] Clicking Reset Results opens a confirmation dialog naming what it clears (Qualification Round, all Match results, Elimination Bracket) and what it keeps (Team roster); only takes effect on explicit confirm
- [x] Clicking New Tournament opens a confirmation dialog making clear the Team roster is also discarded; only takes effect on explicit confirm
- [x] The "New Tournament" button label is changed to clearly communicate it resets everything, including teams (e.g. something like "Reset Everything / New Tournament")
- [x] A reusable confirm-dialog component is extracted so later tickets can reuse it rather than building another one
- [x] `web/robotics/CONTEXT.md`'s **Reset Results** and **New Tournament** entries are updated to drop the "takes effect instantly, with no confirmation step" language
