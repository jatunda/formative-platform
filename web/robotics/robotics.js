import { createLocalStorageAdapter } from './storage.js';
import {
  createInitialState,
  addTeam,
  updateTeam,
  removeTeam,
  setMatchesPerTeam,
  canRegenerateMatchups,
  regenerateMatchups,
  hasEvenMatchCounts,
  suggestEvenMatchesPerTeam,
  recordQualificationResult,
  setQualificationNoShow,
  setQualificationDraftScore,
  canMoveQualificationMatch,
  reorderQualificationMatch,
  setTimelineConfig,
  formPlayoffAlliance,
  removePlayoffAlliance,
  setBracketConfig,
  setSeed,
  generateBracket,
  recordEliminationResult,
  setEliminationNoShow,
  setEliminationDraftScore,
  resetResults,
  newTournament,
  getRevealedPlaces,
  getNextPlaceToReveal,
  revealNextPlacement,
  replayReveal,
} from './state.js';
import { computeMatchTime, computeTotalDurationMinutes, computeStartTimeFromEndTime, estimateEliminationMatchCount, formatTimelineSummary } from './match-timeline.js';
import { computeStandings } from './standings.js';
import { resolveMatchSides, getMatchWinner, isBracketComplete, countUndecidedMatches, getPlacements } from './bracket.js';
import { launchConfetti } from './confetti.js';
import { getCurrentMatchIndex, getUpNextMatchIndex } from './current-match.js';
import { exportStandingsMarkdown, exportMatchesMarkdown, exportRosterMarkdown, exportPlacementsMarkdown } from './markdown-export.js';
import { createToastContainer, showToast } from './toast.js';
import { createConfirmDialogContainer, showConfirm } from './confirm-dialog.js';
import { getTournamentPhase, PHASE_LABELS, getMatchProgress, getCurrentMatchTime, getScheduleDrift, formatScheduleDrift } from './tournament-status.js';

