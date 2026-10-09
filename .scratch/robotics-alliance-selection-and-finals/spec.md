# Spec: Alliance Selection tab, live Finals view, and W-L-T Standings

Status: ready-for-agent
Labels: ready-for-agent

Domain vocabulary: `web/robotics/CONTEXT.md` (Robotics Tournament context). Terms added or changed during this design: **Tie**, **Win Points**, **Alliance Selection**, **Alliance Captain**, **Decline**, **Current Match** / **Up Next** (now covering the Elimination Bracket), **Seed** (formation order by default), **Bracket Size** (now caps Alliance Selection), **Discard Bracket**, **Reset Results** (now also clears Declines).

## Problem Statement

Running the playoff half of an in-class robotics Tournament is awkward on the projector:

- Playoff Alliances are formed by picking two Teams from dropdowns, buried in a collapsed "Playoff Setup" accordion on the Finals tab. Students can't see the Standings while alliances are being formed. Nothing shows which Teams are already taken, or whose turn it is to pick.
- Picking always continues until every Team is used up. There's no way to say "only 4 alliances advance".
- The Finals tab has no live focus. The teacher has to hunt through the bracket for the match being played, and the class can't see what's on now or what's next.
- The Seeds card is always visible on Finals, even though it's setup that's done once.
- The "Reveal Results →" button sits at the bottom of the page, below the bracket, with no visual weight.
- Standings show W-L, which hides Ties. A Tie silently counts as neither a win nor a loss, so a record can fail to add up to matches played. In uneven-match-count mode, a Tie counts the same as a loss toward Win %. On narrower layouts the W-L cell can also wrap onto two lines.
- The collapsed Match Timeline still shows a summary line and takes enough height that the full Standings for 8 Teams don't fit in the sidebar.

## Solution

**Alliance Selection becomes its own tab:** Teams | Schedule & Standings | **Alliance Selection** | Finals | Results.

- **Standings table:** the full Standings are projected, and each row shows one of these states:
  - In an alliance: grayed out, tagged "Alliance N"
  - Declined: badge
  - Alliance Captain: highlighted
  - Not advancing: muted tag, once selection is complete
  - Available: **Pick** and **Declined** buttons for the teacher
- **Captain banner:** "Team 3 is picking", with a one-turn override dropdown.
  - Picking forms an alliance between the Captain and the chosen Team.
  - Declined Teams can't be picked unless the teacher confirms an override.
- **Bracket Size** sits at the top of the tab, prefilled from the Estimated Bracket Size. Alliance Selection ends once that many alliances have formed.
- **Formed alliances** appear in a side list in Seed order. Seed order is the formation order, and can be reordered with ↑/↓ or removed.
- **Start Finals →** builds the Elimination Bracket and switches to the Finals tab. Once a Bracket exists, the tab locks and shows a "Finals in progress" card with **On to Finals →** and **Discard Bracket**.

**Finals becomes a live view:**

- **Top:** a big **Current Match** and a smaller **Up Next**, reusing the Qualification "Now Playing" display, where scores and No-Shows can be entered.
- **Below:** the bracket, filling the remaining screen height with its matches centered vertically.
- **When every Elimination Match has a winner,** the Current Match card becomes a boxed "**Playoffs complete**" card with **Reveal Results →**, styled like "Qualification Round complete".
- **No setup UI remains on Finals.**

**Standings:**

- Records show **W-L-T** on one line.
- Even-match-count mode ranks by **Win Points**: 2 per win, 1 per Tie, 0 per loss, with cumulative Score breaking ties.
- Uneven mode counts a Tie as half a win in Win %.

**Schedule & Standings:**

- The folded Match Timeline is a slim, title-only row.
- "On to Finals →" becomes "**On to Alliance Selection →**".

## User Stories

### Standings and Ties

