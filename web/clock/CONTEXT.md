# School Clock

A public, client-side clock page for every teacher at the school (not just the Formative Platform's one teacher): it knows the day's Bell Schedule, shows where the school day stands, and runs classroom timers and alarms. No login, no database — everything it knows about the school year is fixed in the page itself, and everything a teacher sets lives only on their own device.

See `CONTEXT-MAP.md` at the repo root for how this context relates to the others. In particular, **Schedule** and **Class** in the root `CONTEXT.md` mean unrelated things (a Class's sequence of Lessons; a course section) and are never used here.

## Language

**Bell Schedule**:
A named, ordered set of Segments with start and end times that a School Day can follow (e.g. All Day, Even Day, Late Start Even). A Bell Schedule is a template, not tied to any date — many School Days follow the same one.
_Avoid_: Schedule alone — it collides with the root context's Schedule (a Class's Lessons by Day Index).

**Segment**:
One named span of time within a Bell Schedule, with a start and an end — the clock counts every Segment down. Every Segment is exactly one of a Period, a Break, or an Assembly.

**Period**:
A Segment where teachers teach in their own rooms: the numbered Periods (Period 1 through Period 7), Seminar, and Super Seminar. A finals-day exam block is the Period it's named for. A teacher may give a Period a Period Label.
_Avoid_: Class — in the root context that's a course section; here it would wrongly suggest a Period belongs to one teacher's course. Also avoid using Period for Nutrition or Lunch (those are Breaks) or for Chapel (an Assembly).

**Break**:
A Segment with no class: Nutrition and Lunch.

**Assembly**:
A Segment where the school gathers outside regular rooms: Chapel, Convocation, Pep Rally.

**Period Label**:
A teacher's own name for one of their Periods ("AP CSA", "Prep"), shown alongside the Period's name wherever the clock names that Period — including "up next" during a Passing Period.

**Passing Period**:
The gap between the end of one Segment and the start of the next. Not named or listed in a Bell Schedule — it exists implicitly wherever two consecutive Segments don't touch (a zero-minute gap is not a Passing Period). Always shows which Segment is up next.

**Block Day**:
A School Day whose Bell Schedule has long (about 85-minute) Periods: Even, Odd, Late Start Even, and HS Super Seminar Even.

**School Day**:
A calendar date on which school is in session, together with the Bell Schedule it follows. Every date that isn't a School Day — weekend, holiday, break, in-service day — still gets a Day Label saying what it is.

**Day Label**:
The name shown on the clock for what kind of day today is: the Bell Schedule's name on a School Day, or the reason there's no school (Weekend, Labor Day, Thanksgiving Break, Teacher In-Service).

**Experience Week**:
A week (HS Experience Week) when school is in session but there are no Segments — everyone is on trips or their own projects. The clock names it rather than showing a Bell Schedule. Not counted as a School Day for countdowns.

**Weekday Default**:
The Bell Schedule a School Day follows when no Calendar Exception names that date — one per weekday (Monday through Friday). Weekends are never School Days unless a Calendar Exception says so.

**Calendar Exception**:
A date in the school year whose day differs from its Weekday Default: either no school (holiday, break) or a different Bell Schedule (minimum day, rally schedule).

**Summer**:
The stretch from the end of the last Segment of a School Year's last School Day to the first School Day of the next. The clock counts the days of Summer so far, and counts down to the next first day once that School Year's dates are known.

**School Year**:
The span of dates that one set of Weekday Defaults and Calendar Exceptions covers. A date outside every known School Year has no Bell Schedule; the clock still tells time but can't say anything about Periods.

**Off-Hours**:
Any time outside a School Day's first-Period-start to last-Period-end span — before school, after school, and all of a non-School Day. Passing Periods and Breaks are not Off-Hours.

**Next School Day**:
From any moment in Off-Hours, the soonest School Day whose first Segment hasn't started yet.

**Division**:
Middle School (MS) or High School (HS). The two Divisions share most Bell Schedules but not all — on some days (an Even Day, a Pep Rally day) the same named Bell Schedule has a different Period order or different Periods for each Division, and some days are School Days for one Division but not the other.

**Readout**:
One displayed number on the clock screen, with its own mode (e.g. time left in the Period, time since it started, current time). A screen can show several Readouts at once, each switched independently. During Off-Hours a Readout's modes become their Off-Hours counterparts (until the Next School Day, since school ended, current time).

**Alarm**:
Any sound a teacher sets up to ring. Always one of two kinds: a Clock Alarm or a Period Alarm.
_Avoid_: Bell, for anything a teacher creates — Bells (below) are the one built-in set.

**Clock Alarm**:
An Alarm that rings at a fixed time of day, either once or on every School Day.

**Period Alarm**:
An Alarm that rings at a point within a Period: counted from its start ("at minute 40"), back from its end ("5 minutes before the end"), or at its halfway point. Applies only to Periods (never Breaks or Assemblies), optionally narrowed to chosen Periods and chosen Bell Schedules (e.g. Block Days only). Repeats on every Period it applies to.

**Bells**:
The built-in sounds at the start and end of every Period and Break (not Assemblies), turned on or off as a whole. Where one Segment ends exactly as the next begins, they ring once. Unlike a Period Alarm, Bells also cover Breaks.
