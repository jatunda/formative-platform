import { TeacherAuth } from './teacher-auth.js';

// Initialize teacher authentication
window.teacherAuth = new TeacherAuth();

import { db } from './firebase-config.js';
import { parseQuestionDSL, generateQuestionDSLFromParsed } from './question-dsl.js';
import { validateQuestionDSL, getQuestionErrorExplanation } from './question-dsl-validation.js';
import { renderContentItems } from './content-renderer.js';
import { renderTeacherNav } from './teacher-nav.js';
import { showNotification } from './notification-utils.js';
import { withWorkingIndicator } from './ui-components.js';
import { createQuestionDslCheatSheetPanel } from './question-dsl-cheat-sheet.js';
import {
  getQueryParams,
  handleDslInputKeydown,
  updateUnsavedIndicator,
  handleBeforeUnload
} from './editor.js';
import { initializeDatabase, getClasses } from './database-utils.js';
import {
  initializeQuestionDatabase,
  getQuestionFromDB,
  saveQuestion,
  deleteQuestionAndSlugs,
  resolveClassNameToId,
  getAllQuestionSlugs,
  assignQuestionSlug,
  removeQuestionSlug,
  renameQuestionSlug,
  getQuestionBacklinks
} from './question-database-utils.js';

const BLANK_QUESTION_DSL = `Write your question stem here.

+ Correct answer
    Explanation:
- Wrong answer
    Explanation:
    Mistake:

Tags:  | `;

/**
 * Render a static, read-only proofreading view of a Question: stem, every
 * Option (marked right/wrong), every Explanation, and every Mistake
 * category - deliberately not the interactive question-widget.js (a single
 * question in isolation doesn't benefit from click-through testing, and it
 * would force clicking wrong options just to read their explanations).
 */
function renderQuestionPreview(parsed, previewEl) {
  previewEl.innerHTML = '';

  const stemEl = document.createElement('div');
  renderContentItems(parsed.stem, stemEl);
  previewEl.appendChild(stemEl);

  const optionsList = document.createElement('ul');
  optionsList.className = 'question-preview-options';
  for (const option of parsed.options) {
    const li = document.createElement('li');
    li.className = option.correct ? 'question-preview-option-correct' : 'question-preview-option-wrong';

    const label = document.createElement('strong');
    label.textContent = `${option.correct ? '✓ Correct' : '✗ Wrong'}: ${option.text}`;
    li.appendChild(label);

    const explanation = document.createElement('p');
    explanation.textContent = option.explanation ? `Explanation: ${option.explanation}` : 'Explanation: (missing)';
    li.appendChild(explanation);

    if (!option.correct) {
      const mistake = document.createElement('p');
      mistake.textContent = option.mistakeCategory ? `Mistake: ${option.mistakeCategory}` : 'Mistake: (missing)';
      li.appendChild(mistake);
    }

    optionsList.appendChild(li);
  }
  previewEl.appendChild(optionsList);

  const tags = document.createElement('p');
  tags.className = 'question-preview-tags';
  tags.textContent = `Tags: ${parsed.className || '(no class)'} | ${parsed.topic || '(no topic)'}`;
  previewEl.appendChild(tags);
}

function updateQuestionPreview(dslText, previewEl) {
  try {
    const parsed = parseQuestionDSL(dslText);
    const validationError = validateQuestionDSL(dslText, parsed);
    if (validationError) {
      previewEl.innerHTML = getQuestionErrorExplanation(validationError);
    } else {
      renderQuestionPreview(parsed, previewEl);
    }
  } catch (err) {
    previewEl.innerHTML = getQuestionErrorExplanation(err.message || String(err));
  }
}

/**
 * Phrase the backlink count for a confirm dialog, or '' when there are none.
 */
function describeBacklinks(sourcePageIds) {
  if (sourcePageIds.length === 0) return '';
  const count = sourcePageIds.length;
  return `\n\n${count} page${count === 1 ? '' : 's'} currently link${count === 1 ? 's' : ''} to this question and may be affected.`;
}

/**
 * Re-render the list of Question Links (Slugs) currently assigned to this
 * Question. Unlike a Page's Slug list, these aren't directly browsable URLs
 * - they're only ever used as `[[q:slug]]` references - so each is shown as
 * plain text, not a clickable link.
 */
async function refreshSlugList(questionId, slugListEl) {
  const allSlugs = await getAllQuestionSlugs();
  const mySlugs = Object.entries(allSlugs)
    .filter(([, ownerId]) => ownerId === questionId)
    .map(([slug]) => slug)
    .sort();

  slugListEl.innerHTML = '';

  if (mySlugs.length === 0) {
    const li = document.createElement('li');
    li.className = 'slug-empty';
    li.textContent = 'No Question Link assigned yet - this question can\'t be linked to or added to a Practice Set.';
    slugListEl.appendChild(li);
    return;
  }

  mySlugs.forEach(slug => {
    const li = document.createElement('li');

    const code = document.createElement('code');
    code.textContent = `[[q:${slug}]]`;
    li.appendChild(code);

    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rename';
    renameBtn.className = 'schedule-action-btn';
    renameBtn.onclick = withWorkingIndicator(renameBtn, async () => {
      const newSlug = prompt(`Rename "[[q:${slug}]]" to:`, slug);
      if (!newSlug || newSlug.trim().toLowerCase() === slug) return;
      try {
        await renameQuestionSlug(questionId, slug, newSlug.trim().toLowerCase());
        await refreshSlugList(questionId, slugListEl);
        showNotification(`Renamed to "[[q:${newSlug.trim().toLowerCase()}]]" - links to it elsewhere were updated.`, 'success');
      } catch (err) {
        alert(err.message);
      }
    });

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'schedule-action-btn delete-btn';
    removeBtn.onclick = withWorkingIndicator(removeBtn, async () => {
      const backlinks = await getQuestionBacklinks(questionId);
      const confirmed = confirm(`Remove "[[q:${slug}]]"?${describeBacklinks(backlinks)}`);
      if (!confirmed) return;
      await removeQuestionSlug(slug);
      await refreshSlugList(questionId, slugListEl);
    });

    li.appendChild(renameBtn);
    li.appendChild(removeBtn);
    slugListEl.appendChild(li);
  });
}