1. As a teacher, I want each Team's record shown as W-L-T, so that Ties are visible and the record adds up to matches played.
2. As a student, I want to see how many matches my Team tied, so that I understand why we rank where we do.
3. As a teacher, I want a Tie to be worth half a win in rankings, so that a Team that tied isn't ranked as though it lost.
4. As a teacher, I want even-match-count Standings ranked by Win Points (2/1/0), then by cumulative Score, so that the ranking follows VEX convention.
5. As a teacher, I want uneven-match-count Standings to count a Tie as half a win in Win %, so that the rate mode is consistent with the raw mode.
6. As a teacher, I want a No-Show Team in a tied Qualification Match to still record a loss, so that No-Show stays a loss everywhere.
7. As a teacher, I want the W-L-T cell never to wrap onto two lines, so that the Standings table stays one row per Team and easy to read on the projector.
8. As a teacher, I want the copied Standings Markdown to show W-L-T too, so that exported data matches what's on screen.

### Match Timeline

9. As a teacher, I want the folded Match Timeline to collapse to a slim, title-only row, so that the full Standings for 8 Teams fit in the sidebar without scrolling.
10. As a teacher, I want to still unfold the Match Timeline from that slim row, so that timing controls remain one click away.

### Moving between phases

11. As a teacher, I want the "Qualification Round complete" card to say "On to Alliance Selection →" and take me to that tab, so that the next step in class is one click.
12. As a teacher, I want a dedicated Alliance Selection tab between Schedule & Standings and Finals, so that the tabs follow the order things happen in class.

### Alliance Selection: seeing the field

13. As a student, I want to see the full Standings while alliances are being formed, so that I can decide whom to pick.
14. As a student, I want Teams already in a Playoff Alliance grayed out and tagged with their alliance number, so that I can see at a glance who's taken.
15. As a student, I want the Alliance Captain's row highlighted and a banner saying "Team X is picking", so that everyone knows whose turn it is.
16. As a student, I want Teams that Declined to show a "Declined" badge, so that I know they can't be picked.
17. As a teacher, I want a notice when the Qualification Round isn't finished, saying that Standings and the Captain may still change, so that I can start Alliance Selection early knowingly, without being blocked.
18. As a student, I want Teams that won't advance to get a muted "not advancing" tag once all alliances are formed, so that the cut is clear.

### Alliance Selection: picking

19. As a teacher, I want the Alliance Captain to be the highest-ranked Team not yet in a Playoff Alliance by default, so that I don't have to work out whose turn it is.
20. As a teacher, I want to click **Pick** on an available Team to form an alliance with the current Captain, so that recording a pick is one click.
21. As a teacher, I want to mark an invited Team as **Declined**, so that the decline rule is recorded and visible.
22. As a teacher, I want a Decline to apply to every later Captain, not just the one who invited, so that it matches VEX's decline rule.
23. As a teacher, I want an **Undo** on a Declined Team, so that a mis-click is easy to reverse.
24. As a teacher, I want picking a Declined Team to ask a quick confirmation and then go ahead, so that I can override the decline rule when I need to.
25. As a teacher, I want a Decline to stay in place when an alliance is later removed, so that the record of who declined doesn't change behind my back.
26. As a teacher, I want a Team that Declined to still be able to become an Alliance Captain, so that declining doesn't knock a Team out of the playoffs.
27. As a teacher, I want to change the Captain for the current turn from the banner, so that I can handle an absent Team or a special case.
28. As a teacher, I want the Captain override to last only for one turn, so that a mistaken override can't affect later picks.
29. As a teacher, I want the newly formed alliance to briefly highlight in the alliance list, so that the class notices it was formed.
30. As a teacher, I want a **Form single-Team alliance** button, with no confirmation, when the Captain is the last available Team, so that an odd Team count is handled smoothly.
31. As a teacher, I want the banner to offer "pick a declined Team anyway" or a single-Team alliance when every remaining Team has Declined, so that selection never gets stuck.
32. As a teacher, I want manually forming a single-Team alliance through the Captain override to still ask a confirmation, so that I don't do it by accident.

