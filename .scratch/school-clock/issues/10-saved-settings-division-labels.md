# 10: Saved device settings, with Division and Period Labels end to end

**What to build:** A teacher's settings survive reloads on their own device. On the plain `/clock` page:

- the first visit asks for the Division;
- a select switches Division in one step, and the page follows that Division's Bell Schedules;
- Period Label inputs show up in the current Segment name and in up next ("Period 3 · AP CSA").

Alarms, Bells, sound choices and volume are stored too (the "next rings" list from 09 now reads saved Alarms). There's no editor yet; that waits for the design reference.

**Prefactor first:** Robotics already has a small storage adapter. Extract it into one shared adapter that both contexts use, and let it work with either `localStorage` or `sessionStorage`, rather than copying it into the Clock. Robotics behaviour and tests must not change.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: device storage; user stories 21–23, 26–28, 58). Vocabulary: **Division**, **Period Label** in `web/clock/CONTEXT.md`. Memory note: Eric prefers extracting shared code over duplicating it.

**Blocked by:** 09 (for the Alarm and Bells setting shapes)

**Status:** ready-for-agent

- [ ] The shared storage adapter exists, Robotics uses it, and every Robotics test still passes unchanged (or with only import-path updates)
- [ ] Clock settings are stored under versioned keys. Missing or corrupt data falls back to defaults without throwing
- [ ] Division: asked on first visit (no saved value), switchable afterwards, and the page uses the chosen Division's Bell Schedules and exceptions
- [ ] Period Labels appear wherever the page names that Period (current Segment, up next, next-rings list)
- [ ] Alarms, Bells on/off, sound choices and volume round-trip through storage
- [ ] **24-hour time:** a toggle (default off) saved per device. When on, every clock time on the page (current time, Segment start/end, Next School Day "starts at", next-rings list) shows in 24-hour format through one shared formatter; durations and countdowns are unchanged. Tests cover both formats, including midnight and noon
- [ ] Nothing listens for cross-tab storage events
- [ ] Tests use fake storage: first-visit prompt, Division switch, labels shown, corrupt-data fallback
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

**2026-10-29: built on `school-clock-10`.** Shared adapter `web/storage.js` `createStorageAdapter(key, storage = localStorage)` (Robotics wraps it, tests untouched). Clock settings: `web/clock/clock-storage.js`, one key `school-clock-settings-v1`, parsed field by field (a bad field gets its default; bad Alarms are dropped). Decisions: no Division saved → the page shows only the time plus a "Which Division do you teach?" prompt (no Periods, no rings, settings hidden) until one is picked; Period Labels apply to Periods by name (shared across Divisions), never Breaks/Assemblies, blank = none; 24-hour form is zero-padded "08:05" / "00:00"; the Next School Day line now says "… at 8:30 AM · starts in …"; volume defaults to 0.8 (no UI yet); new devices start with Bells on (School bell) and no Alarms — `SAMPLE_SETTINGS` is gone. `initClockApp` takes `storage` instead of `settings`/`onSettingsChange`. Story 23 (Division shown next to the Segment name) is left to 11's layouts; the Division select shows it for now.
