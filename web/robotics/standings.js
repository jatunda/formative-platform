/**
 * Compute Standings: every Team ranked by record accumulated from completed
 * Qualification Matches. Ranking adapts to whether every Team that has played
 * at least one Qualification Match has played the same number of them (Teams
 * with zero Qualification Matches played don't count toward that check):
 * - Equal match counts ("raw" mode): ranked by wins desc, ties broken by
 *   cumulative Score desc - this is the only mode possible when every Team
 *   plays the same number of matches, so raw totals are already fair.
 * - Unequal match counts ("rate" mode): ranked by win percentage desc, ties
 *   broken by average Score per match desc, since raw totals would otherwise
 *   favor whichever Team played more.
 * @param {{id: string}[]} teams
 * @param {{allianceA: string[], allianceB: string[], scoreA: number, scoreB: number, completed: boolean, noShow: Record<string, boolean>}[]} matches
 * @returns {{teamId: string, wins: number, losses: number, points: number, matchesPlayed: number, winRate: number, avgPoints: number, rankingMode: 'raw'|'rate'}[]}
 */
export function computeStandings(teams, matches) {
  const record = new Map(teams.map((t) => [t.id, { teamId: t.id, wins: 0, losses: 0, points: 0, matchesPlayed: 0 }]));

  for (const match of matches) {
    if (!match.completed) continue;
    const noShow = match.noShow || {};
    const sides = [
      { teamIds: match.allianceA, score: match.scoreA, opponentScore: match.scoreB },
      { teamIds: match.allianceB, score: match.scoreB, opponentScore: match.scoreA },
    ];

    for (const side of sides) {
      const won = side.score > side.opponentScore;
      const lost = side.score < side.opponentScore;
      for (const teamId of side.teamIds) {
        const entry = record.get(teamId);
        if (!entry) continue;
        entry.points += side.score;
        entry.matchesPlayed += 1;
        if (noShow[teamId]) {
          entry.losses += 1;
        } else if (won) {
          entry.wins += 1;
        } else if (lost) {
          entry.losses += 1;
        }
      }
    }
  }

  const playedCounts = [...record.values()].map((e) => e.matchesPlayed).filter((n) => n > 0);
  const rankingMode = playedCounts.every((n) => n === playedCounts[0]) ? 'raw' : 'rate';

  const entries = [...record.values()].map((entry) => ({
    ...entry,
    winRate: entry.matchesPlayed > 0 ? entry.wins / entry.matchesPlayed : 0,
    avgPoints: entry.matchesPlayed > 0 ? entry.points / entry.matchesPlayed : 0,
    rankingMode,
  }));

  return rankingMode === 'raw'
    ? entries.sort((a, b) => b.wins - a.wins || b.points - a.points)
    : entries.sort((a, b) => b.winRate - a.winRate || b.avgPoints - a.avgPoints);
}
