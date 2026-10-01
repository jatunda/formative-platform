import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSlugFromPath, tallyOutcomes, startPracticeSet, initializePage } from '../../practice-view.js';
import { PRACTICE_SET_NOT_FOUND } from '../../constants.js';

vi.mock('https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js', () => ({
  initializeApp: () => ({}),
  getDatabase: () => ({}),
  connectDatabaseEmulator: () => {},
}));

const mockResolvePracticeSetSlugToId = vi.fn();
const mockGetPracticeSetFromDB = vi.fn();
vi.mock('../../practice-set-database-utils.js', () => ({
  initializePracticeSetDatabase: vi.fn(),
  resolvePracticeSetSlugToId: (...args) => mockResolvePracticeSetSlugToId(...args),
  getPracticeSetFromDB: (...args) => mockGetPracticeSetFromDB(...args),
}));

const mockGetQuestionFromDB = vi.fn();
vi.mock('../../question-database-utils.js', () => ({
  initializeQuestionDatabase: vi.fn(),
  getQuestionFromDB: (...args) => mockGetQuestionFromDB(...args),
}));

function question(correctText, options) {
  return {
    stem: [{ type: 'text', value: `Stem for ${correctText}` }],
    options: options.map((opt) => ({
      text: opt.text,
      correct: opt.text === correctText,
      explanation: `Explanation for ${opt.text}`,
      mistakeCategory: opt.text === correctText ? null : 'mistake',
    })),
  };
}

const Q1 = question('right1', [{ text: 'right1' }, { text: 'wrong1' }]);
const Q2 = question('right2', [{ text: 'right2' }, { text: 'wrong2' }]);

describe('getSlugFromPath', () => {
  it('extracts the slug from a /practice/<slug> path', () => {
    expect(getSlugFromPath('/practice/unit-3-review')).toBe('unit-3-review');
  });

  it('handles a trailing slash', () => {
    expect(getSlugFromPath('/practice/unit-3-review/')).toBe('unit-3-review');
  });

  it('returns null when the path has no slug', () => {
    expect(getSlugFromPath('/practice/')).toBeNull();
    expect(getSlugFromPath('/')).toBeNull();
  });
});

describe('tallyOutcomes', () => {
  it('counts first-try, second-try, and missed outcomes', () => {
    const tally = tallyOutcomes([
      { outcome: 'firstTry' },
      { outcome: 'firstTry' },
      { outcome: 'secondTry' },
      { outcome: 'missed' },
    ]);
    expect(tally).toEqual({ firstTry: 2, secondTry: 1, missed: 1 });
  });

  it('ignores null/unfinished entries', () => {
    expect(tallyOutcomes([null, { outcome: null }])).toEqual({ firstTry: 0, secondTry: 0, missed: 0 });
  });
});

function radios(container) {
  return [...container.querySelectorAll('input[type="radio"]')];
}
function submitBtn(container) {
  return container.querySelector('.question-widget-submit');
}
function backBtn(root) {
  return [...root.querySelectorAll('button')].find((b) => b.textContent.includes('Back'));
}
function nextBtn(root) {
  return [...root.querySelectorAll('button')].find((b) => b.textContent.includes('Next'));
}

