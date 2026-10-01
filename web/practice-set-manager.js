import { TeacherAuth } from './teacher-auth.js';

// Initialize teacher authentication
window.teacherAuth = new TeacherAuth();

import { db } from './firebase-config.js';
import { renderTeacherNav } from './teacher-nav.js';
import { initializeDatabase } from './database-utils.js';
import {
  initializePracticeSetDatabase,
  createNewPracticeSet,
  getAllPracticeSets,
  getAllPracticeSetSlugs
} from './practice-set-database-utils.js';
import { UNTITLED_PRACTICE_SET_LOWERCASE } from './constants.js';

function buildSlugsByPracticeSet(allSlugs) {
  const byPracticeSet = {};
  for (const [slug, practiceSetId] of Object.entries(allSlugs)) {
    if (!byPracticeSet[practiceSetId]) byPracticeSet[practiceSetId] = [];
    byPracticeSet[practiceSetId].push(slug);
  }
  Object.values(byPracticeSet).forEach(slugs => slugs.sort());
  return byPracticeSet;
}

async function renderPracticeSetList(listEl) {
  listEl.innerHTML = '<p>Loading practice sets...</p>';

  const [allPracticeSets, allSlugs] = await Promise.all([getAllPracticeSets(), getAllPracticeSetSlugs()]);
  const slugsByPracticeSet = buildSlugsByPracticeSet(allSlugs);
  const practiceSetIds = allPracticeSets ? Object.keys(allPracticeSets).sort() : [];

  if (practiceSetIds.length === 0) {
    listEl.innerHTML = '<p>No practice sets yet. Click "New Practice Set" to create one.</p>';
    return;
  }

  listEl.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'page-manager-table';

  practiceSetIds.forEach(practiceSetId => {
    const title = allPracticeSets[practiceSetId]?.title || UNTITLED_PRACTICE_SET_LOWERCASE;
    const questionCount = Array.isArray(allPracticeSets[practiceSetId]?.questionIds)
      ? allPracticeSets[practiceSetId].questionIds.length
      : 0;
    const slugs = slugsByPracticeSet[practiceSetId] || [];

    const row = document.createElement('tr');

    const titleCell = document.createElement('td');
    const titleLink = document.createElement('a');
    titleLink.href = `practice-set-editor.html?practiceSet=${practiceSetId}`;
    titleLink.textContent = title;
    titleCell.appendChild(titleLink);

    const countCell = document.createElement('td');
    countCell.textContent = `${questionCount} question${questionCount === 1 ? '' : 's'}`;

    const slugsCell = document.createElement('td');
    if (slugs.length === 0) {
      const span = document.createElement('span');
      span.className = 'slug-empty';
      span.textContent = 'No URL assigned';
      slugsCell.appendChild(span);
    } else {
      slugs.forEach((slug, i) => {
        if (i > 0) slugsCell.appendChild(document.createTextNode(', '));
        const link = document.createElement('a');
        link.href = `/practice/${slug}`;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = `/practice/${slug}`;
        slugsCell.appendChild(link);
      });
    }

    row.appendChild(titleCell);
    row.appendChild(countCell);
    row.appendChild(slugsCell);
    table.appendChild(row);
  });

  listEl.appendChild(table);
}

export async function main() {
  initializeDatabase(db);
  initializePracticeSetDatabase(db);
  renderTeacherNav('practice-sets');

  const listEl = document.getElementById('practiceSetList');
  const newPracticeSetBtn = document.getElementById('newPracticeSetBtn');

  newPracticeSetBtn.onclick = async () => {
    const practiceSetId = await createNewPracticeSet();
    window.location.href = `practice-set-editor.html?practiceSet=${practiceSetId}`;
  };

  await renderPracticeSetList(listEl);
}

if (document.getElementById('practiceSetList')) {
  (async () => {
    const isAuthenticated = await window.teacherAuth.requireAuth();
    if (!isAuthenticated) return;

    window.teacherAuth.setupActivityListeners();
    main();
  })();
}
