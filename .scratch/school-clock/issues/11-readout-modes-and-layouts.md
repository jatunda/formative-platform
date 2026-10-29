# 11: Readouts — modes, defaults, and layouts that don't sync between tabs

**What to build:** On the plain `/clock` page:

- clicking a Readout cycles its mode;
- add and remove buttons manage several Readouts;
- each tab keeps its own layout through reloads without affecting other open tabs;
- a newly opened tab starts from the layout last used in any tab.

**Modes:**
- in school: time left, time elapsed, current time;
- Off-Hours: until the Next School Day, since school ended, current time;
- during a Passing Period, both countdown modes show the Passing Period's remaining time.

**Defaults:**
- "until school starts" before school on a School Day;
- "since school ended" after school;
- "until Next School Day" on a day off.

**Mode changes across the day:** a Readout keeps its position in the mode cycle as the day moves between in-school and Off-Hours.

Spec: `.scratch/school-clock/spec.md` (Implementation Decisions: Readout modes, device storage; user stories 5–13, 29–31). Vocabulary: **Readout** in `web/clock/CONTEXT.md`.

**Blocked by:** 08, 10

**Status:** closed

- [x] Readout logic is a pure module: given the moment from the clock model and a Readout's mode, it gives the value to show; cycling goes through the three modes in order
- [x] The defaults above apply to a new Readout; position in the cycle carries across in-school ↔ Off-Hours
- [x] Add and remove Readouts; there's always at least one
- [x] The layout is saved per tab (session storage) and copied as "last used" (local storage). A tab with no session layout starts from "last used". Open tabs never change each other
- [x] Tests: cycling, defaults in each state, Passing Period behaviour, a two-tab scenario with fake storage (two independent layouts; a third "new tab" gets the last-changed one), and reload restores the tab's own layout
- [x] `npm run lint`, `npm run typecheck`, `npm run test:coverage` in `web/` pass

## Comments

Modes are stored as a cycle position (countdown/countup/clock), so a Readout keeps its place across in-school/Off-Hours. During a Passing Period both countdown and count-up show the Passing Period's time left. Layout key `school-clock-layout-v1` (session + last-used). Deferred to design tickets: big-Readout styling; the plain time line at the top duplicates a current-time Readout.
