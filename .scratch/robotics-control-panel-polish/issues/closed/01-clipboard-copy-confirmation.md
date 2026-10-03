# 01: Clipboard copy confirmation popup

**What to build:** Every "Copy ... to Clipboard" action (Roster, Match Data, Standings) shows a brief, dismissible confirmation (toast/popup) immediately after the copy succeeds, so the teacher has positive feedback instead of wondering whether the click did anything. Build this as a small reusable notification helper that later tickets (placements copy) can call too.

**Blocked by:** None (can start immediately)

**Status:** closed

- [x] A shared "show a transient confirmation" helper exists and is reusable from any tab
- [x] Copy Roster to Clipboard, Copy Match Data to Clipboard, and Copy Standings to Clipboard all trigger the confirmation on click
- [x] The confirmation is purely informational (no action required to dismiss) and clears itself after a short delay
- [x] If `navigator.clipboard` is unavailable, the user gets a visible failure indication instead of a silent no-op
