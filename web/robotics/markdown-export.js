function teamName(teams, teamId) {
  return teams.find((t) => t.id === teamId)?.name ?? teamId;
}

function allianceLabel(teams, teamIds) {
  return teamIds.map((id) => teamName(teams, id)).join(' & ');
}

/**
 * Render Standings as a markdown table: rank, team, win-loss record, points.
 * @param {{teamId: string, wins: number, losses: number, points: number}[]} standings
 * @param {{id: string, name: string}[]} teams
 * @returns {string}
 */
export function exportStandingsMarkdown(standings, teams) {
  const lines = ['| Rank | Team | W-L | Points |', '| --- | --- | --- | --- |'];
  standings.forEach((entry, index) => {
    lines.push(`| ${index + 1} | ${teamName(teams, entry.teamId)} | ${entry.wins}-${entry.losses} | ${entry.points} |`);
  });
  return lines.join('\n');
}

/**
 * Render the match-by-match list as markdown, one line per match.
 * @param {{allianceA: string[], allianceB: string[], scoreA: number|null, scoreB: number|null, completed: boolean}[]} matches
 * @param {{id: string, name: string}[]} teams
 * @returns {string}
 */
export function exportMatchesMarkdown(matches, teams) {
  const lines = matches.map((match, index) => {
    const sideA = allianceLabel(teams, match.allianceA);
    const sideB = allianceLabel(teams, match.allianceB);
    const result = match.completed ? `${match.scoreA} - ${match.scoreB}` : 'not yet played';
    return `${index + 1}. ${sideA} vs ${sideB}: ${result}`;
  });
  return lines.join('\n');
}

/**
 * Render the team/member roster as markdown, one line per team:
 * "Team Name: Member1, Member2, ...".
 * @param {{name: string, members: string[]}[]} teams
 * @returns {string}
 */
export function exportRosterMarkdown(teams) {
  return teams.map((team) => `${team.name}: ${team.members.join(', ')}`).join('\n');
}

const PLACE_LABELS = { 1: '1st', 2: '2nd', 3: '3rd' };

/**
 * Render decided tournament placements as markdown: one block per place,
 * naming each Team with its Members listed on the line underneath.
 * @param {{place: number, teamIds: string[]}[]} placements
 * @param {{id: string, name: string, members: string[]}[]} teams
 * @returns {string}
 */
export function exportPlacementsMarkdown(placements, teams) {
  const blocks = placements.map(({ place, teamIds }) => {
    const label = PLACE_LABELS[place] ?? `${place}th`;
    const teamLines = teamIds.flatMap((teamId) => [
      teamName(teams, teamId),
      `  Members: ${(teams.find((t) => t.id === teamId)?.members ?? []).join(', ')}`,
    ]);
    return [`${label} Place:`, ...teamLines].join('\n');
  });
  return blocks.join('\n\n');
}
