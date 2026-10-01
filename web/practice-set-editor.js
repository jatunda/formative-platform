import { TeacherAuth } from './teacher-auth.js';

// Initialize teacher authentication
window.teacherAuth = new TeacherAuth();

import { db } from './firebase-config.js';
import { renderTeacherNav } from './teacher-nav.js';
import { showNotification } from './notification-utils.js';
import { withWorkingIndicator } from './ui-components.js';
import { showQuestionPicker } from './question-picker.js';
import { deriveQuestionLabel } from './question-label.js';
import {
  getQueryParams,
  updateUnsavedIndicator,
  handleBeforeUnload
} from './editor.js';
import { initializeDatabase } from './database-utils.js';
import { initializeQuestionDatabase, getAllQuestions } from './question-database-utils.js';
import {
  initializePracticeSetDatabase,
  getPracticeSetFromDB,
  savePracticeSet,
  deletePracticeSetAndSlugs,
  getAllPracticeSetSlugs,
  assignPracticeSetSlug,
  removePracticeSetSlug,
  renamePracticeSetSlug
} from './practice-set-database-utils.js';
import { DEFAULT_PRACTICE_SET_TITLE } from './constants.js';

/**
 * Re-render the ordered Question list: each row shows its derived label plus
 * Up/Down/Remove controls. questionIds is mutated in place by the control
 * handlers, then this is called again to reflect the new order.
 */
function renderQuestionList(listEl, questionIds, questionsById, { onChange }) {
  listEl.innerHTML = '';

  if (questionIds.length === 0) {
    const li = document.createElement('li');
    li.className = 'slug-empty';
    li.textContent = 'No questions added yet.';
    listEl.appendChild(li);
    return;
  }

  questionIds.forEach((questionId, index) => {
    const li = document.createElement('li');

    const label = document.createElement('span');
    const data = questionsById[questionId];
    label.textContent = data ? deriveQuestionLabel(data) : '(question no longer exists)';
    li.appendChild(label);

    const upBtn = document.createElement('button');
    upBtn.textContent = '↑';
    upBtn.className = 'schedule-action-btn';
    upBtn.disabled = index === 0;
    upBtn.onclick = () => {
      [questionIds[index - 1], questionIds[index]] = [questionIds[index], questionIds[index - 1]];
      onChange();
    };

    const downBtn = document.createElement('button');
    downBtn.textContent = '↓';
    downBtn.className = 'schedule-action-btn';
    downBtn.disabled = index === questionIds.length - 1;
    downBtn.onclick = () => {
      [questionIds[index], questionIds[index + 1]] = [questionIds[index + 1], questionIds[index]];
      onChange();
    };

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'schedule-action-btn delete-btn';
    removeBtn.onclick = () => {
      questionIds.splice(index, 1);
      onChange();
    };

    li.appendChild(upBtn);
    li.appendChild(downBtn);
    li.appendChild(removeBtn);
    listEl.appendChild(li);
  });
}

