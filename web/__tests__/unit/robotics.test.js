import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initRoboticsApp,
  teamName,
  getAllMatchesInScheduleOrder,
  autoFillSeedsFromStandings,
} from '../../robotics/robotics.js';
import { createInitialState, addTeam, setMatchesPerTeam, regenerateMatchups, recordQualificationResult, setTimelineConfig } from '../../robotics/state.js';

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

async function clickDialogButton(root, text) {
  const dialog = root.querySelector('.robotics-confirm-dialog');
  const btn = dialog && [...dialog.querySelectorAll('button')].find((b) => b.textContent === text);
  if (!btn) throw new Error(`No dialog button with text "${text}"`);
  btn.click();
  await Promise.resolve();
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

  it('shows an error toast and adds no team when the name is blank', () => {
    const app = initRoboticsApp();
    const root = document.getElementById('roboticsApp');
    addTeamViaForm(root, '   ');
    expect(app.getState().teams).toHaveLength(0);
    const toast = document.querySelector('.robotics-toast-visible');
    expect(toast?.textContent).toBe('Team name is required.');
    expect(toast?.className).toContain('robotics-toast-error');
  });

  describe('Add a Team keyboard UX', () => {
    function getFormInputs(root) {
      const inputs = root.querySelectorAll('input');
      const nameInput = [...inputs].find((i) => i.placeholder === 'Team name');
      const membersInput = [...inputs].find((i) => i.placeholder === 'Members (comma-separated)');
      return { nameInput, membersInput };
    }

    it('adds the team on Enter in the Team name field', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      const { nameInput } = getFormInputs(root);
      nameInput.value = 'Alpha';
      nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      expect(app.getState().teams).toHaveLength(1);
      expect(app.getState().teams[0].name).toBe('Alpha');
    });

    it('adds the team on Enter in the Members field and returns focus to the Team name field', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      const { nameInput, membersInput } = getFormInputs(root);
      nameInput.value = 'Alpha';
      membersInput.value = 'Ann, Al';
      membersInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      expect(app.getState().teams).toHaveLength(1);
      expect(app.getState().teams[0].members).toEqual(['Ann', 'Al']);
      const { nameInput: refreshedNameInput } = getFormInputs(root);
      expect(document.activeElement).toBe(refreshedNameInput);
    });

    it('does not add a team on a non-Enter keydown in the Team name field', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      const { nameInput } = getFormInputs(root);
      nameInput.value = 'Alpha';
      nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
      expect(app.getState().teams).toHaveLength(0);
    });

    it('shows an error toast on Enter with a blank name and adds no team', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      const { nameInput } = getFormInputs(root);
      nameInput.value = '   ';
      nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      expect(app.getState().teams).toHaveLength(0);
      const toast = document.querySelector('.robotics-toast-visible');
      expect(toast?.textContent).toBe('Team name is required.');
      expect(toast?.className).toContain('robotics-toast-error');
    });
  });

  it('switches tabs', () => {
    const app = initRoboticsApp();
    app.setActiveTab('schedule');
    const active = document.querySelector('.robotics-tab-btn.active');
    expect(active.textContent).toBe('Schedule & Standings');
  });

  it('copies the roster to the clipboard and shows a confirmation toast', async () => {
    const writeText = setClipboardMock();
    const app = initRoboticsApp();
    const root = document.getElementById('roboticsApp');
    addTeamViaForm(root, 'Alpha', 'Ann');
    clickButtonWithText(root, 'Copy Roster to Clipboard');
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Alpha: Ann'));
    await Promise.resolve();
    const toast = document.querySelector('.robotics-toast-visible');
    expect(toast?.textContent).toBe('Roster copied to clipboard.');
  });

  describe('inline roster editing', () => {
    it('renames a team inline by committing the name input on change', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      const nameInput = root.querySelector('.robotics-team-name-input');
      nameInput.value = 'Alpha Squad';
      nameInput.dispatchEvent(new Event('change'));
      expect(app.getState().teams[0].name).toBe('Alpha Squad');
    });

    it('ignores a blank rename and reverts the input to the current name', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      const nameInput = root.querySelector('.robotics-team-name-input');
      nameInput.value = '   ';
      nameInput.dispatchEvent(new Event('change'));
      expect(app.getState().teams[0].name).toBe('Alpha');
      expect(nameInput.value).toBe('Alpha');
    });

    it('renaming a team preserves its id and any generated matches', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      const teamId = app.getState().teams[0].id;
      const matchCountBefore = app.getState().qualification.matches.length;

      const nameInput = document.getElementById('roboticsApp').querySelector('.robotics-team-name-input');
      nameInput.value = 'Alpha Prime';
      nameInput.dispatchEvent(new Event('change'));

      expect(app.getState().teams[0].id).toBe(teamId);
      expect(app.getState().teams[0].name).toBe('Alpha Prime');
      expect(app.getState().qualification.matches).toHaveLength(matchCountBefore);
      expect(app.getState().qualification.matches[0].allianceA.concat(app.getState().qualification.matches[0].allianceB)).toContain(teamId);
    });

    it('adds a member individually via the add-member field', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      const addInput = root.querySelector('.robotics-member-add-input');
      addInput.value = 'Bea';
      clickButtonWithText(root, 'Add member');
      expect(app.getState().teams[0].members).toEqual(['Ann', 'Bea']);
    });

    it('ignores adding a blank member', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      clickButtonWithText(root, 'Add member');
      expect(app.getState().teams[0].members).toEqual(['Ann']);
    });

    it('adds a member by pressing Enter in the add-member field', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      const addInput = root.querySelector('.robotics-member-add-input');
      addInput.value = 'Bea';
      addInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      expect(app.getState().teams[0].members).toEqual(['Ann', 'Bea']);
    });

    it('does not add a member on a non-Enter keydown', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      const addInput = root.querySelector('.robotics-member-add-input');
      addInput.value = 'Bea';
      addInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
      expect(app.getState().teams[0].members).toEqual(['Ann']);
    });

    it('removes an individual member without affecting the rest of the roster', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann, Al');
      const removeBtn = root.querySelector('.robotics-member-remove[aria-label="Remove Ann"]');
      removeBtn.click();
      expect(app.getState().teams[0].members).toEqual(['Al']);
    });
  });

  describe('qualification schedule', () => {
    function setupFourTeams(app) {
      const root = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      return root;
    }

    it('regenerate is disabled once a match is complete, and reset re-enables it', async () => {
      const app = initRoboticsApp();
      let root = setupFourTeams(app);
      const matchesInput = [...root.querySelectorAll('input')].find((i) => i.previousSibling?.textContent?.includes('Matches per team') || true);
      // directly dispatch config + regenerate to keep this test focused on the lock behavior
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      root = document.getElementById('roboticsApp');
      expect([...root.querySelectorAll('button')].find((b) => b.textContent === 'Regenerate Matchups').getAttribute('aria-disabled')).toBeNull();

      app.setActiveTab('schedule');
      root = document.getElementById('roboticsApp');
      const scoreInputs = root.querySelectorAll('.robotics-score-input');
      scoreInputs[0].value = '50';
      scoreInputs[1].value = '10';
      clickButtonWithText(root, 'Mark Complete');

      app.setActiveTab('teams');
      root = document.getElementById('roboticsApp');
      let regenBtn = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Regenerate Matchups');
      expect(regenBtn.getAttribute('aria-disabled')).toBe('true');
      expect(regenBtn.title).toContain('Reset Results');

      clickButtonWithText(root, 'Reset Results');
      root = document.getElementById('roboticsApp');
      await clickDialogButton(root, 'Reset Results');
      root = document.getElementById('roboticsApp');
      expect([...root.querySelectorAll('button')].find((b) => b.textContent === 'Generate Matchups').getAttribute('aria-disabled')).toBeNull();
      expect(app.getState().teams).toHaveLength(4);
    });

    it('labels the button "Generate Matchups" before any matchups exist, and "Regenerate Matchups" after', () => {
      const app = initRoboticsApp();
      let root = setupFourTeams(app);
      expect([...root.querySelectorAll('button')].some((b) => b.textContent === 'Generate Matchups')).toBe(true);
      expect([...root.querySelectorAll('button')].some((b) => b.textContent === 'Regenerate Matchups')).toBe(false);

      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      root = document.getElementById('roboticsApp');
      expect([...root.querySelectorAll('button')].some((b) => b.textContent === 'Generate Matchups')).toBe(false);
      expect([...root.querySelectorAll('button')].some((b) => b.textContent === 'Regenerate Matchups')).toBe(true);
    });

    it('shows an error toast with the reset hint when clicking the locked Regenerate Matchups button', () => {
      const app = initRoboticsApp();
      let root = setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      root = document.getElementById('roboticsApp');
      const scoreInputs = root.querySelectorAll('.robotics-score-input');
      scoreInputs[0].value = '50';
      scoreInputs[1].value = '10';
      clickButtonWithText(root, 'Mark Complete');

      app.setActiveTab('teams');
      root = document.getElementById('roboticsApp');
      const matchesBefore = app.getState().qualification.matches.length;
      clickButtonWithText(root, 'Regenerate Matchups');
      expect(app.getState().qualification.matches.length).toBe(matchesBefore);
      const toast = document.querySelector('.robotics-toast-visible');
      expect(toast?.textContent).toContain('Reset Results');
      expect(toast?.className).toContain('robotics-toast-error');
    });

    it('locks the Add a Team form once a Qualification Match is complete, with a hint on hover and click', () => {
      const app = initRoboticsApp();
      let root = setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      root = document.getElementById('roboticsApp');
      const scoreInputs = root.querySelectorAll('.robotics-score-input');
      scoreInputs[0].value = '50';
      scoreInputs[1].value = '10';
      clickButtonWithText(root, 'Mark Complete');

      app.setActiveTab('teams');
      root = document.getElementById('roboticsApp');
      const inputs = root.querySelectorAll('input');
      const nameInput = [...inputs].find((i) => i.placeholder === 'Team name');
      const membersInput = [...inputs].find((i) => i.placeholder === 'Members (comma-separated)');
      expect(nameInput.readOnly).toBe(true);
      expect(nameInput.title).toContain('Reset Results');
      expect(membersInput.readOnly).toBe(true);
      const addBtn = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Add Team');
      expect(addBtn.getAttribute('aria-disabled')).toBe('true');
      expect(addBtn.title).toContain('Reset Results');

      nameInput.click();
      expect(document.querySelector('.robotics-toast-visible')?.textContent).toContain('Reset Results');

      const teamsBefore = app.getState().teams.length;
      nameInput.value = 'Echo';
      addBtn.click();
      expect(app.getState().teams).toHaveLength(teamsBefore);
      const toast = document.querySelector('.robotics-toast-visible');
      expect(toast?.textContent).toContain('Reset Results');
      expect(toast?.className).toContain('robotics-toast-error');
    });

    it('keeps the Add a Team form enabled when unlocked', () => {
      const app = initRoboticsApp();
      const root = setupFourTeams(app);
      const inputs = root.querySelectorAll('input');
      const nameInput = [...inputs].find((i) => i.placeholder === 'Team name');
      expect(nameInput.readOnly).toBe(false);
      const addBtn = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Add Team');
      expect(addBtn.getAttribute('aria-disabled')).toBeNull();
    });

    it('separates the matchup button from the danger-action row with the spacing class', () => {
      const app = initRoboticsApp();
      const root = setupFourTeams(app);
      const dangerRow = root.querySelector('.robotics-danger-row');
      expect(dangerRow).toBeTruthy();
      expect(dangerRow.querySelector('button').textContent).toBe('Reset Results');
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

    it('marks the winning side with is-winner once a match completes with a decisive score', () => {
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
      const alliances = root.querySelectorAll('.robotics-match-row .robotics-match-alliance');
      expect(alliances[0].classList.contains('is-winner')).toBe(true);
      expect(alliances[1].classList.contains('is-winner')).toBe(false);
    });

    it('does not mark either side as winner on a tied completed match', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      let root = document.getElementById('roboticsApp');
      const scoreInputs = root.querySelectorAll('.robotics-score-input');
      scoreInputs[0].value = '30';
      scoreInputs[1].value = '30';
      clickButtonWithText(root, 'Mark Complete');

      root = document.getElementById('roboticsApp');
      const alliances = root.querySelectorAll('.robotics-match-row .robotics-match-alliance');
      expect(alliances[0].classList.contains('is-winner')).toBe(false);
      expect(alliances[1].classList.contains('is-winner')).toBe(false);
    });

    it('toggles no-show by clicking a team name', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      const root = document.getElementById('roboticsApp');
      const toggle = root.querySelector('.robotics-match-row .robotics-team-toggle');
      expect(toggle.classList.contains('is-no-show')).toBe(false);
      toggle.click();
      const firstTeamId = app.getState().qualification.matches[0].allianceA[0];
      expect(app.getState().qualification.matches[0].noShow[firstTeamId]).toBe(true);
    });

    it('marks a clicked no-show team with the is-no-show class, and clears it on a second click', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      let root = document.getElementById('roboticsApp');
      let toggle = root.querySelector('.robotics-match-row .robotics-team-toggle');
      toggle.click();

      root = document.getElementById('roboticsApp');
      toggle = root.querySelector('.robotics-match-row .robotics-team-toggle');
      expect(toggle.classList.contains('is-no-show')).toBe(true);

      toggle.click();
      root = document.getElementById('roboticsApp');
      toggle = root.querySelector('.robotics-match-row .robotics-team-toggle');
      expect(toggle.classList.contains('is-no-show')).toBe(false);
    });

    it('keeps a typed-but-unsaved score after toggling No-Show, including repeated toggling on either side', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      let root = document.getElementById('roboticsApp');

      const scoreInputs = root.querySelectorAll('.robotics-score-input');
      scoreInputs[0].value = '50';
      scoreInputs[0].dispatchEvent(new Event('change'));
      root = document.getElementById('roboticsApp');
      let freshScoreInputs = root.querySelectorAll('.robotics-score-input');
      freshScoreInputs[1].value = '10';
      freshScoreInputs[1].dispatchEvent(new Event('change'));

      root = document.getElementById('roboticsApp');
      let toggles = root.querySelectorAll('.robotics-match-row .robotics-team-toggle');
      toggles[0].click();

      root = document.getElementById('roboticsApp');
      freshScoreInputs = root.querySelectorAll('.robotics-score-input');
      expect(freshScoreInputs[0].value).toBe('50');
      expect(freshScoreInputs[1].value).toBe('10');
      expect(app.getState().qualification.matches[0].completed).toBe(false);

      // toggle on then off then on again (second team's name)
      root = document.getElementById('roboticsApp');
      toggles = root.querySelectorAll('.robotics-match-row .robotics-team-toggle');
      toggles[1].click();
      root = document.getElementById('roboticsApp');
      toggles = root.querySelectorAll('.robotics-match-row .robotics-team-toggle');
      toggles[1].click();
      root = document.getElementById('roboticsApp');
      toggles = root.querySelectorAll('.robotics-match-row .robotics-team-toggle');
      toggles[1].click();

      root = document.getElementById('roboticsApp');
      freshScoreInputs = root.querySelectorAll('.robotics-score-input');
      expect(freshScoreInputs[0].value).toBe('50');
      expect(freshScoreInputs[1].value).toBe('10');
    });

    it('shows an explicit text label on the current match row', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 3));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      const root = document.getElementById('roboticsApp');
      const currentRow = root.querySelector('.robotics-match-row.is-current');
      expect(currentRow.querySelector('.robotics-current-label').textContent).toBe('Current Match');
    });

    it('reorders not-yet-complete matches with the down button, which becomes the new current match', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 3));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      const secondMatchBefore = app.getState().qualification.matches[1];

      let root = document.getElementById('roboticsApp');
      const moveDownBtns = [...root.querySelectorAll('button')].filter((b) => b.textContent === '↓');
      moveDownBtns[0].click();

      expect(app.getState().qualification.matches[0]).toBe(secondMatchBefore);
      root = document.getElementById('roboticsApp');
      const currentRows = root.querySelectorAll('.robotics-match-row.is-current');
      expect(currentRows).toHaveLength(1);
      expect(currentRows[0]).toBe(root.querySelectorAll('.robotics-match-row')[0]);
    });

    it('disables the up button on the topmost match and does not render reorder buttons on a completed match', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 3));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      let root = document.getElementById('roboticsApp');
      const rows = root.querySelectorAll('.robotics-match-row');
      const firstRowButtons = [...rows[0].querySelectorAll('button')];
      expect(firstRowButtons.find((b) => b.textContent === '↑').disabled).toBe(true);

      const scoreInputs = root.querySelectorAll('.robotics-score-input');
      scoreInputs[0].value = '50';
      scoreInputs[1].value = '10';
      clickButtonWithText(root, 'Mark Complete');

      root = document.getElementById('roboticsApp');
      const completedRow = root.querySelectorAll('.robotics-match-row')[0];
      expect([...completedRow.querySelectorAll('button')].some((b) => b.textContent === '↑' || b.textContent === '↓')).toBe(false);
    });

    it('shows the field assignment per match when field count is greater than 1', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 3));
      app.dispatch((s) => regenerateMatchups(s));
      app.dispatch((s) => setTimelineConfig(s, { fieldCount: 2 }));
      app.setActiveTab('schedule');
      const root = document.getElementById('roboticsApp');
      const fieldLabels = [...root.querySelectorAll('.robotics-match-field')].map((el) => el.textContent);
      expect(fieldLabels[0]).toBe('Field 1');
      expect(fieldLabels[1]).toBe('Field 2');
    });

    it('does not show field assignments when field count is 1', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 3));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      const root = document.getElementById('roboticsApp');
      expect(root.querySelectorAll('.robotics-match-field')).toHaveLength(0);
    });

    it('copies match data to the clipboard and shows a confirmation toast', async () => {
      const writeText = setClipboardMock();
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      const root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Copy Match Data to Clipboard');
      expect(writeText).toHaveBeenCalled();
      await Promise.resolve();
      expect(document.querySelector('.robotics-toast-visible')?.textContent).toBe('Match data copied to clipboard.');
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
      const endInput = root.querySelector('input[type="time"]');
      endInput.value = '12:00';
      clickButtonWithText(root, 'Apply');
      expect(app.getState().timeline.startTime).toBeTruthy();
    });

    it('does not recalculate the backward-mode schedule until Apply is clicked', () => {
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
      const endInput = root.querySelector('input[type="time"]');
      endInput.value = '12:00';
      expect(app.getState().timeline.startTime).toBeNull();
    });

    it('keeps the entered end time visible after Apply instead of clearing the field', () => {
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
      const endInput = root.querySelector('input[type="time"]');
      endInput.value = '12:00';
      clickButtonWithText(root, 'Apply');
      root = document.getElementById('roboticsApp');
      expect(root.querySelector('input[type="time"]').value).toBe('12:00');
    });

    it('has an explicit Apply button in forward mode that only applies the start time on click', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      const root = document.getElementById('roboticsApp');
      const startInput = root.querySelector('input[type="time"]');
      startInput.value = '09:30';
      expect(app.getState().timeline.startTime).toBeNull();
      clickButtonWithText(root, 'Apply');
      const state = app.getState();
      expect(state.timeline.startTime).toBeTruthy();
      const applied = new Date(state.timeline.startTime);
      expect(applied.getHours()).toBe(9);
      expect(applied.getMinutes()).toBe(30);
    });

    it('keeps the entered start time visible after Apply instead of clearing the field', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      let root = document.getElementById('roboticsApp');
      const startInput = root.querySelector('input[type="time"]');
      startInput.value = '09:30';
      clickButtonWithText(root, 'Apply');
      root = document.getElementById('roboticsApp');
      expect(root.querySelector('input[type="time"]').value).toBe('09:30');
    });

    it('shows the previously-saved start time on render (no longer blank)', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      const d = new Date();
      d.setHours(14, 15, 0, 0);
      app.dispatch((s) => setTimelineConfig(s, { startTime: d.getTime() }));
      app.setActiveTab('schedule');
      const root = document.getElementById('roboticsApp');
      expect(root.querySelector('input[type="time"]').value).toBe('14:15');
    });

    it('shows the previously-saved end time on render in backward mode (no longer blank)', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      const d = new Date();
      d.setHours(16, 45, 0, 0);
      app.dispatch((s) => setTimelineConfig(s, { mode: 'backward', endTime: d.getTime() }));
      app.setActiveTab('schedule');
      const root = document.getElementById('roboticsApp');
      expect(root.querySelector('input[type="time"]').value).toBe('16:45');
    });

    it('uses the Teams-tab estimated bracket size/third-place settings for the backward-mode calculation', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('teams');
      let root = document.getElementById('roboticsApp');
      const estBracketInput = [...root.querySelectorAll('input[type="number"]')].find((i) =>
        i.closest('label')?.textContent.includes('Estimated bracket size')
      );
      estBracketInput.value = '4';
      estBracketInput.dispatchEvent(new Event('change'));
      const estThirdInput = [...root.querySelectorAll('input[type="checkbox"]')].find((i) =>
        i.closest('label')?.textContent.includes('Estimated third-place match')
      );
      estThirdInput.checked = true;
      estThirdInput.dispatchEvent(new Event('change'));
      expect(app.getState().timeline.estimatedBracketSize).toBe(4);
      expect(app.getState().timeline.estimatedThirdPlace).toBe(true);

      app.dispatch((s) => setTimelineConfig(s, { mode: 'backward' }));
      app.setActiveTab('schedule');
      root = document.getElementById('roboticsApp');
      const endInput = root.querySelector('input[type="time"]');
      endInput.value = '12:00';
      clickButtonWithText(root, 'Apply');
      // bracketSize 4 + third place = 4 elimination matches; 2 qualification matches already generated
      const totalMatches = app.getState().qualification.matches.length + 4;
      const expectedMinutes = (totalMatches - 1) * (4 + 1) + 4; // matchDurationMin 4, gapMin 1, single field
      const expectedStart = app.getState().timeline.endTime - expectedMinutes * 60 * 1000;
      expect(app.getState().timeline.startTime).toBe(expectedStart);
    });

    it('no longer shows the estimate fields on the Schedule tab', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.dispatch((s) => setTimelineConfig(s, { mode: 'backward' }));
      app.setActiveTab('schedule');
      const root = document.getElementById('roboticsApp');
      const labels = [...root.querySelectorAll('label')].map((l) => l.textContent);
      expect(labels.some((t) => t.includes('Estimated bracket size'))).toBe(false);
      expect(labels.some((t) => t.includes('Estimated third-place match'))).toBe(false);
    });
  });

  describe('Swiss fairness warning dialog', () => {
    function setupFourTeams(app) {
      const root = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      return root;
    }

    function setupFiveTeams(app) {
      const root = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'].forEach((name) => addTeamViaForm(root, name));
      return root;
    }

    it('generates matchups immediately with no dialog when matchesPerTeam divides evenly', () => {
      const app = initRoboticsApp();
      const root = setupFourTeams(app); // 4 teams * default 3 matchesPerTeam = 12, divisible by 4
      clickButtonWithText(root, 'Generate Matchups');
      expect(app.getState().qualification.matches.length).toBeGreaterThan(0);
      expect(document.querySelector('.robotics-confirm-dialog')).toBeFalsy();
    });

    it('shows a confirmation dialog recommending even matchesPerTeam values before generating uneven matchups', async () => {
      const app = initRoboticsApp();
      const root = setupFiveTeams(app); // 5 teams * default 3 matchesPerTeam = 15, not divisible by 4
      clickButtonWithText(root, 'Generate Matchups');
      expect(app.getState().qualification.matches).toHaveLength(0);
      const dialog = document.querySelector('.robotics-confirm-dialog');
      expect(dialog).toBeTruthy();
      expect(dialog.textContent).toContain('4 or 8');

      await clickDialogButton(document.getElementById('roboticsApp'), 'Cancel');
      expect(app.getState().qualification.matches).toHaveLength(0);
    });

    it('proceeds with the uneven matchups once the teacher confirms the dialog', async () => {
      const app = initRoboticsApp();
      const root = setupFiveTeams(app);
      clickButtonWithText(root, 'Generate Matchups');
      await clickDialogButton(document.getElementById('roboticsApp'), 'Generate Anyway');
      expect(app.getState().qualification.matches.length).toBeGreaterThan(0);
    });
  });

  describe('standings tab', () => {
    it('renders a standings row per team', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha');
      addTeamViaForm(root, 'Bravo');
      app.setActiveTab('schedule');
      const rows = document.querySelectorAll('table tr');
      expect(rows.length).toBe(3); // header + 2 teams
    });

    it('copies standings to the clipboard and shows a confirmation toast', async () => {
      const writeText = setClipboardMock();
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha');
      app.setActiveTab('schedule');
      clickButtonWithText(document.getElementById('roboticsApp'), 'Copy Standings to Clipboard');
      expect(writeText).toHaveBeenCalled();
      await Promise.resolve();
      expect(document.querySelector('.robotics-toast-visible')?.textContent).toBe('Standings copied to clipboard.');
    });

    it('keeps the raw Points column and shows no adaptive note when match counts are even', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.getState().qualification.matches.forEach((_, i) => {
        app.dispatch((s) => recordQualificationResult(s, i, { scoreA: 10, scoreB: 5 }));
      });
      app.setActiveTab('schedule');
      const freshRoot = document.getElementById('roboticsApp');
      const headers = [...freshRoot.querySelectorAll('table thead th')].map((th) => th.textContent);
      expect(headers).toEqual(['Rank', 'Team', 'Members', 'W-L', 'Points']);
      expect(freshRoot.querySelector('.robotics-standings-note')).toBeFalsy();
    });

    it('switches to Win % / Avg Pts per Match columns and shows the adaptive note when match counts are uneven', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'].forEach((name) => addTeamViaForm(root, name));
      app.dispatch((s) => setMatchesPerTeam(s, 3));
      app.dispatch((s) => regenerateMatchups(s)); // 5 teams * 3 = 15 slots -> one team ends up with an extra match
      app.getState().qualification.matches.forEach((_, i) => {
        app.dispatch((s) => recordQualificationResult(s, i, { scoreA: 10, scoreB: 5 }));
      });
      app.setActiveTab('schedule');
      const freshRoot = document.getElementById('roboticsApp');
      const headers = [...freshRoot.querySelectorAll('table thead th')].map((th) => th.textContent);
      expect(headers).toEqual(['Rank', 'Team', 'Members', 'W-L', 'Win %', 'Avg Pts/Match']);
      expect(freshRoot.querySelector('.robotics-standings-note')).toBeTruthy();
    });
  });

  describe('merged Schedule & Standings tab', () => {
    it('renders the Match Timeline, Qualification Matches, and Standings sections together without switching tabs', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      const freshRoot = document.getElementById('roboticsApp');

      const cardTitles = [...freshRoot.querySelectorAll('.robotics-card-title')].map((h) => h.textContent);
      expect(cardTitles).toEqual(expect.arrayContaining(['Match Timeline', 'Qualification Matches', 'Standings']));
      expect(freshRoot.querySelectorAll('.robotics-match-row').length).toBeGreaterThan(0);
      expect(freshRoot.querySelector('table.robotics-table')).toBeTruthy();
      expect([...freshRoot.querySelectorAll('button')].some((b) => b.textContent === 'Copy Match Data to Clipboard')).toBe(true);
      expect([...freshRoot.querySelectorAll('button')].some((b) => b.textContent === 'Copy Standings to Clipboard')).toBe(true);
    });
  });

  describe('clipboard copy confirmation toast', () => {
    it('shows an error toast when navigator.clipboard is unavailable', () => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha');
      clickButtonWithText(root, 'Copy Roster to Clipboard');
      const toast = document.querySelector('.robotics-toast-visible');
      expect(toast?.textContent).toBe('Clipboard unavailable — copy failed.');
      expect(toast?.className).toContain('robotics-toast-error');
    });

    it('shows an error toast when navigator.clipboard.writeText rejects', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
        configurable: true,
      });
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha');
      clickButtonWithText(root, 'Copy Roster to Clipboard');
      await Promise.resolve();
      await Promise.resolve();
      const toast = document.querySelector('.robotics-toast-visible');
      expect(toast?.textContent).toBe('Copy failed.');
      expect(toast?.className).toContain('robotics-toast-error');
    });

    it('auto-dismisses the toast after a short delay', async () => {
      vi.useFakeTimers();
      try {
        setClipboardMock();
        const app = initRoboticsApp();
        const root = document.getElementById('roboticsApp');
        addTeamViaForm(root, 'Alpha');
        clickButtonWithText(root, 'Copy Roster to Clipboard');
        await Promise.resolve();
        expect(document.querySelector('.robotics-toast-visible')).toBeTruthy();
        vi.advanceTimersByTime(3000);
        expect(document.querySelector('.robotics-toast-visible')).toBeFalsy();
      } finally {
        vi.useRealTimers();
      }
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

    it('confirms before forming a single-team alliance when Team A and Team B match, then forms it', async () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      const [selectA, selectB] = root.querySelectorAll('select');
      selectB.value = selectA.value;

      clickButtonWithText(root, 'Form Alliance');
      root = document.getElementById('roboticsApp');
      const dialog = root.querySelector('.robotics-confirm-dialog');
      expect(dialog.textContent).toContain('same Team');
      expect(app.getState().elimination.alliances).toHaveLength(0);

      await clickDialogButton(root, 'Form Alliance');
      expect(app.getState().elimination.alliances).toHaveLength(1);
      expect(app.getState().elimination.alliances[0].teamIds).toHaveLength(1);
    });

    it('cancelling the single-team alliance confirmation forms nothing', async () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      const [selectA, selectB] = root.querySelectorAll('select');
      selectB.value = selectA.value;

      clickButtonWithText(root, 'Form Alliance');
      root = document.getElementById('roboticsApp');
      await clickDialogButton(root, 'Cancel');
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

    it('marks the winning side of a completed elimination match with is-winner, and the card as is-complete', () => {
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

      root = document.getElementById('roboticsApp');
      const matchCard = root.querySelector('.robotics-bracket-match');
      expect(matchCard.classList.contains('is-complete')).toBe(true);
      const alliances = matchCard.querySelectorAll('.robotics-match-alliance');
      expect(alliances[0].classList.contains('is-winner')).toBe(true);
      expect(alliances[1].classList.contains('is-winner')).toBe(false);
    });

    it('toggles no-show by clicking a team name on an elimination match', () => {
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
      const toggle = root.querySelector('.robotics-bracket .robotics-team-toggle');
      toggle.click();

      const bracketMatch = app.getState().elimination.bracket.matches.find((m) => !m.isBye);
      expect(Object.values(bracketMatch.noShow)).toContain(true);
    });

    it('keeps a typed-but-unsaved elimination score after toggling No-Show, including repeated toggling', () => {
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
      let scoreInputs = root.querySelectorAll('.robotics-bracket .robotics-score-input');
      scoreInputs[0].value = '80';
      scoreInputs[0].dispatchEvent(new Event('change'));
      root = document.getElementById('roboticsApp');
      scoreInputs = root.querySelectorAll('.robotics-bracket .robotics-score-input');
      scoreInputs[1].value = '20';
      scoreInputs[1].dispatchEvent(new Event('change'));

      root = document.getElementById('roboticsApp');
      let toggles = root.querySelectorAll('.robotics-bracket .robotics-team-toggle');
      toggles[0].click();
      root = document.getElementById('roboticsApp');
      toggles = root.querySelectorAll('.robotics-bracket .robotics-team-toggle');
      toggles[0].click();
      root = document.getElementById('roboticsApp');
      toggles = root.querySelectorAll('.robotics-bracket .robotics-team-toggle');
      toggles[0].click();

      root = document.getElementById('roboticsApp');
      scoreInputs = root.querySelectorAll('.robotics-bracket .robotics-score-input');
      expect(scoreInputs[0].value).toBe('80');
      expect(scoreInputs[1].value).toBe('20');
      const bracketMatch = app.getState().elimination.bracket.matches.find((m) => !m.isBye);
      expect(bracketMatch.completed).toBe(false);
    });

    it('renders the Third-Place Match column positioned to the left of the Final', () => {
      const app = initRoboticsApp();
      const setupRoot = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'].forEach((name) => addTeamViaForm(setupRoot, name));
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      for (let i = 0; i < 4; i++) {
        root = document.getElementById('roboticsApp');
        clickButtonWithText(root, 'Form Alliance');
      }
      expect(app.getState().elimination.alliances).toHaveLength(4);

      root = document.getElementById('roboticsApp');
      const sizeInput = [...root.querySelectorAll('input')].find((i) => i.previousSibling?.textContent?.includes('Bracket size'));
      sizeInput.value = '4';
      root.querySelector('input[type="checkbox"]').checked = true;
      clickButtonWithText(root, 'Save Bracket Config');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Auto-fill Seeds from Standings');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Generate Bracket');

      root = document.getElementById('roboticsApp');
      const headings = [...root.querySelectorAll('.robotics-bracket-round')].map((col) => col.querySelector('h4').textContent);
      expect(headings).toEqual(['Round 1', 'Third Place', 'Final']);
    });

    function setupTwoAlliancesWithBracketSize(root, size, includeThirdPlace = false) {
      clickButtonWithText(root, 'Form Alliance');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance');
      root = document.getElementById('roboticsApp');
      const sizeInput = [...root.querySelectorAll('input')].find((i) => i.previousSibling?.textContent?.includes('Bracket size'));
      sizeInput.value = String(size);
      if (includeThirdPlace) root.querySelector('input[type="checkbox"]').checked = true;
      clickButtonWithText(root, 'Save Bracket Config');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Auto-fill Seeds from Standings');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Generate Bracket');
    }

    it('shows a 2nd place banner once the Final completes, with no 3rd place banner when there is no Third-Place Match', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      setupTwoAlliancesWithBracketSize(root, 2);

      root = document.getElementById('roboticsApp');
      const scoreInputs = root.querySelectorAll('.robotics-bracket .robotics-score-input');
      scoreInputs[0].value = '80';
      scoreInputs[1].value = '20';
      clickButtonWithText(root, 'Mark Complete');

      root = document.getElementById('roboticsApp');
      expect(root.querySelector('.robotics-champion-banner')).toBeTruthy();
      expect(root.querySelector('.robotics-second-place-banner')?.textContent).toContain('2nd Place');
      expect(root.querySelector('.robotics-third-place-banner')).toBeFalsy();
    });

    it('shows a 3rd place banner only once the Third-Place Match completes, and copies all three decided places', () => {
      const writeText = setClipboardMock();
      const app = initRoboticsApp();
      const setupRoot = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'].forEach((name) => addTeamViaForm(setupRoot, name));
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      for (let i = 0; i < 4; i++) {
        root = document.getElementById('roboticsApp');
        clickButtonWithText(root, 'Form Alliance');
      }
      root = document.getElementById('roboticsApp');
      const sizeInput = [...root.querySelectorAll('input')].find((i) => i.previousSibling?.textContent?.includes('Bracket size'));
      sizeInput.value = '4';
      root.querySelector('input[type="checkbox"]').checked = true;
      clickButtonWithText(root, 'Save Bracket Config');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Auto-fill Seeds from Standings');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Generate Bracket');

      // Complete both semifinals so the Third-Place Match's sides resolve.
      root = document.getElementById('roboticsApp');
      let scoreInputs = root.querySelectorAll('.robotics-bracket .robotics-score-input');
      scoreInputs[0].value = '80';
      scoreInputs[1].value = '20';
      let completeBtn = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Mark Complete');
      completeBtn.click();

      root = document.getElementById('roboticsApp');
      scoreInputs = root.querySelectorAll('.robotics-bracket .robotics-score-input');
      scoreInputs[2].value = '70';
      scoreInputs[3].value = '30';
      completeBtn = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Mark Complete');
      completeBtn.click();

      root = document.getElementById('roboticsApp');
      expect(root.querySelector('.robotics-third-place-banner')).toBeFalsy();

      // Now complete the Third-Place Match itself.
      scoreInputs = root.querySelectorAll('.robotics-bracket .robotics-score-input');
      scoreInputs[4].value = '50';
      scoreInputs[5].value = '40';
      completeBtn = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Mark Complete');
      completeBtn.click();

      root = document.getElementById('roboticsApp');
      expect(root.querySelector('.robotics-third-place-banner')?.textContent).toContain('3rd Place');
      expect(root.querySelector('.robotics-champion-banner')).toBeFalsy();

      clickButtonWithText(root, 'Copy Placements to Clipboard');
      expect(writeText).toHaveBeenCalledTimes(1);
      const copied = writeText.mock.calls[0][0];
      expect(copied).toContain('3rd Place:');
      expect(copied).not.toContain('1st Place:');
      expect(copied).not.toContain('2nd Place:');
    });

    it('copies an empty placements list when no bracket has been generated yet', () => {
      const writeText = setClipboardMock();
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      const root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Copy Placements to Clipboard');
      expect(writeText).toHaveBeenCalledWith('');
    });

    it('copies an empty placements list when the bracket exists but nothing is decided yet', () => {
      const writeText = setClipboardMock();
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      setupTwoAlliancesWithBracketSize(root, 2);

      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Copy Placements to Clipboard');
      expect(writeText).toHaveBeenCalledWith('');
    });

    it('copies 1st and 2nd place with team members listed once the Final completes', () => {
      const writeText = setClipboardMock();
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      setupTwoAlliancesWithBracketSize(root, 2);

      root = document.getElementById('roboticsApp');
      const scoreInputs = root.querySelectorAll('.robotics-bracket .robotics-score-input');
      scoreInputs[0].value = '80';
      scoreInputs[1].value = '20';
      clickButtonWithText(root, 'Mark Complete');

      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Copy Placements to Clipboard');
      const copied = writeText.mock.calls[0][0];
      expect(copied).toContain('1st Place:');
      expect(copied).toContain('2nd Place:');
      expect(copied).toContain('Members:');
    });
  });

  it('newTournament wipes teams via the Reset Everything / New Tournament button', async () => {
    const app = initRoboticsApp();
    let root = document.getElementById('roboticsApp');
    addTeamViaForm(root, 'Alpha');
    clickButtonWithText(root, 'Reset Everything / New Tournament');
    root = document.getElementById('roboticsApp');
    await clickDialogButton(root, 'Reset Everything');
    expect(app.getState().teams).toHaveLength(0);
  });

  describe('destructive action confirmations', () => {
    it('does not reset results until the confirm dialog is accepted', async () => {
      const app = initRoboticsApp();
      let root = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      root = document.getElementById('roboticsApp');

      clickButtonWithText(root, 'Reset Results');
      root = document.getElementById('roboticsApp');
      const dialog = root.querySelector('.robotics-confirm-dialog');
      expect(dialog.textContent).toContain('Qualification Round');
      expect(dialog.textContent).toContain('Team roster is kept');
      expect(app.getState().qualification.matches.length).toBeGreaterThan(0);

      await clickDialogButton(root, 'Cancel');
      expect(app.getState().qualification.matches.length).toBeGreaterThan(0);

      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Reset Results');
      root = document.getElementById('roboticsApp');
      await clickDialogButton(root, 'Reset Results');
      expect(app.getState().qualification.matches).toHaveLength(0);
      expect(app.getState().teams).toHaveLength(4);
    });

    it('does not start a new tournament until the confirm dialog is accepted', async () => {
      const app = initRoboticsApp();
      let root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha');

      clickButtonWithText(root, 'Reset Everything / New Tournament');
      root = document.getElementById('roboticsApp');
      const dialog = root.querySelector('.robotics-confirm-dialog');
      expect(dialog.textContent).toContain('Team roster');
      expect(app.getState().teams).toHaveLength(1);

      await clickDialogButton(root, 'Cancel');
      expect(app.getState().teams).toHaveLength(1);

      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Reset Everything / New Tournament');
      root = document.getElementById('roboticsApp');
      await clickDialogButton(root, 'Reset Everything');
      expect(app.getState().teams).toHaveLength(0);
    });
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
