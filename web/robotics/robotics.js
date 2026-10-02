import { createLocalStorageAdapter } from './storage.js';
import {
  createInitialState,
  addTeam,
  updateTeam,
  removeTeam,
  setMatchesPerTeam,
  canRegenerateMatchups,
  regenerateMatchups,
  recordQualificationResult,
  setQualificationNoShow,
  pinCurrentMatch,
  clearPinnedMatch,
  setTimelineConfig,
  formPlayoffAlliance,
  removePlayoffAlliance,
  setBracketConfig,
  setSeed,
  generateBracket,
  recordEliminationResult,
  setEliminationNoShow,
  resetResults,
  newTournament,
} from './state.js';
import { computeMatchTime, computeTotalDurationMinutes, computeStartTimeFromEndTime, estimateEliminationMatchCount } from './match-timeline.js';
import { computeStandings } from './standings.js';
import { resolveMatchSides, getMatchWinner } from './bracket.js';
import { getCurrentMatchIndex, getUpNextMatchIndex } from './current-match.js';
import { exportStandingsMarkdown, exportMatchesMarkdown, exportRosterMarkdown } from './markdown-export.js';

const TABS = [
  { key: 'teams', label: 'Teams' },
  { key: 'schedule', label: 'Schedule / Swiss Live' },
  { key: 'standings', label: 'Standings' },
  { key: 'finals', label: 'Finals' },
];

// ---- Selectors ----

export function teamName(state, teamId) {
  return state.teams.find((t) => t.id === teamId)?.name ?? '(unknown team)';
}

function allianceTeamNames(state, teamIds) {
  return teamIds.map((id) => teamName(state, id)).join(' & ');
}

function playoffAllianceTeamIds(state, allianceId) {
  return state.elimination.alliances.find((a) => a.id === allianceId)?.teamIds ?? [];
}

function playoffAllianceLabel(state, allianceId) {
  const teamIds = playoffAllianceTeamIds(state, allianceId);
  return teamIds.length ? allianceTeamNames(state, teamIds) : '(unassigned)';
}

/**
 * All matches (Qualification then Elimination, Byes excluded since they
 * occupy no time slot) in schedule order, each annotated with its global
 * index for Match Time purposes.
 */
export function getAllMatchesInScheduleOrder(state) {
  const entries = state.qualification.matches.map((match, i) => ({ kind: 'qualification', match, qualIndex: i }));
  if (state.elimination.bracket) {
    const order = { 'third-place': Infinity - 1, final: Infinity };
    const sortedElimMatches = [...state.elimination.bracket.matches]
      .filter((m) => !m.isBye)
      .sort((a, b) => {
        const aKey = typeof a.round === 'number' ? a.round : order[a.round];
        const bKey = typeof b.round === 'number' ? b.round : order[b.round];
        return aKey - bKey || a.slot - b.slot;
      });
    for (const match of sortedElimMatches) {
      entries.push({ kind: 'elimination', match });
    }
  }
  return entries.map((entry, globalIndex) => ({ ...entry, globalIndex }));
}

/** Rank formed Playoff Alliances by the better (lower-index) Standings rank of their two Teams. */
export function autoFillSeedsFromStandings(state) {
  const standings = computeStandings(state.teams, state.qualification.matches);
  const rankOf = new Map(standings.map((s, i) => [s.teamId, i]));
  const ranked = [...state.elimination.alliances].sort((a, b) => {
    const bestA = Math.min(...a.teamIds.map((id) => rankOf.get(id) ?? Infinity));
    const bestB = Math.min(...b.teamIds.map((id) => rankOf.get(id) ?? Infinity));
    return bestA - bestB;
  });
  let next = state;
  ranked.forEach((alliance, i) => {
    next = setSeed(next, i + 1, alliance.id);
  });
  return next;
}

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text);
  }
}

function formatTime(epochMs) {
  if (!epochMs) return '--';
  return new Date(epochMs).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

// ---- Small DOM helpers ----

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'className') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value);
  });
  children.forEach((child) => node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child));
  return node;
}

// ---- Tab: Teams ----