const TABS = [
  { key: 'teams', label: 'Teams' },
  { key: 'schedule', label: 'Schedule & Standings' },
  { key: 'finals', label: 'Finals' },
  { key: 'results', label: 'Results' },
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
 * One side of a match (Qualification alliance or Elimination playoff alliance):
 * each team's name is its own click target toggling that team's No-Show flag,
 * joined with " & "; the whole side gets `is-winner` once the match is decided.
 * `color` is the side's alliance color: 'red' for side A, 'blue' for side B (as in VEX).
 */
function renderAllianceSide(state, teamIds, noShow, onToggleNoShow, isWinner, color) {
  const children = [];
  teamIds.forEach((teamId, i) => {
    if (i > 0) children.push(' & ');
    const isNoShow = !!noShow[teamId];
    children.push(el('span', {
      className: `robotics-team-toggle${isNoShow ? ' is-no-show' : ''}`,
      title: isNoShow ? 'Click to mark present' : 'Click to mark No-Show',
      onClick: () => onToggleNoShow(teamId, !isNoShow),
    }, [teamName(state, teamId)]));
  });
  return el('span', { className: `robotics-match-alliance is-${color}${isWinner ? ' is-winner' : ''}` }, children);
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

function copyToClipboard(text, successMessage = 'Copied to clipboard.') {
  if (!navigator.clipboard?.writeText) {
    showToast('Clipboard unavailable — copy failed.', { isError: true });
    return;
  }
  Promise.resolve(navigator.clipboard.writeText(text)).then(
    () => showToast(successMessage),
    () => showToast('Copy failed.', { isError: true }),
  );
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

// A Match Timeline Start/End Time is a time-of-day only (the Tournament runs in one sitting) —
// combine it with today's date to get the epoch-ms the rest of the app works in.
function timeOfDayInputValue(epochMs) {
  if (epochMs == null) return '';
  const d = new Date(epochMs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function timeOfDayToEpochMs(timeStr) {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

// ---- Tab: Teams ----

function renderRegenerateMatchupsButton(state, dispatch) {
  const locked = !canRegenerateMatchups(state);
  const lockHint = 'Locked — a Qualification Match is already complete. Use Reset Results or Reset Everything / New Tournament first.';
  const regenerateLabel = state.qualification.matches.length === 0 ? 'Generate Matchups' : 'Regenerate Matchups';
  const regenerateBtn = el('button', {
    className: 'robotics-btn robotics-btn-secondary',
    onClick: () => {
      if (locked) {
        showToast(lockHint, { isError: true });
        return;
      }
      if (hasEvenMatchCounts(state.teams.length, state.qualification.matchesPerTeam)) {
        dispatch((s) => regenerateMatchups(s));
        return;
      }
      const suggestions = suggestEvenMatchesPerTeam(state.teams.length, state.qualification.matchesPerTeam);
      const suggestionText = suggestions.length > 0
        ? ` Try ${suggestions.join(' or ')} matches per team instead for an even split.`
        : '';
      showConfirm({
        title: 'Uneven Match Counts?',
        message: `With ${state.teams.length} Teams and ${state.qualification.matchesPerTeam} matches per team, some Teams will play one more Qualification Match than others.${suggestionText} Proceed anyway?`,
        confirmLabel: 'Generate Anyway',
      }).then((confirmed) => {
        if (confirmed) dispatch((s) => regenerateMatchups(s));
      });
    },
  }, [regenerateLabel]);
  if (locked) {
    regenerateBtn.setAttribute('aria-disabled', 'true');
    regenerateBtn.title = lockHint;
    regenerateBtn.classList.add('is-locked');
  }
  return regenerateBtn;
}

/** Roster in a wide column; Add a Team and Tournament Settings beside it on wide screens, stacked around it on narrow ones. */
export function renderTeamsTab(state, dispatch) {
  const section = el('div', { className: 'robotics-teams-layout' });

  const locked = !canRegenerateMatchups(state);
  const lockHint = 'Locked — a Qualification Match is already complete. Use Reset Results or Reset Everything / New Tournament first.';

  const nameInput = el('input', { placeholder: 'Team name' });
  const membersInput = el('input', { placeholder: 'Members (comma-separated)' });
  const addTeamFromForm = () => {
    if (locked) {
      showToast(lockHint, { isError: true });
      return;
    }
    if (!nameInput.value.trim()) {
      showToast('Team name is required.', { isError: true });
      return;
    }
    const members = membersInput.value.split(',').map((m) => m.trim()).filter(Boolean);
    dispatch((s) => addTeam(s, { name: nameInput.value.trim(), members }));
  };
  const addBtn = el('button', {
    className: 'robotics-btn robotics-btn-primary',
    onClick: addTeamFromForm,
  }, ['Add Team']);
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTeamFromForm();
    }
  });
  membersInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTeamFromForm();
      // dispatch() re-renders and replaces the whole subtree on success, so the
      // closed-over nameInput may already be detached — look up the live one.
      document.querySelector('input[placeholder="Team name"]')?.focus();
    }
  });
  if (locked) {
    [nameInput, membersInput].forEach((input) => {
      input.readOnly = true;
      input.title = lockHint;
      input.classList.add('robotics-locked-field');
      input.addEventListener('click', () => showToast(lockHint, { isError: true }));
    });
    addBtn.setAttribute('aria-disabled', 'true');
    addBtn.title = lockHint;
    addBtn.classList.add('is-locked');
  }
  section.appendChild(el('div', { className: 'robotics-card robotics-teams-add' }, [
    el('h3', { className: 'robotics-card-title' }, ['Add a Team']),
    el('div', { className: 'robotics-form-row' }, [nameInput, membersInput, addBtn]),
  ]));

  const list = el('div', { className: 'robotics-card robotics-teams-roster' });
  list.appendChild(el('h3', { className: 'robotics-card-title' }, [`Roster (${state.teams.length})`]));
  if (state.teams.length === 0) {
    list.appendChild(el('p', { className: 'robotics-empty' }, ['No teams yet — add one with Add a Team.']));
  }
  state.teams.forEach((team) => {
    const nameInput = el('input', { type: 'text', className: 'robotics-team-name-input', value: team.name });
    nameInput.addEventListener('change', () => {
      const trimmed = nameInput.value.trim();
      if (!trimmed) {
        nameInput.value = team.name;
        return;
      }
      dispatch((s) => updateTeam(s, team.id, { name: trimmed }));
    });

    const membersEdit = el('div', { className: 'robotics-team-members-edit' });
    team.members.forEach((member, i) => {
      membersEdit.appendChild(el('span', { className: 'robotics-member-chip' }, [
        member,
        el('button', {
          type: 'button',
          className: 'robotics-member-remove',
          'aria-label': `Remove ${member}`,
          onClick: () => dispatch((s) => updateTeam(s, team.id, { members: team.members.filter((_, idx) => idx !== i) })),
        }, ['×']),
      ]));
    });

    const addMemberInput = el('input', { type: 'text', className: 'robotics-member-add-input', placeholder: 'Add member' });
    const addMember = () => {
      const value = addMemberInput.value.trim();
      if (!value) return;
      dispatch((s) => updateTeam(s, team.id, { members: [...team.members, value] }));
    };
    addMemberInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addMember();
      }
    });
    const addMemberBtn = el('button', {
      type: 'button',
      className: 'robotics-btn robotics-btn-ghost robotics-btn-sm',
      onClick: addMember,
    }, ['Add member']);

    const row = el('div', { className: 'robotics-match-row robotics-team-row' }, [
      nameInput,
      membersEdit,
      el('div', { className: 'robotics-member-add-row' }, [addMemberInput, addMemberBtn]),
      el('button', { className: 'robotics-btn robotics-btn-danger robotics-btn-sm', onClick: () => dispatch((s) => removeTeam(s, team.id)) }, ['Remove']),
    ]);
    list.appendChild(row);
  });
  section.appendChild(list);

  const config = el('div', { className: 'robotics-card robotics-teams-settings' });
  config.appendChild(el('h3', { className: 'robotics-card-title' }, ['Tournament Settings']));
  const matchesPerTeamInput = el('input', { type: 'number', value: state.qualification.matchesPerTeam });
  matchesPerTeamInput.addEventListener('change', () => {
    dispatch((s) => setMatchesPerTeam(s, parseInt(matchesPerTeamInput.value, 10) || 1));
  });
  config.appendChild(el('label', { className: 'robotics-field' }, ['Matches per team: ', matchesPerTeamInput]));

  const estBracketInput = el('input', { type: 'number', value: state.timeline.estimatedBracketSize });
  estBracketInput.addEventListener('change', () => {
    dispatch((s) => setTimelineConfig(s, { estimatedBracketSize: parseInt(estBracketInput.value, 10) || 2 }));
  });
  config.appendChild(el('label', { className: 'robotics-field' }, ['Estimated bracket size: ', estBracketInput]));

  const estThirdInput = el('input', { type: 'checkbox' });
  estThirdInput.checked = state.timeline.estimatedThirdPlace;
  estThirdInput.addEventListener('change', () => {
    dispatch((s) => setTimelineConfig(s, { estimatedThirdPlace: estThirdInput.checked }));
  });
  config.appendChild(el('label', { className: 'robotics-field robotics-checkbox-field' }, [estThirdInput, 'Estimated third-place match']));

  config.appendChild(renderRegenerateMatchupsButton(state, dispatch));

  const resetResultsBtn = el('button', {
    className: 'robotics-btn robotics-btn-danger',
    onClick: () => {
      showConfirm({
        title: 'Reset Results?',
        message: 'This clears the Qualification Round, all Match results, and the Elimination Bracket. The Team roster is kept.',
        confirmLabel: 'Reset Results',
      }).then((confirmed) => {
        if (confirmed) dispatch((s) => resetResults(s));
      });
    },
  }, ['Reset Results']);

  const newTournamentBtn = el('button', {
    className: 'robotics-btn robotics-btn-danger',
    onClick: () => {
      showConfirm({
        title: 'Reset Everything?',
        message: 'This discards everything, including the Team roster, and starts a brand-new Tournament.',
        confirmLabel: 'Reset Everything',
      }).then((confirmed) => {
        if (confirmed) dispatch((s) => newTournament(s));
      });
    },
  }, ['Reset Everything / New Tournament']);

  config.appendChild(el('button', { className: 'robotics-btn robotics-btn-ghost', onClick: () => copyToClipboard(exportRosterMarkdown(state.teams), 'Roster copied to clipboard.') }, ['Copy Roster to Clipboard']));

  config.appendChild(el('div', { className: 'robotics-danger-zone' }, [
    el('h4', { className: 'robotics-danger-label' }, ['Danger Zone']),
    el('div', { className: 'robotics-form-row' }, [resetResultsBtn, newTournamentBtn]),
  ]));

  section.appendChild(config);
  return section;
}

