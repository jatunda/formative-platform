import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSlugFromPath, tallyOutcomes, summarizeOutcomes, letterGradeFor, startPracticeSet, initializePage } from '../../practice-view.js';
import { PRACTICE_SET_NOT_FOUND } from '../../constants.js';
import { createInMemorySavedProgressStore } from '../../saved-progress.js';

const mockCelebrate = vi.fn();
const mockPlayCorrectSound = vi.fn();
vi.mock('../../celebration.js', () => ({
  celebrate: (...args) => mockCelebrate(...args),
  playCorrectSound: (...args) => mockPlayCorrectSound(...args),
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

describe('letterGradeFor', () => {
  it('maps percentages onto the standard A-F scale with inclusive lower bounds', () => {
    expect(letterGradeFor(100)).toBe('A');
    expect(letterGradeFor(90)).toBe('A');
    expect(letterGradeFor(80)).toBe('B');
    expect(letterGradeFor(70)).toBe('C');
    expect(letterGradeFor(60)).toBe('D');
    expect(letterGradeFor(59.9)).toBe('F');
    expect(letterGradeFor(0)).toBe('F');
  });

  it('does not round up: 89.6% is a B', () => {
    expect(letterGradeFor(89.6)).toBe('B');
  });
});

describe('summarizeOutcomes', () => {
  it('computes each percentage out of the total and grades on first-try accuracy only', () => {
    const stats = summarizeOutcomes({ firstTry: 3, secondTry: 1, missed: 1 });
    expect(stats.total).toBe(5);
    expect(stats.firstTryPercent).toBe(60);
    expect(stats.secondTryPercent).toBe(20);
    expect(stats.missedPercent).toBe(20);
    expect(stats.withinTwoTriesPercent).toBe(80);
    expect(stats.expectedGrade).toBe('D');
  });

  it('handles an empty tally without dividing by zero', () => {
    const stats = summarizeOutcomes({ firstTry: 0, secondTry: 0, missed: 0 });
    expect(stats.firstTryPercent).toBe(0);
    expect(stats.expectedGrade).toBe('F');
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
  return root.querySelector('.practice-next-btn');
}

describe('startPracticeSet (Frontier navigation)', () => {
  let root;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('mounts the first question with Back disabled and Next hidden (frontier not yet finished)', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);

    expect(root.textContent).toContain('Stem for right1');
    expect(backBtn(root).disabled).toBe(true);
    expect(nextBtn(root).hidden).toBe(true);
  });

  it('shows a subtle hint that the whole set is keyboard-navigable', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }]);

    const hint = root.querySelector('.practice-keyboard-hint');
    expect(hint).not.toBeNull();
    expect(hint.textContent).toContain('Enter');
  });

  it('focuses the first option as soon as a fresh question mounts, so arrow keys work immediately', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }]);

    expect(document.activeElement).toBe(radios(root)[0]);
  });

  it('is fully drivable by arrow keys and Enter alone, across multiple questions', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);

    // Q1: arrow-select the correct option (native radio-group behavior
    // moves focus AND checks the option - simulated here since jsdom
    // doesn't implement native radio arrow-key cycling), then Enter submits.
    const q1Correct = radios(root)[0];
    q1Correct.checked = true;
    q1Correct.focus();
    q1Correct.dispatchEvent(new Event('change', { bubbles: true }));
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    // Enter on the now-focused Next advances to Q2.
    expect(document.activeElement).toBe(nextBtn(root));
    document.activeElement.click();

    expect(root.textContent).toContain('Stem for right2');
    expect(document.activeElement).toBe(radios(root)[0]); // auto-focused again

    const q2Correct = radios(root)[0];
    q2Correct.checked = true;
    q2Correct.dispatchEvent(new Event('change', { bubbles: true }));
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(document.activeElement).toBe(nextBtn(root));
    expect(nextBtn(root).textContent).toContain('See results');
  });

  it('shows Next once the current (frontier) question is finished, without auto-advancing', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);

    radios(root)[0].click();
    submitBtn(root).click();

    expect(root.textContent).toContain('Stem for right1'); // still on Q1 - no auto-advance
    expect(nextBtn(root).hidden).toBe(false);
    expect(nextBtn(root).textContent).toContain('Enter');
  });

  it('keeps Next hidden after a first wrong attempt (question not finished yet)', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);

    radios(root)[1].click();
    submitBtn(root).click();

    expect(nextBtn(root).hidden).toBe(true);
  });

  it('focuses Next after finishing so Enter advances', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);

    radios(root)[0].click();
    submitBtn(root).click();

    expect(document.activeElement).toBe(nextBtn(root));
  });

  it('labels Next as "See results" on the last question', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }]);

    radios(root)[0].click();
    submitBtn(root).click();

    expect(nextBtn(root).textContent).toContain('See results');
  });

  it('shows the same "Enter ↵" key-hint pill as Submit, for visual consistency between the two', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);

    radios(root)[0].click();
    submitBtn(root).click();

    expect(nextBtn(root).textContent).toContain('Next');
    const hint = nextBtn(root).querySelector('kbd.key-hint');
    expect(hint).not.toBeNull();
    expect(hint.textContent).toBe('Enter ↵');
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
    expect(radios(root).every((r) => r.disabled)).toBe(true); // still finished, not reset
  });

  it('does not allow Next to skip past the frontier while reviewing an earlier question', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);

    radios(root)[0].click();
    submitBtn(root).click();
    nextBtn(root).onclick(); // viewing Q2, frontier still at Q2 (unfinished)

    expect(nextBtn(root).hidden).toBe(true);
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
    const rows = Object.fromEntries([...root.querySelectorAll('.practice-summary-table tr')]
      .map((tr) => [tr.querySelector('th').textContent, [...tr.querySelectorAll('td')].map((td) => td.textContent)]));
    expect(rows['Correct on first try']).toEqual(['1 of 2', '50%']);
    expect(rows['Correct on second try']).toEqual(['1 of 2', '50%']);
    expect(rows['Correct within two tries']).toEqual(['2 of 2', '100%']);
    expect(rows['Missed']).toEqual(['0 of 2', '0%']);
    expect(root.querySelector('.practice-grade-letter').textContent).toBe('F');
  });

  it('never shows a rounded first-try percentage that implies a higher grade bracket than the badge', () => {
    // 16/23 first-try-correct = 69.565...% - rounds to "70%" but the badge
    // (computed from the unrounded value) is a D, not a C.
    const total = 23;
    const firstTryCount = 16;
    const questions = Array.from({ length: total }, (_, i) => ({ id: `q${i}`, data: Q1 }));
    startPracticeSet(root, questions);

    for (let i = 0; i < total; i += 1) {
      if (i < firstTryCount) {
        radios(root)[0].click();
        submitBtn(root).click();
      } else {
        radios(root)[1].click();
        submitBtn(root).click();
        radios(root)[1].click();
        submitBtn(root).click();
      }
      nextBtn(root).onclick();
    }

    const letter = root.querySelector('.practice-grade-letter').textContent;
    const noteText = root.querySelector('.practice-grade-note').textContent;
    const shownPercent = Number(noteText.match(/\((\d+)%\)/)[1]);
    expect(letter).toBe('D');
    expect(letterGradeFor(shownPercent)).toBe(letter);
  });

  it('hides Next on the results page', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }]);

    radios(root)[0].click();
    submitBtn(root).click();
    nextBtn(root).onclick();

    expect(root.textContent).toContain("You're done!");
    expect(nextBtn(root).hidden).toBe(true);
  });
});