export function renderTeamsTab(state, dispatch) {
  const section = el('div', { className: 'robotics-section' });

  const nameInput = el('input', { placeholder: 'Team name' });
  const membersInput = el('input', { placeholder: 'Members (comma-separated)' });
  const addBtn = el('button', {
    onClick: () => {
      if (!nameInput.value.trim()) return;
      const members = membersInput.value.split(',').map((m) => m.trim()).filter(Boolean);
      dispatch((s) => addTeam(s, { name: nameInput.value.trim(), members }));
    },
  }, ['Add Team']);
  section.appendChild(el('div', { className: 'robotics-card' }, [nameInput, membersInput, addBtn]));

  const list = el('div', { className: 'robotics-card' });
  state.teams.forEach((team) => {
    const row = el('div', { className: 'robotics-match-row' }, [
      el('strong', {}, [team.name]),
      el('span', {}, [team.members.join(', ')]),
      el('button', { onClick: () => dispatch((s) => removeTeam(s, team.id)) }, ['Remove']),
    ]);
    list.appendChild(row);
  });
  section.appendChild(list);

  const config = el('div', { className: 'robotics-card' });
  const matchesPerTeamInput = el('input', { type: 'number', value: state.qualification.matchesPerTeam });
  matchesPerTeamInput.addEventListener('change', () => {
    dispatch((s) => setMatchesPerTeam(s, parseInt(matchesPerTeamInput.value, 10) || 1));
  });
  config.appendChild(el('label', {}, ['Matches per team: ', matchesPerTeamInput]));

  const regenerateBtn = el('button', {
    onClick: () => dispatch((s) => regenerateMatchups(s)),
  }, ['Regenerate Matchups']);
  regenerateBtn.disabled = !canRegenerateMatchups(state);
  config.appendChild(regenerateBtn);

  config.appendChild(el('button', { onClick: () => dispatch((s) => resetResults(s)) }, ['Reset Results']));
  config.appendChild(el('button', { onClick: () => dispatch((s) => newTournament(s)) }, ['New Tournament']));
  config.appendChild(el('button', { onClick: () => copyToClipboard(exportRosterMarkdown(state.teams)) }, ['Copy Roster to Clipboard']));

  section.appendChild(config);
  return section;
}

// ---- Tab: Schedule / Swiss Live ----

function renderMatchRow(state, dispatch, entry, { currentIndex, upNextIndex }) {
  const { match, qualIndex } = entry;
  const isQual = entry.kind === 'qualification';
  const isCurrent = isQual && qualIndex === currentIndex;
  const isUpNext = isQual && qualIndex === upNextIndex;

  const classNames = ['robotics-match-row'];
  if (isCurrent) classNames.push('is-current');
  if (isUpNext) classNames.push('is-up-next');
  if (match.completed) classNames.push('is-complete');

  const row = el('div', { className: classNames.join(' ') });
  row.appendChild(el('span', {}, [formatTime(computeMatchTime(state.timeline, entry.globalIndex))]));
  row.appendChild(el('span', {}, [allianceTeamNames(state, match.allianceA)]));
  const scoreA = el('input', { type: 'number', className: 'robotics-score-input', value: match.scoreA ?? '' });
  row.appendChild(scoreA);
  row.appendChild(el('span', {}, ['vs']));
  const scoreB = el('input', { type: 'number', className: 'robotics-score-input', value: match.scoreB ?? '' });
  row.appendChild(scoreB);
  row.appendChild(el('span', {}, [allianceTeamNames(state, match.allianceB)]));

  match.allianceA.concat(match.allianceB).forEach((teamId) => {
    const checkbox = el('input', { type: 'checkbox' });
    checkbox.checked = !!match.noShow[teamId];
    checkbox.addEventListener('change', () => {
      dispatch((s) => setQualificationNoShow(s, qualIndex, teamId, checkbox.checked));
    });
    row.appendChild(el('label', {}, [checkbox, `${teamName(state, teamId)} no-show`]));
  });

  row.appendChild(el('button', {
    onClick: () => dispatch((s) => recordQualificationResult(s, qualIndex, {
      scoreA: parseInt(scoreA.value, 10) || 0,
      scoreB: parseInt(scoreB.value, 10) || 0,
    })),
  }, [match.completed ? 'Save Edit' : 'Mark Complete']));

  if (match.completed) {
    row.appendChild(el('span', { className: 'robotics-complete-badge' }, ['✓ Complete']));
  }

  if (!match.completed && !isCurrent) {
    row.appendChild(el('button', { onClick: () => dispatch((s) => pinCurrentMatch(s, qualIndex)) }, ['Set as Current']));
  }

  if (isCurrent && state.qualification.pinnedMatchIndex === qualIndex) {
    row.appendChild(el('button', { onClick: () => dispatch((s) => clearPinnedMatch(s)) }, ['Clear Pin (back to automatic)']));
  }

  return row;
}