### Alliance Selection: Bracket Size and Seeds

33. As a teacher, I want to set Bracket Size at the top of the Alliance Selection tab, so that I control how many alliances advance.
34. As a teacher, I want Bracket Size prefilled from the Estimated Bracket Size in Tournament Settings, so that I usually don't have to enter it again.
35. As a teacher, I want Alliance Selection to stop once Bracket Size alliances have formed, with a banner saying "All N alliances formed" and the Pick and Declined buttons inactive (clicking one shows a toast saying to raise Bracket Size), so that we don't run through every Team.
36. As a teacher, I want raising Bracket Size to resume picking, so that I can let more alliances in.
37. As a teacher, I want lowering Bracket Size below the number of alliances already formed to be refused, with a toast telling me to remove alliances first, so that alliances are never dropped silently.
38. As a teacher, I want the Third-Place Match checkbox on the Alliance Selection tab, so that all playoff setup lives in one place.
39. As a teacher, I want Seeds to follow the order alliances were formed in by default, so that seeding needs no extra step.
40. As a teacher, I want to reorder the alliance list with ↑/↓ to change Seeds, so that I can override seeding without per-seed dropdowns.
41. As a teacher, I want to remove an alliance from the list, so that I can fix a mistake before the Finals start. The Captain is then recomputed.

### Starting the Finals

42. As a teacher, I want one **Start Finals →** button that builds the Bracket and switches to the Finals tab, so that starting the playoffs is a single action.
43. As a teacher, I want Start Finals with fewer than 2 alliances to do nothing and show a toast saying why, so that I can't build an impossible bracket and I know what's missing.
44. As a teacher, I want Start Finals to warn me when fewer than Bracket Size alliances have formed and, if I confirm, shrink Bracket Size to match, so that I can start early on purpose.
45. As a teacher, I want Alliance Selection locked once a Bracket exists (no picks, Declines, removals, reorders, or Bracket Size changes), so that the Bracket can't end up pointing at alliances that no longer exist.
45a. As a teacher, I want clicking any locked or invalid control to show a toast explaining why it didn't work, so that I'm never left wondering why nothing happened.
46. As a teacher, I want a "Finals in progress" card on Alliance Selection with **On to Finals →**, so that I can get back to the bracket from this tab.
47. As a teacher, I want a secondary **Discard Bracket** button that asks a confirmation naming any Elimination results that will be lost, so that I can unlock Alliance Selection and redo the playoffs.
48. As a teacher, I want Discard Bracket to keep the alliances, Declines, and Seeds, and to reset the Podium reveal, so that redoing the playoffs only needs a small fix and a new Start Finals.

### Finals: live view

49. As a teacher, I want a big Current Match at the top of Finals, so that the class sees what's being played right now.
50. As a teacher, I want to enter scores, mark No-Shows, and mark the Current Match complete from the big display, so that I don't have to find it in the bracket.
51. As a teacher, I want the Current Match to be the first undecided Elimination Match in bracket order (by round, then slot; Third-Place Match before the Final; Byes skipped), so that it advances predictably.
52. As a teacher, I want a completed Elimination Match that ended in a Tie to stay Current until I fix its Score, so that I notice the playoffs can't move on.
53. As a student, I want a smaller Up Next beside the Current Match, so that the next Playoff Alliances can get ready.
54. As a student, I want an Up Next side that isn't decided yet to read "Winner of Round 2 · Match 1", so that I know where it comes from.
55. As a teacher, I want the big display and the bracket card to edit the same draft score, so that both always agree.
56. As a teacher, I want Match Time and Field shown on the Current and Up Next cards, as in the Qualification Round, so that timing stays visible.
57. As a teacher, I want the bracket to fill the rest of the screen height with its matches centered vertically, so that it looks balanced on the projector even late in the playoffs.
58. As a teacher, I want the Finals tab to have no setup UI, so that the bracket and the live match are the whole page.
59. As a teacher, I want Finals with no Bracket to say "Form alliances on the Alliance Selection tab", so that I know where to go.

