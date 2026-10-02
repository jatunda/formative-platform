import { generateQualificationMatches } from './pairing-draw.js';
import { buildBracket } from './bracket.js';

let idCounter = 0;
function generateId(prefix) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/**
 * The blank Tournament state: no Teams, default Qualification/Timeline
 * config, no Elimination Bracket. See web/robotics/CONTEXT.md for the
 * vocabulary behind every field here.
 * @returns {object}
 */
export function createInitialState() {
  return {
    teams: [],
    qualification: {
      matchesPerTeam: 3,
      matches: [],
      pinnedMatchIndex: null,
    },
    timeline: {
      mode: 'forward',
      startTime: null,
      endTime: null,
      matchDurationMin: 4,
      gapMin: 1,
      fieldCount: 1,
      estimatedBracketSize: 8,
      estimatedThirdPlace: true,
    },
    elimination: {
      bracketSize: null,
      includeThirdPlace: true,
      alliances: [],
      seeds: {},
      bracket: null,
    },
  };
}

// ---- Teams ----

export function addTeam(state, { name, members = [] }) {
  const team = { id: generateId('team'), name, members: [...members] };
  return { ...state, teams: [...state.teams, team] };
}

export function updateTeam(state, teamId, patch) {
  return {
    ...state,
    teams: state.teams.map((t) => (t.id === teamId ? { ...t, ...patch } : t)),
  };
}

export function removeTeam(state, teamId) {
  return { ...state, teams: state.teams.filter((t) => t.id !== teamId) };
}

// ---- Qualification ----

export function setMatchesPerTeam(state, matchesPerTeam) {
  return { ...state, qualification: { ...state.qualification, matchesPerTeam } };
}

/** Regenerating matchups is destructive, so it's locked once any Qualification Match is complete. */
export function canRegenerateMatchups(state) {
  return state.qualification.matches.every((m) => !m.completed);
}

export function regenerateMatchups(state, { random } = {}) {
  if (!canRegenerateMatchups(state)) {
    throw new Error('Cannot regenerate matchups once a Qualification Match is complete. Reset results first.');
  }
  const raw = generateQualificationMatches(state.teams, state.qualification.matchesPerTeam, random ? { random } : {});
  const matches = raw.map((m) => ({
    id: generateId('qm'),
    allianceA: m.allianceA,
    allianceB: m.allianceB,
    scoreA: null,
    scoreB: null,
    completed: false,
    noShow: {},
  }));
  return { ...state, qualification: { ...state.qualification, matches, pinnedMatchIndex: null } };
}

export function recordQualificationResult(state, matchIndex, { scoreA, scoreB }) {
  const matches = state.qualification.matches.map((m, i) =>
    i === matchIndex ? { ...m, scoreA, scoreB, completed: true } : m
  );
  const pinnedMatchIndex = state.qualification.pinnedMatchIndex === matchIndex ? null : state.qualification.pinnedMatchIndex;
  return { ...state, qualification: { ...state.qualification, matches, pinnedMatchIndex } };
}

export function setQualificationNoShow(state, matchIndex, teamId, flag) {
  const matches = state.qualification.matches.map((m, i) => {
    if (i !== matchIndex) return m;
    const noShow = { ...m.noShow };
    if (flag) noShow[teamId] = true;
    else delete noShow[teamId];
    return { ...m, noShow };
  });
  return { ...state, qualification: { ...state.qualification, matches } };
}

export function pinCurrentMatch(state, matchIndex) {
  return { ...state, qualification: { ...state.qualification, pinnedMatchIndex: matchIndex } };
}

export function clearPinnedMatch(state) {
  return { ...state, qualification: { ...state.qualification, pinnedMatchIndex: null } };
}

// ---- Timeline ----

export function setTimelineConfig(state, patch) {
  return { ...state, timeline: { ...state.timeline, ...patch } };
}

// ---- Elimination ----

export function formPlayoffAlliance(state, teamIdA, teamIdB) {
  const alreadyUsed = new Set(state.elimination.alliances.flatMap((a) => a.teamIds));
  if (alreadyUsed.has(teamIdA) || alreadyUsed.has(teamIdB)) {
    throw new Error('A team can only belong to one Playoff Alliance.');
  }
  const alliance = { id: generateId('alliance'), teamIds: [teamIdA, teamIdB] };
  return { ...state, elimination: { ...state.elimination, alliances: [...state.elimination.alliances, alliance] } };
}

export function removePlayoffAlliance(state, allianceId) {
  const seeds = { ...state.elimination.seeds };
  for (const [seedNum, id] of Object.entries(seeds)) {
    if (id === allianceId) delete seeds[seedNum];
  }
  return {
    ...state,
    elimination: {
      ...state.elimination,
      alliances: state.elimination.alliances.filter((a) => a.id !== allianceId),
      seeds,
    },
  };
}

export function setBracketConfig(state, { bracketSize, includeThirdPlace }) {
  return { ...state, elimination: { ...state.elimination, bracketSize, includeThirdPlace } };
}

export function setSeed(state, seedNumber, allianceId) {
  return { ...state, elimination: { ...state.elimination, seeds: { ...state.elimination.seeds, [seedNumber]: allianceId } } };
}

export function generateBracket(state) {
  const { bracketSize, seeds, includeThirdPlace } = state.elimination;
  if (!bracketSize || bracketSize < 2) {
    throw new Error('Bracket Size must be at least 2 before generating the Elimination Bracket.');
  }
  const seedList = [];
  for (let i = 1; i <= bracketSize; i++) {
    if (!seeds[i]) {
      throw new Error(`Seed ${i} has no Playoff Alliance assigned.`);
    }
    seedList.push(seeds[i]);
  }
  const bracket = buildBracket({ bracketSize, seeds: seedList, includeThirdPlace });
  return { ...state, elimination: { ...state.elimination, bracket } };
}

export function recordEliminationResult(state, matchId, { scoreA, scoreB }) {
  const bracket = {
    ...state.elimination.bracket,
    matches: state.elimination.bracket.matches.map((m) =>
      m.id === matchId ? { ...m, scoreA, scoreB, completed: true } : m
    ),
  };
  return { ...state, elimination: { ...state.elimination, bracket } };
}

export function setEliminationNoShow(state, matchId, teamId, flag) {
  const bracket = {
    ...state.elimination.bracket,
    matches: state.elimination.bracket.matches.map((m) => {
      if (m.id !== matchId) return m;
      const noShow = { ...m.noShow };
      if (flag) noShow[teamId] = true;
      else delete noShow[teamId];
      return { ...m, noShow };
    }),
  };
  return { ...state, elimination: { ...state.elimination, bracket } };
}

// ---- Resets ----

/** Reset Results: clears Qualification/Elimination state, keeps the Team roster. */
export function resetResults(state) {
  const fresh = createInitialState();
  return { ...fresh, teams: state.teams };
}

/** New Tournament: clears everything, including the Team roster. */
export function newTournament(_state) {
  return createInitialState();
}
