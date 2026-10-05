# Robotics Tournament

A single-device, client-side control panel for running an in-class VEX-style robotics tournament: a Qualification Round where every Team plays multiple matches, followed by an optional single-elimination Bracket. One Tournament exists at a time — there is no history of past Tournaments.

See `CONTEXT-MAP.md` at the repo root for how this context relates to the unrelated Formative Platform context (`CONTEXT.md`).

## Language

**Tournament**:
The single current competition: a Team roster, a Qualification Round, and an optional Elimination Bracket. Only one Tournament exists at a time — starting a new one (see New Tournament) discards the previous one entirely rather than archiving it.

**Team**:
A competing entry with a name and an ordered list of Member names. Members are display-only (shown on roster lists and match cards so students can tell who's on which Team) — no stats are tracked per Member, only per Team.

**Member**:
A student name within a Team's roster. Free-form, addable/removable at any time. Not a tracked entity on its own — Members exist only as part of a Team's roster.

**Qualification Round**:
The phase where every Team plays a teacher-configured number of Qualification Matches before the Elimination Bracket begins. Teams are ranked by Standings during and after this phase.
_Avoid_: Swiss Round — "swiss" is a reasonable informal description of the pairing style, but Qualification Round is the canonical term, matching standard VEX terminology.

**Qualification Match**:
One match during the Qualification Round, pairing two Match Alliances (four Teams total). Each Match Alliance has a Score. Scheduled at a Match Time. Can be marked complete (or edited after completion) regardless of schedule order — there is no requirement that earlier matches be completed first.

**Match Alliance**:
The two-Team pairing formed for exactly one Qualification Match, generated fresh each match by the Pairing Draw. Distinct from Playoff Alliance (below) — a Match Alliance does not persist beyond its one match, and the same two Teams are not guaranteed to be paired together again.
_Avoid_: Alliance alone — always specify Match Alliance or Playoff Alliance; the bare term is ambiguous between the two.

**Pairing Draw**:
The process that generates every Qualification Match's Match Alliances and matchups for the Qualification Round, following the Pairing Rules. Re-running the Pairing Draw ("Regenerate Matchups") discards all existing Qualification Match assignments and is only permitted while zero Qualification Matches are complete — once any is complete, Reset Results must be used first.

**Pairing Rules**:
The fairness goals the Pairing Draw targets, best-effort rather than exhaustively guaranteed:
1. A Team should not share a Match Alliance with the same Team twice, nor face the same opposing Team twice, across its Qualification Matches.
2. A Team's Qualification Matches should be spread across the full span of the Qualification Round rather than clustered together.
3. A Team should not be scheduled into too many consecutive Qualification Matches without a gap to recover between them.

These are satisfied greedily, in roughly the priority listed — a rule is only violated when the number of Teams and configured match count make satisfying it mathematically impossible.

Unlike the rules above, equal match counts are a hard guarantee, not a goal: no Team ever plays more than one Qualification Match more than another, so every Team plays exactly `matchesPerTeam` whenever Teams × `matchesPerTeam` is divisible by 4 (the case the Generate Matchups uneven-count warning treats as even).

**No-Show**:
A flag on one Team within one Match (Qualification or Elimination) recording that the Team did not participate. Counts as a loss for that Team alone; its Match Alliance (or Playoff Alliance) partner is unaffected and can still win the Match on its own merit.

**Score**:
The points value recorded for one Match Alliance (or Playoff Alliance) within one Match — shared equally as that side's result by both of its Teams.

**Standings**:
Teams ranked from completed Qualification Matches, using one of two modes depending on whether every Team that has played at least one Qualification Match has played the same number of them (a Team with zero Qualification Matches played doesn't count toward that check):
- *Even match counts*: ranked by win/loss record, with ties broken by cumulative Score — today's behavior, since raw totals are already fair when every Team has played the same number of matches.
- *Uneven match counts* (see Pairing Draw — the teacher can choose to proceed with an uneven split): ranked by win percentage, with ties broken by average Score per Qualification Match, since raw totals would otherwise favor whichever Team played more.
Meaningful only for the Qualification Round — the Elimination Bracket uses Seeds, not Standings, once it begins.

**Match Timeline**:
The tournament-wide timing configuration used to compute every Match's Match Time, in one of two modes:
- *Forward*: a Start Time plus a Match Duration and Gap, computed forward through the Qualification Round and then the Elimination Bracket.
- *Backward*: a target End Time, from which a Start Time is back-calculated using an Estimated Bracket Size and whether a Third-Place Match is included (both configured once, up front, on the Teams tab's Tournament Settings — not re-asked per Match Timeline mode switch), to determine the total match count. Changing the actual Bracket Size later does not re-target the original End Time — it only recalculates forward from the current time.
Start Time and End Time are entered as a time-of-day only (the Tournament runs in one sitting) and only take effect once the teacher clicks Apply.
Recalculating the Match Timeline ("Recalculate Match Times") never alters recorded results and is always available, distinct from the (destructive) Pairing Draw.

**Match Time**:
The computed scheduled time for one Qualification Match or Elimination Match, derived from the Match Timeline.

**Field Count**:
How many Matches run concurrently per time slot. Set once per Tournament and not changed mid-Tournament; feeds only the Match Timeline's calculations, and never restricts which Match can be marked complete or edited.

**Current Match**:
The Qualification Match spotlighted in the live Qualification Round view: always the Inferred Current Match. There is no way to override which match is current other than reordering the schedule itself (see Qualification Match).

**Inferred Current Match**:
The definition behind Current Match: the first not-yet-complete Qualification Match in schedule order. The teacher controls which match this lands on by manually reordering not-yet-complete Qualification Matches, rather than by any separate override.

**Up Next**:
The first not-yet-complete Qualification Match after the Current Match, in schedule order.

**Alliance Selection**:
The teacher manually forming Playoff Alliances once the Qualification Round ends, by typing in which two Teams form each Alliance.
_Avoid_: auto-pairing, seeding alliances — Playoff Alliances are always formed by explicit teacher choice, never derived automatically from Standings.

**Playoff Alliance**:
A pairing of two Teams formed once via Alliance Selection, fixed for the remainder of the Tournament. Distinct from Match Alliance (above) — a Playoff Alliance persists across every Elimination Match it plays. Normally two distinct Teams, but the teacher can confirm forming a single-Team Playoff Alliance (e.g. when a Team has no partner left) — it plays alone, with no partner Team sharing its Score.

**Elimination Bracket**:
The single-elimination bracket of Playoff Alliances played after Alliance Selection. Fixed once generated — Bracket Slots are not reseeded between rounds.

**Bracket Size**:
The number of Playoff Alliances the teacher chooses to enter into the Elimination Bracket — any positive integer, not restricted to a power of two.

**Bracket Slot**:
One seeded position within the Elimination Bracket. If Bracket Size isn't a power of two, the bracket pads to the next power of two, with the extra Bracket Slots resolved as Byes for the top Seeds.

**Seed**:
The rank-order position assigned to a Playoff Alliance within the Elimination Bracket. Auto-filled from Standings by default, but every Bracket Slot's Seed is manually overridable.

**Bye**:
An automatic advancement past Round 1 of the Elimination Bracket, given to a top Seed when Bracket Size is padded to the next power of two.

**Elimination Match**:
A match between two Playoff Alliances within the Elimination Bracket. A Score is recorded for the record, and only win/loss by Score determines advancement — a No-Show here (as everywhere) only affects that Team's own record, never which Playoff Alliance advances.

**Third-Place Match**:
An optional Elimination Match between the two Semifinal-round losers. Can be toggled on or off at any time until the Third-Place Match itself is marked complete.

**Placement**:
A decided 1st / 2nd / 3rd finishing position in the Elimination Bracket, held by one Playoff Alliance. 1st and 2nd come from the Final; 3rd exists only when a Third-Place Match is included and complete.

**Podium**:
The Results tab's display of the Placements, revealed one Placement at a time (3rd → 2nd → 1st, or 2nd → 1st with no Third-Place Match) by the teacher for the class. Shown only once every Elimination Match (Third-Place Match included) has a winner — until then the Results tab says the results are not decided yet. How far the Podium has been revealed is part of the Tournament: it stays revealed across visits, "Replay reveal" re-covers it, and Reset Results and New Tournament clear it.
_Avoid_: Standings for this — Standings are Qualification Round rankings only.

**Schedule Drift**:
How far the Tournament is running behind (or ahead of) the Match Timeline: the gap between the current wall-clock time and the Current Match's Match Time. Display-only — it never changes Match Times (Recalculating the Match Timeline does that).

**Reset Results**:
The action that clears the Qualification Round, all Match results, and the Elimination Bracket, while preserving the Team roster. Re-enables the Pairing Draw. Requires confirming a dialog (naming what is cleared and that the Team roster is kept) before it takes effect.

**New Tournament**:
The action that clears everything — Team roster included — starting completely over. Requires confirming a dialog (making clear the Team roster is also discarded) before it takes effect.
_Avoid_: Reset — ambiguous between this and Reset Results; always say which one.