### Results

60. As a teacher, I want the Current Match card to become a boxed "Playoffs complete" card with **Reveal Results →** above the bracket once every Elimination Match has a winner, so that the reveal is prominent and in the same spot I'm already looking.
61. As a teacher, I want the old Reveal Results button at the bottom of Finals removed, so that there's one obvious path to the Podium.

### Resets

62. As a teacher, I want Reset Results to also clear Declines and to say so in its confirmation ("alliances and declines"), so that a fresh run starts clean.
63. As a teacher, I want New Tournament to clear everything as before, Declines included.

## Implementation Decisions

### Standings and Ties

- Each Standings entry gains a `ties` count and a `winPoints` value (2W + T). A Qualification Match that's complete with equal Scores gives a Tie to every non-No-Show Team on both sides. A No-Show still records a loss.
- Raw mode sorts by Win Points, then cumulative Score.
- Rate mode's Win % becomes (W + ½T) / matches played, with average Score as the tiebreaker.
- The Standings display and the Markdown export both show `W-L-T`. The record cell is styled to never wrap.
- A draggable divider between the matches column and the sidebar was considered, but is deferred until `nowrap` alone turns out to be insufficient.

### New pure Alliance Selection module

The Alliance Selection rules live in one new pure module, beside standings and bracket. It holds no DOM code, and the rendering layer only asks it questions. Proposed interface (names indicative):

- `getAllianceCaptain(state)`: the highest-ranked Team in Standings not in a Playoff Alliance. Declined Teams are eligible. Returns null when selection is complete or no Teams are available.
- `getSelectionRowStatus(state, teamId)`: one of `in-alliance` (with alliance number), `captain`, `declined`, `available`, or `not-advancing`. A Team can be both Declined and Captain; the Captain status wins for highlighting.
- `isSelectionComplete(state)`: true when the number of alliances formed is at least the effective Bracket Size.
- `getEffectiveBracketSize(state)`: the explicit Bracket Size, or the Estimated Bracket Size from the Match Timeline settings when it isn't set.
- `getPickableTeams(state, captainId)`: available Teams other than the Captain, with a flag for Declined ones.

Ranking for the Captain comes from the same Standings computation the Standings tab uses, so the two can never disagree.

### State changes

These are pure `state → state` actions, following the existing state-module style. They are no-ops, not errors, when locked or when the reference doesn't match, consistent with the recent "setters no-op instead of throwing" changes.

- **Declines:** the elimination section gains `declinedTeamIds`. Actions are `declineTeam` and `undoDecline`. Older saved Tournaments have no such field; every reader treats a missing field as empty, since the app loads saved state as-is without merging defaults.
- **Seeds:** Seeds are derived from the order of the Playoff Alliance list; alliance N in the list is Seed N. The per-number `seeds` map and `setSeed` go away. A new `movePlayoffAlliance(state, allianceId, direction)` reorders the list. "Auto-fill Seeds from Standings" is removed.
- **Bracket Size:** setting a Bracket Size below the number of alliances already formed is refused (no-op), and the UI shows a toast explaining why. The Third-Place toggle moves with it.
- **Locking:** while `elimination.bracket` exists, the following actions are all no-ops:
  - `formPlayoffAlliance`, `removePlayoffAlliance`, `movePlayoffAlliance`
  - `declineTeam`, `undoDecline`
  - the Bracket Size and Third-Place config setter
