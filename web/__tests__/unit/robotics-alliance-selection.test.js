import { describe, it, expect } from 'vitest';
import {
  getAllianceCaptain,
  getSelectionRowStatus,
  getAllianceSelectionBlockReason,
  getPickableTeams,
  getEffectiveBracketSize,
  isSelectionComplete,
  getAllianceShortfall,
  isQualificationIncomplete,
} from '../../robotics/alliance-selection.js';
import {
  createInitialState,
  addTeam,
  setMatchesPerTeam,
  regenerateMatchups,
  recordQualificationResult,
  formPlayoffAlliance,
  removePlayoffAlliance,
  declineTeam,
  undoDecline,
  setBracketConfig,
  setTimelineConfig,
  startFinals,
  discardBracket,
} from '../../robotics/state.js';
import { computeStandings } from '../../robotics/standings.js';

function withTeams(names) {
  let s = createInitialState();
  for (const name of names) s = addTeam(s, { name, members: [] });
  return s;
}

const idOf = (state, name) => state.teams.find((t) => t.name === name).id;

/** Four Teams with a played Qualification Round, so Standings have a definite order. */
function withPlayedQualification() {
  let s = withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']);
  s = setMatchesPerTeam(s, 2);
  s = regenerateMatchups(s, { random: () => 0.5 });
  s.qualification.matches.forEach((_, i) => {
    s = recordQualificationResult(s, i, { scoreA: 10 + i, scoreB: 3 * i });
  });
  return s;
}

const rankedTeamIds = (s) => computeStandings(s.teams, s.qualification.matches).map((e) => e.teamId);

describe('getAllianceCaptain', () => {
  it('is null with no Teams', () => {
    expect(getAllianceCaptain(createInitialState())).toBeNull();
  });

  it('is the top-ranked Team in Standings while no alliances exist', () => {
    const s = withPlayedQualification();
    expect(getAllianceCaptain(s)).toBe(rankedTeamIds(s)[0]);
  });

  it('skips Teams already in a Playoff Alliance', () => {
    let s = withPlayedQualification();
    const [first, , third] = rankedTeamIds(s);
    s = formPlayoffAlliance(s, first, third);
    expect(getAllianceCaptain(s)).toBe(rankedTeamIds(s)[1]);
  });

  it('is recomputed when an alliance is removed', () => {
    let s = withPlayedQualification();
    const [first, second] = rankedTeamIds(s);
    s = formPlayoffAlliance(s, first, second);
    s = removePlayoffAlliance(s, s.elimination.alliances[0].id);
    expect(getAllianceCaptain(s)).toBe(first);
  });

  it('is null once every Team is in a Playoff Alliance', () => {
    let s = withTeams(['Alpha', 'Bravo']);
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    expect(getAllianceCaptain(s)).toBeNull();
  });
});

describe('Captain override', () => {
  /** Four Teams, no matches played, so Standings keep roster order and Alpha is the default Captain. */
  const fourTeams = () => withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']);

  it('makes an available Team the Captain in place of the default', () => {
    const s = fourTeams();
    expect(getAllianceCaptain(s, idOf(s, 'Charlie'))).toBe(idOf(s, 'Charlie'));
  });

  it('falls back to the default rule when the override is unset, unknown, or already in an alliance', () => {
    let s = fourTeams();
    expect(getAllianceCaptain(s, null)).toBe(idOf(s, 'Alpha'));
    expect(getAllianceCaptain(s, 'no-such-team')).toBe(idOf(s, 'Alpha'));
    s = formPlayoffAlliance(s, idOf(s, 'Charlie'), idOf(s, 'Delta'));
    expect(getAllianceCaptain(s, idOf(s, 'Charlie'))).toBe(idOf(s, 'Alpha'));
  });

  it('moves the captain row status to the overriding Team, and the default Captain reads as it otherwise would', () => {
    let s = fourTeams();
    s = declineTeam(s, idOf(s, 'Alpha'));
    const captainId = idOf(s, 'Charlie');
    expect(getSelectionRowStatus(s, idOf(s, 'Charlie'), captainId)).toEqual({ status: 'captain' });
    expect(getSelectionRowStatus(s, idOf(s, 'Alpha'), captainId)).toEqual({ status: 'declined' });
    expect(getSelectionRowStatus(s, idOf(s, 'Bravo'), captainId)).toEqual({ status: 'available' });
  });
});

