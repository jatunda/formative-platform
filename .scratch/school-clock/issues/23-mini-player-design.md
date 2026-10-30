# 23: The mini player in the design reference's look

**What to build:** The always-on-top mini player (Document Picture-in-Picture, Chrome and Edge desktop) is laid out to the design reference at about 320 × 180 and larger. It shows the big Readout, the current Segment with its Period Label, up next, and a dismiss button while something rings. It follows the teacher's theme, 24-hour and seconds settings, and stays hidden where the browser doesn't support it.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: mini player; user stories 76, 77). Design reference: `.scratch/school-clock/mockups/final/` (mini player layout). Built behaviour: closed ticket 14.

**Blocked by:** 17

**Status:** ready-for-agent

- [ ] The mini player matches the design reference at 320 × 180 and scales sensibly when resized larger
- [ ] It uses the same theme tokens as the main page (and picks up 21's themes once they exist, without changes here)
- [ ] It shows a running timer as the main Readout when one is running
- [ ] The dismiss button is reachable by keyboard and stops the ring
- [ ] Tests with a fake PiP capability check the content and the dismiss button, not styling
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments
