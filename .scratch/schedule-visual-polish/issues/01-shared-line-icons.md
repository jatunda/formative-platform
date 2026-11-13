# 01: Shared line-icon module

**What to build:** Prefactor. The School Clock's inline-SVG line-icon helper becomes one shared module that the School Clock and the teacher pages both use (one source of truth, per CODING_STANDARDS). Nothing changes on screen. Later tickets add the open-in-new, link, trash and spinner icons beside the existing ones.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The clock's icons come from the shared module and look the same
- [ ] `npm run check:clock` passes
