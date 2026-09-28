import { TeacherAuth } from './teacher-auth.js';

// Initialize teacher authentication
window.teacherAuth = new TeacherAuth();

import { db } from './firebase-config.js';
import { parseDSL, generateDSLFromContent } from './dsl.js';
import { renderTeacherNav } from './teacher-nav.js';
import { showNotification } from './notification-utils.js';
import { withWorkingIndicator } from './ui-components.js';
import {
  getQueryParams,
  updatePreview,
  handleDslInputKeydown,
  updateUnsavedIndicator,
  handleBeforeUnload
} from './editor.js';
import {
  initializePageDatabase,
  getPageFromDB,
  savePage,
  deletePageAndSlugs,
  getAllSlugs,
  assignSlug,
  removeSlug
} from './page-database-utils.js';
import { DEFAULT_PAGE_TITLE } from './constants.js';

/**
 * Re-render the list of Slugs currently assigned to this Page, each with a
 * Remove button. A Page with no Slugs still exists but has no live URL.
 */
async function refreshSlugList(pageId, slugListEl) {
  const allSlugs = await getAllSlugs();
  const mySlugs = Object.entries(allSlugs)
    .filter(([, ownerId]) => ownerId === pageId)
    .map(([slug]) => slug)
    .sort();

  slugListEl.innerHTML = '';

  if (mySlugs.length === 0) {
    const li = document.createElement('li');
    li.className = 'slug-empty';
    li.textContent = 'No URL assigned yet — this page is not reachable.';
    slugListEl.appendChild(li);
    return;
  }

  mySlugs.forEach(slug => {
    const li = document.createElement('li');

    const link = document.createElement('a');
    link.href = `/p/${slug}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = `/p/${slug}`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'schedule-action-btn delete-btn';
    removeBtn.onclick = withWorkingIndicator(removeBtn, async () => {
      await removeSlug(slug);
      await refreshSlugList(pageId, slugListEl);
    });

    li.appendChild(link);
    li.appendChild(removeBtn);
    slugListEl.appendChild(li);
  });
}

export async function main() {
  initializePageDatabase(db);
  renderTeacherNav('pages');

  const params = getQueryParams();
  const pageId = params.page;

  if (!pageId) {
    alert('No page selected.');
    window.location.href = 'page-manager.html';
    return;
  }

  const pageIdEl = document.getElementById('pageId');
  const dslInput = document.getElementById('dslInput');
  const preview = document.getElementById('preview');
  const saveBtn = document.getElementById('saveBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const slugList = document.getElementById('slugList');
  const newSlugInput = document.getElementById('newSlugInput');
  const addSlugBtn = document.getElementById('addSlugBtn');
  const unsavedIndicator = document.getElementById('unsavedIndicator');

  // Unsaved-changes tracking, same pattern as editor.js: dirty as soon as
  // the DSL textarea changes, clean again after a successful save. No
  // in-app dropdown/search to switch through here (that's a navigation to
  // page-manager.html instead), so beforeunload is the only guard needed.
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

  pageIdEl.textContent = pageId;

  dslInput.addEventListener('input', () => {
    markDirty();
    updatePreview(dslInput.value, preview);
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
      await assignSlug(pageId, slug);
      newSlugInput.value = '';
      await refreshSlugList(pageId, slugList);
      showNotification(`"/p/${slug}" now points to this page.`, 'success');
    } catch (err) {
      alert(err.message);
    }
  });

  saveBtn.onclick = async () => {
    const parsed = parseDSL(dslInput.value);
    if (!parsed.title || !parsed.blocks) {
      alert('Parsing failed or content is malformed.');
      return;
    }
    await savePage(pageId, parsed);
    showNotification(`"${parsed.title}" saved successfully at ${new Date().toLocaleString()}`, 'success');
    markClean();
  };

  deleteBtn.onclick = async () => {
    const confirmed = confirm(
      'Are you sure you want to delete this page?\n\n' +
      'This also removes every URL pointing to it. This action cannot be undone.'
    );
    if (!confirmed) return;
    await deletePageAndSlugs(pageId);
    markClean();
    window.location.href = 'page-manager.html';
  };

  const data = await getPageFromDB(pageId);
  const dslText = data
    ? generateDSLFromContent(data)
    : generateDSLFromContent({ title: DEFAULT_PAGE_TITLE, blocks: [] });
  dslInput.value = dslText;
  updatePreview(dslText, preview);
  markClean();

  await refreshSlugList(pageId, slugList);
}

// Only run automatically when actually loaded on page-editor.html - importing
// this module elsewhere (tests) never triggers real auth/Firebase/DOM side
// effects on its own.
if (document.getElementById('dslInput')) {
  (async () => {
    const isAuthenticated = await window.teacherAuth.requireAuth();
    if (!isAuthenticated) return;

    window.teacherAuth.setupActivityListeners();
    main();
  })();
}
