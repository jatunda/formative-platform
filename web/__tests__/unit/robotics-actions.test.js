import { describe, it, expect } from 'vitest';
import { applyTournamentAction, getActionBlockReason } from '../../robotics/actions.js';
import { createInitialState, recordQualificationResult } from '../../robotics/state.js';

const NO_SCREEN = { captainOverride: null };

/** Applies each action in turn, failing loudly on a blocked one, and returns the final state and screen. */
function run(actions, { state = createInitialState(), screen = NO_SCREEN } = {}) {
  return actions.reduce((acc, action) => {
    const result = applyTournamentAction(acc.state, acc.screen, action);
    if (result.blockReason) throw new Error(`${action.type} blocked: ${result.blockReason}`);
    return result;
  }, { state, screen });
}

const idOf = (state, name) => state.teams.find((t) => t.name === name).id;
const addTeams = (names) => names.map((name) => ({ type: 'add-team', name, members: [] }));

describe('Teams through named actions', () => {
  it('adds a Team', () => {
    const { state } = run([{ type: 'add-team', name: 'Alpha', members: ['Ann'] }]);
    expect(state.teams).toEqual([{ id: expect.any(String), name: 'Alpha', members: ['Ann'] }]);
  });

  it('removes a Team before the Qualification Matches are drawn', () => {
    const before = run(addTeams(['Alpha', 'Bravo']));
    const { state } = run([{ type: 'remove-team', teamId: idOf(before.state, 'Alpha') }], before);
    expect(state.teams.map((t) => t.name)).toEqual(['Bravo']);
  });

  it('renames a Team and edits its Members against the current roster, so back-to-back edits all land', () => {
    const before = run([{ type: 'add-team', name: 'Alpha', members: ['Ann'] }]);
    const teamId = idOf(before.state, 'Alpha');
    const { state } = run([
      { type: 'add-member', teamId, member: 'Al' },
      { type: 'add-member', teamId, member: 'Abe' },
      { type: 'remove-member', teamId, index: 0 },
      { type: 'rename-team', teamId, name: 'Alpha Prime' },
    ], before);
    expect(state.teams).toEqual([{ id: teamId, name: 'Alpha Prime', members: ['Al', 'Abe'] }]);
  });

  it('a Member edit for a Team no longer on the roster changes nothing', () => {
    const before = run([{ type: 'add-team', name: 'Alpha', members: ['Ann'] }]);
    const teamId = idOf(before.state, 'Alpha');
    const removed = run([{ type: 'remove-team', teamId }], before);
    for (const action of [{ type: 'add-member', teamId, member: 'Al' }, { type: 'remove-member', teamId, index: 0 }]) {
      expect(applyTournamentAction(removed.state, removed.screen, action).state).toBe(removed.state);
    }
  });

  it('allows renaming and editing Members after the draw', () => {
    const drawn = run([...addTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']), { type: 'regenerate-matchups' }]);
    const teamId = idOf(drawn.state, 'Alpha');
    const { state } = run([{ type: 'rename-team', teamId, name: 'Ace' }, { type: 'add-member', teamId, member: 'Ann' }], drawn);
    expect(state.teams[0]).toMatchObject({ name: 'Ace', members: ['Ann'] });
  });

  it('refuses Regenerate Matchups once a Qualification Match is complete', () => {
    const drawn = run([...addTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']), { type: 'regenerate-matchups' }]).state;
    const played = recordQualificationResult(drawn, 0, { scoreA: 1, scoreB: 0 });
    const result = applyTournamentAction(played, NO_SCREEN, { type: 'regenerate-matchups' });
    expect(result.blockReason).toBe('Locked — a Qualification Match is already complete. Use Reset Results or Reset Everything / New Tournament first.');
    expect(result.state).toBe(played);
  });

  it('sets matches per team and the Timeline estimates', () => {
    const { state } = run([
      { type: 'set-matches-per-team', matchesPerTeam: 3 },
      { type: 'set-timeline-config', patch: { estimatedBracketSize: 6, estimatedThirdPlace: true } },
    ]);
    expect(state.qualification.matchesPerTeam).toBe(3);
    expect(state.timeline).toMatchObject({ estimatedBracketSize: 6, estimatedThirdPlace: true });
  });

  it('refuses to add or remove a Team once the Qualification Matches are drawn, leaving state as it was', () => {
    const drawn = run([...addTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']), { type: 'regenerate-matchups' }]).state;
    const message = 'Locked — the Qualification Matches are drawn. Use Reset Results or Reset Everything / New Tournament to change Teams.';
    for (const action of [{ type: 'add-team', name: 'Charlie', members: [] }, { type: 'remove-team', teamId: idOf(drawn, 'Alpha') }]) {
      const result = applyTournamentAction(drawn, NO_SCREEN, action);
      expect(result.blockReason).toBe(message);
      expect(result.state).toBe(drawn);
      expect(result.screen).toBe(NO_SCREEN);
    }
  });
});

describe('Alliance Selection through named actions', () => {
  /** Six Teams on the roster, no alliances formed yet. */
  function selectionReady() {
    return run(addTeams(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot']));
  }
  const allianceNames = (state) => state.elimination.alliances.map((a) => a.teamIds.map((id) => state.teams.find((t) => t.id === id).name));

  it('an overridden Captain picks a partner, and forming the alliance ends the override', () => {
    const start = selectionReady();
    const id = (name) => idOf(start.state, name);
    const overridden = run([{ type: 'set-captain-override', teamId: id('Charlie') }], start);
    expect(overridden.screen).toEqual({ captainOverride: id('Charlie') });
    expect(overridden.state).toBe(start.state);

    const { state, screen } = run([{ type: 'pick', captainId: id('Charlie'), partnerId: id('Echo') }], overridden);
    expect(allianceNames(state)).toEqual([['Charlie', 'Echo']]);
    expect(screen).toEqual({ captainOverride: null });
  });

  it('a Captain picking itself forms a single-Team alliance', () => {
    const start = selectionReady();
    const alpha = idOf(start.state, 'Alpha');
    const { state } = run([{ type: 'pick', captainId: alpha, partnerId: alpha }], start);
    expect(allianceNames(state)).toEqual([['Alpha']]);
  });

  it('a blocked pick changes nothing, keeping the Captain override', () => {
    const start = selectionReady();
    const id = (name) => idOf(start.state, name);
    const full = run([
      { type: 'set-bracket-size', bracketSize: 2 },
      { type: 'pick', captainId: id('Alpha'), partnerId: id('Bravo') },
      { type: 'pick', captainId: id('Charlie'), partnerId: id('Delta') },
      { type: 'set-captain-override', teamId: id('Echo') },
    ], start);
    const result = applyTournamentAction(full.state, full.screen, { type: 'pick', captainId: id('Echo'), partnerId: id('Foxtrot') });
    expect(result.blockReason).toBe('All 2 alliances are formed. Raise Bracket Size to keep picking.');
    expect(result.state).toBe(full.state);
    expect(result.screen).toEqual({ captainOverride: id('Echo') });
  });

  it('records and undoes a Decline', () => {
    const start = selectionReady();
    const bravo = idOf(start.state, 'Bravo');
    const declined = run([{ type: 'decline', teamId: bravo }], start);
    expect(declined.state.elimination.declinedTeamIds).toEqual([bravo]);
    const undone = run([{ type: 'undo-decline', teamId: bravo }], declined);
    expect(undone.state.elimination.declinedTeamIds).toEqual([]);
  });

  it('reorders and removes Playoff Alliances', () => {
    const start = selectionReady();
    const id = (name) => idOf(start.state, name);
    const formed = run([
      { type: 'pick', captainId: id('Alpha'), partnerId: id('Bravo') },
      { type: 'pick', captainId: id('Charlie'), partnerId: id('Delta') },
    ], start);
    const [first, second] = formed.state.elimination.alliances;
    const moved = run([{ type: 'move-alliance', allianceId: second.id, direction: -1 }], formed);
    expect(allianceNames(moved.state)).toEqual([['Charlie', 'Delta'], ['Alpha', 'Bravo']]);
    const removed = run([{ type: 'remove-alliance', allianceId: first.id }], moved);
    expect(allianceNames(removed.state)).toEqual([['Charlie', 'Delta']]);
  });

  it('refuses a Bracket Size below the alliances formed', () => {
    const start = selectionReady();
    const id = (name) => idOf(start.state, name);
    const formed = run(['Alpha', 'Bravo', 'Charlie'].map((name) => ({ type: 'pick', captainId: id(name), partnerId: id(name) })), start);
    const result = applyTournamentAction(formed.state, formed.screen, { type: 'set-bracket-size', bracketSize: 2 });
    expect(result.blockReason).toBe('3 alliances are already formed. Remove alliances before lowering Bracket Size below 3.');
    expect(result.state).toBe(formed.state);
  });

  it('starts the Finals only once a short selection is confirmed, reporting what it did', () => {
    const start = selectionReady();
    const id = (name) => idOf(start.state, name);
    const formed = run([
      { type: 'set-bracket-size', bracketSize: 4 },
      { type: 'set-third-place', includeThirdPlace: true },
      { type: 'pick', captainId: id('Alpha'), partnerId: id('Bravo') },
      { type: 'pick', captainId: id('Charlie'), partnerId: id('Delta') },
    ], start);

    const unconfirmed = applyTournamentAction(formed.state, formed.screen, { type: 'start-finals', confirmedShort: false });
    expect(unconfirmed).toMatchObject({ blockReason: null, outcome: { started: false, shortBy: 2 } });
    expect(unconfirmed.state).toBe(formed.state);

    const confirmed = applyTournamentAction(formed.state, formed.screen, { type: 'start-finals', confirmedShort: true });
    expect(confirmed.outcome).toEqual({ started: true, shortBy: 2 });
    expect(confirmed.state.elimination.bracket).not.toBeNull();
    expect(confirmed.state.elimination.bracketSize).toBe(2);
  });

  it('locks every selection action while a Bracket exists, until Discard Bracket', () => {
    const start = selectionReady();
    const id = (name) => idOf(start.state, name);
    const started = run([
      { type: 'set-bracket-size', bracketSize: 2 },
      { type: 'pick', captainId: id('Alpha'), partnerId: id('Bravo') },
      { type: 'pick', captainId: id('Charlie'), partnerId: id('Delta') },
      { type: 'start-finals', confirmedShort: false },
    ], start);
    const allianceId = started.state.elimination.alliances[0].id;
    const locked = 'Locked — the Finals have started. Discard Bracket to change alliances.';
    for (const action of [
      { type: 'pick', captainId: id('Echo'), partnerId: id('Foxtrot') },
      { type: 'decline', teamId: id('Echo') },
      { type: 'undo-decline', teamId: id('Echo') },
      { type: 'move-alliance', allianceId, direction: 1 },
      { type: 'remove-alliance', allianceId },
      { type: 'set-bracket-size', bracketSize: 4 },
      { type: 'set-third-place', includeThirdPlace: true },
      { type: 'start-finals', confirmedShort: true },
    ]) {
      expect(applyTournamentAction(started.state, started.screen, action).blockReason).toBe(locked);
    }
    const discarded = run([{ type: 'discard-bracket' }, { type: 'remove-alliance', allianceId }], started);
    expect(discarded.state.elimination.bracket).toBeNull();
    expect(allianceNames(discarded.state)).toEqual([['Charlie', 'Delta']]);
  });
});

describe('getActionBlockReason', () => {
  it('asks the same rule the entry point checks, and allows actions with no rule', () => {
    const drawn = run([...addTeams(['Alpha', 'Bravo', 'Charlie', 'Delta']), { type: 'regenerate-matchups' }]).state;
    expect(getActionBlockReason(drawn, { type: 'add-team' })).toMatch(/^Locked — the Qualification Matches are drawn/);
    expect(getActionBlockReason(drawn, { type: 'rename-team' })).toBeNull();
    expect(getActionBlockReason(createInitialState(), { type: 'start-finals' })).toBe('Form at least 2 alliances before starting the Finals.');
  });
});

describe('unknown actions', () => {
  it('throws rather than silently doing nothing', () => {
    expect(() => applyTournamentAction(createInitialState(), NO_SCREEN, { type: 'no-such-action' })).toThrow('Unknown tournament action: no-such-action');
  });
});
