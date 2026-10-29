# 14: Fullscreen with Wake Lock, the mini player, and the feedback link

**What to build:** On the plain `/clock` page there are three controls.

**Fullscreen button:**
- enters fullscreen and keeps the screen awake for as long as fullscreen lasts;
- releases the wake lock on exit;
- fails quietly where Wake Lock isn't supported.

**Mini player button:**
- shown only where Document Picture-in-Picture exists (Chrome and Edge desktop);
- opens an always-on-top window that mirrors the live big Readout, the current Segment and up next;
- has a dismiss button for a ring.

How the mini player looks is not decided here; ticket 03's design reference decides that later.

**Feedback link:** "Feedback? Email Eric" opens a new email to erich@villagechristian.org with the subject "Clock feedback".

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: mini player, Wake Lock; user stories 73, 74, 76, 77, 80). Vocabulary: `web/clock/CONTEXT.md`.

**Blocked by:** 06 (only the mini player's dismiss checkbox needs 12; the rest can start straight away)

**Status:** closed

- [x] Fullscreen, Wake Lock and Document PiP are passed into the page as capabilities, each detected rather than assumed
- [x] Wake Lock is requested on entering fullscreen, released on exit, and requested again when the page becomes visible while still fullscreen
- [x] The mini player button is hidden when Document PiP is missing. When present, it opens a window that updates every tick from the same state as the main page and closes cleanly when the main tab closes
- [x] The mini player's dismiss button stops a ring (needs 12)
- [x] The feedback link's `mailto:` target has the address and subject, URL-encoded
- [x] Tests with fake capabilities: button hidden without PiP; Wake Lock requested and released; mini player content mirrors the main page; the mailto string
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

The model now gives up next during a Segment, for the mini player. Fullscreen covers the whole page with only the display and the ringing banner shown; you exit with Esc. The mini player is 320×200 and shows the time when there are no Readouts. Feedback link is in a footer.