export function renderScheduleTab(state, dispatch) {
  const section = el('div', { className: 'robotics-section' });

  const timelineCard = el('div', { className: 'robotics-card' });
  const modeSelect = el('select', {});
  ['forward', 'backward'].forEach((mode) => {
    const opt = el('option', { value: mode }, [mode === 'forward' ? 'Forward (start time)' : 'Backward (end time)']);
    if (state.timeline.mode === mode) opt.setAttribute('selected', 'selected');
    modeSelect.appendChild(opt);
  });
  modeSelect.addEventListener('change', () => dispatch((s) => setTimelineConfig(s, { mode: modeSelect.value })));
  timelineCard.appendChild(el('label', {}, ['Mode: ', modeSelect]));

  if (state.timeline.mode === 'forward') {
    const startInput = el('input', { type: 'datetime-local' });
    startInput.addEventListener('change', () => {
      dispatch((s) => setTimelineConfig(s, { startTime: new Date(startInput.value).getTime() }));
    });
    timelineCard.appendChild(el('label', {}, ['Start time: ', startInput]));
  } else {
    const endInput = el('input', { type: 'datetime-local' });
    const estBracketInput = el('input', { type: 'number', value: state.timeline.estimatedBracketSize });
    const estThirdInput = el('input', { type: 'checkbox' });
    estThirdInput.checked = state.timeline.estimatedThirdPlace;
    const applyBtn = el('button', {
      onClick: () => {
        const endTime = new Date(endInput.value).getTime();
        const estimatedBracketSize = parseInt(estBracketInput.value, 10) || 2;
        const estimatedThirdPlace = estThirdInput.checked;
        const eliminationCount = state.elimination.bracket
          ? state.elimination.bracket.matches.filter((m) => !m.isBye).length
          : estimateEliminationMatchCount(estimatedBracketSize, estimatedThirdPlace);
        const totalMatches = state.qualification.matches.length + eliminationCount;
        const totalMinutes = computeTotalDurationMinutes(state.timeline, totalMatches);
        const startTime = computeStartTimeFromEndTime({ endTime }, totalMinutes);
        dispatch((s) => setTimelineConfig(s, { endTime, estimatedBracketSize, estimatedThirdPlace, startTime }));
      },
    }, ['Apply']);
    timelineCard.appendChild(el('label', {}, ['End time: ', endInput]));
    timelineCard.appendChild(el('label', {}, ['Estimated bracket size: ', estBracketInput]));
    timelineCard.appendChild(el('label', {}, [estThirdInput, 'Estimated third-place match']));
    timelineCard.appendChild(applyBtn);
  }

  const durationInput = el('input', { type: 'number', value: state.timeline.matchDurationMin });
  durationInput.addEventListener('change', () => dispatch((s) => setTimelineConfig(s, { matchDurationMin: parseInt(durationInput.value, 10) || 1 })));
  const gapInput = el('input', { type: 'number', value: state.timeline.gapMin });
  gapInput.addEventListener('change', () => dispatch((s) => setTimelineConfig(s, { gapMin: parseInt(gapInput.value, 10) || 0 })));
  const fieldInput = el('input', { type: 'number', value: state.timeline.fieldCount });
  fieldInput.addEventListener('change', () => dispatch((s) => setTimelineConfig(s, { fieldCount: parseInt(fieldInput.value, 10) || 1 })));
  timelineCard.appendChild(el('label', {}, ['Match duration (min): ', durationInput]));
  timelineCard.appendChild(el('label', {}, ['Gap (min): ', gapInput]));
  timelineCard.appendChild(el('label', {}, ['Field count: ', fieldInput]));
  section.appendChild(timelineCard);

  const currentIndex = getCurrentMatchIndex(state.qualification.matches, state.qualification.pinnedMatchIndex);
  const upNextIndex = getUpNextMatchIndex(state.qualification.matches, currentIndex);

  const matchList = el('div', { className: 'robotics-card' });
  const entries = getAllMatchesInScheduleOrder(state).filter((e) => e.kind === 'qualification');
  entries.forEach((entry) => matchList.appendChild(renderMatchRow(state, dispatch, entry, { currentIndex, upNextIndex })));
  section.appendChild(matchList);

  section.appendChild(el('button', {
    onClick: () => copyToClipboard(exportMatchesMarkdown(state.qualification.matches, state.teams)),
  }, ['Copy Match Data to Clipboard']));

  return section;
}

// ---- Tab: Standings ----

