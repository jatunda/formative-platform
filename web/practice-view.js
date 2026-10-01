// Student-facing Practice Set delivery. Mirrors page-view.js's resolve ->
// fetch -> render shape for /practice/<slug>, but owns a real interaction
// state machine on top: the Frontier navigation controller (see CONTEXT.md's
// Frontier entry) and the end-of-set summary. Nothing here is persisted to
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

function renderSummary(containerEl, perQuestionState) {
  const tally = tallyOutcomes(perQuestionState);
  containerEl.innerHTML = '';

  const heading = document.createElement('h2');
  heading.textContent = "You're done!";
  containerEl.appendChild(heading);

  const list = document.createElement('ul');
  list.className = 'practice-summary-list';
  [
    [`First-try correct`, tally.firstTry],
    [`Second-try correct`, tally.secondTry],
    [`Missed`, tally.missed],
  ].forEach(([label, count]) => {
    const li = document.createElement('li');
    li.textContent = `${label}: ${count}`;
    list.appendChild(li);
  });
  containerEl.appendChild(list);
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
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'schedule-action-btn';
  nextBtn.textContent = 'Next →';
  navBar.appendChild(backBtn);
  navBar.appendChild(nextBtn);

  const questionContainer = document.createElement('div');

  rootEl.appendChild(navBar);
  rootEl.appendChild(questionContainer);

  function updateNavControls() {
    backBtn.disabled = viewingIndex === 0;
    nextBtn.disabled = !(viewingIndex < frontierIndex);
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
      },
    });
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
