// Student-facing Practice Set delivery. Mirrors page-view.js's resolve ->
// fetch -> render shape for /practice/<slug>, but owns a real interaction
// state machine on top: the Frontier navigation controller (see CONTEXT.md's
// Frontier entry) and the end-of-set summary (with an expected test grade).
// Per-Question state is kept as Saved Progress in browser storage
// (saved-progress.js), never in the database (docs/adr/0012); the Frontier
// is derived from it on demand.
import { readPath } from './database-rest.js';
import { renderQuestionWidget } from './question-widget.js';
import { PRACTICE_SET_NOT_FOUND } from './constants.js';
import {
  createInMemorySavedProgressStore,
  createLocalStorageSavedProgressStore
} from './saved-progress.js';
import { createToast } from './toast.js';

const CANT_ADVANCE_MESSAGE = 'Answer this question to move on';
const NO_QUESTIONS_MESSAGE = 'This practice set has no questions yet.';

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

// letterGradeFor compares the unrounded percent (see its doc comment), so
// rounding to the nearest percent can display e.g. "70%" next to a D badge
// for a 69.565% score. Floor instead: a shown first-try number then never
// implies a bracket the raw score didn't actually reach.
const floorPercent = (p) => `${Math.floor(p)}%`;

// The Running Score (see CONTEXT.md): First-Try Correct out of the
// Questions finished so far, from the same outcome counts as the summary.
function formatRunningScore(outcomeCounts) {
  const finished = outcomeCounts.firstTry + outcomeCounts.secondTry + outcomeCounts.missed;
  if (finished === 0) return '- / -';
  return `${outcomeCounts.firstTry} / ${finished} first try · ${floorPercent((outcomeCounts.firstTry / finished) * 100)}`;
}

function renderSummary(containerEl, perQuestionState, onReset) {
  const tally = tallyOutcomes(perQuestionState);
  const stats = summarizeOutcomes(tally);
  const fmt = (p) => `${Math.round(p)}%`;
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
  gradeNote.textContent = `Based on your first-try accuracy (${floorPercent(stats.firstTryPercent)}), since a test only gives you one try.`;
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

  // Only offered here, never mid-set, so unfinished work can't be wiped by
  // accident. No confirm: the label already says the answers go.
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'schedule-action-btn practice-reset-btn';
  resetBtn.textContent = 'Reset answers & start over';
  resetBtn.onclick = onReset;
  containerEl.appendChild(resetBtn);
}

// The Order step: this student's ordered Questions. Today that's the
// Practice Set's current order with Questions that no longer exist dropped;
// a shuffled order would be generated once and kept in Saved Progress.
function orderQuestions(questions, _progress) {
  return questions.filter((question) => question.data);
}

// The Frontier (see CONTEXT.md): the first Question in this student's order
// not finished in Saved Progress, or ordered.length once all are (the
// summary). Derived on demand, never stored, so answers saved for Questions
// since removed from the set can't move it.
function frontierIndexOf(ordered, progress) {
  const index = ordered.findIndex((question) => !progress.questions[question.id]?.finished);
  return index === -1 ? ordered.length : index;
}

// The Navigable step: which indexes (ordered.length being the summary) a
// student may view. Today, locked order: everything up to and including the
// Frontier. Skip-ahead would swap this rule.
function isNavigable(ordered, progress, index) {
  return index >= 0 && index <= frontierIndexOf(ordered, progress);
}

