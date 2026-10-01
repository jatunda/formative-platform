import { TeacherAuth } from './teacher-auth.js';

// Initialize teacher authentication
window.teacherAuth = new TeacherAuth();

import { db } from './firebase-config.js';
import { renderTeacherNav } from './teacher-nav.js';
import { initializeDatabase, getClasses } from './database-utils.js';
import {
  initializeQuestionDatabase,
  createNewQuestion,
  getAllQuestions,
  getAllQuestionSlugs
} from './question-database-utils.js';
import { deriveQuestionLabel } from './question-label.js';

/**
 * Invert the slug -> questionId index into questionId -> [slugs]
 */
function buildSlugsByQuestion(allSlugs) {
  const byQuestion = {};
  for (const [slug, questionId] of Object.entries(allSlugs)) {
    if (!byQuestion[questionId]) byQuestion[questionId] = [];
    byQuestion[questionId].push(slug);
  }
  Object.values(byQuestion).forEach((slugs) => slugs.sort());
  return byQuestion;
}

async function renderQuestionList(listEl, classes, { classId, topic }) {
  listEl.innerHTML = '<p>Loading questions...</p>';

  const [allQuestions, allSlugs] = await Promise.all([getAllQuestions(), getAllQuestionSlugs()]);
  const slugsByQuestion = buildSlugsByQuestion(allSlugs);
  const topicLower = topic.trim().toLowerCase();

  const questionIds = (allQuestions ? Object.keys(allQuestions) : []).filter((id) => {
    const data = allQuestions[id];
    if (classId && data.classId !== classId) return false;
    if (topicLower && !(data.topic || '').toLowerCase().includes(topicLower)) return false;
    return true;
  });

  if (questionIds.length === 0) {
    listEl.innerHTML = '<p>No questions match these filters.</p>';
    return;
  }

  listEl.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'page-manager-table';

  questionIds.forEach((questionId) => {
    const data = allQuestions[questionId];
    const slugs = slugsByQuestion[questionId] || [];

    const row = document.createElement('tr');

    const labelCell = document.createElement('td');
    const labelLink = document.createElement('a');
    labelLink.href = `question-editor.html?question=${questionId}`;
    labelLink.textContent = deriveQuestionLabel(data);
    labelCell.appendChild(labelLink);

    const classCell = document.createElement('td');
    classCell.textContent = classes?.[data.classId]?.name || '(no class)';

    const topicCell = document.createElement('td');
    topicCell.textContent = data.topic || '(no topic)';

    const linksCell = document.createElement('td');
    if (slugs.length === 0) {
      const span = document.createElement('span');
      span.className = 'slug-empty';
      span.textContent = 'No Question Link assigned';
      linksCell.appendChild(span);
    } else {
      slugs.forEach((slug, i) => {
        if (i > 0) linksCell.appendChild(document.createTextNode(', '));
        const code = document.createElement('code');
        code.textContent = `[[q:${slug}]]`;
        linksCell.appendChild(code);
      });
    }

    row.appendChild(labelCell);
    row.appendChild(classCell);
    row.appendChild(topicCell);
    row.appendChild(linksCell);
    table.appendChild(row);
  });

  listEl.appendChild(table);
}

export async function main() {
  initializeDatabase(db);
  initializeQuestionDatabase(db);
  renderTeacherNav('questions');

  const listEl = document.getElementById('questionList');
  const newQuestionBtn = document.getElementById('newQuestionBtn');
  const classFilter = document.getElementById('classFilter');
  const topicFilter = document.getElementById('topicFilter');

  const classes = (await getClasses()) || {};
  Object.entries(classes)
    .sort(([, a], [, b]) => (a.name || '').localeCompare(b.name || ''))
    .forEach(([classId, classData]) => {
      const option = document.createElement('option');
      option.value = classId;
      option.textContent = classData.name;
      classFilter.appendChild(option);
    });

  const refresh = () => renderQuestionList(listEl, classes, { classId: classFilter.value, topic: topicFilter.value });

  classFilter.onchange = refresh;
  topicFilter.oninput = refresh;

  newQuestionBtn.onclick = async () => {
    const questionId = await createNewQuestion();
    window.location.href = `question-editor.html?question=${questionId}`;
  };

  await refresh();
}

if (document.getElementById('questionList')) {
  (async () => {
    const isAuthenticated = await window.teacherAuth.requireAuth();
    if (!isAuthenticated) return;

    window.teacherAuth.setupActivityListeners();
    main();
  })();
}