export function renderStandingsTab(state) {
  const section = el('div', { className: 'robotics-section' });
  const standings = computeStandings(state.teams, state.qualification.matches);

  const table = el('table');
  table.appendChild(el('tr', {}, ['Rank', 'Team', 'Members', 'W-L', 'Points'].map((h) => el('th', {}, [h]))));
  standings.forEach((entry, i) => {
    const team = state.teams.find((t) => t.id === entry.teamId);
    table.appendChild(el('tr', {}, [
      el('td', {}, [String(i + 1)]),
      el('td', {}, [team?.name ?? '(unknown)']),
      el('td', {}, [(team?.members ?? []).join(', ')]),
      el('td', {}, [`${entry.wins}-${entry.losses}`]),
      el('td', {}, [String(entry.points)]),
    ]));
  });
  section.appendChild(table);

  section.appendChild(el('button', {
    onClick: () => copyToClipboard(exportStandingsMarkdown(standings, state.teams)),
  }, ['Copy Standings to Clipboard']));

  return section;
}

// ---- Tab: Finals ----

function renderBracketMatch(state, dispatch, match) {
  const sides = resolveMatchSides(state.elimination.bracket, match.id);
  const card = el('div', { className: 'robotics-card' });
  if (match.isBye) {
    card.appendChild(el('div', {}, [`BYE → ${playoffAllianceLabel(state, sides.allianceA ?? sides.allianceB)}`]));
    return card;
  }
  card.appendChild(el('div', {}, [sides.allianceA ? playoffAllianceLabel(state, sides.allianceA) : 'TBD']));
  const scoreA = el('input', { type: 'number', className: 'robotics-score-input', value: match.scoreA ?? '' });
  const scoreB = el('input', { type: 'number', className: 'robotics-score-input', value: match.scoreB ?? '' });
  card.appendChild(scoreA);
  card.appendChild(el('span', {}, ['vs']));
  card.appendChild(scoreB);
  card.appendChild(el('div', {}, [sides.allianceB ? playoffAllianceLabel(state, sides.allianceB) : 'TBD']));

  [sides.allianceA, sides.allianceB].filter(Boolean).forEach((allianceId) => {
    playoffAllianceTeamIds(state, allianceId).forEach((teamId) => {
      const checkbox = el('input', { type: 'checkbox' });
      checkbox.checked = !!match.noShow[teamId];
      checkbox.addEventListener('change', () => {
        dispatch((s) => setEliminationNoShow(s, match.id, teamId, checkbox.checked));
      });
      card.appendChild(el('label', {}, [checkbox, `${teamName(state, teamId)} no-show`]));
    });
  });

  card.appendChild(el('button', {
    onClick: () => dispatch((s) => recordEliminationResult(s, match.id, {
      scoreA: parseInt(scoreA.value, 10) || 0,
      scoreB: parseInt(scoreB.value, 10) || 0,
    })),
  }, [match.completed ? 'Save Edit' : 'Mark Complete']));
  if (match.completed) card.appendChild(el('span', { className: 'robotics-complete-badge' }, ['✓ Complete']));
  return card;
}

function renderBracket(state, dispatch) {
  const bracket = state.elimination.bracket;
  const container = el('div', { className: 'robotics-bracket' });
  const roundKeys = [...new Set(bracket.matches.map((m) => m.round))].sort((a, b) => {
    const order = { 'third-place': Infinity - 1, final: Infinity };
    const aKey = typeof a === 'number' ? a : order[a];
    const bKey = typeof b === 'number' ? b : order[b];
    return aKey - bKey;
  });
  roundKeys.forEach((round) => {
    const col = el('div', { className: 'robotics-bracket-round' }, [el('h4', {}, [round === 'final' ? 'Final' : round === 'third-place' ? 'Third Place' : `Round ${round}`])]);
    bracket.matches.filter((m) => m.round === round).forEach((m) => col.appendChild(renderBracketMatch(state, dispatch, m)));
    container.appendChild(col);
  });
  const winner = getMatchWinner(bracket, bracket.matches.find((m) => m.round === 'final').id);
  if (winner) {
    container.appendChild(el('div', { className: 'robotics-card' }, [`🏆 Champion: ${playoffAllianceLabel(state, winner)}`]));
  }
  return container;
}