// ---- Tab: Schedule / Swiss Live ----

function renderMatchRow(state, dispatch, entry, { currentIndex, upNextIndex }) {
  const { match, qualIndex } = entry;
  const isQual = entry.kind === 'qualification';
  const isCurrent = isQual && qualIndex === currentIndex;
  const isUpNext = isQual && qualIndex === upNextIndex;

  const hasField = state.timeline.fieldCount > 1;
  const classNames = ['robotics-match-row', 'robotics-match-grid'];
  if (hasField) classNames.push('has-field');
  if (isCurrent) classNames.push('is-current');
  if (isUpNext) classNames.push('is-up-next');
  if (match.completed) classNames.push('is-complete');

  const row = el('div', { className: classNames.join(' ') });

  row.appendChild(el('span', { className: 'robotics-match-time' }, [formatTime(computeMatchTime(state.timeline, entry.globalIndex))]));

  if (hasField) {
    const field = (entry.globalIndex % state.timeline.fieldCount) + 1;
    row.appendChild(el('span', { className: 'robotics-match-field' }, [`Field ${field}`]));
  }

  row.appendChild(el('span', { className: `robotics-current-label${isCurrent ? '' : ' is-placeholder'}` }, ['Current Match']));

  const scoreA = el('input', { type: 'number', className: 'robotics-score-input is-red', value: match.scoreA ?? '' });
  const scoreB = el('input', { type: 'number', className: 'robotics-score-input is-blue', value: match.scoreB ?? '' });
  scoreA.addEventListener('change', () => {
    dispatch((s) => setQualificationDraftScore(s, qualIndex, 'scoreA', scoreA.value === '' ? null : parseInt(scoreA.value, 10) || 0));
  });
  scoreB.addEventListener('change', () => {
    dispatch((s) => setQualificationDraftScore(s, qualIndex, 'scoreB', scoreB.value === '' ? null : parseInt(scoreB.value, 10) || 0));
  });
  const winningSide = match.completed && match.scoreA !== match.scoreB
    ? (match.scoreA > match.scoreB ? 'A' : 'B')
    : null;
  const toggleQualificationNoShow = (teamId, next) => dispatch((s) => setQualificationNoShow(s, qualIndex, teamId, next));
  // Each side and each score is its own grid cell so columns line up down the list.
  row.appendChild(renderAllianceSide(state, match.allianceA, match.noShow, toggleQualificationNoShow, winningSide === 'A', 'red'));
  row.appendChild(scoreA);
  row.appendChild(scoreB);
  row.appendChild(renderAllianceSide(state, match.allianceB, match.noShow, toggleQualificationNoShow, winningSide === 'B', 'blue'));

  const actions = el('div', { className: 'robotics-match-actions' });
  actions.appendChild(el('button', {
    className: 'robotics-btn robotics-btn-secondary robotics-btn-sm',
    onClick: () => dispatch((s) => recordQualificationResult(s, qualIndex, {
      scoreA: parseInt(scoreA.value, 10) || 0,
      scoreB: parseInt(scoreB.value, 10) || 0,
    })),
  }, [match.completed ? 'Save Edit' : 'Mark Complete']));

  if (match.completed) {
    actions.appendChild(el('span', { className: 'robotics-complete-badge' }, ['✓ Complete']));
  } else {
    const moveUpBtn = el('button', {
      className: 'robotics-btn robotics-btn-ghost robotics-btn-sm',
      'aria-label': 'Move match up',
      onClick: () => dispatch((s) => reorderQualificationMatch(s, qualIndex, -1)),
    }, ['↑']);
    moveUpBtn.disabled = !canMoveQualificationMatch(state.qualification.matches, qualIndex, -1);
    const moveDownBtn = el('button', {
      className: 'robotics-btn robotics-btn-ghost robotics-btn-sm',
      'aria-label': 'Move match down',
      onClick: () => dispatch((s) => reorderQualificationMatch(s, qualIndex, 1)),
    }, ['↓']);
    moveDownBtn.disabled = !canMoveQualificationMatch(state.qualification.matches, qualIndex, 1);
    actions.appendChild(moveUpBtn);
    actions.appendChild(moveDownBtn);
  }
  row.appendChild(actions);

  return row;
}

/** Every match the schedule spans: Qualification Matches plus actual (or, before a bracket exists, estimated) Elimination Matches. */
function getScheduledMatchCount(state) {
  const eliminationCount = state.elimination.bracket
    ? state.elimination.bracket.matches.filter((m) => !m.isBye).length
    : estimateEliminationMatchCount(state.timeline.estimatedBracketSize, state.timeline.estimatedThirdPlace);
  return state.qualification.matches.length + eliminationCount;
}

