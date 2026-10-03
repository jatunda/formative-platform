# 03: Add-Team form keyboard UX and validation

**What to build:** Make adding a Team fast and keyboard-driven, and fail loudly instead of silently when the form is incomplete. Today, pressing Enter in either the name or members field does nothing, and clicking Add Team with no name just no-ops.

**Blocked by:** 01 (Clipboard copy confirmation popup) — reuses the same transient-popup mechanism for the validation error

**Status:** closed

- [x] Pressing Enter while focused in the Team name field adds the Team (same as clicking Add Team)
- [x] Pressing Enter while focused in the Members field adds the Team and returns focus to the Team name field, ready for the next entry
- [x] Attempting to add a Team with a blank name shows a visible error popup explaining the name is required, and does not add the Team
- [x] Existing "Add Team" button-click behavior is unchanged for well-formed input