describe('startPracticeSet (Frontier navigation)', () => {
  let root;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('mounts the first question with Back disabled and Next disabled (frontier not yet finished)', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);

    expect(root.textContent).toContain('Stem for right1');
    expect(backBtn(root).disabled).toBe(true);
    expect(nextBtn(root).disabled).toBe(true);
  });

  it('enables Next once the current (frontier) question is finished, without auto-advancing', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);

    radios(root)[0].click();
    submitBtn(root).click();

    expect(root.textContent).toContain('Stem for right1'); // still on Q1 - no auto-advance
    expect(nextBtn(root).disabled).toBe(false);
  });

  it('moves to the next question when Next is clicked after finishing', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);

    radios(root)[0].click();
    submitBtn(root).click();
    nextBtn(root).onclick();

    expect(root.textContent).toContain('Stem for right2');
    expect(backBtn(root).disabled).toBe(false);
  });

  it('restores exact prior state when navigating Back to a finished question', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);

    radios(root)[1].click(); // wrong1
    submitBtn(root).click();
    radios(root)[0].click(); // right1, second try
    submitBtn(root).click();
    nextBtn(root).onclick(); // now on Q2

    backBtn(root).onclick(); // back to Q1

    expect(root.textContent).toContain('Stem for right1');
    expect(root.textContent).toContain('Explanation for right1');
    expect(root.querySelector('.question-widget-submit')).toBeNull(); // still finished, not reset
  });

  it('does not allow Next to skip past the frontier while reviewing an earlier question', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);

    radios(root)[0].click();
    submitBtn(root).click();
    nextBtn(root).onclick(); // viewing Q2, frontier still at Q2 (unfinished)

    expect(nextBtn(root).disabled).toBe(true);
  });

  it('shows the end-of-set summary with correct tallies once every question is finished', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);

    radios(root)[0].click(); // Q1 first-try correct
    submitBtn(root).click();
    nextBtn(root).onclick();

    radios(root)[1].click(); // Q2 wrong
    submitBtn(root).click();
    radios(root)[0].click(); // Q2 correct on retry
    submitBtn(root).click();
    nextBtn(root).onclick();

    expect(root.textContent).toContain("You're done!");
    expect(root.textContent).toContain('First-try correct: 1');
    expect(root.textContent).toContain('Second-try correct: 1');
    expect(root.textContent).toContain('Missed: 0');
  });
});

describe('initializePage', () => {
  beforeEach(() => {
    document.body.innerHTML = '<h1 id="practiceSetTitle"></h1><div id="content"></div>';
    mockResolvePracticeSetSlugToId.mockReset();
    mockGetPracticeSetFromDB.mockReset();
    mockGetQuestionFromDB.mockReset();
  });

  it('fetches every referenced question in parallel and renders the first one', async () => {
    window.history.pushState(null, '', '/practice/unit-3-review');
    mockResolvePracticeSetSlugToId.mockResolvedValue('ps1');
    mockGetPracticeSetFromDB.mockResolvedValue({ title: 'Unit 3 Review', questionIds: ['q1', 'q2'] });
    mockGetQuestionFromDB.mockImplementation(async (id) => (id === 'q1' ? Q1 : Q2));

    await initializePage();

    expect(mockGetQuestionFromDB).toHaveBeenCalledWith('q1');
    expect(mockGetQuestionFromDB).toHaveBeenCalledWith('q2');
    expect(document.getElementById('practiceSetTitle').textContent).toBe('Unit 3 Review');
    expect(document.getElementById('content').textContent).toContain('Stem for right1');
  });

  it('skips a referenced question that no longer exists', async () => {
    window.history.pushState(null, '', '/practice/unit-3-review');
    mockResolvePracticeSetSlugToId.mockResolvedValue('ps1');
    mockGetPracticeSetFromDB.mockResolvedValue({ title: 'T', questionIds: ['q1', 'deleted-id'] });
    mockGetQuestionFromDB.mockImplementation(async (id) => (id === 'q1' ? Q1 : null));

    await initializePage();

    expect(document.getElementById('content').textContent).toContain('Stem for right1');
  });

  it('shows a message when the practice set has no questions', async () => {
    window.history.pushState(null, '', '/practice/empty');
    mockResolvePracticeSetSlugToId.mockResolvedValue('ps1');
    mockGetPracticeSetFromDB.mockResolvedValue({ title: 'Empty', questionIds: [] });

    await initializePage();

    expect(document.getElementById('content').textContent).toContain('no questions yet');
  });

  it('shows "Practice set not found" when the slug does not resolve', async () => {
    window.history.pushState(null, '', '/practice/missing');
    mockResolvePracticeSetSlugToId.mockResolvedValue(null);

    await initializePage();

    expect(mockGetPracticeSetFromDB).not.toHaveBeenCalled();
    expect(document.getElementById('content').textContent).toBe(PRACTICE_SET_NOT_FOUND);
  });

  it('shows "Practice set not found" when the path has no slug at all', async () => {
    window.history.pushState(null, '', '/practice/');

    await initializePage();

    expect(mockResolvePracticeSetSlugToId).not.toHaveBeenCalled();
    expect(document.getElementById('content').textContent).toBe(PRACTICE_SET_NOT_FOUND);
  });
});