- **`startFinals(state)`:** requires at least 2 alliances. If fewer than the effective Bracket Size have formed, it sets Bracket Size to the number formed (the UI confirms first). It then builds the Bracket from the first Bracket Size alliances in list order and resets the Podium reveal, as generating a bracket does today. It replaces the separate generate-bracket step in the UI.
- **`discardBracket(state)`:** clears the Bracket and resets the Podium reveal. Alliances, Declines, Bracket Size, and the Third-Place setting are kept.
- **`resetResults`** also clears `declinedTeamIds`. Its confirm dialog text adds "alliances and declines". `newTournament` is unchanged, since it already returns a blank state.

### Locked and invalid actions explain themselves

Follow the existing Regenerate Matchups pattern: a control whose action is locked or invalid stays visible and clickable. It is styled as inactive, and clicking it shows an error toast saying why, never a silent no-op or a hidden or disabled control. The reasons come from the pure Alliance Selection module, through one query such as `getAllianceSelectionBlockReason(state, action)` that returns a message or null. That way the state action's no-op and the UI's toast can't disagree. Messages, with wording indicative:

- **Bracket exists** (Pick, Declined, Undo, ↑/↓, Remove, Bracket Size, Third-Place): "Locked — the Finals have started. Discard Bracket to change alliances."
- **Selection complete** (Pick, Declined): "All N alliances are formed. Raise Bracket Size to keep picking."
- **Bracket Size lowered below the number formed:** "N alliances are already formed. Remove alliances before lowering Bracket Size below N." The input reverts to its saved value.
- **Start Finals with fewer than 2 alliances:** "Form at least 2 alliances before starting the Finals."

While locked, the Standings table and alliance list stay on screen, so the class still sees the final alliances. Their controls are inactive, and clicking one shows the toast.

### Captain override

The per-turn Captain override is temporary UI state in the render loop, not saved Tournament state. It is cleared whenever an alliance forms or the tab changes. Picking always calls the existing form-alliance action with an explicit Captain and partner. Picking a Declined partner goes through a confirm dialog first. Choosing the Captain themself as partner (the manual single-Team case) keeps the existing confirm. The automatic last-Team case skips it.

### Finals Current Match and Up Next

- New queries next to the existing current-match functions: the Elimination Current Match id is the first undecided Elimination Match in bracket order, and Up Next is the next undecided one after it. "Undecided" means no winner, so a completed Tie counts as undecided.
- Bracket order is the same order the schedule already uses for Elimination Matches. It is extracted so both share one definition.
- An undecided side is labelled "Winner of Round R · Match S", from the Match that feeds it. The existing logic for resolving each match's sides already knows the feeder Matches.

### Shared Now Playing display

- The Qualification Now Playing display (big Current Match + smaller Up Next, with score inputs, No-Show toggles, Mark Complete, and match meta) is generalized to take:
  - the match
  - its two sides' team lists
  - the score-draft and record-result actions
  - the No-Show action

  Qualification and Finals then use the same display. This follows the earlier unification of score controls across the two match kinds.
- The empty/finished card becomes generic too: "Qualification Round complete" with **On to Alliance Selection →**, or "Playoffs complete" with **Reveal Results →**, in the same boxed style.

### Tabs and layout

- **Tab list:** a new tab, key `alliance-selection`, labelled "Alliance Selection", goes between Schedule & Standings and Finals.
- **Phase:** the tournament phase already has an `alliance-selection` phase, so the status header needs no new phase.
- **Alliance Selection layout:** the Standings selection table is the main column. The side column holds the Bracket Size and Third-Place settings, the alliance list with ↑/↓ and Remove, and Start Finals, or the "Finals in progress" card when locked.
- **Finals layout:** a vertical flex column. The Now Playing area sits at the top. The bracket container grows to fill the remaining viewport height, and its round columns center their matches within that height. The "Playoff Setup" accordion and the Seeds card are removed from Finals.
- **Match Timeline accordion, when collapsed:** renders only its chevron and title, with no summary text and reduced padding. When expanded, it shows the full panel as now.
- **New-alliance highlight:** a short CSS animation on the newest alliance's list item. No toast, no confetti.

## Testing Decisions