describe('getPickableTeams', () => {
  it('lists the available Teams other than the Captain, in Standings order, flagging Declined ones', () => {
    let s = withPlayedQualification();
    const [first, second, third, fourth] = rankedTeamIds(s);
    s = declineTeam(s, fourth);
    expect(getPickableTeams(s, first)).toEqual([
      { teamId: second, declined: false },
      { teamId: third, declined: false },
      { teamId: fourth, declined: true },
    ]);
    s = formPlayoffAlliance(s, first, third);
    expect(getPickableTeams(s, second)).toEqual([{ teamId: fourth, declined: true }]);
  });

  it('is empty when the Captain is the last available Team', () => {
    let s = withTeams(['Alpha', 'Bravo', 'Charlie']);
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    expect(getPickableTeams(s, idOf(s, 'Charlie'))).toEqual([]);
  });
});

describe('getSelectionRowStatus', () => {
  it('marks the Captain, Teams in alliances with their alliance number, and everyone else available', () => {
    let s = withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']);
    // No matches played, so Standings keep roster order.
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Delta'));
    s = formPlayoffAlliance(s, idOf(s, 'Bravo'), idOf(s, 'Bravo'));
    expect(getSelectionRowStatus(s, idOf(s, 'Alpha'))).toEqual({ status: 'in-alliance', allianceNumber: 1 });
    expect(getSelectionRowStatus(s, idOf(s, 'Delta'))).toEqual({ status: 'in-alliance', allianceNumber: 1 });
    expect(getSelectionRowStatus(s, idOf(s, 'Bravo'))).toEqual({ status: 'in-alliance', allianceNumber: 2 });
    expect(getSelectionRowStatus(s, idOf(s, 'Charlie'))).toEqual({ status: 'captain' });
    expect(getSelectionRowStatus(s, idOf(s, 'Echo'))).toEqual({ status: 'available' });
  });

  it('numbers alliances by their position in the list (their Seed)', () => {
    let s = withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    s = formPlayoffAlliance(s, idOf(s, 'Charlie'), idOf(s, 'Delta'));
    s = removePlayoffAlliance(s, s.elimination.alliances[0].id);
    expect(getSelectionRowStatus(s, idOf(s, 'Charlie'))).toEqual({ status: 'in-alliance', allianceNumber: 1 });
  });
});

describe('Declines', () => {
  /** Five Teams, no matches played, so Standings keep roster order and Alpha is the Captain. */
  const fiveTeams = () => withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']);

  it('marks a Declined Team as declined, and Undo makes it available again', () => {
    let s = fiveTeams();
    const charlie = idOf(s, 'Charlie');
    s = declineTeam(s, charlie);
    expect(getSelectionRowStatus(s, charlie)).toEqual({ status: 'declined' });
    s = undoDecline(s, charlie);
    expect(getSelectionRowStatus(s, charlie)).toEqual({ status: 'available' });
  });

  it('declining twice records one Decline, so a single Undo clears it', () => {
    let s = fiveTeams();
    const charlie = idOf(s, 'Charlie');
    s = declineTeam(declineTeam(s, charlie), charlie);
    expect(getSelectionRowStatus(undoDecline(s, charlie), charlie)).toEqual({ status: 'available' });
  });

  it('counts against every later Captain, not just the one who invited', () => {
    let s = fiveTeams();
    const delta = idOf(s, 'Delta');
    s = declineTeam(s, delta);
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    expect(getAllianceCaptain(s)).toBe(idOf(s, 'Charlie'));
    expect(getSelectionRowStatus(s, delta)).toEqual({ status: 'declined' });
  });

  it('stays in place when an alliance is removed', () => {
    let s = fiveTeams();
    const charlie = idOf(s, 'Charlie');
    s = declineTeam(s, charlie);
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    s = removePlayoffAlliance(s, s.elimination.alliances[0].id);
    expect(getSelectionRowStatus(s, charlie)).toEqual({ status: 'declined' });
  });

  it('a Declined Team can still become Alliance Captain, and the Captain status wins', () => {
    let s = fiveTeams();
    const alpha = idOf(s, 'Alpha');
    s = declineTeam(s, alpha);
    expect(getAllianceCaptain(s)).toBe(alpha);
    expect(getSelectionRowStatus(s, alpha)).toEqual({ status: 'captain' });
  });

  it('a Team in an alliance reads as in-alliance even if it Declined earlier', () => {
    let s = fiveTeams();
    const charlie = idOf(s, 'Charlie');
    s = declineTeam(s, charlie);
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), charlie);
    expect(getSelectionRowStatus(s, charlie)).toEqual({ status: 'in-alliance', allianceNumber: 1 });
  });

  it('treats a Tournament saved before Declines existed as having none', () => {
    const s = fiveTeams();
    const { declinedTeamIds, ...elimination } = s.elimination;
    const saved = { ...s, elimination };
    const charlie = idOf(s, 'Charlie');
    expect(getSelectionRowStatus(saved, charlie)).toEqual({ status: 'available' });
    expect(getSelectionRowStatus(undoDecline(saved, charlie), charlie)).toEqual({ status: 'available' });
    expect(getSelectionRowStatus(declineTeam(saved, charlie), charlie)).toEqual({ status: 'declined' });
  });
});