/**
 * Convert a stored Question's classId back to the human-readable Class name
 * for display in the DSL textarea's Tags line - the DSL always shows names,
 * never raw ids (see resolveClassNameToId's reasoning in question-database-utils.js).
 */
async function classIdToName(classId) {
  if (!classId) return '';
  const classes = await getClasses();
  return classes?.[classId]?.name || '';
}

export async function main() {
  initializeDatabase(db);
  initializeQuestionDatabase(db);
  renderTeacherNav('questions');

  const params = getQueryParams();
  const questionId = params.question;

  if (!questionId) {
    alert('No question selected.');
    window.location.href = 'question-bank-manager.html';
    return;
  }

  const questionIdEl = document.getElementById('questionId');
  const dslInput = document.getElementById('questionDslInput');
  const preview = document.getElementById('preview');
  const saveBtn = document.getElementById('saveBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const slugList = document.getElementById('slugList');
  const newSlugInput = document.getElementById('newSlugInput');
  const addSlugBtn = document.getElementById('addSlugBtn');
  const unsavedIndicator = document.getElementById('unsavedIndicator');
  const cheatSheetContainer = document.getElementById('cheatSheetContainer');

  cheatSheetContainer.appendChild(createQuestionDslCheatSheetPanel());

  let isDirty = false;
  const markDirty = () => {
    isDirty = true;
    updateUnsavedIndicator(unsavedIndicator, isDirty);
  };
  const markClean = () => {
    isDirty = false;
    updateUnsavedIndicator(unsavedIndicator, isDirty);
  };

  window.addEventListener('beforeunload', (event) => handleBeforeUnload(event, isDirty));

  questionIdEl.textContent = questionId;

  dslInput.addEventListener('input', () => {
    markDirty();
    updateQuestionPreview(dslInput.value, preview);
  });
  dslInput.addEventListener('keydown', (event) => handleDslInputKeydown(event, dslInput));

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (!saveBtn.disabled) saveBtn.click();
    }
  });

  addSlugBtn.onclick = withWorkingIndicator(addSlugBtn, async () => {
    const slug = newSlugInput.value.trim().toLowerCase();
    if (!slug) return;
    try {
      await assignQuestionSlug(questionId, slug);
      newSlugInput.value = '';
      await refreshSlugList(questionId, slugList);
      showNotification(`"[[q:${slug}]]" now points to this question.`, 'success');
    } catch (err) {
      alert(err.message);
    }
  });

  saveBtn.onclick = async () => {
    const dslText = dslInput.value;
    const parsed = parseQuestionDSL(dslText);
    const validationError = validateQuestionDSL(dslText, parsed);
    if (validationError) {
      alert(validationError);
      return;
    }

    let classId;
    try {
      classId = await resolveClassNameToId(parsed.className);
    } catch (err) {
      alert(err.message);
      return;
    }

    await saveQuestion(questionId, {
      stem: parsed.stem,
      options: parsed.options,
      classId,
      topic: parsed.topic,
    });
    showNotification(`Question saved successfully at ${new Date().toLocaleString()}`, 'success');
    markClean();
  };

  deleteBtn.onclick = async () => {
    const backlinks = await getQuestionBacklinks(questionId);
    const confirmed = confirm(
      'Are you sure you want to delete this question?\n\n' +
      'This also removes every Question Link pointing to it. This action cannot be undone.' +
      describeBacklinks(backlinks)
    );
    if (!confirmed) return;
    await deleteQuestionAndSlugs(questionId);
    markClean();
    window.location.href = 'question-bank-manager.html';
  };

  const data = await getQuestionFromDB(questionId);
  let dslText;
  if (data && Array.isArray(data.stem)) {
    const className = await classIdToName(data.classId);
    dslText = generateQuestionDSLFromParsed({
      stem: data.stem,
      options: data.options || [],
      className,
      topic: data.topic || '',
    });
  } else {
    dslText = BLANK_QUESTION_DSL;
  }
  dslInput.value = dslText;
  updateQuestionPreview(dslText, preview);
  markClean();

  await refreshSlugList(questionId, slugList);
}

// Only run automatically when actually loaded on question-editor.html -
// importing this module elsewhere (tests) never triggers real auth/Firebase/
// DOM side effects on its own.
if (document.getElementById('questionDslInput')) {
  (async () => {
    const isAuthenticated = await window.teacherAuth.requireAuth();
    if (!isAuthenticated) return;

    window.teacherAuth.setupActivityListeners();
    main();
  })();
}
