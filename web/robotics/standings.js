import { qualificationTeamResult } from './match-result.js';

/**
 * Compute Standings: every Team ranked by record accumulated from completed
 * Qualification Matches. Ranking adapts to whether every Team that has played
 * at least one Qualification Match has played the same number of them (Teams
 * with zero Qualification Matches played don't count toward that check):
 * - Equal match counts ("raw" mode): ranked by Win Points desc (2 per win,
 *   1 per Tie, 0 per loss), tiebreak: cumulative Score desc - raw totals
 *   are already fair when every Team plays the same number of matches.
 * - Unequal match counts ("rate" mode): ranked by win percentage desc, where a
 *   Tie counts as half a win, tiebreak: average Score per match desc,
 *   since raw totals would otherwise favor whichever Team played more.
 * Each Team's win, loss or Tie comes from the shared "who won" rule
 * (`qualificationTeamResult`), so a No-Show Team still records a loss.
 * @param {{id: string}[]} teams
 * @param {{allianceA: string[], allianceB: string[], scoreA: number, scoreB: number, completed: boolean, noShow: Record<string, boolean>}[]} matches
 * @returns {{teamId: string, wins: number, losses: number, ties: number, winPoints: number, points: number, matchesPlayed: number, winRate: number, avgPoints: number, rankingMode: 'raw'|'rate'}[]}
 */
export function computeStandings(teams, matches) {
  const record = new Map(teams.map((t) => [t.id, { teamId: t.id, wins: 0, losses: 0, ties: 0, points: 0, matchesPlayed: 0 }]));

  for (const match of matches) {
    const sides = [
      { side: 'A', teamIds: match.allianceA, score: match.scoreA },
      { side: 'B', teamIds: match.allianceB, score: match.scoreB },
    ];

    for (const { side, teamIds, score } of sides) {
      for (const teamId of teamIds) {
        const entry = record.get(teamId);
        const result = qualificationTeamResult(match, side, teamId);
        if (!entry || result === null) continue;
        entry.points += score;
        entry.matchesPlayed += 1;
        if (result === 'win') entry.wins += 1;
        else if (result === 'loss') entry.losses += 1;
        else entry.ties += 1;
      }
    }
  }

  const playedCounts = [...record.values()].map((e) => e.matchesPlayed).filter((n) => n > 0);
  const rankingMode = playedCounts.every((n) => n === playedCounts[0]) ? 'raw' : 'rate';

  const entries = [...record.values()].map((entry) => ({
    ...entry,
    winPoints: 2 * entry.wins + entry.ties,
    winRate: entry.matchesPlayed > 0 ? (entry.wins + entry.ties / 2) / entry.matchesPlayed : 0,
    avgPoints: entry.matchesPlayed > 0 ? entry.points / entry.matchesPlayed : 0,
    rankingMode,
  }));

  return rankingMode === 'raw'
    ? entries.sort((a, b) => b.winPoints - a.winPoints || b.points - a.points)
    : entries.sort((a, b) => b.winRate - a.winRate || b.avgPoints - a.avgPoints);
}

/**
 * A Standings entry's record as shown on screen and in exports, e.g. `2-1-0`.
 * @param {{wins: number, losses: number, ties: number}} entry
 * @returns {string}
 */
export function formatRecord(entry) {
  return `${entry.wins}-${entry.losses}-${entry.ties}`;
}