describe('getAllianceSelectionBlockReason', () => {
  const START_FINALS_MESSAGE = 'Form at least 2 alliances before starting the Finals.';

  it('blocks Start Finals with fewer than 2 alliances', () => {
    let s = withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    expect(getAllianceSelectionBlockReason(s, 'start-finals')).toBe(START_FINALS_MESSAGE);
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    expect(getAllianceSelectionBlockReason(s, 'start-finals')).toBe(START_FINALS_MESSAGE);
  });

  it('allows Start Finals with 2 or more alliances', () => {
    let s = withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    s = formPlayoffAlliance(s, idOf(s, 'Charlie'), idOf(s, 'Delta'));
    expect(getAllianceSelectionBlockReason(s, 'start-finals')).toBeNull();
  });

  it('allows every other action while selection is open', () => {
    const s = createInitialState();
    for (const action of ['pick', 'move-alliance', 'remove-alliance', 'decline', 'undo-decline', 'set-bracket-size']) {
      expect(getAllianceSelectionBlockReason(s, action)).toBeNull();
    }
  });

  it('blocks Pick and Declined once selection is complete, but not Undo, ↑/↓, or Remove', () => {
    const s = withTwoAlliancesOfTwo();
    expect(getAllianceSelectionBlockReason(s, 'pick')).toBe('All 2 alliances are formed. Raise Bracket Size to keep picking.');
    expect(getAllianceSelectionBlockReason(s, 'decline')).toBe('All 2 alliances are formed. Raise Bracket Size to keep picking.');
    for (const action of ['undo-decline', 'move-alliance', 'remove-alliance', 'start-finals']) {
      expect(getAllianceSelectionBlockReason(s, action)).toBeNull();
    }
  });

  it('blocks a Bracket Size below the number of alliances formed', () => {
    let s = withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']);
    ['Alpha', 'Bravo', 'Charlie'].forEach((name) => { s = formPlayoffAlliance(s, idOf(s, name), idOf(s, name)); });
    const message = '3 alliances are already formed. Remove alliances before lowering Bracket Size below 3.';
    expect(getAllianceSelectionBlockReason(s, 'set-bracket-size', { bracketSize: 2 })).toBe(message);
    expect(getAllianceSelectionBlockReason(s, 'set-bracket-size', { bracketSize: 3 })).toBeNull();
    expect(getAllianceSelectionBlockReason(s, 'set-bracket-size', { bracketSize: 6 })).toBeNull();
  });

  it('allows clearing Bracket Size until one is saved, then refuses it', () => {
    let s = withTeams(['Alpha', 'Bravo', 'Charlie']);
    expect(getAllianceSelectionBlockReason(s, 'set-bracket-size', { bracketSize: null })).toBeNull();
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Alpha'));
    const message = 'Enter a Bracket Size of 2 or more.';
    expect(getAllianceSelectionBlockReason(s, 'set-bracket-size', { bracketSize: null })).toBe(message);
    expect(getAllianceSelectionBlockReason(s, 'set-bracket-size', { bracketSize: 1 })).toBe(message);
  });
});

