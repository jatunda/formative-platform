import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initRoboticsApp,
  teamName,
  getAllMatchesInScheduleOrder,
  autoFillSeedsFromStandings,
  nameFitStyle,
} from '../../robotics/robotics.js';
import {
  createInitialState,
  addTeam,
  setMatchesPerTeam,
  regenerateMatchups,
  recordQualificationResult,
  setTimelineConfig,
  formPlayoffAlliance,
  setBracketConfig,
  setSeed,
  generateBracket,
  recordEliminationResult,
  revealNextPlacement,
  getRevealedCount,
} from '../../robotics/state.js';

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

// dispatch() now defers its DOM rebuild past the current event (see robotics.js) so that a
// click isn't swallowed by a same-tick rebuild triggered by another field's blur/change commit.
// Tests that inspect the DOM after a dispatch-triggering interaction must await this first.
function flushRender() {
  return new Promise((resolve) => setTimeout(resolve, 0));
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

  it('adds and removes a team through the form', async () => {
    const app = initRoboticsApp();
    const root = document.getElementById('roboticsApp');
    addTeamViaForm(root, 'Alpha', 'Ann, Al');
    expect(app.getState().teams).toHaveLength(1);
    expect(app.getState().teams[0].members).toEqual(['Ann', 'Al']);

    await flushRender();
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

    it('adds the team on Enter in the Team name field and keeps focus in the Team name field', async () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      const { nameInput } = getFormInputs(root);
      nameInput.value = 'Alpha';
      nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      expect(app.getState().teams).toHaveLength(1);
      expect(document.activeElement).toBe(getFormInputs(root).nameInput);
      await flushRender();
      expect(document.activeElement).toBe(getFormInputs(root).nameInput);
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
    await flushRender();
    clickButtonWithText(root, 'Copy Roster to Clipboard');
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Alpha: Ann'));
    await Promise.resolve();
    const toast = document.querySelector('.robotics-toast-visible');
    expect(toast?.textContent).toBe('Roster copied to clipboard.');
  });

  describe('inline roster editing', () => {
    it('renames a team inline by committing the name input on change', async () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      await flushRender();
      const nameInput = root.querySelector('.robotics-team-name-input');
      nameInput.value = 'Alpha Squad';
      nameInput.dispatchEvent(new Event('change'));
      expect(app.getState().teams[0].name).toBe('Alpha Squad');
    });

    it('ignores a blank rename and reverts the input to the current name', async () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      await flushRender();
      const nameInput = root.querySelector('.robotics-team-name-input');
      nameInput.value = '   ';
      nameInput.dispatchEvent(new Event('change'));
      expect(app.getState().teams[0].name).toBe('Alpha');
      expect(nameInput.value).toBe('Alpha');
    });

    it('renaming a team preserves its id and any generated matches', async () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      const teamId = app.getState().teams[0].id;
      const matchCountBefore = app.getState().qualification.matches.length;

      await flushRender();
      const nameInput = document.getElementById('roboticsApp').querySelector('.robotics-team-name-input');
      nameInput.value = 'Alpha Prime';
      nameInput.dispatchEvent(new Event('change'));

      expect(app.getState().teams[0].id).toBe(teamId);
      expect(app.getState().teams[0].name).toBe('Alpha Prime');
      expect(app.getState().qualification.matches).toHaveLength(matchCountBefore);
      expect(app.getState().qualification.matches[0].allianceA.concat(app.getState().qualification.matches[0].allianceB)).toContain(teamId);
    });

    it('adds a member individually via the add-member field', async () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      await flushRender();
      const addInput = root.querySelector('.robotics-member-add-input');
      addInput.value = 'Bea';
      clickButtonWithText(root, 'Add member');
      expect(app.getState().teams[0].members).toEqual(['Ann', 'Bea']);
    });

    it('ignores adding a blank member', async () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      await flushRender();
      clickButtonWithText(root, 'Add member');
      expect(app.getState().teams[0].members).toEqual(['Ann']);
    });

    it('adds a member by pressing Enter in the add-member field', async () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      await flushRender();
      const addInput = root.querySelector('.robotics-member-add-input');
      addInput.value = 'Bea';
      addInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      expect(app.getState().teams[0].members).toEqual(['Ann', 'Bea']);
    });

    it('does not add a member on a non-Enter keydown', async () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      await flushRender();
      const addInput = root.querySelector('.robotics-member-add-input');
      addInput.value = 'Bea';
      addInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
      expect(app.getState().teams[0].members).toEqual(['Ann']);
    });

    it('adds a member on Enter and keeps focus in that same team\'s add-member field', async () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      await flushRender();
      const addInput = root.querySelector('.robotics-member-add-input');
      addInput.value = 'Bea';
      addInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      expect(app.getState().teams[0].members).toEqual(['Ann', 'Bea']);
      expect(document.activeElement).toBe(root.querySelector('.robotics-member-add-input'));
      await flushRender();
      expect(document.activeElement).toBe(root.querySelector('.robotics-member-add-input'));
    });

    it('adding a member to one team does not leave focus on another team\'s add-member field', async () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      await flushRender();
      addTeamViaForm(root, 'Bravo', 'Bob');
      await flushRender();
      const teamIds = app.getState().teams.map((t) => t.id);
      const bravoSelector = `.robotics-member-add-input[data-team-id="${teamIds[1]}"]`;
      const alphaSelector = `.robotics-member-add-input[data-team-id="${teamIds[0]}"]`;
      const bravoInput = root.querySelector(bravoSelector);
      bravoInput.value = 'Bea';
      bravoInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      expect(app.getState().teams[1].members).toEqual(['Bob', 'Bea']);
      expect(document.activeElement).toBe(root.querySelector(bravoSelector));
      expect(document.activeElement).not.toBe(root.querySelector(alphaSelector));
      await flushRender();
      expect(document.activeElement).toBe(root.querySelector(bravoSelector));
      expect(document.activeElement).not.toBe(root.querySelector(alphaSelector));
    });

    it('removes an individual member without affecting the rest of the roster', async () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann, Al');
      await flushRender();
      const removeBtn = root.querySelector('.robotics-member-remove[aria-label="Remove Ann"]');
      removeBtn.click();
      expect(app.getState().teams[0].members).toEqual(['Al']);
    });

    it('does not refocus the row that shifted into a removed row\'s position', async () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie'].forEach((name) => addTeamViaForm(root, name));
      await flushRender();
      const removeButtons = () => [...root.querySelectorAll('.robotics-team-row')].map((row) => [...row.querySelectorAll('button')].find((b) => b.textContent === 'Remove'));
      removeButtons()[0].focus();
      removeButtons()[0].click();
      await flushRender();
      expect(app.getState().teams.map((t) => t.name)).toEqual(['Bravo', 'Charlie']);
      // Bravo's row shifted into Alpha's old position; its Remove button must not inherit focus
      // from Alpha's now-gone one, or an unaware next keypress would delete Bravo too.
      expect(document.activeElement).not.toBe(removeButtons()[0]);
    });
  });

  describe('deferred render (fixes the stale-click-on-rerender bug)', () => {
    // Root cause (see robotics.js): a field's "change" event commits during the browser's
    // blur-handling phase of a click, which runs before that same click's mouseup/click phase.
    // A synchronous DOM rebuild there destroys the actual click target mid-interaction, so the
    // click lands on a node that's already gone. These tests pin down the fix's two halves:
    // the rebuild no longer happens inside the triggering event, and two actions queued close
    // together (a field commit, then a different control's click) both still land.
    //
    // A second, subtler half of the same root cause (see the "held-down click" test below):
    // mousedown and mouseup are two separate native events with a real gap between them while
    // the mouse button is physically held - deferring the rebuild by one macrotask isn't enough
    // on its own, because that macrotask readily fires inside that gap. The rebuild additionally
    // has to wait out any mouse button that's currently down.

    it('does not tear down the DOM inside the event that committed a field edit', async () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      await flushRender();
      const nameInput = root.querySelector('.robotics-team-name-input');
      const addTeamBtn = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Add Team');

      nameInput.value = 'Alpha Squad';
      nameInput.dispatchEvent(new Event('change'));
      // Synchronously, right after the commit: the old subtree (and the button a browser's
      // in-flight click would be headed for) must still be attached, not yet replaced.
      expect(document.body.contains(addTeamBtn)).toBe(true);
      expect(document.body.contains(nameInput)).toBe(true);

      await flushRender();
      // Only now does the rebuild happen, replacing the old nodes.
      expect(document.body.contains(addTeamBtn)).toBe(false);
      expect(app.getState().teams[0].name).toBe('Alpha Squad');
    });

    it('commits an in-progress name edit and adds a different new team from one click', async () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      await flushRender();
      const nameInput = root.querySelector('.robotics-team-name-input');
      const inputs = root.querySelectorAll('input');
      const newNameInput = [...inputs].find((i) => i.placeholder === 'Team name');

      // No await between these: the "change" commit and the "Add Team" click land in the
      // same tick, before the rebuild that "change" just triggered has run.
      nameInput.value = 'Alpha Squad';
      nameInput.dispatchEvent(new Event('change'));
      newNameInput.value = 'Bravo';
      clickButtonWithText(root, 'Add Team');

      expect(app.getState().teams.map((t) => t.name)).toEqual(['Alpha Squad', 'Bravo']);
    });

    it('focuses a different, already-rendered field immediately after a sibling field commits, and keeps focus there once the rebuild runs', async () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann');
      addTeamViaForm(root, 'Bravo', 'Bob');
      await flushRender();
      const [alphaInput, bravoInput] = root.querySelectorAll('.robotics-team-name-input');

      alphaInput.value = 'Alpha Squad';
      alphaInput.dispatchEvent(new Event('change'));
      // What a browser's mousedown-driven focus shift would do, landing before the rebuild.
      bravoInput.focus();
      expect(document.activeElement).toBe(bravoInput);

      await flushRender();
      const [, refreshedBravoInput] = root.querySelectorAll('.robotics-team-name-input');
      expect(document.activeElement).toBe(refreshedBravoInput);
      expect(app.getState().teams[0].name).toBe('Alpha Squad');
    });

    it('does not tear down the DOM while the mouse button is still held down, even once a field commits', async () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');

      const scoreInputs = root.querySelectorAll('.robotics-score-input');
      const markBtn = [...root.querySelectorAll('button')].find((b) => b.textContent === 'Mark Complete');
      scoreInputs[0].value = '50';
      scoreInputs[1].value = '10';

      // A real mousedown on the button steals focus from the field *before* the field's blur
      // (hence "change") fires - and that field commit must not schedule a rebuild that lands
      // before the button is released. Simulated here as two separate events instead of one
      // click() call, because the real gap between them is exactly what the bug lives in.
      markBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      scoreInputs[0].dispatchEvent(new Event('change'));

      // Give the deferred render every opportunity to fire while the button is still "held" -
      // with the bug, this is exactly when the rebuild ran and pulled the target out from under
      // the pending mouseup/click.
      await flushRender();
      await flushRender();
      expect(document.body.contains(markBtn)).toBe(true);

      markBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      markBtn.click();

      await flushRender();
      expect(app.getState().qualification.matches[0].completed).toBe(true);
      expect(app.getState().qualification.matches[0].scoreA).toBe(50);
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
      await flushRender();
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
      await flushRender();
      root = document.getElementById('roboticsApp');
      expect([...root.querySelectorAll('button')].find((b) => b.textContent === 'Generate Matchups').getAttribute('aria-disabled')).toBeNull();
      expect(app.getState().teams).toHaveLength(4);
    });

    it('labels the button "Generate Matchups" before any matchups exist, and "Regenerate Matchups" after', async () => {
      const app = initRoboticsApp();
      let root = setupFourTeams(app);
      expect([...root.querySelectorAll('button')].some((b) => b.textContent === 'Generate Matchups')).toBe(true);
      expect([...root.querySelectorAll('button')].some((b) => b.textContent === 'Regenerate Matchups')).toBe(false);

      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      await flushRender();
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
      const dangerZone = root.querySelector('.robotics-danger-zone');
      expect(dangerZone).toBeTruthy();
      expect(dangerZone.querySelector('button').textContent).toBe('Reset Results');
    });

    it('lays out Add a Team, the Roster, and Tournament Settings as separate grid areas', async () => {
      const app = initRoboticsApp();
      const root = setupFourTeams(app);
      await flushRender();
      const layout = root.querySelector('.robotics-teams-layout');
      expect(layout).toBeTruthy();

      const areas = [...layout.children].map((card) => [
        ['robotics-teams-add', 'robotics-teams-roster', 'robotics-teams-settings'].find((c) => card.classList.contains(c)),
        card.querySelector('.robotics-card-title').textContent,
      ]);
      expect(areas).toEqual([
        ['robotics-teams-add', 'Add a Team'],
        ['robotics-teams-roster', 'Roster (4)'],
        ['robotics-teams-settings', 'Tournament Settings'],
      ]);
      expect(layout.querySelector('.robotics-teams-roster').querySelectorAll('.robotics-team-row')).toHaveLength(4);
    });

    it('fences the destructive resets into a labeled Danger Zone, apart from Copy Roster', () => {
      const app = initRoboticsApp();
      const root = setupFourTeams(app);
      const settings = root.querySelector('.robotics-teams-settings');
      const zone = settings.querySelector('.robotics-danger-zone');
      expect(zone.querySelector('.robotics-danger-label').textContent).toBe('Danger Zone');
      expect([...zone.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Reset Results', 'Reset Everything / New Tournament']);
      const copyRoster = [...settings.querySelectorAll('button')].find((b) => b.textContent === 'Copy Roster to Clipboard');
      expect(copyRoster).toBeTruthy();
      expect(zone.contains(copyRoster)).toBe(false);
    });

    it('marks a match complete and shows the completed badge', async () => {
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
      await flushRender();
      root = document.getElementById('roboticsApp');
      expect(root.querySelector('.robotics-complete-badge')).toBeTruthy();
      expect(app.getState().qualification.matches[0].completed).toBe(true);
    });

    it('marks the winning side with is-winner once a match completes with a decisive score', async () => {
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

      await flushRender();
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

    it('shrinks a long team name in a match row to fit one line, leaving short names at normal size', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Robo Raiders Supreme');
      ['Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      const freshRoot = document.getElementById('roboticsApp');
      const toggles = [...freshRoot.querySelectorAll('.robotics-match-row .robotics-team-toggle')];
      const longNameToggle = toggles.find((t) => t.textContent === 'Robo Raiders Supreme');
      const shortNameToggle = toggles.find((t) => t.textContent === 'Bravo');
      expect(longNameToggle.classList.contains('robotics-fit-name')).toBe(true);
      expect(longNameToggle.getAttribute('style')).toContain('--robotics-name-scale:');
      expect(shortNameToggle.classList.contains('robotics-fit-name')).toBe(false);
      expect(shortNameToggle.getAttribute('style')).toBeNull();
    });

    it('lets an extremely long team name fall back to wrapping instead of forcing nowrap past the shrink floor', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      const extremeName = 'A'.repeat(60);
      addTeamViaForm(root, extremeName);
      ['Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      const freshRoot = document.getElementById('roboticsApp');
      const toggle = [...freshRoot.querySelectorAll('.robotics-match-row .robotics-team-toggle')].find((t) => t.textContent === extremeName);
      expect(toggle.classList.contains('robotics-fit-name')).toBe(false);
      expect(toggle.getAttribute('style')).toContain('--robotics-name-scale: 0.6;');
    });

    it('marks a clicked no-show team with the is-no-show class, and clears it on a second click', async () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      let root = document.getElementById('roboticsApp');
      let toggle = root.querySelector('.robotics-match-row .robotics-team-toggle');
      toggle.click();

      await flushRender();
      root = document.getElementById('roboticsApp');
      toggle = root.querySelector('.robotics-match-row .robotics-team-toggle');
      expect(toggle.classList.contains('is-no-show')).toBe(true);

      toggle.click();
      await flushRender();
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

    it('marks the current match row with a compact dot indicator, not a wide text label', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 3));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      const root = document.getElementById('roboticsApp');
      const currentRow = root.querySelector('.robotics-match-row.is-current');
      const dot = currentRow.querySelector('.robotics-current-dot');
      expect(dot.classList.contains('is-placeholder')).toBe(false);
      expect(dot.getAttribute('aria-label')).toBe('Current Match');
      expect(dot.textContent).toBe('');

      const otherRow = [...root.querySelectorAll('.robotics-match-row')].find((r) => r !== currentRow);
      const otherDot = otherRow.querySelector('.robotics-current-dot');
      expect(otherDot.classList.contains('is-placeholder')).toBe(true);
      expect(otherDot.getAttribute('aria-label')).toBeNull();
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

    it('disables the up button on the topmost match and does not render reorder buttons on a completed match', async () => {
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

      await flushRender();
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
      expect(root.querySelector('.robotics-match-row').classList.contains('has-field')).toBe(true);
    });

    it('lays each match row out as flat grid cells: time, indicator dot, red side, red score, blue score, blue side, actions', () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.dispatch((s) => setMatchesPerTeam(s, 3));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      const row = document.querySelector('#roboticsApp .robotics-match-row');
      expect(row.classList.contains('robotics-match-grid')).toBe(true);
      expect(row.classList.contains('has-field')).toBe(false);
      const cells = [...row.children].map((c) => c.className);
      expect(cells).toEqual([
        'robotics-match-time',
        'robotics-current-dot',
        'robotics-match-alliance is-red',
        'robotics-score-input is-red',
        'robotics-score-input is-blue',
        'robotics-match-alliance is-blue',
        'robotics-match-actions',
      ]);
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
      await flushRender();
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
      await flushRender();
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
      expect(headers).toEqual(['Rank', 'Team', 'W-L', 'Points']);
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
      expect(headers).toEqual(['Rank', 'Team', 'W-L', 'Win %', 'Avg Pts/Match']);
      expect(freshRoot.querySelector('.robotics-standings-note')).toBeTruthy();
    });

    it('shows Members as a muted subline under the team name, omitted when a team has no Members', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ann, Al');
      ['Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.getState().qualification.matches.forEach((_, i) => {
        app.dispatch((s) => recordQualificationResult(s, i, { scoreA: 10, scoreB: 5 }));
      });
      app.setActiveTab('schedule');
      const freshRoot = document.getElementById('roboticsApp');
      const teamCells = [...freshRoot.querySelectorAll('table tbody tr td:nth-child(2)')];
      const byName = Object.fromEntries(teamCells.map((td) => [td.querySelector('.robotics-standings-team-name').textContent, td]));
      expect(byName.Alpha.querySelector('.robotics-standings-members').textContent).toBe('Ann, Al');
      expect(byName.Bravo.querySelector('.robotics-standings-members')).toBeNull();
    });

    it('shrinks a long team or member name in the Standings table to fit one line, leaving short ones at normal size', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Robo Raiders Supreme', 'Alexandria Montgomery-Wu');
      ['Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.getState().qualification.matches.forEach((_, i) => {
        app.dispatch((s) => recordQualificationResult(s, i, { scoreA: 10, scoreB: 5 }));
      });
      app.setActiveTab('schedule');
      const freshRoot = document.getElementById('roboticsApp');
      const teamCells = [...freshRoot.querySelectorAll('table tbody tr td:nth-child(2)')];
      const byName = Object.fromEntries(teamCells.map((td) => [td.querySelector('.robotics-standings-team-name').textContent, td]));

      const longNameEl = byName['Robo Raiders Supreme'].querySelector('.robotics-standings-team-name');
      const longMembersEl = byName['Robo Raiders Supreme'].querySelector('.robotics-standings-members');
      expect(longNameEl.getAttribute('style')).toContain('--robotics-name-scale:');
      expect(longMembersEl.getAttribute('style')).toContain('--robotics-name-scale:');

      const shortNameEl = byName.Bravo.querySelector('.robotics-standings-team-name');
      expect(shortNameEl.getAttribute('style')).toBeNull();
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

    it('lays out matches beside a narrow column of Match Timeline above Standings, each keeping its own copy button', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      const layout = document.querySelector('.robotics-schedule-layout');
      expect(layout).toBeTruthy();

      const [matchesCol, sideCol] = layout.children;
      expect(layout.children).toHaveLength(2);
      expect(matchesCol.classList.contains('robotics-schedule-matches')).toBe(true);
      expect(sideCol.classList.contains('robotics-schedule-side')).toBe(true);
      const [timelineCard, standingsCol] = sideCol.children;
      expect(timelineCard.classList.contains('robotics-timeline')).toBe(true);
      expect(standingsCol.classList.contains('robotics-schedule-standings')).toBe(true);

      const titlesIn = (col) => [...col.querySelectorAll('.robotics-card-title')].map((h) => h.textContent);
      const buttonsIn = (col) => [...col.querySelectorAll('button')].map((b) => b.textContent);
      expect(titlesIn(matchesCol)).toEqual(['Qualification Matches']);
      expect(matchesCol.querySelectorAll('.robotics-match-row').length).toBeGreaterThan(0);
      expect(buttonsIn(matchesCol)).toContain('Copy Match Data to Clipboard');
      expect(buttonsIn(matchesCol)).not.toContain('Copy Standings to Clipboard');

      expect(titlesIn(sideCol)).toEqual(['Match Timeline', 'Standings']);
      expect(buttonsIn(standingsCol)).toEqual(['Copy Standings to Clipboard']);
    });
  });

  describe('Now Playing card', () => {
    function openSchedule(app, matchesPerTeam) {
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Alpha', 'Ana, Abe');
      ['Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      app.dispatch((s) => setMatchesPerTeam(s, matchesPerTeam));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
    }
    const card = () => document.querySelector('.robotics-now-playing');
    const names = (state, ids) => ids.map((id) => state.teams.find((t) => t.id === id).name);

    it('sits at the top of the matches column and spotlights the Current Match, which stays highlighted in the list', () => {
      const app = initRoboticsApp();
      openSchedule(app, 3);
      const matchesCol = document.querySelector('.robotics-schedule-matches');
      expect(matchesCol.firstElementChild.classList.contains('robotics-now-playing-layout')).toBe(true);
      expect(card().querySelector('.robotics-now-playing-kicker').textContent).toBe('Now Playing');

      const match = app.getState().qualification.matches[0];
      const sideNames = (color) => [...card().querySelectorAll(`.robotics-now-playing-side.is-${color} .robotics-now-playing-team-name`)].map((n) => n.textContent);
      expect(sideNames('red')).toEqual(names(app.getState(), match.allianceA));
      expect(sideNames('blue')).toEqual(names(app.getState(), match.allianceB));
      expect(document.querySelectorAll('.robotics-match-row.is-current')).toHaveLength(1);
    });

    it('shows each Team\'s Members under its name, and nothing for a Team without Members', () => {
      const app = initRoboticsApp();
      openSchedule(app, 3);
      const teams = [...card().querySelectorAll('.robotics-now-playing-team')];
      const alpha = teams.find((t) => t.querySelector('.robotics-now-playing-team-name').textContent === 'Alpha');
      const bravo = teams.find((t) => t.querySelector('.robotics-now-playing-team-name').textContent === 'Bravo');
      expect(alpha.querySelector('.robotics-now-playing-members').textContent).toBe('Ana, Abe');
      expect(bravo.querySelector('.robotics-now-playing-members')).toBeNull();
    });

    it('shrinks a long team or member name in the Now Playing banner to fit, leaving short ones at normal size', () => {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      addTeamViaForm(root, 'Robo Raiders Supreme', 'Alexandria Montgomery-Wu');
      ['Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      app.dispatch((s) => setMatchesPerTeam(s, 3));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      const teams = [...card().querySelectorAll('.robotics-now-playing-team')];
      const longTeam = teams.find((t) => t.querySelector('.robotics-now-playing-team-name').textContent === 'Robo Raiders Supreme');
      const shortTeam = teams.find((t) => t.querySelector('.robotics-now-playing-team-name').textContent === 'Bravo');

      expect(longTeam.querySelector('.robotics-now-playing-team-name').getAttribute('style')).toContain('--robotics-name-scale:');
      expect(longTeam.querySelector('.robotics-now-playing-members').getAttribute('style')).toContain('--robotics-name-scale:');
      expect(shortTeam.querySelector('.robotics-now-playing-team-name').getAttribute('style')).toBeNull();
    });

    it('shows the Match Time ("--" before a Start Time is set) and the Field only when more than one runs', async () => {
      const app = initRoboticsApp();
      openSchedule(app, 3);
      expect(card().querySelector('.robotics-now-playing-time').textContent).toBe('--');
      expect(card().querySelector('.robotics-now-playing-field')).toBeNull();

      const start = new Date(2026, 9, 3, 14, 5).getTime();
      app.dispatch((s) => setTimelineConfig(s, { startTime: start, fieldCount: 2 }));
      await flushRender();
      expect(card().querySelector('.robotics-now-playing-time').textContent)
        .toBe(new Date(start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      expect(card().querySelector('.robotics-now-playing-field').textContent).toBe('Field 1');
    });

    it('keeps draft scores and No-Shows in sync with the Current Match row', async () => {
      const app = initRoboticsApp();
      openSchedule(app, 3);
      const [cardScoreA] = card().querySelectorAll('.robotics-score-input');
      cardScoreA.value = '42';
      cardScoreA.dispatchEvent(new Event('change'));
      card().querySelectorAll('.robotics-score-input')[1].value = '7';
      card().querySelectorAll('.robotics-score-input')[1].dispatchEvent(new Event('change'));
      await flushRender();

      const rowInputs = document.querySelector('.robotics-match-row.is-current').querySelectorAll('.robotics-score-input');
      expect([rowInputs[0].value, rowInputs[1].value]).toEqual(['42', '7']);

      // ...and the other way: an edit in the row shows up in the card.
      rowInputs[0].value = '50';
      rowInputs[0].dispatchEvent(new Event('change'));
      await flushRender();
      expect(card().querySelectorAll('.robotics-score-input')[0].value).toBe('50');

      const match = app.getState().qualification.matches[0];
      card().querySelector('.robotics-now-playing-team-name').click();
      await flushRender();
      expect(app.getState().qualification.matches[0].noShow[match.allianceA[0]]).toBe(true);
      expect(card().querySelector('.robotics-now-playing-team-name').classList.contains('is-no-show')).toBe(true);
      expect(card().querySelector('.robotics-now-playing-team-name').title).toBe('Click to mark present');
      expect(document.querySelector('.robotics-match-row.is-current .robotics-team-toggle').classList.contains('is-no-show')).toBe(true);
    });

    it('Mark Complete records the result and moves the card on to the next match', async () => {
      const app = initRoboticsApp();
      openSchedule(app, 3);
      const [scoreA, scoreB] = card().querySelectorAll('.robotics-score-input');
      scoreA.value = '30';
      scoreB.value = '20';
      card().querySelector('.robotics-now-playing-complete').click();
      await flushRender();
      const [first, second] = app.getState().qualification.matches;
      expect(first).toMatchObject({ completed: true, scoreA: 30, scoreB: 20 });
      const redNames = [...card().querySelectorAll('.robotics-now-playing-side.is-red .robotics-now-playing-team-name')].map((n) => n.textContent);
      expect(redNames).toEqual(names(app.getState(), second.allianceA));
    });

    it('auto-scrolls the Current Match row into view once Mark Complete advances it, but not on a draft score edit', async () => {
      const app = initRoboticsApp();
      openSchedule(app, 3);
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

      const [scoreA, scoreB] = card().querySelectorAll('.robotics-score-input');
      scoreA.value = '10';
      scoreA.dispatchEvent(new Event('change'));
      scoreB.value = '0';
      scoreB.dispatchEvent(new Event('change'));
      await nextTick();
      expect(scrollIntoView).not.toHaveBeenCalled();

      card().querySelector('.robotics-now-playing-complete').click();
      await nextTick();

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
      expect(scrollIntoView.mock.instances[0]).toBe(document.querySelector('.robotics-match-row.is-current'));

      delete Element.prototype.scrollIntoView;
    });

    it('does not auto-scroll when the Current Match changes while on a different tab', async () => {
      const app = initRoboticsApp();
      openSchedule(app, 1);
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

      app.setActiveTab('teams');
      app.dispatch((s) => recordQualificationResult(s, 0, { scoreA: 1, scoreB: 0 }));
      await nextTick();
      expect(scrollIntoView).not.toHaveBeenCalled();

      delete Element.prototype.scrollIntoView;
    });

    it('shows a read-only Up Next preview of the following match', () => {
      const app = initRoboticsApp();
      openSchedule(app, 3);
      const upNext = document.querySelector('.robotics-up-next');
      const next = app.getState().qualification.matches[1];
      expect(upNext.querySelector('.robotics-now-playing-kicker').textContent).toBe('Up Next');
      expect(upNext.querySelector('.robotics-up-next-teams.is-red').textContent).toBe(names(app.getState(), next.allianceA).join(' & '));
      expect(upNext.querySelector('.robotics-up-next-teams.is-blue').textContent).toBe(names(app.getState(), next.allianceB).join(' & '));
      expect(upNext.querySelector('.robotics-up-next-meta .robotics-now-playing-time')).toBeTruthy();
      expect(upNext.querySelectorAll('input, button')).toHaveLength(0);
    });

    it('omits Up Next when the Current Match is the last one left', () => {
      const app = initRoboticsApp();
      openSchedule(app, 1);
      expect(app.getState().qualification.matches).toHaveLength(1);
      expect(card()).toBeTruthy();
      expect(document.querySelector('.robotics-up-next')).toBeNull();
    });

    it('says the Qualification Round is complete once every match is, with a button on to Finals', async () => {
      const app = initRoboticsApp();
      openSchedule(app, 1);
      app.dispatch((s) => recordQualificationResult(s, 0, { scoreA: 1, scoreB: 0 }));
      await flushRender();
      expect(card().classList.contains('is-finished')).toBe(true);
      expect(card().querySelector('.robotics-now-playing-message').textContent).toBe('Qualification Round complete');
      expect(card().querySelector('.robotics-score-input')).toBeNull();
      clickButtonWithText(card(), 'On to Finals →');
      expect(document.querySelector('.robotics-tab-btn.active').dataset.tabKey).toBe('finals');
    });

    it('shows an empty state before any Qualification Matches exist', () => {
      const app = initRoboticsApp();
      app.setActiveTab('schedule');
      expect(card().classList.contains('is-idle')).toBe(true);
      expect(card().classList.contains('is-finished')).toBe(false);
      expect(card().querySelector('.robotics-now-playing-message').textContent).toBe('No Qualification Matches scheduled yet.');
      expect(card().querySelector('button')).toBeNull();
    });
  });

  describe('collapsible Match Timeline', () => {
    function openScheduleWithMatches() {
      const app = initRoboticsApp();
      const root = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta'].forEach((name) => addTeamViaForm(root, name));
      app.dispatch((s) => setMatchesPerTeam(s, 2));
      app.dispatch((s) => regenerateMatchups(s));
      app.setActiveTab('schedule');
      return app;
    }
    const toggle = () => document.querySelector('.robotics-timeline .robotics-accordion-toggle');
    const panel = () => document.getElementById(toggle().getAttribute('aria-controls'));

    it('is collapsed by default into a one-line summary of the current configuration', () => {
      openScheduleWithMatches();
      expect(toggle().tagName).toBe('BUTTON');
      expect(toggle().getAttribute('type')).toBe('button');
      expect(toggle().parentElement.tagName).toBe('H3');
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      expect(panel().hidden).toBe(true);
      expect(document.querySelector('.robotics-timeline .robotics-accordion-summary').textContent)
        .toBe('Forward · no start time · 4 + 1 min · 1 field');
    });

    it('summarises the applied start time with a projected end time', async () => {
      const app = openScheduleWithMatches();
      const start = new Date();
      start.setHours(13, 0, 0, 0);
      app.dispatch((s) => setTimelineConfig(s, { startTime: start.getTime(), fieldCount: 2 }));
      await flushRender();
      const summary = document.querySelector('.robotics-timeline .robotics-accordion-summary').textContent;
      expect(summary).toMatch(/^Forward · starts .+ · 4 \+ 1 min · 2 fields · ends ~.+$/);
    });

    it('expands and collapses in place when the summary is clicked', () => {
      openScheduleWithMatches();
      const btn = toggle();
      btn.click();
      expect(btn.getAttribute('aria-expanded')).toBe('true');
      expect(panel().hidden).toBe(false);
      expect(document.querySelector('.robotics-timeline').classList.contains('is-expanded')).toBe(true);
      expect(panel().querySelector('select')).toBeTruthy();
      expect(panel().querySelector('input[type="time"]')).toBeTruthy();
      expect([...panel().querySelectorAll('button')].map((b) => b.textContent)).toContain('Apply');
      expect(panel().querySelectorAll('input[type="number"]')).toHaveLength(3);
      // Toggled in place, so keyboard focus is not lost to a re-render.
      expect(toggle()).toBe(btn);

      btn.click();
      expect(btn.getAttribute('aria-expanded')).toBe('false');
      expect(panel().hidden).toBe(true);
    });

    it('remembers the open/closed choice across reloads', () => {
      openScheduleWithMatches();
      toggle().click();
      initRoboticsApp().setActiveTab('schedule');
      expect(toggle().getAttribute('aria-expanded')).toBe('true');
      expect(panel().hidden).toBe(false);

      toggle().click();
      initRoboticsApp().setActiveTab('schedule');
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
    });

    it('stays open after a Tournament change re-renders the tab', () => {
      const app = openScheduleWithMatches();
      toggle().click();
      app.dispatch((s) => setTimelineConfig(s, { gapMin: 2 }));
      expect(toggle().getAttribute('aria-expanded')).toBe('true');
    });

    it('keeps the preference out of Tournament state, so New Tournament does not reset it', async () => {
      const app = openScheduleWithMatches();
      toggle().click();
      expect(localStorage.getItem('robotics-tournament-state')).not.toContain('xpanded');

      app.setActiveTab('teams');
      let root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Reset Everything / New Tournament');
      root = document.getElementById('roboticsApp');
      await clickDialogButton(root, 'Reset Everything');
      app.setActiveTab('schedule');
      expect(toggle().getAttribute('aria-expanded')).toBe('true');
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

    it('forms and removes a playoff alliance', async () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance');
      expect(app.getState().elimination.alliances).toHaveLength(1);

      await flushRender();
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

    it('configures the bracket, assigns seeds, and generates it', async () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance'); // Alpha+Bravo
      await flushRender();
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance'); // Charlie+Delta
      expect(app.getState().elimination.alliances).toHaveLength(2);

      root = document.getElementById('roboticsApp');
      const sizeInput = [...root.querySelectorAll('input')].find((i) => i.previousSibling?.textContent?.includes('Bracket size'));
      sizeInput.value = '2';
      clickButtonWithText(root, 'Save Bracket Config');

      await flushRender();
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Auto-fill Seeds from Standings');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Generate Bracket');

      expect(app.getState().elimination.bracket).toBeTruthy();
      await flushRender();
      root = document.getElementById('roboticsApp');
      expect(root.querySelector('.robotics-bracket')).toBeTruthy();
    });

    it('groups the setup cards into one collapsible accordion with the bracket full-width beneath it', async () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      const panelTitles = () => [...root.querySelectorAll('.robotics-finals-accordion-panel > .robotics-card > .robotics-card-title')].map((h) => h.textContent);
      expect(panelTitles()).toEqual(['Form a Playoff Alliance', 'Playoff Alliances', 'Bracket Configuration']);

      app.dispatch((s) => formPlayoffAlliance(s, s.teams[0].id, s.teams[1].id));
      app.dispatch((s) => formPlayoffAlliance(s, s.teams[2].id, s.teams[3].id));
      app.dispatch((s) => setBracketConfig(s, { bracketSize: 2, includeThirdPlace: false }));
      app.dispatch((s) => autoFillSeedsFromStandings(s));
      app.dispatch((s) => generateBracket(s));
      await flushRender();
      root = document.getElementById('roboticsApp');
      expect(panelTitles()).toEqual(['Form a Playoff Alliance', 'Playoff Alliances', 'Bracket Configuration']);
      // Seeds sits outside the accordion, sharing the setup row.
      const seedsTitle = root.querySelector('.robotics-finals-setup > .robotics-card:not(.robotics-accordion) > .robotics-card-title');
      expect(seedsTitle.textContent).toBe('Seeds');

      const setup = root.querySelector('.robotics-finals-setup');
      const bracket = root.querySelector('.robotics-bracket');
      expect(setup.contains(bracket)).toBe(false);
      expect(bracket.parentElement).toBe(setup.parentElement);
      expect(setup.nextElementSibling).toBe(bracket);
      expect([...bracket.querySelectorAll('.robotics-bracket-round.is-final h4')].map((h) => h.textContent)).toEqual(['Final']);
    });

    describe('collapsible Playoff Setup accordion', () => {
      const toggle = () => document.querySelector('.robotics-finals-accordion .robotics-accordion-toggle');
      const panel = () => document.getElementById(toggle().getAttribute('aria-controls'));

      it('is collapsed by default into a one-line summary of alliances and bracket configuration', () => {
        const app = initRoboticsApp();
        setupFourTeams(app);
        app.setActiveTab('finals');
        expect(toggle().tagName).toBe('BUTTON');
        expect(toggle().getAttribute('type')).toBe('button');
        expect(toggle().parentElement.tagName).toBe('H3');
        expect(toggle().getAttribute('aria-expanded')).toBe('false');
        expect(panel().hidden).toBe(true);
        expect(document.querySelector('.robotics-finals-accordion .robotics-accordion-summary').textContent)
          .toBe('0 alliances · bracket size not set · with third-place match');
      });

      it('summarises alliances formed and the saved bracket configuration', async () => {
        const app = initRoboticsApp();
        setupFourTeams(app);
        app.setActiveTab('finals');
        app.dispatch((s) => formPlayoffAlliance(s, s.teams[0].id, s.teams[1].id));
        app.dispatch((s) => setBracketConfig(s, { bracketSize: 4, includeThirdPlace: false }));
        await flushRender();
        const summary = document.querySelector('.robotics-finals-accordion .robotics-accordion-summary').textContent;
        expect(summary).toBe('1 alliance · bracket size 4 · no third-place match');
      });

      it('expands and collapses in place when the summary is clicked, and the setup cards still work while expanded', async () => {
        const app = initRoboticsApp();
        setupFourTeams(app);
        app.setActiveTab('finals');
        const btn = toggle();
        btn.click();
        expect(btn.getAttribute('aria-expanded')).toBe('true');
        expect(panel().hidden).toBe(false);
        expect(document.querySelector('.robotics-finals-accordion').classList.contains('is-expanded')).toBe(true);
        // Toggled in place, so keyboard focus is not lost to a re-render.
        expect(toggle()).toBe(btn);

        let root = document.getElementById('roboticsApp');
        clickButtonWithText(root, 'Form Alliance');
        expect(app.getState().elimination.alliances).toHaveLength(1);
        await flushRender();

        root = document.getElementById('roboticsApp');
        const sizeInput = [...root.querySelectorAll('input')].find((i) => i.previousSibling?.textContent?.includes('Bracket size'));
        sizeInput.value = '2';
        clickButtonWithText(root, 'Save Bracket Config');
        expect(app.getState().elimination.bracketSize).toBe(2);
        await flushRender();

        root = document.getElementById('roboticsApp');
        clickButtonWithText(root, 'Remove');
        expect(app.getState().elimination.alliances).toHaveLength(0);
        await flushRender();

        toggle().click();
        expect(toggle().getAttribute('aria-expanded')).toBe('false');
        expect(panel().hidden).toBe(true);
      });

      it('remembers the open/closed choice across reloads', () => {
        const app = initRoboticsApp();
        setupFourTeams(app);
        app.setActiveTab('finals');
        toggle().click();
        initRoboticsApp().setActiveTab('finals');
        expect(toggle().getAttribute('aria-expanded')).toBe('true');
        expect(panel().hidden).toBe(false);

        toggle().click();
        initRoboticsApp().setActiveTab('finals');
        expect(toggle().getAttribute('aria-expanded')).toBe('false');
      });

      it('stays open after a Tournament change re-renders the tab', () => {
        const app = initRoboticsApp();
        setupFourTeams(app);
        app.setActiveTab('finals');
        toggle().click();
        app.dispatch((s) => formPlayoffAlliance(s, s.teams[0].id, s.teams[1].id));
        expect(toggle().getAttribute('aria-expanded')).toBe('true');
      });

      it('keeps the preference out of Tournament state, so New Tournament does not reset it', async () => {
        const app = initRoboticsApp();
        setupFourTeams(app);
        app.setActiveTab('finals');
        toggle().click();
        expect(localStorage.getItem('robotics-tournament-state')).not.toContain('xpanded');

        app.setActiveTab('teams');
        let root = document.getElementById('roboticsApp');
        clickButtonWithText(root, 'Reset Everything / New Tournament');
        root = document.getElementById('roboticsApp');
        await clickDialogButton(root, 'Reset Everything');
        app.setActiveTab('finals');
        expect(toggle().getAttribute('aria-expanded')).toBe('true');
      });
    });

    it('records an elimination result and offers Reveal Results (no Champion banner) once the final completes', async () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance');
      await flushRender();
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance');
      root = document.getElementById('roboticsApp');
      const sizeInput = [...root.querySelectorAll('input')].find((i) => i.previousSibling?.textContent?.includes('Bracket size'));
      sizeInput.value = '2';
      clickButtonWithText(root, 'Save Bracket Config');
      await flushRender();
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Auto-fill Seeds from Standings');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Generate Bracket');
      await flushRender();

      root = document.getElementById('roboticsApp');
      const scoreInputs = root.querySelectorAll('.robotics-bracket .robotics-score-input');
      scoreInputs[0].value = '80';
      scoreInputs[1].value = '20';
      clickButtonWithText(root, 'Mark Complete');
      await flushRender();

      root = document.getElementById('roboticsApp');
      expect(root.textContent).not.toContain('Champion');
      expect(root.querySelector('.robotics-champion-banner')).toBeFalsy();
      clickButtonWithText(root, 'Reveal Results →');
      expect(document.querySelector('.robotics-tab-btn.active').dataset.tabKey).toBe('results');
      expect(document.querySelector('.robotics-podium')).toBeTruthy();
    });

    it('marks the winning side of a completed elimination match with is-winner, and the card as is-complete', async () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance');
      await flushRender();
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance');
      root = document.getElementById('roboticsApp');
      const sizeInput = [...root.querySelectorAll('input')].find((i) => i.previousSibling?.textContent?.includes('Bracket size'));
      sizeInput.value = '2';
      clickButtonWithText(root, 'Save Bracket Config');
      await flushRender();
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Auto-fill Seeds from Standings');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Generate Bracket');
      await flushRender();

      root = document.getElementById('roboticsApp');
      const scoreInputs = root.querySelectorAll('.robotics-bracket .robotics-score-input');
      scoreInputs[0].value = '80';
      scoreInputs[1].value = '20';
      clickButtonWithText(root, 'Mark Complete');
      await flushRender();

      root = document.getElementById('roboticsApp');
      const matchCard = root.querySelector('.robotics-bracket-match');
      expect(matchCard.classList.contains('is-complete')).toBe(true);
      const sides = matchCard.querySelectorAll('.robotics-bracket-side');
      expect(sides[0].classList.contains('is-red')).toBe(true);
      expect(sides[1].classList.contains('is-blue')).toBe(true);
      const alliances = matchCard.querySelectorAll('.robotics-match-alliance');
      expect(alliances[0].classList.contains('is-winner')).toBe(true);
      expect(alliances[1].classList.contains('is-winner')).toBe(false);
    });

    it('toggles no-show by clicking a team name on an elimination match', async () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance');
      await flushRender();
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance');
      root = document.getElementById('roboticsApp');
      const sizeInput = [...root.querySelectorAll('input')].find((i) => i.previousSibling?.textContent?.includes('Bracket size'));
      sizeInput.value = '2';
      clickButtonWithText(root, 'Save Bracket Config');
      await flushRender();
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Auto-fill Seeds from Standings');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Generate Bracket');
      await flushRender();

      root = document.getElementById('roboticsApp');
      const toggle = root.querySelector('.robotics-bracket .robotics-team-toggle');
      toggle.click();

      const bracketMatch = app.getState().elimination.bracket.matches.find((m) => !m.isBye);
      expect(Object.values(bracketMatch.noShow)).toContain(true);
    });

    it('keeps a typed-but-unsaved elimination score after toggling No-Show, including repeated toggling', async () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance');
      await flushRender();
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Form Alliance');
      root = document.getElementById('roboticsApp');
      const sizeInput = [...root.querySelectorAll('input')].find((i) => i.previousSibling?.textContent?.includes('Bracket size'));
      sizeInput.value = '2';
      clickButtonWithText(root, 'Save Bracket Config');
      await flushRender();
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Auto-fill Seeds from Standings');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Generate Bracket');
      await flushRender();

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

    it('renders the Third-Place Match column positioned to the left of the Final', async () => {
      const app = initRoboticsApp();
      const setupRoot = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'].forEach((name) => addTeamViaForm(setupRoot, name));
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      for (let i = 0; i < 4; i++) {
        root = document.getElementById('roboticsApp');
        clickButtonWithText(root, 'Form Alliance');
        await flushRender();
      }
      expect(app.getState().elimination.alliances).toHaveLength(4);

      root = document.getElementById('roboticsApp');
      const sizeInput = [...root.querySelectorAll('input')].find((i) => i.previousSibling?.textContent?.includes('Bracket size'));
      sizeInput.value = '4';
      root.querySelector('input[type="checkbox"]').checked = true;
      clickButtonWithText(root, 'Save Bracket Config');
      await flushRender();
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Auto-fill Seeds from Standings');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Generate Bracket');
      await flushRender();

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

    it('renders a Bye as its own card naming the advancing Playoff Alliance', async () => {
      const app = initRoboticsApp();
      setupFourTeams(app);
      // 3 Playoff Alliances in a 3-alliance bracket: the top seed gets a Bye
      app.dispatch((s) => {
        const [alpha, bravo, charlie, delta] = s.teams.map((t) => t.id);
        let next = formPlayoffAlliance(s, alpha, bravo);
        next = formPlayoffAlliance(next, charlie, charlie);
        next = formPlayoffAlliance(next, delta, delta);
        return setBracketConfig(next, { bracketSize: 3, includeThirdPlace: false });
      });
      app.dispatch((s) => generateBracket(autoFillSeedsFromStandings(s)));
      app.setActiveTab('finals');
      await flushRender();

      const root = document.getElementById('roboticsApp');
      const byes = [...root.querySelectorAll('.robotics-bracket .robotics-bracket-bye')].map((b) => b.textContent);
      expect(byes).toHaveLength(1);
      expect(byes[0]).toMatch(/^BYE → (Alpha & Bravo|Charlie|Delta)$/);
    });

    it('shows no Reveal Results button while the Third-Place Match is still undecided, and no place banners at any point', async () => {
      const app = initRoboticsApp();
      const setupRoot = document.getElementById('roboticsApp');
      ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'].forEach((name) => addTeamViaForm(setupRoot, name));
      app.setActiveTab('finals');
      let root = document.getElementById('roboticsApp');
      for (let i = 0; i < 4; i++) {
        root = document.getElementById('roboticsApp');
        clickButtonWithText(root, 'Form Alliance');
        await flushRender();
      }
      root = document.getElementById('roboticsApp');
      const sizeInput = [...root.querySelectorAll('input')].find((i) => i.previousSibling?.textContent?.includes('Bracket size'));
      sizeInput.value = '4';
      root.querySelector('input[type="checkbox"]').checked = true;
      clickButtonWithText(root, 'Save Bracket Config');
      await flushRender();
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Auto-fill Seeds from Standings');
      root = document.getElementById('roboticsApp');
      clickButtonWithText(root, 'Generate Bracket');
      await flushRender();

      // Semis (inputs 0-3), then the Final (inputs 6-7), leaving the Third-Place Match (inputs 4-5).
      for (const [a, b] of [[0, 1], [2, 3], [6, 7]]) {
        root = document.getElementById('roboticsApp');
        const scoreInputs = root.querySelectorAll('.robotics-bracket .robotics-score-input');
        scoreInputs[a].value = '80';
        scoreInputs[b].value = '20';
        scoreInputs[a].closest('.robotics-bracket-match').querySelector('.robotics-match-actions button').click();
        await flushRender();
      }

      root = document.getElementById('roboticsApp');
      expect(app.getState().elimination.bracket.matches.find((m) => m.round === 'final').completed).toBe(true);
      expect(root.querySelector('.robotics-reveal-results-btn')).toBeFalsy();
      expect(root.querySelector('.robotics-champion-banner, .robotics-second-place-banner, .robotics-third-place-banner')).toBeFalsy();

      const scoreInputs = root.querySelectorAll('.robotics-bracket .robotics-score-input');
      scoreInputs[4].value = '50';
      scoreInputs[5].value = '40';
      scoreInputs[4].closest('.robotics-bracket-match').querySelector('.robotics-match-actions button').click();
      await flushRender();

      root = document.getElementById('roboticsApp');
      expect(root.querySelector('.robotics-reveal-results-btn')?.textContent).toBe('Reveal Results →');
      expect(root.querySelector('.robotics-third-place-banner')).toBeFalsy();
      expect([...root.querySelectorAll('button')].some((b) => b.textContent === 'Copy Placements to Clipboard')).toBe(false);
    });
  });

  describe('results tab', () => {
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    /**
     * Seed localStorage with a Tournament whose bracket is generated from
     * single-Team Playoff Alliances, Seed n = the nth Team. `winners` lists,
     * per played match in bracket order, whether side A wins (true), side B
     * wins (false), or it is left unplayed (undefined); `revealedCount`
     * Placements start revealed on the Podium.
     */
    function seedTournament({ teams, includeThirdPlace = false, winners = [], revealedCount = 0 }) {
      let s = createInitialState();
      teams.forEach(([name, members]) => { s = addTeam(s, { name, members }); });
      s.teams.forEach((t) => { s = formPlayoffAlliance(s, t.id, t.id); });
      s = setBracketConfig(s, { bracketSize: teams.length, includeThirdPlace });
      s.elimination.alliances.forEach((a, i) => { s = setSeed(s, i + 1, a.id); });
      s = generateBracket(s);
      const played = s.elimination.bracket.matches.filter((m) => !m.isBye);
      winners.forEach((aWins, i) => {
        if (aWins === undefined) return;
        s = recordEliminationResult(s, played[i].id, aWins ? { scoreA: 9, scoreB: 1 } : { scoreA: 1, scoreB: 9 });
      });
      for (let i = 0; i < revealedCount; i++) s = revealNextPlacement(s);
      localStorage.setItem('robotics-tournament-state', JSON.stringify(s));
    }

    // Semis: Alpha v Delta, Bravo v Charlie. Alpha + Bravo win, Alpha wins the Final, Charlie takes 3rd.
    const FOUR_TEAMS = [['Alpha', ['Ann']], ['Bravo', ['Bea', 'Bo']], ['Charlie', ['Cy']], ['Delta', ['Di']]];
    const seedCompleteFour = (extra = {}) => seedTournament({ teams: FOUR_TEAMS, includeThirdPlace: true, winners: [true, true, true, false], ...extra });

    const openResults = () => {
      const app = initRoboticsApp();
      app.setActiveTab('results');
      return app;
    };
    const podium = () => document.querySelector('.robotics-podium');
    const block = (place) => document.querySelector(`.robotics-podium-block[data-place="${place}"]`);
    const pressSpace = (target = document.body) => {
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      return event;
    };

    it('is always in the nav, after Finals', () => {
      initRoboticsApp();
      const keys = [...document.querySelectorAll('.robotics-tab-btn')].map((b) => b.dataset.tabKey);
      expect(keys).toEqual(['teams', 'schedule', 'finals', 'results']);
      expect(document.querySelector('[data-tab-key="results"]').textContent).toBe('Results');
    });

    it('shows "Results not decided yet" before any bracket exists', () => {
      openResults();
      const root = document.getElementById('roboticsApp');
      expect(root.textContent).toContain('Results not decided yet');
      expect(root.textContent).toContain('Generate the Elimination Bracket');
      expect(podium()).toBeFalsy();
    });

    it('shows how many Elimination Matches remain while the bracket is undecided', () => {
      seedTournament({ teams: FOUR_TEAMS, includeThirdPlace: true, winners: [true] });
      openResults();
      expect(document.getElementById('roboticsApp').textContent).toContain('3 Elimination Matches remain');
      expect(podium()).toBeFalsy();
    });

    it('says "1 Elimination Match remains" in the singular', () => {
      seedTournament({ teams: FOUR_TEAMS.slice(0, 2) });
      openResults();
      expect(document.getElementById('roboticsApp').textContent).toContain('1 Elimination Match remains');
    });

    it('lays out 2nd | 1st | 3rd, all covered, with no names showing', () => {
      seedCompleteFour();
      openResults();
      const blocks = [...podium().querySelectorAll('.robotics-podium-block')];
      expect(blocks.map((b) => b.dataset.place)).toEqual(['2', '1', '3']);
      expect(blocks.every((b) => b.classList.contains('is-covered'))).toBe(true);
      expect(podium().textContent).not.toContain('Alpha');
      expect(document.querySelector('.robotics-podium-hint').textContent).toContain('3rd place');
    });

    it('reveals 3rd, 2nd, then 1st on each podium click, listing Teams and Members', async () => {
      window.matchMedia = vi.fn(() => ({ matches: false }));
      seedCompleteFour();
      const app = openResults();

      podium().click();
      await flushRender();
      expect(block(3).classList.contains('is-revealed')).toBe(true);
      expect(block(3).textContent).toContain('Charlie');
      expect(block(3).textContent).toContain('Cy');
      expect(block(2).classList.contains('is-covered')).toBe(true);
      expect(block(3).classList.contains('is-rising')).toBe(true);

      podium().click();
      await flushRender();
      expect(block(2).textContent).toContain('Bravo');
      expect(block(2).textContent).toContain('Bea, Bo');
      expect(block(1).classList.contains('is-covered')).toBe(true);
      expect(document.querySelector('.robotics-confetti')).toBeFalsy();

      podium().click();
      await flushRender();
      expect(block(1).classList.contains('is-revealed')).toBe(true);
      expect(block(1).textContent).toContain('Alpha');
      expect(block(1).querySelector('.robotics-confetti')).toBeTruthy();
      expect(document.querySelector('.robotics-podium-hint')).toBeFalsy();
      expect(getRevealedCount(app.getState())).toBe(3);

      // Fully revealed: further clicks change nothing.
      podium().click();
      await flushRender();
      expect(getRevealedCount(app.getState())).toBe(3);
    });

    it('reveals the right place for each click even when two clicks land before the DOM rebuild', async () => {
      window.matchMedia = vi.fn(() => ({ matches: false }));
      seedCompleteFour();
      openResults();

      // Two reveals triggered back-to-back, before dispatch's deferred rebuild runs for either:
      // each must still tag its own place, not both tag whichever was "next" at the first click.
      podium().click();
      podium().click();
      await flushRender();

      expect(block(3).classList.contains('is-revealed')).toBe(true);
      expect(block(3).classList.contains('is-rising')).toBe(true);
      expect(block(2).classList.contains('is-revealed')).toBe(true);
      expect(block(2).classList.contains('is-rising')).toBe(true);

      podium().click();
      await flushRender();
      expect(block(1).classList.contains('is-revealed')).toBe(true);
      expect(block(1).querySelector('.robotics-confetti')).toBeTruthy();
    });

    it('reveals with Space, but not on another tab or while typing in a field', () => {
      seedCompleteFour();
      const app = openResults();
      const event = pressSpace();
      expect(event.defaultPrevented).toBe(true);
      expect(getRevealedCount(app.getState())).toBe(1);

      const input = document.createElement('input');
      document.getElementById('roboticsApp').appendChild(input);
      pressSpace(input);
      expect(getRevealedCount(app.getState())).toBe(1);

      pressSpace(document.querySelector('.robotics-tab-btn'));
      expect(getRevealedCount(app.getState())).toBe(1);

      app.setActiveTab('finals');
      expect(pressSpace().defaultPrevented).toBe(false);
      expect(getRevealedCount(app.getState())).toBe(1);
    });

    it('ignores held-down (repeating) Space so one press reveals one Placement', () => {
      seedCompleteFour();
      const app = openResults();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', repeat: true, bubbles: true, cancelable: true }));
      expect(getRevealedCount(app.getState())).toBe(0);
    });

    it('reveals with Enter on the focused podium, ignoring other keys', () => {
      seedCompleteFour();
      const app = openResults();
      podium().dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      expect(getRevealedCount(app.getState())).toBe(0);
      podium().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(getRevealedCount(app.getState())).toBe(1);
    });

    it('ignores Space on the Results tab while results are undecided', () => {
      const app = openResults();
      expect(pressSpace().defaultPrevented).toBe(false);
      expect(getRevealedCount(app.getState())).toBe(0);
    });

    it('skips 3rd when there is no Third-Place Match', async () => {
      seedTournament({ teams: FOUR_TEAMS.slice(0, 2), winners: [false] });
      openResults();
      expect([...podium().querySelectorAll('.robotics-podium-block')].map((b) => b.dataset.place)).toEqual(['2', '1']);
      expect(document.querySelector('.robotics-podium-hint').textContent).toContain('2nd place');
      podium().click();
      await flushRender();
      expect(block(2).textContent).toContain('Alpha');
      podium().click();
      await flushRender();
      expect(block(1).textContent).toContain('Bravo');
    });

    it('launches no confetti under prefers-reduced-motion', async () => {
      window.matchMedia = vi.fn(() => ({ matches: true }));
      seedCompleteFour({ revealedCount: 2 });
      openResults();
      podium().click();
      await flushRender();
      expect(block(1).classList.contains('is-revealed')).toBe(true);
      expect(document.querySelector('.robotics-confetti')).toBeFalsy();
    });

    it('keeps revealed Placements when revisiting the tab, without replaying the rise', () => {
      seedCompleteFour();
      const app = openResults();
      podium().click();
      app.setActiveTab('teams');
      app.setActiveTab('results');
      expect(block(3).classList.contains('is-revealed')).toBe(true);
      expect(block(3).classList.contains('is-rising')).toBe(false);
    });

    it('Replay reveal re-covers every block', async () => {
      seedCompleteFour({ revealedCount: 3 });
      const app = openResults();
      expect(block(1).classList.contains('is-revealed')).toBe(true);
      clickButtonWithText(document.getElementById('roboticsApp'), 'Replay reveal');
      expect(getRevealedCount(app.getState())).toBe(0);
      await flushRender();
      expect(block(1).classList.contains('is-covered')).toBe(true);
    });

    it('offers no Replay reveal before anything is revealed', () => {
      seedCompleteFour();
      openResults();
      expect([...document.querySelectorAll('button')].some((b) => b.textContent === 'Replay reveal')).toBe(false);
    });

    it('Reset Results clears reveal progress', async () => {
      seedCompleteFour({ revealedCount: 3 });
      const app = initRoboticsApp();
      clickButtonWithText(document.getElementById('roboticsApp'), 'Reset Results');
      await clickDialogButton(document.getElementById('roboticsApp'), 'Reset Results');
      expect(getRevealedCount(app.getState())).toBe(0);
    });

    it('copies all decided Placements with Members from the Results tab', () => {
      const writeText = setClipboardMock();
      seedCompleteFour();
      openResults();
      clickButtonWithText(document.getElementById('roboticsApp'), 'Copy Placements to Clipboard');
      const copied = writeText.mock.calls[0][0];
      expect(copied).toContain('1st Place:\nAlpha\n  Members: Ann');
      expect(copied).toContain('2nd Place:\nBravo');
      expect(copied).toContain('3rd Place:\nCharlie');
    });

    it('offers no Copy Placements while results are undecided', () => {
      openResults();
      expect([...document.querySelectorAll('button')].some((b) => b.textContent === 'Copy Placements to Clipboard')).toBe(false);
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

describe('nameFitStyle', () => {
  it('returns null for a short name, so no style attribute is rendered at all', () => {
    expect(nameFitStyle('Alpha')).toBeNull();
    expect(nameFitStyle('')).toBeNull();
  });

  it('shrinks the font-size scale for a name past the fit threshold, and reports it fits one line', () => {
    const fit = nameFitStyle('Robo Raiders Supreme'); // 20 chars
    expect(fit.style).toContain('--robotics-name-scale:');
    const scale = Number(fit.style.match(/--robotics-name-scale:\s*([\d.]+)/)[1]);
    expect(scale).toBeLessThan(1);
    expect(scale).toBeCloseTo(0.82);
    expect(fit.fitsOneLine).toBe(true);
  });

  it('floors the scale so an extremely long name never shrinks past readable, and reports it no longer fits one line', () => {
    const fit = nameFitStyle('A'.repeat(60));
    const scale = Number(fit.style.match(/--robotics-name-scale:\s*([\d.]+)/)[1]);
    expect(scale).toBe(0.6);
    expect(fit.fitsOneLine).toBe(false);
  });
});

describe('live status header', () => {
  const START = new Date(2026, 9, 3, 9, 0, 0).getTime();
  let app;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="roboticsApp"></div>';
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });

  afterEach(() => {
    app?.destroy();
    app = null;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function scheduledApp({ startTime = START } = {}) {
    app = initRoboticsApp();
    ['Alpha', 'Bravo', 'Charlie', 'Delta'].forEach((name) => app.dispatch((s) => addTeam(s, { name, members: [] })));
    app.dispatch((s) => setMatchesPerTeam(s, 2));
    app.dispatch((s) => regenerateMatchups(s));
    app.dispatch((s) => setTimelineConfig(s, { startTime, matchDurationMin: 5, gapMin: 0, fieldCount: 1 }));
    // dispatch()'s DOM rebuild is deferred to a macrotask (see robotics.js); under these fake
    // timers it only runs once a timer-advance lets it, rather than automatically.
    vi.advanceTimersByTime(0);
    return app;
  }

  const header = () => document.querySelector('.robotics-header');
  const text = (selector) => header().querySelector(selector)?.textContent;

  it('shows the title and Setup phase, with no progress or drift, before any matches exist', () => {
    app = initRoboticsApp();
    expect(text('.robotics-title')).toBe('Robotics Tournament');
    expect(text('.robotics-status-phase')).toBe('Setup');
    expect(header().querySelector('.robotics-status-progress')).toBeNull();
    expect(header().querySelector('.robotics-status-drift').hidden).toBe(true);
  });

  it('shows Qualification phase, match progress and drift once matches are scheduled', () => {
    scheduledApp();
    app.dispatch((s) => recordQualificationResult(s, 0, { scoreA: 1, scoreB: 0 }));
    vi.advanceTimersByTime(0);
    expect(text('.robotics-status-phase')).toBe('Qualification');
    expect(text('.robotics-status-progress')).toBe('Match 2 of 2');
    // Match 2 is scheduled 5 min after Start Time, and it is still the Start Time.
    expect(text('.robotics-status-drift')).toBe('5 min ahead');
  });

  it('hides drift when there is no Start Time', () => {
    scheduledApp({ startTime: null });
    expect(header().querySelector('.robotics-status-drift').hidden).toBe(true);
  });

  it('ticks the clock and drift each second without re-rendering the app', () => {
    scheduledApp();
    const appRoot = document.querySelector('.robotics-app');
    const clock = header().querySelector('.robotics-status-clock');
    const before = clock.textContent;
    expect(text('.robotics-status-drift')).toBe('On schedule');

    vi.advanceTimersByTime(4 * 60 * 1000);

    expect(document.querySelector('.robotics-app')).toBe(appRoot);
    expect(header().querySelector('.robotics-status-clock')).toBe(clock);
    expect(clock.textContent).not.toBe(before);
    expect(text('.robotics-status-drift')).toBe('4 min behind');
  });

  it('starts one clock interval per app, never another on re-render, and destroy() clears it', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    scheduledApp();
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    app.setActiveTab('schedule');
    app.setActiveTab('teams');
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    const clockTimer = setIntervalSpy.mock.results[0].value;
    app.destroy();
    expect(clearIntervalSpy).toHaveBeenCalledWith(clockTimer);
  });

  it('stops the previous app clock when a new app is initialised', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    initRoboticsApp();
    app = initRoboticsApp();
    const [firstTimer, secondTimer] = setIntervalSpy.mock.results.map((r) => r.value);
    expect(clearIntervalSpy).toHaveBeenCalledWith(firstTimer);
    expect(clearIntervalSpy).not.toHaveBeenCalledWith(secondTimer);
  });

  it("leaves the newer app's clock running when a superseded app is destroyed", () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const superseded = initRoboticsApp();
    app = initRoboticsApp();
    const secondTimer = setIntervalSpy.mock.results[1].value;
    superseded.destroy();
    expect(clearIntervalSpy).not.toHaveBeenCalledWith(secondTimer);
    app.destroy();
    expect(clearIntervalSpy).toHaveBeenCalledWith(secondTimer);
  });
});