function formatClock(epochMs) {
  return new Date(epochMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function renderTimelineControls(state, dispatch) {
  const panel = el('div', { className: 'robotics-timeline-panel', id: 'robotics-timeline-panel' });

  const modeSelect = el('select', {});
  ['forward', 'backward'].forEach((mode) => {
    const opt = el('option', { value: mode }, [mode === 'forward' ? 'Forward (start time)' : 'Backward (end time)']);
    if (state.timeline.mode === mode) opt.setAttribute('selected', 'selected');
    modeSelect.appendChild(opt);
  });
  modeSelect.addEventListener('change', () => dispatch((s) => setTimelineConfig(s, { mode: modeSelect.value })));
  panel.appendChild(el('label', { className: 'robotics-field robotics-timeline-mode' }, ['Mode', modeSelect]));

  const isForward = state.timeline.mode === 'forward';
  const timeInput = el('input', { type: 'time', value: timeOfDayInputValue(isForward ? state.timeline.startTime : state.timeline.endTime) });
  const applyBtn = el('button', {
    className: 'robotics-btn robotics-btn-primary',
    onClick: () => {
      if (isForward) {
        const startTime = timeOfDayToEpochMs(timeInput.value);
        dispatch((s) => setTimelineConfig(s, { startTime }));
        return;
      }
      const endTime = timeOfDayToEpochMs(timeInput.value);
      const totalMinutes = computeTotalDurationMinutes(state.timeline, getScheduledMatchCount(state));
      const startTime = computeStartTimeFromEndTime({ endTime }, totalMinutes);
      dispatch((s) => setTimelineConfig(s, { endTime, startTime }));
    },
  }, ['Apply']);
  panel.appendChild(el('div', { className: 'robotics-timeline-time' }, [
    el('label', { className: 'robotics-field' }, [isForward ? 'Start time' : 'End time', timeInput]),
    applyBtn,
  ]));

  const durationInput = el('input', { type: 'number', value: state.timeline.matchDurationMin });
  durationInput.addEventListener('change', () => dispatch((s) => setTimelineConfig(s, { matchDurationMin: parseInt(durationInput.value, 10) || 1 })));
  const gapInput = el('input', { type: 'number', value: state.timeline.gapMin });
  gapInput.addEventListener('change', () => dispatch((s) => setTimelineConfig(s, { gapMin: parseInt(gapInput.value, 10) || 0 })));
  const fieldInput = el('input', { type: 'number', value: state.timeline.fieldCount });
  fieldInput.addEventListener('change', () => dispatch((s) => setTimelineConfig(s, { fieldCount: parseInt(fieldInput.value, 10) || 1 })));
  panel.appendChild(el('div', { className: 'robotics-timeline-pacing' }, [
    el('label', { className: 'robotics-field' }, ['Duration (min)', durationInput]),
    el('label', { className: 'robotics-field' }, ['Gap (min)', gapInput]),
    el('label', { className: 'robotics-field' }, ['Field count', fieldInput]),
  ]));
  return panel;
}

/**
 * The Match Timeline as a compact panel: a one-line summary that toggles the controls open in place.
 * Toggling only flips the DOM (keeping focus on the button) and reports the choice via onToggle.
 */
function renderMatchTimeline(state, dispatch, { expanded, onToggle }) {
  const card = el('div', { className: `robotics-card robotics-timeline${expanded ? ' is-expanded' : ''}` });
  const panel = renderTimelineControls(state, dispatch);
  panel.hidden = !expanded;
  const toggle = el('button', {
    type: 'button',
    className: 'robotics-timeline-toggle',
    'aria-expanded': String(expanded),
    'aria-controls': panel.id,
    onClick: () => {
      const next = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(next));
      panel.hidden = !next;
      card.classList.toggle('is-expanded', next);
      onToggle(next);
    },
  }, [
    el('span', { className: 'robotics-timeline-chevron', 'aria-hidden': 'true' }, ['▸']),
    el('span', { className: 'robotics-timeline-heading' }, [
      el('span', { className: 'robotics-card-title' }, ['Match Timeline']),
      el('span', { className: 'robotics-timeline-summary' }, [
        formatTimelineSummary(state.timeline, getScheduledMatchCount(state), formatClock),
      ]),
    ]),
  ]);
  // Accordion pattern: the heading wraps the button (a button may not contain a heading).
  card.appendChild(el('h3', { className: 'robotics-timeline-header' }, [toggle]));
  card.appendChild(panel);
  return card;
}

export function renderScheduleTab(state, dispatch) {
  const section = el('div', { className: 'robotics-section' });

  const currentIndex = getCurrentMatchIndex(state.qualification.matches);
  const upNextIndex = getUpNextMatchIndex(state.qualification.matches, currentIndex);

  const matchList = el('div', { className: 'robotics-card' });
  matchList.appendChild(el('h3', { className: 'robotics-card-title' }, ['Qualification Matches']));
  matchList.appendChild(renderRegenerateMatchupsButton(state, dispatch));
  const entries = getAllMatchesInScheduleOrder(state).filter((e) => e.kind === 'qualification');
  if (entries.length === 0) {
    matchList.appendChild(el('p', { className: 'robotics-empty' }, ['No matches scheduled yet — add teams and regenerate matchups from the Teams tab.']));
  }
  entries.forEach((entry) => matchList.appendChild(renderMatchRow(state, dispatch, entry, { currentIndex, upNextIndex })));
  section.appendChild(matchList);

  section.appendChild(el('button', {
    className: 'robotics-btn robotics-btn-ghost',
    onClick: () => copyToClipboard(exportMatchesMarkdown(state.qualification.matches, state.teams), 'Match data copied to clipboard.'),
  }, ['Copy Match Data to Clipboard']));

  return section;
}

// ---- Tab: Standings ----

/** Team name with its Members as a muted second line (omitted when there are none). */
function renderStandingsTeamCell(team) {
  const parts = [el('div', { className: 'robotics-standings-team-name' }, [team?.name ?? '(unknown)'])];
  if (team?.members?.length) {
    parts.push(el('div', { className: 'robotics-standings-members' }, [team.members.join(', ')]));
  }
  return parts;
}

export function renderStandingsTab(state) {
  const section = el('div', { className: 'robotics-section' });
  const standings = computeStandings(state.teams, state.qualification.matches);

  const card = el('div', { className: 'robotics-card' });
  card.appendChild(el('h3', { className: 'robotics-card-title' }, ['Standings']));

  if (standings.length === 0) {
    card.appendChild(el('p', { className: 'robotics-empty' }, ['No results yet — standings will appear once matches are completed.']));
  } else {
    const isRateMode = standings[0].rankingMode === 'rate';
    if (isRateMode) {
      card.appendChild(el('p', { className: 'robotics-standings-note' }, [
        'Teams have played an uneven number of Qualification Matches — ranked by win % and average points per match instead of raw totals.',
      ]));
    }
    const headers = isRateMode
      ? ['Rank', 'Team', 'W-L', 'Win %', 'Avg Pts/Match']
      : ['Rank', 'Team', 'W-L', 'Points'];
    const table = el('table', { className: 'robotics-table' });
    table.appendChild(el('thead', {}, [
      el('tr', {}, headers.map((h) => el('th', {}, [h]))),
    ]));
    const tbody = el('tbody');
    standings.forEach((entry, i) => {
      const team = state.teams.find((t) => t.id === entry.teamId);
      const cells = [
        el('td', { className: 'robotics-rank-cell' }, [String(i + 1)]),
        el('td', {}, renderStandingsTeamCell(team)),
        el('td', {}, [`${entry.wins}-${entry.losses}`]),
      ];
      if (isRateMode) {
        cells.push(el('td', {}, [`${Math.round(entry.winRate * 100)}%`]));
        cells.push(el('td', {}, [entry.avgPoints.toFixed(1)]));
      } else {
        cells.push(el('td', {}, [String(entry.points)]));
      }
      tbody.appendChild(el('tr', {}, cells));
    });
    table.appendChild(tbody);
    card.appendChild(el('div', { className: 'robotics-table-wrap' }, [table]));
  }

  section.appendChild(card);

  section.appendChild(el('button', {
    className: 'robotics-btn robotics-btn-ghost',
    onClick: () => copyToClipboard(exportStandingsMarkdown(standings, state.teams), 'Standings copied to clipboard.'),
  }, ['Copy Standings to Clipboard']));

  return section;
}

/** Matches in the wide column; the Match Timeline above Standings in the narrow one (Timeline first when stacked). */
export function renderScheduleAndStandingsTab(state, dispatch, { ui }) {
  const matches = renderScheduleTab(state, dispatch);
  matches.classList.add('robotics-schedule-matches');
  const timeline = renderMatchTimeline(state, dispatch, {
    expanded: ui.prefs.timelineExpanded === true,
    onToggle: (expanded) => ui.setPref('timelineExpanded', expanded),
  });
  const standings = renderStandingsTab(state);
  standings.classList.add('robotics-schedule-standings');
  const side = el('div', { className: 'robotics-schedule-side' }, [timeline, standings]);
  return el('div', { className: 'robotics-schedule-layout' }, [matches, side]);
}

// ---- Tab: Finals ----

function renderBracketMatch(state, dispatch, match) {
  const sides = resolveMatchSides(state.elimination.bracket, match.id);
  const cardClassNames = ['robotics-card', 'robotics-bracket-match'];
  if (match.completed) cardClassNames.push('is-complete');
  const card = el('div', { className: cardClassNames.join(' ') });
  if (match.isBye) {
    card.appendChild(el('div', { className: 'robotics-bracket-bye' }, [`BYE → ${playoffAllianceLabel(state, sides.allianceA ?? sides.allianceB)}`]));
    return card;
  }

  const winner = getMatchWinner(state.elimination.bracket, match.id);
  const toggleEliminationNoShow = (teamId, next) => dispatch((s) => setEliminationNoShow(s, match.id, teamId, next));

  const scoreA = el('input', { type: 'number', className: 'robotics-score-input is-red', value: match.scoreA ?? '' });
  const scoreB = el('input', { type: 'number', className: 'robotics-score-input is-blue', value: match.scoreB ?? '' });
  scoreA.addEventListener('change', () => {
    dispatch((s) => setEliminationDraftScore(s, match.id, 'scoreA', scoreA.value === '' ? null : parseInt(scoreA.value, 10) || 0));
  });
  scoreB.addEventListener('change', () => {
    dispatch((s) => setEliminationDraftScore(s, match.id, 'scoreB', scoreB.value === '' ? null : parseInt(scoreB.value, 10) || 0));
  });
  card.appendChild(el('div', { className: 'robotics-bracket-side is-red' }, [
    sides.allianceA
      ? renderAllianceSide(state, playoffAllianceTeamIds(state, sides.allianceA), match.noShow, toggleEliminationNoShow, winner === sides.allianceA, 'red')
      : el('span', { className: 'robotics-match-alliance' }, ['TBD']),
    scoreA,
  ]));
  card.appendChild(el('div', { className: 'robotics-match-vs' }, ['vs']));
  card.appendChild(el('div', { className: 'robotics-bracket-side is-blue' }, [
    sides.allianceB
      ? renderAllianceSide(state, playoffAllianceTeamIds(state, sides.allianceB), match.noShow, toggleEliminationNoShow, winner === sides.allianceB, 'blue')
      : el('span', { className: 'robotics-match-alliance' }, ['TBD']),
    scoreB,
  ]));

  const actions = el('div', { className: 'robotics-match-actions' });
  actions.appendChild(el('button', {
    className: 'robotics-btn robotics-btn-secondary robotics-btn-sm',
    onClick: () => dispatch((s) => recordEliminationResult(s, match.id, {
      scoreA: parseInt(scoreA.value, 10) || 0,
      scoreB: parseInt(scoreB.value, 10) || 0,
    })),
  }, [match.completed ? 'Save Edit' : 'Mark Complete']));
  if (match.completed) actions.appendChild(el('span', { className: 'robotics-complete-badge' }, ['✓ Complete']));
  card.appendChild(actions);
  return card;
}

// A bracket-tree column centers each match between the two matches feeding it by
// surrounding every match with flex spacers in a 1 : 2 : 2 : ... : 2 : 1 ratio: the
// leftover space a shorter column gets stretched into (relative to round 1, which
// has the most matches and so defines the bracket's overall height) is distributed
// so each match lands at the midpoint of its two feeders, recursively.
function renderBracketSpacer(grow) {
  return el('div', { className: 'robotics-bracket-spacer', style: `flex-grow: ${grow};` });
}

function renderBracketRoundColumn(state, dispatch, matches, title) {
  const col = el('div', { className: 'robotics-bracket-round' }, [el('h4', {}, [title])]);
  const sorted = [...matches].sort((a, b) => a.slot - b.slot);
  col.appendChild(renderBracketSpacer(1));
  sorted.forEach((match, i) => {
    col.appendChild(renderBracketMatch(state, dispatch, match));
    if (i < sorted.length - 1) col.appendChild(renderBracketSpacer(2));
  });
  col.appendChild(renderBracketSpacer(1));
  return col;
}

function renderBracket(state, dispatch) {
  const bracket = state.elimination.bracket;
  const container = el('div', { className: 'robotics-bracket' });

  const numericRounds = [...new Set(
    bracket.matches.map((m) => m.round).filter((round) => typeof round === 'number'),
  )].sort((a, b) => a - b);

  numericRounds.forEach((round) => {
    const roundMatches = bracket.matches.filter((m) => m.round === round);
    container.appendChild(renderBracketRoundColumn(state, dispatch, roundMatches, `Round ${round}`));
  });

  const thirdPlaceMatch = bracket.matches.find((m) => m.round === 'third-place');
  if (thirdPlaceMatch) {
    container.appendChild(renderBracketRoundColumn(state, dispatch, [thirdPlaceMatch], 'Third Place'));
  }

  const finalMatch = bracket.matches.find((m) => m.round === 'final');
  const finalCol = renderBracketRoundColumn(state, dispatch, [finalMatch], 'Final');
  finalCol.classList.add('is-final');
  container.appendChild(finalCol);
  return container;
}

/** Setup cards share one auto-fit row on wide screens; the bracket spans the full width beneath them. */
export function renderFinalsTab(state, dispatch, { setActiveTab }) {
  const section = el('div', { className: 'robotics-section' });
  const setup = el('div', { className: 'robotics-finals-setup' });
  section.appendChild(setup);

  const usedTeamIds = new Set(state.elimination.alliances.flatMap((a) => a.teamIds));
  const available = state.teams.filter((t) => !usedTeamIds.has(t.id));

  const selectionCard = el('div', { className: 'robotics-card' });
  selectionCard.appendChild(el('h3', { className: 'robotics-card-title' }, ['Form a Playoff Alliance']));
  const selectA = el('select', {});
  const selectB = el('select', {});
  available.forEach((team, i) => {
    selectA.appendChild(el('option', { value: team.id }, [team.name]));
    const optionB = el('option', { value: team.id }, [team.name]);
    if (i === 1) optionB.setAttribute('selected', 'selected');
    selectB.appendChild(optionB);
  });
  const selectionRow = el('div', { className: 'robotics-form-row' }, [
    el('label', { className: 'robotics-field' }, ['Team A: ', selectA]),
    el('label', { className: 'robotics-field' }, ['Team B: ', selectB]),
    el('button', {
      className: 'robotics-btn robotics-btn-primary',
      onClick: () => {
        if (!selectA.value || !selectB.value) return;
        if (selectA.value === selectB.value) {
          showConfirm({
            title: 'Form a Single-Team Alliance?',
            message: 'Team A and Team B are the same Team. This forms a Playoff Alliance containing just that one Team.',
            confirmLabel: 'Form Alliance',
          }).then((confirmed) => {
            if (confirmed) dispatch((s) => formPlayoffAlliance(s, selectA.value, selectB.value));
          });
          return;
        }
        dispatch((s) => formPlayoffAlliance(s, selectA.value, selectB.value));
      },
    }, ['Form Alliance']),
  ]);
  selectionCard.appendChild(selectionRow);
  setup.appendChild(selectionCard);

  const alliancesCard = el('div', { className: 'robotics-card' });
  alliancesCard.appendChild(el('h3', { className: 'robotics-card-title' }, ['Playoff Alliances']));
  if (state.elimination.alliances.length === 0) {
    alliancesCard.appendChild(el('p', { className: 'robotics-empty' }, ['No alliances formed yet.']));
  }
  state.elimination.alliances.forEach((alliance) => {
    alliancesCard.appendChild(el('div', { className: 'robotics-match-row robotics-team-row' }, [
      el('span', { className: 'robotics-team-name' }, [allianceTeamNames(state, alliance.teamIds)]),
      el('button', { className: 'robotics-btn robotics-btn-danger robotics-btn-sm', onClick: () => dispatch((s) => removePlayoffAlliance(s, alliance.id)) }, ['Remove']),
    ]));
  });
  setup.appendChild(alliancesCard);

  const bracketConfigCard = el('div', { className: 'robotics-card robotics-settings-grid' });
  bracketConfigCard.appendChild(el('h3', { className: 'robotics-card-title' }, ['Bracket Configuration']));
  const sizeInput = el('input', { type: 'number', min: '2', value: state.elimination.bracketSize ?? '' });
  const thirdPlaceInput = el('input', { type: 'checkbox' });
  thirdPlaceInput.checked = state.elimination.includeThirdPlace;
  bracketConfigCard.appendChild(el('label', { className: 'robotics-field' }, ['Bracket size: ', sizeInput]));
  bracketConfigCard.appendChild(el('label', { className: 'robotics-field robotics-checkbox-field' }, [thirdPlaceInput, 'Include third-place match']));
  bracketConfigCard.appendChild(el('button', {
    className: 'robotics-btn robotics-btn-secondary',
    onClick: () => dispatch((s) => setBracketConfig(s, { bracketSize: parseInt(sizeInput.value, 10) || null, includeThirdPlace: thirdPlaceInput.checked })),
  }, ['Save Bracket Config']));
  setup.appendChild(bracketConfigCard);

  if (state.elimination.bracketSize) {
    const seedsCard = el('div', { className: 'robotics-card robotics-settings-grid' });
    seedsCard.appendChild(el('h3', { className: 'robotics-card-title' }, ['Seeds']));
    for (let seedNum = 1; seedNum <= state.elimination.bracketSize; seedNum++) {
      const select = el('select', {});
      select.appendChild(el('option', { value: '' }, ['(unassigned)']));
      state.elimination.alliances.forEach((alliance) => {
        const opt = el('option', { value: alliance.id }, [allianceTeamNames(state, alliance.teamIds)]);
        if (state.elimination.seeds[seedNum] === alliance.id) opt.setAttribute('selected', 'selected');
        select.appendChild(opt);
      });
      select.addEventListener('change', () => dispatch((s) => setSeed(s, seedNum, select.value || null)));
      seedsCard.appendChild(el('label', { className: 'robotics-field' }, [`Seed ${seedNum}: `, select]));
    }
    const seedActions = el('div', { className: 'robotics-form-row' }, [
      el('button', { className: 'robotics-btn robotics-btn-secondary', onClick: () => dispatch((s) => autoFillSeedsFromStandings(s)) }, ['Auto-fill Seeds from Standings']),
      el('button', { className: 'robotics-btn robotics-btn-primary', onClick: () => dispatch((s) => generateBracket(s)) }, ['Generate Bracket']),
    ]);
    seedsCard.appendChild(seedActions);
    setup.appendChild(seedsCard);
  }

  if (state.elimination.bracket) {
    section.appendChild(renderBracket(state, dispatch));
  }

  if (isBracketComplete(state.elimination.bracket)) {
    section.appendChild(el('button', {
      className: 'robotics-btn robotics-btn-primary robotics-reveal-results-btn',
      onClick: () => setActiveTab('results'),
    }, ['Reveal Results →']));
  }

  return section;
}

// ---- Tab: Results ----

const PLACE_LABELS = { 1: '1st', 2: '2nd', 3: '3rd' };
// Podium blocks left to right: 1st in the middle, flanked by 2nd and 3rd.
const PODIUM_LAYOUT = [2, 1, 3];

/** The Results tab before the bracket is complete: how many Elimination Matches remain, or that there is no bracket yet. */
function renderResultsNotDecided(state) {
  const { bracket } = state.elimination;
  let detail = 'Generate the Elimination Bracket on the Finals tab to start the playoffs.';
  if (bracket) {
    const remaining = countUndecidedMatches(bracket);
    detail = remaining === 1 ? '1 Elimination Match remains.' : `${remaining} Elimination Matches remain.`;
  }
  return el('div', { className: 'robotics-card robotics-results-pending' }, [
    el('h3', { className: 'robotics-card-title' }, ['Results not decided yet']),
    el('p', { className: 'robotics-empty' }, [detail]),
  ]);
}

/** One Podium block; a covered block shows only its pedestal, so no names leak before the reveal. */
function renderPodiumBlock(state, { place, allianceId }, isRevealed) {
  const block = el('div', {
    className: `robotics-podium-block is-place-${place} ${isRevealed ? 'is-revealed' : 'is-covered'}`,
    'data-place': String(place),
  });
  const reveal = el('div', { className: 'robotics-podium-reveal' });
  if (isRevealed) {
    playoffAllianceTeamIds(state, allianceId).forEach((teamId) => {
      const team = state.teams.find((t) => t.id === teamId);
      reveal.appendChild(el('div', { className: 'robotics-podium-team' }, [
        el('div', { className: 'robotics-podium-team-name' }, [teamName(state, teamId)]),
        ...(team?.members.length ? [el('div', { className: 'robotics-podium-members' }, [team.members.join(', ')])] : []),
      ]));
    });
  } else {
    reveal.appendChild(el('div', { className: 'robotics-podium-mystery' }, ['?']));
  }
  block.appendChild(reveal);
  block.appendChild(el('div', { className: 'robotics-podium-step' }, [
    el('span', { className: 'robotics-podium-place' }, [PLACE_LABELS[place]]),
  ]));
  return block;
}

/**
 * The Podium: 2nd | 1st | 3rd, revealed 3rd -> 2nd -> 1st by clicking it
 * (or Space, wired up in initRoboticsApp). Reveal progress lives in state; the
 * rise animation and confetti are applied to the freshly rendered block only
 * when it is revealed here, so revisiting the tab doesn't replay them.
 */
export function renderResultsTab(state, dispatch) {
  const section = el('div', { className: 'robotics-section robotics-results' });
  const { bracket } = state.elimination;
  if (!isBracketComplete(bracket)) {
    section.appendChild(renderResultsNotDecided(state));
    return section;
  }

  const placements = getPlacements(bracket);
  const revealed = getRevealedPlaces(state);
  const nextPlace = getNextPlaceToReveal(state);

  const card = el('div', { className: 'robotics-card robotics-podium-card' });
  card.appendChild(el('h3', { className: 'robotics-card-title' }, ['Podium']));
  if (nextPlace) {
    card.appendChild(el('p', { className: 'robotics-podium-hint' }, [`Click the podium or press Space to reveal ${PLACE_LABELS[nextPlace]} place`]));
  }

  const revealNext = () => {
    dispatch(revealNextPlacement);
    // dispatch re-rendered the app synchronously, so look up the new block for this place.
    const block = document.querySelector(`.robotics-podium-block[data-place="${nextPlace}"]`);
    block?.classList.add('is-rising');
    if (nextPlace === 1) launchConfetti(block);
  };
  const podium = nextPlace
    ? el('div', {
      className: 'robotics-podium is-revealable',
      role: 'button',
      tabindex: '0',
      'aria-label': `Reveal ${PLACE_LABELS[nextPlace]} place`,
      onClick: revealNext,
      // Space is handled app-wide in initRoboticsApp; Enter only while the podium has focus.
      onKeydown: (e) => { if (e.key === 'Enter') revealNext(); },
    })
    : el('div', { className: 'robotics-podium' });
  PODIUM_LAYOUT.forEach((place) => {
    const placement = placements.find((p) => p.place === place);
    if (placement) podium.appendChild(renderPodiumBlock(state, placement, revealed.has(place)));
  });
  card.appendChild(podium);
  section.appendChild(card);

  const actions = el('div', { className: 'robotics-form-row' });
  if (revealed.size > 0) {
    actions.appendChild(el('button', { className: 'robotics-btn robotics-btn-secondary', onClick: () => dispatch(replayReveal) }, ['Replay reveal']));
  }
  const placementsForExport = placements.map(({ place, allianceId }) => ({ place, teamIds: playoffAllianceTeamIds(state, allianceId) }));
  actions.appendChild(el('button', {
    className: 'robotics-btn robotics-btn-ghost',
    onClick: () => copyToClipboard(exportPlacementsMarkdown(placementsForExport, state.teams), 'Placements copied to clipboard.'),
  }, ['Copy Placements to Clipboard']));
  section.appendChild(actions);

  return section;
}

// ---- App shell ----

const CLOCK_TICK_MS = 1000;

/**
 * Broadcast-style status strip: title, phase, match progress, and the live
 * clock + Schedule Drift. The clock and drift are filled in (and kept ticking)
 * by updateLiveStatus, so a tick never re-renders the rest of the app.
 */
function renderStatusHeader(state) {
  const phase = getTournamentPhase(state);
  const progress = getMatchProgress(state, phase);
  const header = el('header', { className: 'robotics-header' }, [
    el('h1', { className: 'robotics-title' }, ['Robotics Tournament']),
    el('div', { className: 'robotics-status-strip' }, [
      el('span', { className: 'robotics-status-phase' }, [PHASE_LABELS[phase]]),
      ...(progress ? [el('span', { className: 'robotics-status-progress' }, [progress])] : []),
      el('span', { className: 'robotics-status-drift' }),
      el('span', { className: 'robotics-status-clock' }),
    ]),
  ]);
  updateLiveStatus(header, state, Date.now());
  return header;
}

/** Refresh only the clock and Schedule Drift elements under root; drift is hidden when there is none. */
function updateLiveStatus(root, state, now) {
  root.querySelector('.robotics-status-clock').textContent = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const driftEl = root.querySelector('.robotics-status-drift');
  const drift = getScheduleDrift(now, getCurrentMatchTime(state));
  driftEl.hidden = !drift;
  driftEl.textContent = formatScheduleDrift(drift) ?? '';
  driftEl.dataset.drift = drift?.status ?? '';
}

// Only one control panel runs per page; initialising another stops the previous clock and Space handler.
let stopActiveClock = null;

export function renderApp(state, dispatch, activeTab, setActiveTab, ui) {
  const app = el('div', { className: 'robotics-app' });

  app.appendChild(renderStatusHeader(state));

  const tabs = el('nav', { className: 'robotics-tabs' });
  TABS.forEach(({ key, label }) => {
    const btn = el('button', {
      className: `robotics-tab-btn${key === activeTab ? ' active' : ''}`,
      'data-tab-key': key,
      onClick: () => setActiveTab(key),
    }, [label]);
    tabs.appendChild(btn);
  });
  app.appendChild(tabs);

  const renderers = {
    teams: renderTeamsTab,
    schedule: renderScheduleAndStandingsTab,
    finals: renderFinalsTab,
    results: renderResultsTab,
  };
  app.appendChild(renderers[activeTab](state, dispatch, { setActiveTab, ui }));
  app.appendChild(createToastContainer());
  app.appendChild(createConfirmDialogContainer());
  return app;
}

export function initRoboticsApp({ mountId = 'roboticsApp', storageKey = 'robotics-tournament-state', uiPrefsKey = 'robotics-ui-prefs' } = {}) {
  const mount = document.getElementById(mountId);
  if (!mount) return null;

  const storage = createLocalStorageAdapter(storageKey);
  let state = storage.load() ?? createInitialState();
  let activeTab = 'teams';

  // UI preferences (e.g. whether the Match Timeline is open) persist under their own key,
  // so Reset Results / New Tournament never touch them.
  const uiStorage = createLocalStorageAdapter(uiPrefsKey);
  const ui = {
    prefs: uiStorage.load() ?? {},
    setPref(key, value) {
      ui.prefs = { ...ui.prefs, [key]: value };
      uiStorage.save(ui.prefs);
    },
  };

  function render() {
    mount.innerHTML = '';
    mount.appendChild(renderApp(state, dispatch, activeTab, setActiveTab, ui));
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

  stopActiveClock?.();
  const clockTimer = setInterval(() => updateLiveStatus(mount, state, Date.now()), CLOCK_TICK_MS);

  // Space reveals the next Placement on the Results tab, unless it's meant for a focused control.
  // A held-down Space repeats; ignore repeats so one press is one reveal.
  function onKeydown(e) {
    if (activeTab !== 'results' || e.key !== ' ' || e.repeat) return;
    if (e.target.closest?.('input, textarea, select, button, [contenteditable]')) return;
    const podium = mount.querySelector('.robotics-podium.is-revealable');
    if (!podium) return;
    e.preventDefault();
    podium.click();
  }
  document.addEventListener('keydown', onKeydown);

  function destroy() {
    clearInterval(clockTimer);
    document.removeEventListener('keydown', onKeydown);
    if (stopActiveClock === destroy) stopActiveClock = null;
  }
  stopActiveClock = destroy;

  return { getState: () => state, dispatch, setActiveTab, destroy };
}

if (typeof document !== 'undefined' && document.getElementById('roboticsApp')) {
  initRoboticsApp();
}
