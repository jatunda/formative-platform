// Student-facing Practice Set delivery. Mirrors page-view.js's resolve ->
// fetch -> render shape for /practice/<slug>, but owns a real interaction
// state machine on top: the Frontier navigation controller (see CONTEXT.md's
// Frontier entry) and the end-of-set summary (with an expected test grade). Nothing here is persisted to
// the database (docs/adr/0012) - frontierIndex, viewingIndex, and
// perQuestionState all live only in memory for this page load.
import { db } from './firebase-config.js';
import { renderQuestionWidget } from './question-widget.js';
import {
  initializePracticeSetDatabase,
  resolvePracticeSetSlugToId,
  getPracticeSetFromDB
} from './practice-set-database-utils.js';
import { initializeQuestionDatabase, getQuestionFromDB } from './question-database-utils.js';
import { PRACTICE_SET_NOT_FOUND } from './constants.js';

/**
 * Extract the Slug from a /practice/<slug> URL path.
 */
export function getSlugFromPath(pathname) {
  const match = pathname.match(/\/practice\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Tally First-Try Correct / Second-Try Correct / Missed from every
 * finished question's recorded state (see CONTEXT.md's Question Outcome
 * entry). Purely derived, in-memory - never written anywhere.
 */
export function tallyOutcomes(perQuestionState) {
  const tally = { firstTry: 0, secondTry: 0, missed: 0 };
  for (const state of perQuestionState) {
    if (state && state.outcome === 'firstTry') tally.firstTry += 1;
    else if (state && state.outcome === 'secondTry') tally.secondTry += 1;
    else if (state && state.outcome === 'missed') tally.missed += 1;
  }
  return tally;
}

// Expected test grade is estimated from first-try accuracy alone: a real
// test gives one attempt, so second-try recoveries don't count toward it.
// Standard US scale; minimum percent (inclusive) for each letter.
export const GRADE_SCALE = [
  { letter: 'A', min: 90 },
  { letter: 'B', min: 80 },
  { letter: 'C', min: 70 },
  { letter: 'D', min: 60 },
  { letter: 'F', min: 0 },
];

/**
 * Map a 0-100 percentage to a letter grade using GRADE_SCALE. Compares the
 * unrounded value, so 89.6% is a B, not an A.
 */
export function letterGradeFor(percent) {
  const entry = GRADE_SCALE.find((g) => percent >= g.min);
  return entry ? entry.letter : GRADE_SCALE[GRADE_SCALE.length - 1].letter;
}

/**
 * Derive the end-of-set summary stats from a tally (see tallyOutcomes).
 * Every percentage is out of the total number of questions.
 */
export function summarizeOutcomes(tally) {
  const total = tally.firstTry + tally.secondTry + tally.missed;
  const pct = (n) => (total === 0 ? 0 : (n / total) * 100);
  const firstTryPercent = pct(tally.firstTry);
  return {
    total,
    firstTryPercent,
    secondTryPercent: pct(tally.secondTry),
    missedPercent: pct(tally.missed),
    withinTwoTriesPercent: pct(tally.firstTry + tally.secondTry),
    expectedGrade: letterGradeFor(firstTryPercent),
  };
}

function renderSummary(containerEl, perQuestionState) {
  const tally = tallyOutcomes(perQuestionState);
  const stats = summarizeOutcomes(tally);
  const fmt = (p) => `${Math.round(p)}%`;
  // letterGradeFor compares the unrounded percent (see its doc comment), so
  // rounding this one to the nearest percent can display e.g. "70%" next to
  // a D badge for a 69.565% score. Floor instead: the shown number then
  // never implies a bracket the raw score didn't actually reach.
  const fmtForGrade = (p) => `${Math.floor(p)}%`;
  containerEl.innerHTML = '';

  const heading = document.createElement('h2');
  heading.textContent = "You're done!";
  containerEl.appendChild(heading);

  const gradeCard = document.createElement('div');
  gradeCard.className = 'practice-grade-card';
  const gradeLabel = document.createElement('div');
  gradeLabel.className = 'practice-grade-label';
  gradeLabel.textContent = 'Expected test grade';
  const gradeLetter = document.createElement('div');
  gradeLetter.className = `practice-grade-letter practice-grade-${stats.expectedGrade.toLowerCase()}`;
  gradeLetter.textContent = stats.expectedGrade;
  const gradeNote = document.createElement('div');
  gradeNote.className = 'practice-grade-note';
  gradeNote.textContent = `Based on your first-try accuracy (${fmtForGrade(stats.firstTryPercent)}), since a test only gives you one try.`;
  gradeCard.append(gradeLabel, gradeLetter, gradeNote);
  containerEl.appendChild(gradeCard);

  const table = document.createElement('table');
  table.className = 'practice-summary-table';
  const tbody = document.createElement('tbody');
  [
    ['Correct on first try', tally.firstTry, stats.firstTryPercent],
    ['Correct on second try', tally.secondTry, stats.secondTryPercent],
    ['Correct within two tries', tally.firstTry + tally.secondTry, stats.withinTwoTriesPercent],
    ['Missed', tally.missed, stats.missedPercent],
  ].forEach(([label, count, percent]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = label;
    const countTd = document.createElement('td');
    countTd.textContent = `${count} of ${stats.total}`;
    const pctTd = document.createElement('td');
    pctTd.className = 'practice-summary-percent';
    pctTd.textContent = fmt(percent);
    tr.append(th, countTd, pctTd);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  containerEl.appendChild(table);
}

/**
 * Drive the Frontier navigation controller for one Practice Set.
 * @param {HTMLElement} rootEl - mounts its own nav bar + question container into this
 * @param {Array<{id: string, data: object}>} questions - in Practice Set order
 */
export function startPracticeSet(rootEl, questions) {
  let frontierIndex = 0;
  let viewingIndex = 0;
  const perQuestionState = new Array(questions.length).fill(null);
  let currentWidget = null;

  rootEl.innerHTML = '';
  const navBar = document.createElement('div');
  navBar.className = 'practice-nav-bar';
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'schedule-action-btn';
  backBtn.textContent = '← Back';
  navBar.appendChild(backBtn);

  const questionContainer = document.createElement('div');

  // Lives below the question (where Submit was) rather than in the top nav
  // bar, and only exists on screen once moving forward is actually allowed:
  // the viewed question is finished (viewingIndex < frontierIndex) and
  // there's somewhere to go (never on the summary).
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'primary-action-btn practice-next-btn';

  rootEl.appendChild(navBar);
  rootEl.appendChild(questionContainer);
  rootEl.appendChild(nextBtn);

  function updateNavControls() {
    backBtn.disabled = viewingIndex === 0;
    const canAdvance = viewingIndex < questions.length && viewingIndex < frontierIndex;
    nextBtn.hidden = !canAdvance;
    nextBtn.textContent = '';
    nextBtn.append(viewingIndex === questions.length - 1 ? 'See results ' : 'Next ');
    const hint = document.createElement('span');
    hint.className = 'practice-next-btn-hint';
    hint.textContent = '(press enter)';
    nextBtn.appendChild(hint);
    nextBtn.title = 'Shortcut: Enter';
  }

  function showQuestion(index) {
    if (currentWidget) {
      perQuestionState[viewingIndex] = currentWidget.getState();
      currentWidget.destroy();
      currentWidget = null;
    }

    viewingIndex = index;
    updateNavControls();

    if (viewingIndex >= questions.length) {
      renderSummary(questionContainer, perQuestionState);
      return;
    }

    currentWidget = renderQuestionWidget(questionContainer, questions[viewingIndex].data, {
      restoreState: perQuestionState[viewingIndex] || undefined,
      onOutcome: () => {
        perQuestionState[viewingIndex] = currentWidget.getState();
        if (viewingIndex === frontierIndex) {
          frontierIndex += 1;
        }
        updateNavControls();
        // Focusing Next makes the same Enter key that submitted the answer
        // also advance on its next press (native button activation).
        if (!nextBtn.hidden) nextBtn.focus({ preventScroll: true });
      },
    });

    // Reviewing an earlier, already-finished question: Next is already
    // showing, so let Enter advance from here too.
    if (!nextBtn.hidden) nextBtn.focus({ preventScroll: true });
  }

  backBtn.onclick = () => showQuestion(viewingIndex - 1);
  nextBtn.onclick = () => showQuestion(viewingIndex + 1);

  showQuestion(0);
}

export async function initializePage() {
  initializePracticeSetDatabase(db);
  initializeQuestionDatabase(db);

  const contentEl = document.getElementById('content');
  // The production /practice/<slug> path is served by the practiceSetSSR
  // Cloud Function, never by this static file directly - the ?slug=
  // fallback exists so this same practice-set-view.html can be opened
  // directly for local dev/testing, where there's no server-side rewrite to
  // produce a /practice/<slug> path at all (mirrors page-view.js).
  const slug = getSlugFromPath(window.location.pathname)
    || new URLSearchParams(window.location.search).get('slug');

  if (!slug) {
    contentEl.textContent = PRACTICE_SET_NOT_FOUND;
    return;
  }

  const practiceSetId = await resolvePracticeSetSlugToId(slug);
  if (!practiceSetId) {
    contentEl.textContent = PRACTICE_SET_NOT_FOUND;
    return;
  }

  const practiceSet = await getPracticeSetFromDB(practiceSetId);
  const questionIds = (practiceSet && practiceSet.questionIds) || [];

  // Fetched up front, in parallel, rather than lazily per-question, so
  // Frontier Back/Forward navigation is instant with no loading flicker -
  // Practice Sets are expected to be small (see the implementation plan).
  const questionData = await Promise.all(questionIds.map((id) => getQuestionFromDB(id)));
  const questions = questionIds
    .map((id, index) => ({ id, data: questionData[index] }))
    .filter((question) => question.data);

  const titleEl = document.getElementById('practiceSetTitle');
  if (titleEl) titleEl.textContent = practiceSet?.title || '';

  if (questions.length === 0) {
    contentEl.textContent = 'This practice set has no questions yet.';
    return;
  }

  startPracticeSet(contentEl, questions);
}

if (document.getElementById('content')) {
  initializePage();
}