// Saved Question states hold only primitives, so their JSON is a faithful
// comparison (both sides come from the same store, so key order matches).
function sameState(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// The page frame: the top bar (Back, the top-bar Next, Question N of M,
// the Running Score, the keyboard hint), the question area and the toast,
// in their loading state, plus the (not yet mounted) green Next. initializePage draws it before any
// read and startPracticeSet redraws the same layout, so nothing shifts when
// the data arrives.
function drawFrame(rootEl) {
  const navBar = document.createElement('div');
  navBar.className = 'practice-nav-bar';
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'schedule-action-btn';
  backBtn.textContent = '← Back';
  // Styled like Back so the green Next below stays the main action. Grayed
  // out via aria-disabled rather than `disabled`, so a click while it can't
  // advance still arrives and can explain itself with a toast.
  const topNextBtn = document.createElement('button');
  topNextBtn.type = 'button';
  topNextBtn.className = 'schedule-action-btn practice-top-next-btn';
  // Grouped so the status group wraps below the buttons as one unit on
  // narrow screens.
  const navButtons = document.createElement('div');
  navButtons.className = 'practice-nav-buttons';
  navButtons.append(backBtn, topNextBtn);
  navBar.appendChild(navButtons);

  const status = document.createElement('div');
  status.className = 'practice-status';
  const questionNumber = document.createElement('span');
  questionNumber.className = 'practice-question-number';
  const runningScore = document.createElement('span');
  runningScore.className = 'practice-running-score';
  status.append(questionNumber, runningScore);
  navBar.appendChild(status);

  // Subtle reminder that the whole Practice Set - choosing an option,
  // submitting, and advancing - is doable without a mouse.
  const keyboardHint = document.createElement('div');
  keyboardHint.className = 'practice-keyboard-hint';
  keyboardHint.textContent = '↑↓ to choose · Enter to continue';
  navBar.appendChild(keyboardHint);

  // At its usual height even while empty (style.css), so nothing below it
  // moves when the first Question or the summary fills it in.
  const questionContainer = document.createElement('div');
  questionContainer.className = 'practice-question-area';

  // The green Next: the widget mounts it in Submit's exact slot once the
  // Question is finished (passed as nextButton), so it's on screen only once
  // moving forward is actually allowed: the next index is navigable and
  // there's somewhere to go (never on the summary).
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'primary-action-btn practice-next-btn';

  const toast = createToast('practice-toast');

  rootEl.innerHTML = '';
  rootEl.appendChild(navBar);
  rootEl.appendChild(questionContainer);
  rootEl.appendChild(toast.element);

  backBtn.disabled = true;
  topNextBtn.textContent = 'Next →';
  topNextBtn.setAttribute('aria-disabled', 'true');
  questionNumber.textContent = 'Question - of -';
  runningScore.textContent = formatRunningScore({ firstTry: 0, secondTry: 0, missed: 0 });
  nextBtn.hidden = true;

  return { backBtn, topNextBtn, questionNumber, runningScore, questionContainer, nextBtn, toast };
}

/**
 * Drive the Frontier navigation controller for one Practice Set.
 * @param {HTMLElement} rootEl - mounts its own nav bar + question container into this
 * @param {Array<{id: string, data: object}>} questions - in Practice Set order
 * @param {import('./saved-progress.js').SavedProgressStore} [store] - this
 * Practice Set's Saved Progress; defaults to in-memory (nothing survives a refresh)
 */
export function startPracticeSet(rootEl, questions, store = createInMemorySavedProgressStore()) {
  let progress = store.load();
  const ordered = orderQuestions(questions, progress);
  // Nothing to practice: no Questions, or none that still exist.
  if (ordered.length === 0) {
    rootEl.textContent = NO_QUESTIONS_MESSAGE;
    return;
  }
  let viewingIndex = 0;
  let currentWidget = null;

  // Each ordered Question's saved state (null if untouched), for the
  // Running Score and the summary.
  const orderedStates = () => ordered.map((question) => progress.questions[question.id] || null);

  const {
    backBtn, topNextBtn, questionNumber, runningScore, questionContainer, nextBtn, toast,
  } = drawFrame(rootEl);

  // Whether the viewed screen can move forward, from the Navigable step;
  // there's nowhere further from the summary.
  function canAdvance() {
    return viewingIndex < ordered.length && isNavigable(ordered, progress, viewingIndex + 1);
  }

  function updateNavControls() {
    // The viewed Question, counted in this student's order; blank on the
    // summary, where there's no current Question.
    questionNumber.textContent = viewingIndex < ordered.length
      ? `Question ${viewingIndex + 1} of ${ordered.length}`
      : '';
    runningScore.textContent = formatRunningScore(tallyOutcomes(orderedStates()));
    backBtn.disabled = !isNavigable(ordered, progress, viewingIndex - 1);
    const advancing = canAdvance();
    const onLastQuestion = viewingIndex === ordered.length - 1;
    topNextBtn.textContent = onLastQuestion ? 'Results →' : 'Next →';
    topNextBtn.setAttribute('aria-disabled', String(!advancing));
    nextBtn.hidden = !advancing;
    nextBtn.textContent = '';
    nextBtn.append(onLastQuestion ? 'See results ' : 'Next ');
    // Matches Submit's own "Enter ↵" key-hint pill (question-widget.js), so
    // the two primary-action buttons read as one consistent control.
    const hint = document.createElement('kbd');
    hint.className = 'key-hint';
    hint.textContent = 'Enter ↵';
    nextBtn.appendChild(hint);
    nextBtn.title = 'Shortcut: Enter';
  }

  function resetAndStartOver() {
    store.clear();
    progress = store.load();
    showQuestion(0);
  }

  // takeFocus is false for a redraw caused by another tab, which restores
  // state silently: the student's focus stays wherever it was.
  function showQuestion(index, { takeFocus = true } = {}) {
    if (currentWidget) {
      currentWidget.destroy();
      currentWidget = null;
    }

    viewingIndex = index;
    updateNavControls();

    if (viewingIndex >= ordered.length) {
      renderSummary(questionContainer, orderedStates(), resetAndStartOver);
      return;
    }

    const { id, data } = ordered[viewingIndex];
    currentWidget = renderQuestionWidget(questionContainer, data, {
      restoreState: progress.questions[id],
      // Keeps a fresh question keyboard-navigable from the moment it
      // appears, so arrow keys work immediately without first clicking an
      // option - the Frontier can be driven end-to-end without a mouse.
      autoFocus: takeFocus,
      // The green Next replaces Submit, in its slot, once finished.
      nextButton: nextBtn,
      // Every pick and submit is saved, not just finishing, so a refresh
      // can't buy a free retry or lose an unsubmitted pick.
      onStateChange: (state) => {
        store.record(id, state);
        progress = store.load();
      },
      onOutcome: () => {
        updateNavControls();
        // Focusing Next makes the same Enter key that submitted the answer
        // also advance on its next press (native button activation).
        if (!nextBtn.hidden) nextBtn.focus({ preventScroll: true });
      },
    });

    // Reviewing an earlier, already-finished question: Next is already
    // showing, so let Enter advance from here too.
    if (takeFocus && !nextBtn.hidden) nextBtn.focus({ preventScroll: true });
  }

  // A change from another tab (the store never echoes this tab's own
  // changes back). Redraws the viewed Question only if its state changed;
  // restoring is silent, so only the tab that acted celebrates.
  store.subscribe((incoming) => {
    const previous = progress;
    progress = incoming;
    // A reset (another tab's clear) is the one change that moves this tab.
    // Neither redraw takes focus: that stays in the tab the student is using.
    const wasReset = Object.keys(incoming.questions).length === 0
      && Object.keys(previous.questions).length > 0;
    if (wasReset) {
      showQuestion(0, { takeFocus: false });
      return;
    }
    const viewed = ordered[viewingIndex];
    if (viewed && !sameState(previous.questions[viewed.id], incoming.questions[viewed.id])) {
      showQuestion(viewingIndex, { takeFocus: false });
    } else {
      // The Running Score (and Next) can change even when the viewed
      // Question didn't.
      updateNavControls();
    }
  });

  backBtn.onclick = () => showQuestion(viewingIndex - 1);
  nextBtn.onclick = () => showQuestion(viewingIndex + 1);
  topNextBtn.onclick = () => {
    if (canAdvance()) showQuestion(viewingIndex + 1);
    else if (viewingIndex < ordered.length) toast.show(CANT_ADVANCE_MESSAGE);
  };

  // Opens on the Frontier: the first unfinished Question, or the summary
  // when every Question is finished.
  showQuestion(frontierIndexOf(ordered, progress));
}

// The Practice Set this URL names, and its id; null when there is none.
// The practiceSetSSR shell embeds the id it resolved (<body
// data-practice-set-id>), but that shell is CDN-cached for a day, so the
// Slug is re-checked in parallel with reading the embedded set: they
// normally agree, costing no extra round trip; if the Slug has since been
// pointed elsewhere (or freed), the Slug wins. With no embedded id - the
// ?slug= dev page, opened directly with no server-side shell (mirrors
// page-view.js) - the Slug is resolved first.
async function readNamedPracticeSet(read) {
  const embeddedId = document.body.dataset.practiceSetId;
  const slug = getSlugFromPath(window.location.pathname)
    || new URLSearchParams(window.location.search).get('slug');
  const slugToId = async () => {
    const id = slug ? await read(['practiceSetSlugIndex', slug]) : null;
    return typeof id === 'string' ? id : null;
  };

  let id = embeddedId;
  let practiceSet = null;
  if (embeddedId && slug) {
    let embeddedSet;
    [id, embeddedSet] = await Promise.all([slugToId(), read(['practiceSets', embeddedId])]);
    if (id === embeddedId) practiceSet = embeddedSet;
  } else if (!embeddedId) {
    id = await slugToId();
  }
  if (!id) return null;
  if (!practiceSet) practiceSet = await read(['practiceSets', id]);
  return practiceSet ? { id, practiceSet } : null;
}

// A load this slow is worth acknowledging; a faster one shouldn't flicker.
const LOADING_PULSE_DELAY_MS = 1000;

export async function initializePage() {
  const contentEl = document.getElementById('content');
  // REST reads, not the Firebase SDK: delivery only reads once, so it skips
  // the SDK download and the live connection.
  const read = (segments) => readPath(segments, { fetch, hostname: window.location.hostname });

  const { questionContainer } = drawFrame(contentEl);
  const pulseTimer = setTimeout(() => {
    questionContainer.classList.add('practice-question-area-loading');
  }, LOADING_PULSE_DELAY_MS);
  try {
    await loadPracticeSet(contentEl, read);
  } finally {
    clearTimeout(pulseTimer);
  }
}

// Reads the Practice Set and its Questions, then renders it (or the
// not-found / empty-set message) in place of the frame.
async function loadPracticeSet(contentEl, read) {
  const named = await readNamedPracticeSet(read);
  // No Slug, a freed Slug, or a set deleted since the Slug index was written.
  if (!named) {
    contentEl.textContent = PRACTICE_SET_NOT_FOUND;
    return;
  }
  const { id: practiceSetId, practiceSet } = named;
  const questionIds = practiceSet.questionIds || [];

  // Fetched up front, in parallel, rather than lazily per-question, so
  // Frontier Back/Forward navigation is instant with no loading flicker -
  // Practice Sets are expected to be small (see the implementation plan).
  // Questions that no longer exist are dropped by the Order step.
  const questionData = await Promise.all(questionIds.map((id) => read(['questions', id])));
  const questions = questionIds.map((id, index) => ({ id, data: questionData[index] }));

  const titleEl = document.getElementById('practiceSetTitle');
  if (titleEl) titleEl.textContent = practiceSet.title || '';
  // The shell's <title> can be a day old (CDN-cached); the tab follows a
  // rename as soon as the student loads.
  if (practiceSet.title) document.title = practiceSet.title;

  startPracticeSet(contentEl, questions, createLocalStorageSavedProgressStore(practiceSetId));
}

if (document.getElementById('content')) {
  initializePage();
}