export function renderFinalsTab(state, dispatch) {
  const section = el('div', { className: 'robotics-section' });

  const usedTeamIds = new Set(state.elimination.alliances.flatMap((a) => a.teamIds));
  const available = state.teams.filter((t) => !usedTeamIds.has(t.id));

  const selectionCard = el('div', { className: 'robotics-card' });
  const selectA = el('select', {});
  const selectB = el('select', {});
  available.forEach((team, i) => {
    selectA.appendChild(el('option', { value: team.id }, [team.name]));
    const optionB = el('option', { value: team.id }, [team.name]);
    if (i === 1) optionB.setAttribute('selected', 'selected');
    selectB.appendChild(optionB);
  });
  selectionCard.appendChild(el('label', {}, ['Team A: ', selectA]));
  selectionCard.appendChild(el('label', {}, ['Team B: ', selectB]));
  selectionCard.appendChild(el('button', {
    onClick: () => {
      if (!selectA.value || !selectB.value || selectA.value === selectB.value) return;
      dispatch((s) => formPlayoffAlliance(s, selectA.value, selectB.value));
    },
  }, ['Form Alliance']));
  section.appendChild(selectionCard);

  const alliancesCard = el('div', { className: 'robotics-card' });
  state.elimination.alliances.forEach((alliance) => {
    alliancesCard.appendChild(el('div', { className: 'robotics-match-row' }, [
      el('span', {}, [allianceTeamNames(state, alliance.teamIds)]),
      el('button', { onClick: () => dispatch((s) => removePlayoffAlliance(s, alliance.id)) }, ['Remove']),
    ]));
  });
  section.appendChild(alliancesCard);

  const bracketConfigCard = el('div', { className: 'robotics-card' });
  const sizeInput = el('input', { type: 'number', min: '2', value: state.elimination.bracketSize ?? '' });
  const thirdPlaceInput = el('input', { type: 'checkbox' });
  thirdPlaceInput.checked = state.elimination.includeThirdPlace;
  bracketConfigCard.appendChild(el('label', {}, ['Bracket size: ', sizeInput]));
  bracketConfigCard.appendChild(el('label', {}, [thirdPlaceInput, 'Include third-place match']));
  bracketConfigCard.appendChild(el('button', {
    onClick: () => dispatch((s) => setBracketConfig(s, { bracketSize: parseInt(sizeInput.value, 10) || null, includeThirdPlace: thirdPlaceInput.checked })),
  }, ['Save Bracket Config']));
  section.appendChild(bracketConfigCard);

  if (state.elimination.bracketSize) {
    const seedsCard = el('div', { className: 'robotics-card' });
    for (let seedNum = 1; seedNum <= state.elimination.bracketSize; seedNum++) {
      const select = el('select', {});
      select.appendChild(el('option', { value: '' }, ['(unassigned)']));
      state.elimination.alliances.forEach((alliance) => {
        const opt = el('option', { value: alliance.id }, [allianceTeamNames(state, alliance.teamIds)]);
        if (state.elimination.seeds[seedNum] === alliance.id) opt.setAttribute('selected', 'selected');
        select.appendChild(opt);
      });
      select.addEventListener('change', () => dispatch((s) => setSeed(s, seedNum, select.value || null)));
      seedsCard.appendChild(el('label', {}, [`Seed ${seedNum}: `, select]));
    }
    seedsCard.appendChild(el('button', { onClick: () => dispatch((s) => autoFillSeedsFromStandings(s)) }, ['Auto-fill Seeds from Standings']));
    seedsCard.appendChild(el('button', { onClick: () => dispatch((s) => generateBracket(s)) }, ['Generate Bracket']));
    section.appendChild(seedsCard);
  }

  if (state.elimination.bracket) {
    section.appendChild(renderBracket(state, dispatch));
  }

  return section;
}

// ---- App shell ----

export function renderApp(state, dispatch, activeTab, setActiveTab) {
  const app = el('div', { className: 'robotics-app' });
  const tabs = el('nav', { className: 'robotics-tabs' });
  TABS.forEach(({ key, label }) => {
    const btn = el('button', {
      className: `robotics-tab-btn${key === activeTab ? ' active' : ''}`,
      onClick: () => setActiveTab(key),
    }, [label]);
    tabs.appendChild(btn);
  });
  app.appendChild(tabs);

  const renderers = {
    teams: renderTeamsTab,
    schedule: renderScheduleTab,
    standings: renderStandingsTab,
    finals: renderFinalsTab,
  };
  app.appendChild(renderers[activeTab](state, dispatch));
  return app;
}

export function initRoboticsApp({ mountId = 'roboticsApp', storageKey = 'robotics-tournament-state' } = {}) {
  const mount = document.getElementById(mountId);
  if (!mount) return null;

  const storage = createLocalStorageAdapter(storageKey);
  let state = storage.load() ?? createInitialState();
  let activeTab = 'teams';

  function render() {
    mount.innerHTML = '';
    mount.appendChild(renderApp(state, dispatch, activeTab, setActiveTab));
  }

  function dispatch(updater) {
    state = updater(state);
    storage.save(state);
    render();
  }

  function setActiveTab(tab) {
    activeTab = tab;
    render();
  }

  render();
  return { getState: () => state, dispatch, setActiveTab };
}

if (typeof document !== 'undefined' && document.getElementById('roboticsApp')) {
  initRoboticsApp();
}
