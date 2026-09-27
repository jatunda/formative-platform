import { TeacherAuth } from './teacher-auth.js';

// Initialize teacher authentication
window.teacherAuth = new TeacherAuth();

import { db } from './firebase-config.js';
import { renderTeacherNav } from './teacher-nav.js';
import { initializeDatabase } from './database-utils.js';
import {
  initializePageDatabase,
  createNewPage,
  getAllPages,
  getAllSlugs
} from './page-database-utils.js';
import { UNTITLED_PAGE_LOWERCASE } from './constants.js';

/**
 * Invert the slug -> pageId index into pageId -> [slugs], for display next
 * to each page in the list.
 */
function buildSlugsByPage(allSlugs) {
  const byPage = {};
  for (const [slug, pageId] of Object.entries(allSlugs)) {
    if (!byPage[pageId]) byPage[pageId] = [];
    byPage[pageId].push(slug);
  }
  Object.values(byPage).forEach(slugs => slugs.sort());
  return byPage;
}

async function renderPageList(listEl) {
  listEl.innerHTML = '<p>Loading pages...</p>';

  const [allPages, allSlugs] = await Promise.all([getAllPages(), getAllSlugs()]);
  const slugsByPage = buildSlugsByPage(allSlugs);
  const pageIds = allPages ? Object.keys(allPages).sort() : [];

  if (pageIds.length === 0) {
    listEl.innerHTML = '<p>No pages yet. Click "New Page" to create one.</p>';
    return;
  }

  listEl.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'page-manager-table';

  pageIds.forEach(pageId => {
    const title = allPages[pageId]?.title || UNTITLED_PAGE_LOWERCASE;
    const slugs = slugsByPage[pageId] || [];

    const row = document.createElement('tr');

    const titleCell = document.createElement('td');
    const titleLink = document.createElement('a');
    titleLink.href = `page-editor.html?page=${pageId}`;
    titleLink.textContent = title;
    titleCell.appendChild(titleLink);

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
        link.href = `/p/${slug}`;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = `/p/${slug}`;
        slugsCell.appendChild(link);
      });
    }

    row.appendChild(titleCell);
    row.appendChild(slugsCell);
    table.appendChild(row);
  });

  listEl.appendChild(table);
}

export async function main() {
  initializeDatabase(db);
  initializePageDatabase(db);
  renderTeacherNav('pages');

  const listEl = document.getElementById('pageList');
  const newPageBtn = document.getElementById('newPageBtn');

  newPageBtn.onclick = async () => {
    const pageId = await createNewPage();
    window.location.href = `page-editor.html?page=${pageId}`;
  };

  await renderPageList(listEl);
}

if (document.getElementById('pageList')) {
  (async () => {
    const isAuthenticated = await window.teacherAuth.requireAuth();
    if (!isAuthenticated) return;

    window.teacherAuth.setupActivityListeners();
    main();
  })();
}