function topNextBtn(root) {
  return root.querySelector('.practice-nav-buttons .practice-top-next-btn');
}
function visibleToast(root) {
  return root.querySelector('.practice-toast-visible');
}

describe('startPracticeSet (Next buttons)', () => {
  let root;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function answerCorrectly() {
    radios(root)[0].click();
    submitBtn(root).click();
  }

  it('replaces Submit with the green Next once the Question is finished', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);
    expect(submitBtn(root)).not.toBeNull();

    answerCorrectly();

    expect(submitBtn(root)).toBeNull();
    expect(nextBtn(root).hidden).toBe(false);
    expect(nextBtn(root).textContent).toContain('Enter ↵');
  });

  it('shows the green Next, not a grayed-out Submit, when revisiting a finished Question', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);
    answerCorrectly();
    nextBtn(root).click();

    backBtn(root).click();

    expect(root.textContent).toContain('Stem for right1');
    expect(submitBtn(root)).toBeNull();
    expect(nextBtn(root).hidden).toBe(false);
    expect(document.activeElement).toBe(nextBtn(root));
  });

  it('puts a top-bar Next beside Back, grayed out (but still clickable) on an unfinished Question', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);

    const top = topNextBtn(root);
    expect(top.textContent).toBe('Next →');
    expect(top.getAttribute('aria-disabled')).toBe('true');
    expect(top.disabled).toBe(false);
  });

  it('enables the top-bar Next once the Question is finished, and it advances', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);
    answerCorrectly();

    expect(topNextBtn(root).getAttribute('aria-disabled')).toBe('false');
    topNextBtn(root).click();

    expect(root.textContent).toContain('Stem for right2');
    expect(topNextBtn(root).getAttribute('aria-disabled')).toBe('true');
  });

  it('labels the top-bar Next "Results →" on the last Question and leads to the summary', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }]);

    expect(topNextBtn(root).textContent).toBe('Results →');
    answerCorrectly();
    topNextBtn(root).click();

    expect(root.textContent).toContain("You're done!");
  });

  it('labels the green Next "See results" on the last Question', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);
    answerCorrectly();
    expect(nextBtn(root).textContent).toContain('Next');
    nextBtn(root).click();

    answerCorrectly();

    expect(nextBtn(root).textContent).toContain('See results');
  });

  it('explains a click on the grayed-out top-bar Next with a toast that fades and does not stack', () => {
    vi.useFakeTimers();
    startPracticeSet(root, [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }]);

    topNextBtn(root).click();
    topNextBtn(root).click();

    expect(root.textContent).toContain('Stem for right1'); // didn't advance
    expect(visibleToast(root).textContent).toBe('Answer this question to move on');
    expect(root.querySelectorAll('[role="status"]')).toHaveLength(1);

    vi.advanceTimersByTime(5000);
    expect(visibleToast(root)).toBeNull();
  });

  it('grays out the top-bar Next on the summary, with no toast on click', () => {
    startPracticeSet(root, [{ id: 'q1', data: Q1 }]);
    answerCorrectly();
    nextBtn(root).click();

    expect(topNextBtn(root).getAttribute('aria-disabled')).toBe('true');
    topNextBtn(root).click();

    expect(root.textContent).toContain("You're done!");
    expect(visibleToast(root)).toBeNull();
  });
});

