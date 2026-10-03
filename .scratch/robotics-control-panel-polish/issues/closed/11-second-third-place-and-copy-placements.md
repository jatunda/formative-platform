# 11: Second/third place display and copy placements to clipboard

**What to build:** The Finals tab already shows a champion banner once the final is complete. Add equivalent 2nd place (final's loser) and 3rd place (Third-Place Match's winner, when that match exists and is played) displays, and a "Copy Placements" button that puts 1st/2nd/3rd place onto the clipboard as text, each with their Team members listed.

**Blocked by:** 01 (Clipboard copy confirmation popup) — reuses its copy-confirmation mechanism

**Status:** closed

- [x] Once the final is complete, a 2nd place display appears alongside the existing champion banner, naming the losing Playoff Alliance's Team(s)
- [x] Once the Third-Place Match is complete, a 3rd place display appears naming its winning Playoff Alliance's Team(s)
- [x] If the Third-Place Match isn't included or isn't complete, no 3rd place display is shown (no placeholder implying a result that doesn't exist)
- [x] A "Copy Placements to Clipboard" button exports whichever of 1st/2nd/3rd are currently decided, with each Team's Members listed underneath its name
- [x] Copying triggers the same confirmation popup as other clipboard actions