- **What makes a good test here:** assert observable behavior through the public interface, never internal helpers or DOM structure that a reasonable refactor might change.
  - For state: given a Tournament state, calling an action or query yields the expected state or answer.
  - For the UI: after mounting the app and interacting the way the teacher would (clicking buttons by their visible text, choosing options), the expected text, row states, and active tab appear.
- **Seam 1, the pure tournament modules (unit tests):**
  - **Standings:**
    - Ties counted for both sides
    - No-Show in a Tie still counts as a loss
    - Win Points ordering, with Score as the tiebreaker
    - Rate mode counting a Tie as half
  - **Alliance Selection module:**
    - Captain is the highest-ranked available Team
    - Captain skips Teams in alliances but not Declined ones
    - the five row statuses
    - selection complete at Bracket Size
    - effective Bracket Size falling back to the estimate
    - missing `declinedTeamIds` treated as empty
  - **State actions:**
    - decline and undo
    - reorder alliances
    - every Alliance Selection action is a no-op while a Bracket exists
    - the block-reason query returns the right message (or null) for each action in each state
    - refusing a Bracket Size below the number of alliances formed
    - `startFinals`: needs 2 or more alliances, shrinks Bracket Size, seeds in list order, resets the Podium
    - `discardBracket`: keeps alliances, Declines, and settings
    - `resetResults` clears Declines
  - **Finals Current Match / Up Next:**
    - bracket order
    - Third-Place before the Final
    - Byes skipped
    - a completed Tie stays Current
    - null once the Bracket is complete
    - the "Winner of …" label source
- **Seam 2, the mounted app (DOM tests, same harness as the existing robotics app test, with its flush-render helper):**
  - tab order including Alliance Selection
  - the "On to Alliance Selection →" path
  - row states rendered (grayed / Declined / Captain / not-advancing)
  - Pick forms an alliance and the banner advances
  - the Declined-pick confirm
  - the Captain override for one turn
  - the last-Team single alliance
  - the Start Finals confirm when short, and the switch to Finals
  - the locked "Finals in progress" card and Discard Bracket
  - clicking each locked or invalid control shows its explanatory toast and leaves state unchanged
  - Finals Current Match scoring through the big display updating the bracket
  - the "Playoffs complete" card leading to Results
  - the slim folded Timeline shows no summary
  - W-L-T text in Standings
- **Prior art:** the existing robotics unit tests for standings, state, bracket, current-match, and tournament-status; and the robotics app DOM test, which mounts the app with a mocked storage adapter and drives it by button text.
- **Tests to replace:** tests covering "Auto-fill Seeds from Standings", per-seed dropdowns, and the Finals "Playoff Setup" accordion are replaced by the new behavior, not kept.
- **Coverage gate:** `npm run test:coverage` in `web/` must pass at or above the current thresholds. Every new branch, especially the lock no-ops and the Decline/override paths, needs a test.

## Out of Scope

- A draggable or resizable divider between the matches column and the Standings sidebar. Revisit only if `nowrap` on W-L-T isn't enough.
- A separate "Regenerate Bracket" button. Discard Bracket followed by Start Finals covers it.
- Enforcing that only the Captain can pick, or automatic "invite" workflows. The teacher records every pick.
- Reseeding between rounds, or any change to how the Bracket itself is built or advanced.
- Student-facing devices or live sync. This is still a single-device, projected app.
- Changing Estimated Bracket Size semantics or the backward Match Timeline calculation.

## Further Notes

- The glossary in `web/robotics/CONTEXT.md` was updated during the design session and is the source of truth for terms used here.
- This design keeps the "Playoff Alliances are always formed by explicit teacher choice" rule: the Alliance Captain is only a default the teacher can override.
- Saved Tournaments from before this change have a `seeds` map and no `declinedTeamIds`. Readers must cope with both. The Bracket in an existing saved Tournament already holds its own seed order, so ignoring the old `seeds` map is safe.
