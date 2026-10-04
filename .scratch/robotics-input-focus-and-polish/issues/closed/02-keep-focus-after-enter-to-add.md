# 02: Keep focus in the input after pressing Enter to quick-add

**What to build:** Two "type, Enter, repeat" flows should keep the cursor in the same box after each Enter, so the teacher can add several items back-to-back without reclicking:

- **Add a Team** (Teams tab): after pressing Enter in the Team Name field to add a team, focus returns to (stays in) the Team Name field so the next team name can be typed immediately.
- **Add member** (an existing team's roster row): after pressing Enter in that team's Add Member box to add a member, focus returns to (stays in) that same team's Add Member box so the next member can be typed immediately.

Both forms already add their item on Enter; only the post-add focus behavior is missing/incomplete. The Team Name field's Enter handler doesn't refocus it at all today; the Members field's Enter handler already refocuses Team Name afterward (see the `dispatch() re-renders and replaces the whole subtree` comment in `robotics.js`) as a reference pattern for the look-up-the-live-element-after-render approach needed here, since each `dispatch()` replaces the whole DOM subtree and the original input reference goes stale.

**Blocked by:** None (can start immediately).

**Status:** closed

- [ ] Pressing Enter in the Team Name field adds the team and leaves focus in the (new) Team Name field, ready to type the next team.
- [ ] Pressing Enter in a team's Add Member field adds the member and leaves focus in that same team's (new) Add Member field, ready to type the next member.
- [ ] Works for multiple teams at once (adding members to Team A doesn't leave focus on Team B's add-member box, etc.).
- [ ] `cd web && npm run test:coverage` passes.
