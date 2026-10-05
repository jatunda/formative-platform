# 01: Fix first-click-swallowed bug when switching focus between fields/buttons

**What to build:** Throughout the robotics control panel, editing a field and then clicking elsewhere must work on the first click — never require a second click, and never silently discard input. Concretely:

- Editing one match's score, then clicking into another match's score input, moves focus there immediately (today it takes two clicks).
- Clicking any button (e.g. "Add Team", "Mark Complete", "Remove") while another field is still focused/mid-edit fires that button's action on the first click (today the first click is swallowed and does nothing).
- Editing an existing team's name in the roster, then clicking "Add Team" to add a *different* new team, both commits the name edit and adds the new team — it must not eat the "Add Team" click.

Root cause: `dispatch()` commits state and synchronously tears down and rebuilds the whole app DOM (`mount.innerHTML = ''`). Text/score inputs commit via the `change` event, which fires during the browser's blur-handling phase of a click — before that same click's `mouseup`/`click` stage. The synchronous rebuild destroys the actual click target mid-interaction, so the first click lands on a node that's already gone. The fix should address this at the shared `dispatch`/`render` mechanism in `robotics.js` rather than patching individual call sites, since every editable field and button goes through it.

**Blocked by:** None (can start immediately).

**Status:** closed

- [ ] Editing a team's name in the roster, then clicking directly into another team's name field (or score field elsewhere), moves focus there on the first click.
- [ ] Editing a match score, then clicking "Mark Complete" (or another button) on the first click, fires the action — not swallowed.
- [ ] Editing an existing team's name, then clicking "Add Team" for a new team, both commits the name edit and adds the new team in one click.
- [ ] Editing one Qualification Match's score, then clicking directly into another match's score input, focuses it on the first click.
- [ ] `cd web && npm run test:coverage` passes.