describe('Alliance Selection locked while a Bracket exists', () => {
  const LOCKED_MESSAGE = 'Locked — the Finals have started. Discard Bracket to change alliances.';
  const ACTIONS = ['pick', 'decline', 'undo-decline', 'move-alliance', 'remove-alliance', 'start-finals', 'set-bracket-size'];

  it('blocks every Alliance Selection action with the lock message', () => {
    const s = startFinals(withTwoAlliancesOfTwo(), { confirmedShort: true }).state;
    for (const action of ACTIONS) {
      expect(getAllianceSelectionBlockReason(s, action)).toBe(LOCKED_MESSAGE);
    }
    expect(getAllianceSelectionBlockReason(s, 'set-bracket-size', { bracketSize: 6 })).toBe(LOCKED_MESSAGE);
  });

  it('unblocks them once the Bracket is discarded', () => {
    const s = discardBracket(startFinals(withTwoAlliancesOfTwo(), { confirmedShort: true }).state);
    for (const action of ['undo-decline', 'move-alliance', 'remove-alliance', 'start-finals']) {
      expect(getAllianceSelectionBlockReason(s, action)).toBeNull();
    }
  });
});

/** Alpha & Bravo, Charlie & Delta formed, with Bracket Size 2 and Echo and Foxtrot left over. */
function withTwoAlliancesOfTwo() {
  let s = withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot']);
  s = setBracketConfig(s, { bracketSize: 2 });
  s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
  return formPlayoffAlliance(s, idOf(s, 'Charlie'), idOf(s, 'Delta'));
}

describe('getEffectiveBracketSize', () => {
  it('is the Estimated Bracket Size until a Bracket Size is set', () => {
    let s = setTimelineConfig(createInitialState(), { estimatedBracketSize: 6 });
    expect(getEffectiveBracketSize(s)).toBe(6);
    s = setBracketConfig(s, { bracketSize: 4 });
    expect(getEffectiveBracketSize(s)).toBe(4);
  });
});

describe('Bracket Size saved once Alliance Selection starts', () => {
  it('saves the Estimated Bracket Size as Bracket Size when the first alliance forms', () => {
    let s = setTimelineConfig(withTeams(['Alpha', 'Bravo', 'Charlie']), { estimatedBracketSize: 3 });
    expect(s.elimination.bracketSize).toBeNull();
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    expect(s.elimination.bracketSize).toBe(3);
  });

  it('leaves a Bracket Size already set alone', () => {
    let s = setBracketConfig(withTeams(['Alpha', 'Bravo', 'Charlie']), { bracketSize: 5 });
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    expect(s.elimination.bracketSize).toBe(5);
  });

  it('no longer follows the Estimated Bracket Size once saved', () => {
    let s = withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    ['Alpha', 'Bravo', 'Charlie'].forEach((name) => { s = formPlayoffAlliance(s, idOf(s, name), idOf(s, name)); });
    s = setTimelineConfig(s, { estimatedBracketSize: 2 });
    expect(getEffectiveBracketSize(s)).toBe(8);
    expect(isSelectionComplete(s)).toBe(false);
    expect(getAllianceCaptain(s)).toBe(idOf(s, 'Delta'));
    expect(startFinals(s, { confirmedShort: true }).state.elimination.bracket.seeds).toHaveLength(3);
  });

  it('keeps the saved Bracket Size when every alliance is removed', () => {
    let s = withTeams(['Alpha', 'Bravo']);
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    s = removePlayoffAlliance(s, s.elimination.alliances[0].id);
    s = setTimelineConfig(s, { estimatedBracketSize: 4 });
    expect(getEffectiveBracketSize(s)).toBe(8);
  });

  it('saves at least 2, so an Estimated Bracket Size of 1 still saves', () => {
    let s = setTimelineConfig(withTeams(['Alpha', 'Bravo', 'Charlie']), { estimatedBracketSize: 1 });
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Alpha'));
    expect(s.elimination.bracketSize).toBe(2);
    s = setTimelineConfig(s, { estimatedBracketSize: 6 });
    expect(getEffectiveBracketSize(s)).toBe(2);
  });

  it('keeps the saved Bracket Size through Discard Bracket', () => {
    const s = setTimelineConfig(discardBracket(startFinals(withTwoAlliancesOfTwo(), { confirmedShort: true }).state), { estimatedBracketSize: 6 });
    expect(getEffectiveBracketSize(s)).toBe(2);
  });

  it('refuses to clear a saved Bracket Size', () => {
    let s = withTeams(['Alpha', 'Bravo']);
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    expect(setBracketConfig(s, { bracketSize: null })).toBe(s);
  });
});

