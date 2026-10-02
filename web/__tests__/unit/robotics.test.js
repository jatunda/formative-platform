import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initRoboticsApp,
  teamName,
  getAllMatchesInScheduleOrder,
  autoFillSeedsFromStandings,
} from '../../robotics/robotics.js';
import { createInitialState, addTeam, setMatchesPerTeam, regenerateMatchups } from '../../robotics/state.js';

function setClipboardMock() {
  const writeText = vi.fn();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  return writeText;
}

function clickButtonWithText(root, text) {
  const btn = [...root.querySelectorAll('button')].find((b) => b.textContent === text);
  if (!btn) throw new Error(`No button with text "${text}"`);
  btn.click();
}

function addTeamViaForm(root, name, members = '') {
  const inputs = root.querySelectorAll('input');
  const nameInput = [...inputs].find((i) => i.placeholder === 'Team name');
  const membersInput = [...inputs].find((i) => i.placeholder === 'Members (comma-separated)');
  nameInput.value = name;
  membersInput.value = members;
  clickButtonWithText(root, 'Add Team');
}

describe('initRoboticsApp', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="roboticsApp"></div>';
    setClipboardMock();
  });

  it('returns null when the mount point is missing', () => {
    document.body.innerHTML = '';
    expect(initRoboticsApp()).toBeNull();
  });

  it('renders the Teams tab by default', () => {
    initRoboticsApp();
    const active = document.querySelector('.robotics-tab-btn.active');
    expect(active.textContent).toBe('Teams');
  });

  it('adds and removes a team through the form', () => {
    const app = initRoboticsApp();
    const root = document.getElementById('roboticsApp');
    addTeamViaForm(root, 'Alpha', 'Ann, Al');
    expect(app.getState().teams).toHaveLength(1);
    expect(app.getState().teams[0].members).toEqual(['Ann', 'Al']);

    clickButtonWithText(root, 'Remove');
    expect(app.getState().teams).toHaveLength(0);
  });

  it('ignores adding a team with a blank name', () => {
    const app = initRoboticsApp();
    const root = document.getElementById('roboticsApp');
    addTeamViaForm(root, '   ');
    expect(app.getState().teams).toHaveLength(0);
  });

  it('switches tabs', () => {
    const app = initRoboticsApp();
    app.setActiveTab('standings');
    const active = document.querySelector('.robotics-tab-btn.active');
    expect(active.textContent).toBe('Standings');
  });

  it('copies the roster to the clipboard', () => {
    const writeText = setClipboardMock();
    const app = initRoboticsApp();
    const root = document.getElementById('roboticsApp');
    addTeamViaForm(root, 'Alpha', 'Ann');
    clickButtonWithText(root, 'Copy Roster to Clipboard');
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Alpha: Ann'));
  });

  describe('qualification schedule', () => {
    function setupFourTeams(app) {
      const root = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      return root;
    }

    it('regenerate is disabled once a match is complete, and reset re-enables it', () => {
      const app = initRoboticsApp();
      let root = setupFourTeams(app);
      const matchesInput = [...root.querySelectorAll('input')].find((i) => i.previousSibling?.textContent?.includes('Matches per team') || true);
      // directly dispatch config + regenerate to keep this test focused on the lock behavior
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      root = document.getElementById('roboticsApp');
      expect([...root.querySelectorAll('button')].find((b) => b.textContent === 'Regenerate Matchups').disabled).toBe(false);

      app.setActiveTab('schedule');
      root = document.getElementById('roboticsApp');
      const scoreInputs = root.querySelectorAll('.robotics-score-input');
      scoreInputs[0].value = '50';
      scoreInputs[1].value = '10';
      clickButtonWithText(root, 'Mark Complete');

      app.setActiveTab('teams');
      root = document.getElementById('roboticsApp');
      expect([...root.querySelectorAll('button')].find((b) => b.textContent === 'Regenerate Matchups').disabled).toBe(true);

      clickButtonWithText(root, 'Reset Results');
      root = document.getElementById('roboticsApp');
      expect([...root.querySelectorAll('button')].find((b) => b.textContent === 'Regenerate Matchups').disabled).toBe(false);
      expect(app.getState().teams).toHaveLength(4);
    });

    it('marks a match complete and shows the completed badge', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      let root = document.getElementById('roboticsApp');
      const scoreInputs = root.querySelectorAll('.robotics-score-input');
      scoreInputs[0].value = '50';
      scoreInputs[1].value = '10';
      clickButtonWithText(root, 'Mark Complete');
      root = document.getElementById('roboticsApp');
      expect(root.querySelector('.robotics-complete-badge')).toBeTruthy();
      expect(app.getState().qualification.matches[0].completed).toBe(true);
    });

    it('toggles a no-show checkbox', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      const root = document.getElementById('roboticsApp');
      const checkbox = root.querySelector('.robotics-match-row input[type="checkbox"]');
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      const firstTeamId = app.getState().qualification.matches[0].allianceA[0];
      expect(app.getState().qualification.matches[0].noShow[firstTeamId]).toBe(true);
    });

    it('pins a match as current via Set as Current', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 3));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      let root = document.getElementById('roboticsApp');
      const rows = root.querySelectorAll('.robotics-match-row');
      expect(rows.length).toBeGreaterThan(1);
      const setCurrentBtns = [...root.querySelectorAll('button')].filter((b) => b.textContent === 'Set as Current');
      setCurrentBtns[setCurrentBtns.length - 1].click();
      expect(app.getState().qualification.pinnedMatchIndex).not.toBeNull();
      root = document.getElementById('roboticsApp');
      expect(root.querySelectorAll('.robotics-match-row.is-current')).toHaveLength(1);
    });

    it('clears a pinned match back to automatic mode via Clear Pin', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 3));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      let root = document.getElementById('roboticsApp');
      const setCurrentBtns = [...root.querySelectorAll('button')].filter((b) => b.textContent === 'Set as Current');
      setCurrentBtns[setCurrentBtns.length - 1].click();
      expect(app.getState().qualification.pinnedMatchIndex).not.toBeNull();

      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Clear Pin (back to automatic)');
      expect(app.getState().qualification.pinnedMatchIndex).toBeNull();
    });

    it('copies match data to the clipboard', () => {
      const writeText = setClipboardMock();
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      const root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Copy Match Data to Clipboard');
      expect(writeText).toHaveBeenCalled();
    });

    it('applies a backward-mode end time to compute a start time', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      let root = document.getElementById('roboticsApp');
      const modeSelect = root.querySelector('select');
      modeSelect.value = 'backward';
      modeSelect.dispatchEvent(new Event('change'));
      root = document.getElementById('roboticsApp');
      const endInput = root.querySelector('input[type="datetime-local"]');
      endInput.value = '2026-10-02T12:00';
      endInput.dispatchEvent(new Event('change'));
      clickButtonWithText(root, 'Apply');
      expect(app.getState().timeline.startTime).toBeTruthy();
    });
  });

  describe('standings tab', () => {
    it('renders a standings row per team', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha');
      addTeamViaForm(root, 'Bravo');
      app.setActiveTab('standings');
      const rows = document.querySelectorAll('table tr');
      expect(rows.length).toBe(3); // header + 2 teams
    });

    it('copies standings to the clipboard', () => {
      const writeText = setClipboardMock();
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha');
      app.setActiveTab('standings');
      clickButtonWithText(document.getElementById('roboticsApp'), 'Copy Standings to Clipboard');
      expect(writeText).toHaveBeenCalled();
    });
  });

  describe('finals tab', () => {
    function setupFourTeams(app) {
      const root = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
    }

    it('forms and removes a playoff alliance', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance');
      expect(app.getState().elimination.alliances).toHaveLength(1);

      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Remove');
      expect(app.getState().elimination.alliances).toHaveLength(0);
    });

    it('configures the bracket, assigns seeds, and generates it', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance'); // Alpha+Bravo
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance'); // Charlie+Delta
      expect(app.getState().elimination.alliances).toHaveLength(2);

      root = document.getElementById('roboticsApp');
      const sizeInput = [...root.querySelectorAll('input')].find((i) => i.previousSibling?.textContent?.includes('Bracket size'));
      sizeInput.value = '2';
      clickButtonWithText(root, 'Save Bracket Config');

      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Auto-fill Seeds from Standings');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Generate Bracket');

      expect(app.getState().elimination.bracket).toBeTruthy();
      root = document.getElementById('roboticsApp');
      expect(root.querySelector('.robotics-bracket')).toBeTruthy();
    });

    it('records an elimination result and shows the champion once the final completes', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance');
      root = document.getElementById('roboticsApp');
      const sizeInput = [...root.querySelectorAll('input')].find((i) => i.previousSibling?.textContent?.includes('Bracket size'));
      sizeInput.value = '2';
      clickButtonWithText(root, 'Save Bracket Config');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Auto-fill Seeds from Standings');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Generate Bracket');

      root = document.getElementById('roboticsApp');
      const scoreInputs = root.querySelectorAll('.robotics-bracket .robotics-score-input');
      scoreInputs[0].value = '80';
      scoreInputs[1].value = '20';
      clickButtonWithText(root, 'Mark Complete');

      expect(document.getElementById('roboticsApp').textContent).toContain('Champion');
    });

    it('toggles a no-show checkbox on an elimination match', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance');
      root = document.getElementById('roboticsApp');
      const sizeInput = [...root.querySelectorAll('input')].find((i) => i.previousSibling?.textContent?.includes('Bracket size'));
      sizeInput.value = '2';
      clickButtonWithText(root, 'Save Bracket Config');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Auto-fill Seeds from Standings');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Generate Bracket');

      root = document.getElementById('roboticsApp');
      const checkbox = root.querySelector('.robotics-bracket input[type="checkbox"]');
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));

      const bracketMatch = app.getState().elimination.bracket.matches.find((m) => !m.isBye);
      expect(Object.values(bracketMatch.noShow)).toContain(true);
    });
  });

  it('newTournament wipes teams via the New Tournament button', () => {
    const app = initRoboticsApp();
    const root = document.getElementById('roboticsApp');
    addTeamViaForm(root, 'Alpha');
    clickButtonWithText(root, 'New Tournament');
    expect(app.getState().teams).toHaveLength(0);
  });
});

describe('teamName', () => {
  it('falls back for an unknown team id', () => {
    expect(teamName(createInitialState(), 'nope')).toBe('(unknown team)');
  });
});

describe('getAllMatchesInScheduleOrder', () => {
  it('returns an empty list for a fresh tournament', () => {
    expect(getAllMatchesInScheduleOrder(createInitialState())).toEqual([]);
  });
});

describe('autoFillSeedsFromStandings', () => {
  it('is a no-op when there are no playoff alliances yet', () => {
    const state = createInitialState();
    expect(autoFillSeedsFromStandings(state).elimination.seeds).toEqual({});
  });
});