async function refreshSlugList(practiceSetId, slugListEl) {
  const allSlugs = await getAllPracticeSetSlugs();
  const mySlugs = Object.entries(allSlugs)
    .filter(([, ownerId]) => ownerId === practiceSetId)
    .map(([slug]) => slug)
    .sort();

  slugListEl.innerHTML = '';

  if (mySlugs.length === 0) {
    const li = document.createElement('li');
    li.className = 'slug-empty';
    li.textContent = 'No URL assigned yet — this practice set is not reachable.';
    slugListEl.appendChild(li);
    return;
  }

  mySlugs.forEach(slug => {
    const li = document.createElement('li');

    const link = document.createElement('a');
    link.href = `/practice/${slug}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = `/practice/${slug}`;

    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rename';
    renameBtn.className = 'schedule-action-btn';
    renameBtn.onclick = withWorkingIndicator(renameBtn, async () => {
      const newSlug = prompt(`Rename "/practice/${slug}" to:`, slug);
      if (!newSlug || newSlug.trim().toLowerCase() === slug) return;
      try {
        await renamePracticeSetSlug(practiceSetId, slug, newSlug.trim().toLowerCase());
        await refreshSlugList(practiceSetId, slugListEl);
        showNotification(`Renamed to "/practice/${newSlug.trim().toLowerCase()}".`, 'success');
      } catch (err) {
        alert(err.message);
      }
    });

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'schedule-action-btn delete-btn';
    removeBtn.onclick = withWorkingIndicator(removeBtn, async () => {
      const confirmed = confirm(`Remove "/practice/${slug}"?`);
      if (!confirmed) return;
      await removePracticeSetSlug(slug);
      await refreshSlugList(practiceSetId, slugListEl);
    });

    li.appendChild(link);
    li.appendChild(renameBtn);
    li.appendChild(removeBtn);
    slugListEl.appendChild(li);
  });
}

export async function main() {
  initializeDatabase(db);
  initializeQuestionDatabase(db);
  initializePracticeSetDatabase(db);
  renderTeacherNav('practice-sets');

  const params = getQueryParams();
  const practiceSetId = params.practiceSet;

  if (!practiceSetId) {
    alert('No practice set selected.');
    window.location.href = 'practice-set-manager.html';
    return;
  }

  const titleInput = document.getElementById('titleInput');
  const saveBtn = document.getElementById('saveBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const unsavedIndicator = document.getElementById('unsavedIndicator');
  const questionListEl = document.getElementById('questionList');
  const addQuestionBtn = document.getElementById('addQuestionBtn');
  const slugList = document.getElementById('slugList');
  const newSlugInput = document.getElementById('newSlugInput');
  const addSlugBtn = document.getElementById('addSlugBtn');

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

  const data = await getPracticeSetFromDB(practiceSetId);
  const questionIds = data && Array.isArray(data.questionIds) ? [...data.questionIds] : [];
  titleInput.value = data?.title || DEFAULT_PRACTICE_SET_TITLE;

  const allQuestions = (await getAllQuestions()) || {};

  const refreshQuestionList = () => renderQuestionList(questionListEl, questionIds, allQuestions, {
    onChange: () => {
      markDirty();
      refreshQuestionList();
    },
  });
  refreshQuestionList();

  titleInput.addEventListener('input', markDirty);

  addQuestionBtn.onclick = () => {
    showQuestionPicker({
      onSelect: ({ questionId }) => {
        questionIds.push(questionId);
        markDirty();
        refreshQuestionList();
      },
    });
  };

  addSlugBtn.onclick = withWorkingIndicator(addSlugBtn, async () => {
    const slug = newSlugInput.value.trim().toLowerCase();
    if (!slug) return;
    try {
      await assignPracticeSetSlug(practiceSetId, slug);
      newSlugInput.value = '';
      await refreshSlugList(practiceSetId, slugList);
      showNotification(`"/practice/${slug}" now points to this practice set.`, 'success');
    } catch (err) {
      alert(err.message);
    }
  });

  saveBtn.onclick = async () => {
    const title = titleInput.value.trim();
    if (!title) {
      alert('Please enter a title.');
      return;
    }
    await savePracticeSet(practiceSetId, { title, questionIds });
    showNotification(`"${title}" saved successfully at ${new Date().toLocaleString()}`, 'success');
    markClean();
  };

  deleteBtn.onclick = async () => {
    const confirmed = confirm(
      'Are you sure you want to delete this practice set?\n\n' +
      'This also removes every URL pointing to it. This action cannot be undone.'
    );
    if (!confirmed) return;
    await deletePracticeSetAndSlugs(practiceSetId);
    markClean();
    window.location.href = 'practice-set-manager.html';
  };

  markClean();
  await refreshSlugList(practiceSetId, slugList);
}

if (document.getElementById('titleInput')) {
  (async () => {
    const isAuthenticated = await window.teacherAuth.requireAuth();
    if (!isAuthenticated) return;

    window.teacherAuth.setupActivityListeners();
    main();
  })();
}