describe('selection complete at Bracket Size', () => {
  it('is complete once the number of alliances formed reaches the effective Bracket Size', () => {
    let s = withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot']);
    s = setBracketConfig(s, { bracketSize: 2 });
    expect(isSelectionComplete(s)).toBe(false);
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    expect(isSelectionComplete(s)).toBe(false);
    s = formPlayoffAlliance(s, idOf(s, 'Charlie'), idOf(s, 'Delta'));
    expect(isSelectionComplete(s)).toBe(true);
  });

  it('falls back to the Estimated Bracket Size', () => {
    let s = setTimelineConfig(withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']), { estimatedBracketSize: 2 });
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    s = formPlayoffAlliance(s, idOf(s, 'Charlie'), idOf(s, 'Delta'));
    expect(isSelectionComplete(s)).toBe(true);
  });

  it('has no Captain, and tags the leftover Teams not advancing, noting any that Declined', () => {
    let s = withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot']);
    s = declineTeam(s, idOf(s, 'Foxtrot'));
    s = setBracketConfig(s, { bracketSize: 2 });
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    s = formPlayoffAlliance(s, idOf(s, 'Charlie'), idOf(s, 'Delta'));
    expect(getAllianceCaptain(s)).toBeNull();
    expect(getAllianceCaptain(s, idOf(s, 'Echo'))).toBeNull();
    expect(getSelectionRowStatus(s, idOf(s, 'Alpha'))).toEqual({ status: 'in-alliance', allianceNumber: 1 });
    expect(getSelectionRowStatus(s, idOf(s, 'Echo'))).toEqual({ status: 'not-advancing', declined: false });
    expect(getSelectionRowStatus(s, idOf(s, 'Foxtrot'))).toEqual({ status: 'not-advancing', declined: true });
  });

  it('raising Bracket Size makes picking available again', () => {
    let s = withTwoAlliancesOfTwo();
    s = setBracketConfig(s, { bracketSize: 3 });
    expect(isSelectionComplete(s)).toBe(false);
    expect(getAllianceCaptain(s)).toBe(idOf(s, 'Echo'));
    expect(getAllianceSelectionBlockReason(s, 'pick')).toBeNull();
  });
});

describe('getAllianceShortfall', () => {
  it('is how many alliances short of the effective Bracket Size, never below 0', () => {
    let s = setBracketConfig(withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']), { bracketSize: 3 });
    expect(getAllianceShortfall(s)).toBe(3);
    s = formPlayoffAlliance(s, idOf(s, 'Alpha'), idOf(s, 'Bravo'));
    expect(getAllianceShortfall(s)).toBe(2);
    s = formPlayoffAlliance(s, idOf(s, 'Charlie'), idOf(s, 'Charlie'));
    s = formPlayoffAlliance(s, idOf(s, 'Delta'), idOf(s, 'Delta'));
    expect(getAllianceShortfall(s)).toBe(0);
  });
});

describe('isQualificationIncomplete', () => {
  it('is true while any Qualification Match is incomplete, false once all are or none exist', () => {
    const teams = withTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    expect(isQualificationIncomplete(teams)).toBe(false);
    expect(isQualificationIncomplete(regenerateMatchups(setMatchesPerTeam(teams, 2), { random: () => 0.5 }))).toBe(true);
    expect(isQualificationIncomplete(withPlayedQualification())).toBe(false);
  });
});
