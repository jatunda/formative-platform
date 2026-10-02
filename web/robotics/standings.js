/**
 * Compute Standings: every Team ranked by win/loss record accumulated from
 * completed Qualification Matches, ties broken by cumulative Score.
 * @param {{id: string}[]} teams
 * @param {{allianceA: string[], allianceB: string[], scoreA: number, scoreB: number, completed: boolean, noShow: Record<string, boolean>}[]} matches
 * @returns {{teamId: string, wins: number, losses: number, points: number}[]}
 */
export function computeStandings(teams, matches) {
  const record = new Map(teams.map((t) => [t.id, { teamId: t.id, wins: 0, losses: 0, points: 0 }]));

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

  return [...record.values()].sort((a, b) => b.wins - a.wins || b.points - a.points);
}