function summaryRows(root) {
  return Object.fromEntries([...root.querySelectorAll('.practice-summary-table tr')]
    .map((tr) => [tr.querySelector('th').textContent, tr.querySelector('td').textContent]));
}

describe('startPracticeSet (Saved Progress)', () => {
  let root;
  const Q3 = question('right3', [{ text: 'right3' }, { text: 'wrong3' }]);
  const SET = [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }, { id: 'q3', data: Q3 }];

  beforeEach(() => {
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  // Stands in for a page refresh: a brand-new controller on the same store.
  function remount(questions, store) {
    root.remove();
    root = document.createElement('div');
    document.body.appendChild(root);
    startPracticeSet(root, questions, store);
  }

  function answerCorrectly() {
    radios(root)[0].click();
    submitBtn(root).click();
  }

  it('resumes on the Frontier after a refresh', () => {
    const store = createInMemorySavedProgressStore();
    startPracticeSet(root, SET, store);
    answerCorrectly();
    nextBtn(root).onclick();

    remount(SET, store);

    expect(root.textContent).toContain('Stem for right2');
    expect(backBtn(root).disabled).toBe(false);
  });

  it('resumes on the summary when every Question was finished', () => {
    const store = createInMemorySavedProgressStore();
    startPracticeSet(root, SET, store);
    answerCorrectly();
    nextBtn(root).onclick();
    answerCorrectly();
    nextBtn(root).onclick();
    answerCorrectly();

    remount(SET, store);

    expect(root.textContent).toContain("You're done!");
    expect(root.querySelector('.practice-grade-letter').textContent).toBe('A');
    expect(backBtn(root).disabled).toBe(false);
  });

  it('keeps a half-done Question across a refresh: the used Attempt and the wrong pick\'s Explanation', () => {
    const store = createInMemorySavedProgressStore();
    startPracticeSet(root, SET, store);
    radios(root)[1].click(); // wrong1
    submitBtn(root).click();

    remount(SET, store);

    expect(root.textContent).toContain('Stem for right1');
    expect(root.textContent).toContain('Explanation for wrong1');
    expect(radios(root)[1].checked).toBe(true);
    // The first Attempt is spent: one more wrong pick ends it as Missed.
    radios(root)[1].click();
    submitBtn(root).click();
    expect(radios(root).every((r) => r.disabled)).toBe(true);
    nextBtn(root).onclick();
    answerCorrectly();
    nextBtn(root).onclick();
    answerCorrectly();
    nextBtn(root).onclick();
    const rows = summaryRows(root);
    expect(rows['Missed']).toBe('1 of 3');
  });

  it('keeps an unsubmitted pick across a refresh', () => {
    const store = createInMemorySavedProgressStore();
    startPracticeSet(root, SET, store);
    radios(root)[1].click();

    remount(SET, store);

    expect(radios(root)[1].checked).toBe(true);
    expect(submitBtn(root).disabled).toBe(false);
    expect(root.textContent).not.toContain('Explanation for wrong1');
  });

  it('shows Reset answers & start over only on the summary, and it wipes everything and starts at Question 1', () => {
    const store = createInMemorySavedProgressStore();
    startPracticeSet(root, SET, store);
    const resetButton = () => [...root.querySelectorAll('button')].find((b) => b.textContent === 'Reset answers & start over');
    answerCorrectly();
    expect(resetButton()).toBeUndefined();
    nextBtn(root).onclick();
    answerCorrectly();
    nextBtn(root).onclick();
    answerCorrectly();
    nextBtn(root).onclick();

    resetButton().click();

    expect(root.textContent).toContain('Stem for right1');
    expect(radios(root).some((r) => r.checked || r.disabled)).toBe(false);
    expect(backBtn(root).disabled).toBe(true);
    expect(nextBtn(root).hidden).toBe(true);
    remount(SET, store);
    expect(root.textContent).toContain('Stem for right1');
    expect(radios(root).some((r) => r.checked)).toBe(false);
  });

  it('ignores answers to Questions removed from the set in the Frontier and summary', () => {
    const store = createInMemorySavedProgressStore();
    startPracticeSet(root, SET, store);
    answerCorrectly(); // q1 first try
    nextBtn(root).onclick();
    radios(root)[1].click(); // q2 missed
    submitBtn(root).click();
    radios(root)[1].click();
    submitBtn(root).click();

    remount([SET[0], SET[2]], store); // q2 removed

    expect(root.textContent).toContain('Stem for right3');
    answerCorrectly();
    nextBtn(root).onclick();
    const rows = summaryRows(root);
    expect(rows['Correct on first try']).toBe('2 of 2');
    expect(rows['Missed']).toBe('0 of 2');
  });

  it('moves the Frontier back to a Question added before it', () => {
    const store = createInMemorySavedProgressStore();
    startPracticeSet(root, [SET[0], SET[2]], store);
    answerCorrectly();
    nextBtn(root).onclick();
    answerCorrectly(); // finished: would resume on the summary

    remount(SET, store); // q2 inserted in the middle

    expect(root.textContent).toContain('Stem for right2');
    expect(nextBtn(root).hidden).toBe(true);
  });

  it('keeps answers with their Questions when the set is reordered', () => {
    const store = createInMemorySavedProgressStore();
    startPracticeSet(root, SET, store);
    answerCorrectly(); // q1 only

    remount([SET[1], SET[0], SET[2]], store);

    expect(root.textContent).toContain('Stem for right2'); // q2 now first and unfinished
    expect(backBtn(root).disabled).toBe(true);
    answerCorrectly();
    nextBtn(root).onclick();
    expect(root.textContent).toContain('Stem for right1');
    expect(root.textContent).toContain('Explanation for right1'); // still finished
    expect(nextBtn(root).hidden).toBe(false);
  });

  it('drops a Question whose data no longer exists from the order', () => {
    const store = createInMemorySavedProgressStore();
    startPracticeSet(root, [SET[0], { id: 'gone', data: null }], store);
    answerCorrectly();

    expect(nextBtn(root).textContent).toContain('See results');
  });
});

describe('startPracticeSet (question numbers and Running Score)', () => {
  let root;
  const Q3 = question('right3', [{ text: 'right3' }, { text: 'wrong3' }]);
  const SET = [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }, { id: 'q3', data: Q3 }];

  beforeEach(() => {
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  function remount(questions, store) {
    root.remove();
    root = document.createElement('div');
    document.body.appendChild(root);
    startPracticeSet(root, questions, store);
  }

  function answer(optionIndex) {
    radios(root)[optionIndex].click();
    submitBtn(root).click();
  }

  const questionNumber = () => root.querySelector('.practice-question-number');
  const runningScore = () => root.querySelector('.practice-running-score').textContent;

  it('shows Question 1 of M on first load', () => {
    startPracticeSet(root, SET);

    expect(questionNumber().textContent).toBe('Question 1 of 3');
  });

  it('follows the viewed Question after Next and Back, not the Frontier', () => {
    startPracticeSet(root, SET);
    answer(0);
    nextBtn(root).click();
    expect(questionNumber().textContent).toBe('Question 2 of 3');

    backBtn(root).click();
    expect(questionNumber().textContent).toBe('Question 1 of 3');
  });

  it('shows the resumed Question\'s number after a refresh', () => {
    const store = createInMemorySavedProgressStore();
    startPracticeSet(root, SET, store);
    answer(0);

    remount(SET, store);

    expect(questionNumber().textContent).toBe('Question 2 of 3');
  });

  it('counts only Questions still in the set', () => {
    startPracticeSet(root, [...SET, { id: 'gone', data: null }]);

    expect(questionNumber().textContent).toBe('Question 1 of 3');
  });

  it('shows no question number on the summary', () => {
    startPracticeSet(root, SET);
    for (let i = 0; i < SET.length; i += 1) {
      answer(0);
      nextBtn(root).click();
    }

    expect(root.textContent).toContain("You're done!");
    expect(questionNumber().textContent).toBe('');
    expect(root.textContent).not.toContain('Question 3 of 3');
  });

  it('reads - / - before any Question is finished', () => {
    startPracticeSet(root, SET);

    expect(runningScore()).toBe('- / -');
  });

  it('counts only first-try correct, the moment each Question is finished', () => {
    startPracticeSet(root, SET);

    answer(0); // first-try correct
    expect(runningScore()).toBe('1 / 1 first try · 100%');

    nextBtn(root).click();
    answer(1); // wrong once: not finished, so not counted yet
    expect(runningScore()).toBe('1 / 1 first try · 100%');
    answer(0); // second-try correct
    expect(runningScore()).toBe('1 / 2 first try · 50%');

    nextBtn(root).click();
    answer(1);
    answer(1); // missed
    // 1/3 = 33.3%: floored, like the summary, so it never overstates.
    expect(runningScore()).toBe('1 / 3 first try · 33%');
  });

  it('floors the percentage rather than rounding it up', () => {
    startPracticeSet(root, SET);
    answer(0);
    nextBtn(root).click();
    answer(0);
    nextBtn(root).click();
    answer(1);
    answer(0);

    // 2/3 = 66.7%: rounding would claim 67%.
    expect(runningScore()).toBe('2 / 3 first try · 66%');
  });

  it('is correct straight after resuming from Saved Progress', () => {
    const store = createInMemorySavedProgressStore();
    startPracticeSet(root, SET, store);
    answer(0);
    nextBtn(root).click();
    answer(1);
    answer(0);

    remount(SET, store);

    expect(runningScore()).toBe('1 / 2 first try · 50%');
  });

  it('ignores saved answers for Questions removed from the set', () => {
    const store = createInMemorySavedProgressStore();
    startPracticeSet(root, SET, store);
    answer(1);
    answer(1); // q1 missed
    nextBtn(root).click();
    answer(0); // q2 first-try correct

    remount([SET[1], SET[2]], store);

    expect(runningScore()).toBe('1 / 1 first try · 100%');
    expect(questionNumber().textContent).toBe('Question 2 of 2');
  });

  it('goes back to - / - after a reset', () => {
    startPracticeSet(root, SET);
    for (let i = 0; i < SET.length; i += 1) {
      answer(0);
      nextBtn(root).click();
    }

    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Reset answers & start over').click();

    expect(runningScore()).toBe('- / -');
    expect(questionNumber().textContent).toBe('Question 1 of 3');
  });

  it('updates for an answer made in another tab on a Question this tab isn\'t viewing', () => {
    const storeA = createInMemorySavedProgressStore();
    startPracticeSet(root, SET, storeA);
    answer(0);
    nextBtn(root).click();
    backBtn(root).click(); // reviewing Question 1

    const otherTab = document.createElement('div');
    document.body.appendChild(otherTab);
    startPracticeSet(otherTab, SET, createInMemorySavedProgressStore({ sharedWith: storeA }));
    radios(otherTab)[0].click();
    submitBtn(otherTab).click(); // other tab finishes Question 2

    expect(questionNumber().textContent).toBe('Question 1 of 3');
    expect(runningScore()).toBe('2 / 2 first try · 100%');
  });
});

describe('startPracticeSet (tab sync)', () => {
  const Q3 = question('right3', [{ text: 'right3' }, { text: 'wrong3' }]);
  const SET = [{ id: 'q1', data: Q1 }, { id: 'q2', data: Q2 }, { id: 'q3', data: Q3 }];
  let tabA;
  let tabB;

  // Two tabs of one Practice Set: two controllers whose stores share one
  // record, each hearing only the other's changes.
  beforeEach(() => {
    document.body.innerHTML = '';
    tabA = document.createElement('div');
    tabB = document.createElement('div');
    document.body.append(tabA, tabB);
    const storeA = createInMemorySavedProgressStore();
    startPracticeSet(tabA, SET, storeA);
    startPracticeSet(tabB, SET, createInMemorySavedProgressStore({ sharedWith: storeA }));
  });

  function answer(tab, optionIndex) {
    radios(tab)[optionIndex].click();
    submitBtn(tab).click();
  }

  it('shows an answer made in one tab on the same Question in the other', () => {
    answer(tabA, 0);

    expect(tabB.textContent).toContain('Explanation for right1');
    expect(radios(tabB).every((r) => r.disabled)).toBe(true);
    expect(nextBtn(tabB).hidden).toBe(false);
  });

  it('celebrates only in the tab that answered', () => {
    mockCelebrate.mockClear();
    mockPlayCorrectSound.mockClear();

    answer(tabA, 0);

    expect(mockCelebrate).toHaveBeenCalledTimes(1);
    expect(mockPlayCorrectSound).toHaveBeenCalledTimes(1);
  });

  it('keeps each tab on the Question it was viewing, while the Frontier advances in both', () => {
    answer(tabA, 0);
    nextBtn(tabA).click();
    answer(tabA, 0); // tab A finishes Question 2; tab B still on Question 1

    expect(tabB.textContent).toContain('Stem for right1');
    nextBtn(tabB).click();
    expect(tabB.textContent).toContain('Explanation for right2');
    expect(nextBtn(tabB).hidden).toBe(false); // Question 3 is now reachable
    expect(tabA.textContent).toContain('Stem for right2');
  });

  it('does not redraw a tab for its own answer, so its celebration stays on screen', () => {
    mockCelebrate.mockClear();

    answer(tabA, 1); // wrong first, then right: two saves from tab A
    answer(tabA, 0);

    expect(tabA.contains(mockCelebrate.mock.calls[0][0])).toBe(true);
    expect(tabB.textContent).toContain('Explanation for right1');
  });

  it('a reset in one tab sends the other back to Question 1 with nothing answered', () => {
    for (let i = 0; i < SET.length; i += 1) {
      answer(tabA, 0);
      nextBtn(tabA).click();
    }
    nextBtn(tabB).click(); // tab B reviewing Question 2
    expect(tabB.textContent).toContain('Stem for right2');

    [...tabA.querySelectorAll('button')].find((b) => b.textContent === 'Reset answers & start over').click();

    expect(tabB.textContent).toContain('Stem for right1');
    expect(radios(tabB).some((r) => r.checked || r.disabled)).toBe(false);
    expect(backBtn(tabB).disabled).toBe(true);
    expect(nextBtn(tabB).hidden).toBe(true);
  });
});

describe('initializePage', () => {
  // Fake database behind the REST API: routes each fetch by its path
  // (e.g. "practiceSets/ps1"), whichever host it targets. Absent paths
  // read as null, as the real REST API does.
  let db;
  let fetchMock;
  const pathOf = (url) => decodeURIComponent(new URL(url).pathname.replace(/^\//, '').replace(/\.json$/, ''));
  function fakeDatabase(data) {
    db = data;
    fetchMock = vi.fn(async (url) => ({ ok: true, json: async () => db[pathOf(url)] ?? null }));
    vi.stubGlobal('fetch', fetchMock);
  }
  const fetchedPaths = () => fetchMock.mock.calls.map(([url]) => pathOf(url));

  function servedShell(practiceSetId) {
    document.body.innerHTML = '<h1 id="practiceSetTitle"></h1><div id="content"></div>';
    if (practiceSetId) document.body.dataset.practiceSetId = practiceSetId;
    else delete document.body.dataset.practiceSetId;
  }

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    servedShell();
  });

  beforeEach(() => {
    localStorage.clear();
    servedShell();
  });

  it('reads the embedded Practice Set id, then every Question, and renders the first one', async () => {
    window.history.pushState(null, '', '/practice/unit-3-review');
    servedShell('ps1');
    fakeDatabase({
      'practiceSets/ps1': { title: 'Unit 3 Review', questionIds: ['q1', 'q2'] },
      'questions/q1': Q1,
      'questions/q2': Q2,
    });

    await initializePage();

    expect(fetchedPaths()).toEqual(['practiceSets/ps1', 'questions/q1', 'questions/q2']);
    expect(document.getElementById('practiceSetTitle').textContent).toBe('Unit 3 Review');
    expect(document.getElementById('content').textContent).toContain('Stem for right1');
  });

  // Every element's tag + classes in document order, to compare layouts.
  const layoutOf = (el) => [...el.querySelectorAll('*')].map((node) => `${node.tagName}.${node.className}`);

  it('draws the frame before any read answers, laid out like the loaded top bar', async () => {
    window.history.pushState(null, '', '/practice/unit-3-review');
    servedShell('ps1');
    fakeDatabase({
      'practiceSets/ps1': { title: 'Unit 3 Review', questionIds: ['q1'] },
      'questions/q1': Q1,
    });
    const base = fetchMock.getMockImplementation();
    let answer;
    const gate = new Promise((resolve) => { answer = resolve; });
    fetchMock.mockImplementation(async (url) => { await gate; return base(url); });

    const loading = initializePage();
    const content = document.getElementById('content');

    expect(content.textContent).toContain('Question - of -');
    expect(content.textContent).toContain('- / -');
    expect(backBtn(content).disabled).toBe(true);
    expect(content.querySelector('.practice-question-area')).not.toBeNull();
    const frameNavLayout = layoutOf(content.querySelector('.practice-nav-bar'));

    answer();
    await loading;

    expect(content.textContent).toContain('Stem for right1');
    expect(layoutOf(content.querySelector('.practice-nav-bar'))).toEqual(frameNavLayout);
    expect(content.querySelector('.practice-question-area')).not.toBeNull();
  });

  function gatedDatabase(data) {
    fakeDatabase(data);
    const base = fetchMock.getMockImplementation();
    let answer;
    const gate = new Promise((resolve) => { answer = resolve; });
    fetchMock.mockImplementation(async (url) => { await gate; return base(url); });
    return answer;
  }
  const pulsing = () => document.querySelector('#content .practice-question-area')
    .classList.contains('practice-question-area-loading');

  it('pulses the question area only once loading runs past about a second, and stops on render', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    window.history.pushState(null, '', '/practice/unit-3-review');
    servedShell('ps1');
    const answer = gatedDatabase({ 'practiceSets/ps1': { title: 'T', questionIds: ['q1'] }, 'questions/q1': Q1 });

    const loading = initializePage();
    vi.advanceTimersByTime(900);
    expect(pulsing()).toBe(false);
    vi.advanceTimersByTime(200);
    expect(pulsing()).toBe(true);

    answer();
    await loading;

    expect(document.getElementById('content').textContent).toContain('Stem for right1');
    expect(pulsing()).toBe(false);
  });

  it('never pulses when loading finishes within a second', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    window.history.pushState(null, '', '/practice/unit-3-review');
    servedShell('ps1');
    fakeDatabase({ 'practiceSets/ps1': { title: 'T', questionIds: ['q1'] }, 'questions/q1': Q1 });

    await initializePage();
    vi.advanceTimersByTime(2000);

    expect(pulsing()).toBe(false);
  });

  it('stops the pulse when the message replaces the frame', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    window.history.pushState(null, '', '/practice/empty');
    servedShell('ps1');
    const answer = gatedDatabase({ 'practiceSets/ps1': { title: 'Empty', questionIds: [] } });

    const loading = initializePage();
    vi.advanceTimersByTime(1100);
    answer();
    await loading;

    expect(document.getElementById('content').textContent).toBe('This practice set has no questions yet.');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('names the tab after the live Practice Set title', async () => {
    document.title = 'Old Title From The Cached Shell';
    window.history.pushState(null, '', '/practice/unit-3-review');
    servedShell('ps1');
    fakeDatabase({ 'practiceSets/ps1': { title: 'Unit 3 Review (renamed)', questionIds: ['q1'] }, 'questions/q1': Q1 });

    await initializePage();

    expect(document.title).toBe('Unit 3 Review (renamed)');
  });

  it('opens a returning student straight on their Frontier, never showing Question 1 first', async () => {
    window.history.pushState(null, '', '/practice/unit-3-review');
    fakeDatabase({
      'practiceSets/ps1': { title: 'T', questionIds: ['q1', 'q2'] },
      'questions/q1': Q1,
      'questions/q2': Q2,
    });
    servedShell('ps1');
    await initializePage();
    radios(document.getElementById('content'))[0].click();
    submitBtn(document.getElementById('content')).click();

    servedShell('ps1');
    const content = document.getElementById('content');
    const seen = [];
    const observer = new MutationObserver(() => seen.push(content.textContent));
    observer.observe(content, { childList: true, subtree: true, characterData: true });
    await initializePage();
    observer.disconnect();

    expect(content.textContent).toContain('Stem for right2');
    expect(seen.some((text) => text.includes('Stem for right1'))).toBe(false);
  });

  it('requests every Question at once, without waiting for any of them', async () => {
    window.history.pushState(null, '', '/practice/unit-3-review');
    servedShell('ps1');
    fakeDatabase({ 'practiceSets/ps1': { title: 'T', questionIds: ['q1', 'q2', 'q3'] } });
    const base = fetchMock.getMockImplementation();
    const neverAnswers = new Promise(() => {});
    fetchMock.mockImplementation((url) => (pathOf(url).startsWith('questions/') ? neverAnswers : base(url)));

    initializePage();
    await vi.waitFor(() => expect(fetchedPaths()).toHaveLength(4));

    expect(fetchedPaths()).toEqual(['practiceSets/ps1', 'questions/q1', 'questions/q2', 'questions/q3']);
  });

  it('resolves the ?slug= Slug first on the local dev page, then reads the same way', async () => {
    window.history.pushState(null, '', '/practice-set-view.html?slug=unit-3-review');
    fakeDatabase({
      'practiceSetSlugIndex/unit-3-review': 'ps1',
      'practiceSets/ps1': { title: 'Unit 3 Review', questionIds: ['q1', 'q2'] },
      'questions/q1': Q1,
      'questions/q2': Q2,
    });

    await initializePage();

    expect(fetchedPaths()).toEqual(['practiceSetSlugIndex/unit-3-review', 'practiceSets/ps1', 'questions/q1', 'questions/q2']);
    expect(document.getElementById('content').textContent).toContain('Stem for right1');
  });

  it('saves progress in the browser, so reloading the page resumes on the Frontier', async () => {
    window.history.pushState(null, '', '/practice/unit-3-review');
    fakeDatabase({
      'practiceSets/ps1': { title: 'Unit 3 Review', questionIds: ['q1', 'q2'] },
      'questions/q1': Q1,
      'questions/q2': Q2,
    });
    servedShell('ps1');
    await initializePage();
    const content = document.getElementById('content');
    radios(content)[0].click();
    submitBtn(content).click();

    servedShell('ps1');
    await initializePage();

    expect(document.getElementById('content').textContent).toContain('Stem for right2');
  });

  it('skips a referenced question that no longer exists', async () => {
    window.history.pushState(null, '', '/practice/unit-3-review');
    servedShell('ps1');
    fakeDatabase({ 'practiceSets/ps1': { title: 'T', questionIds: ['deleted-id', 'q1'] }, 'questions/q1': Q1 });

    await initializePage();

    expect(document.getElementById('content').textContent).toContain('Stem for right1');
    expect(document.getElementById('content').textContent).toContain('Question 1 of 1');
  });

  it('shows a message when the practice set has no questions', async () => {
    window.history.pushState(null, '', '/practice/empty');
    servedShell('ps1');
    fakeDatabase({ 'practiceSets/ps1': { title: 'Empty', questionIds: [] } });

    await initializePage();

    expect(document.getElementById('content').textContent).toBe('This practice set has no questions yet.');
  });

  it('treats an embedded id whose Practice Set is gone as an empty set, keeping the tab title', async () => {
    document.title = 'Shell Title';
    window.history.pushState(null, '', '/practice/gone');
    servedShell('ps-deleted');
    fakeDatabase({});

    await initializePage();

    expect(document.getElementById('content').textContent).toBe('This practice set has no questions yet.');
    expect(document.title).toBe('Shell Title');
  });

  it('shows "Practice set not found" when the ?slug= Slug does not resolve', async () => {
    window.history.pushState(null, '', '/practice-set-view.html?slug=missing');
    fakeDatabase({});

    await initializePage();

    expect(fetchedPaths()).toEqual(['practiceSetSlugIndex/missing']);
    expect(document.getElementById('content').textContent).toBe(PRACTICE_SET_NOT_FOUND);
  });

  it('shows "Practice set not found" without reading anything when the page names no Practice Set', async () => {
    window.history.pushState(null, '', '/practice/');
    fakeDatabase({});

    await initializePage();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.getElementById('content').textContent).toBe(PRACTICE_SET_NOT_FOUND);
  });
});
