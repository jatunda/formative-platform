import { TeacherAuth } from './teacher-auth.js';

// Initialize teacher authentication
window.teacherAuth = new TeacherAuth();

import { db } from './firebase-config.js';
import { parseDSL, generateDSLFromContent } from './dsl.js';
import { renderTeacherNav } from './teacher-nav.js';
import { showNotification } from './notification-utils.js';
import { withWorkingIndicator } from './ui-components.js';
import { createDslCheatSheetPanel } from './dsl-cheat-sheet.js';
import { showPageLinkPicker } from './page-link-picker.js';
import { showQuestionLinkPicker } from './question-link-picker.js';
import {
  getQueryParams,
  updatePreview,
  handleDslInputKeydown,
  computeInsertAtCursor,
  applyComputedEdit,
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
  removeSlug,
  renameSlug,
  getBacklinks,
  updateBacklinksForPage
} from './page-database-utils.js';
import {
  initializeQuestionDatabase,
  updateQuestionBacklinksForPage
} from './question-database-utils.js';
import { DEFAULT_PAGE_TITLE } from './constants.js';

/**
 * Phrase the backlink count for a confirm dialog, or '' when there are none.
 */
function describeBacklinks(sourcePageIds) {
  if (sourcePageIds.length === 0) return '';
  const count = sourcePageIds.length;
  return `\n\n${count} other page${count === 1 ? '' : 's'} currently link${count === 1 ? 's' : ''} here and may be affected.`;
}

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

    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rename';
    renameBtn.className = 'schedule-action-btn';
    renameBtn.onclick = withWorkingIndicator(renameBtn, async () => {
      const newSlug = prompt(`Rename "/p/${slug}" to:`, slug);
      if (!newSlug || newSlug.trim().toLowerCase() === slug) return;
      try {
        await renameSlug(pageId, slug, newSlug.trim().toLowerCase());
        await refreshSlugList(pageId, slugListEl);
        showNotification(`Renamed to "/p/${newSlug.trim().toLowerCase()}" - links to it elsewhere were updated.`, 'success');
      } catch (err) {
        alert(err.message);
      }
    });

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'schedule-action-btn delete-btn';
    removeBtn.onclick = withWorkingIndicator(removeBtn, async () => {
      const backlinks = await getBacklinks(pageId);
      const confirmed = confirm(`Remove "/p/${slug}"?${describeBacklinks(backlinks)}`);
      if (!confirmed) return;
      await removeSlug(slug);
      await refreshSlugList(pageId, slugListEl);
    });

    li.appendChild(link);
    li.appendChild(renameBtn);
    li.appendChild(removeBtn);
    slugListEl.appendChild(li);
  });
}

export async function main() {
  initializePageDatabase(db);
  initializeQuestionDatabase(db);
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
  const insertPageLinkBtn = document.getElementById('insertPageLinkBtn');
  const insertQuestionLinkBtn = document.getElementById('insertQuestionLinkBtn');
  const cheatSheetContainer = document.getElementById('cheatSheetContainer');

  cheatSheetContainer.appendChild(createDslCheatSheetPanel());

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

  insertPageLinkBtn.onclick = () => {
    showPageLinkPicker({
      onSelect: ({ slug, title }) => {
        const snippet = `[[${slug}|${title}]]`;
        const result = computeInsertAtCursor(dslInput.value, dslInput.selectionStart, dslInput.selectionEnd, snippet);
        applyComputedEdit(dslInput, result);
        dslInput.focus();
      }
    });
  };

  insertQuestionLinkBtn.onclick = () => {
    showQuestionLinkPicker({
      onSelect: ({ slug, label }) => {
        const snippet = `[[q:${slug}|${label}]]`;
        const result = computeInsertAtCursor(dslInput.value, dslInput.selectionStart, dslInput.selectionEnd, snippet);
        applyComputedEdit(dslInput, result);
        dslInput.focus();
      }
    });
  };

  saveBtn.onclick = async () => {
    const parsed = parseDSL(dslInput.value);
    if (!parsed.title || !parsed.blocks) {
      alert('Parsing failed or content is malformed.');
      return;
    }
    await savePage(pageId, parsed);
    await updateBacklinksForPage(pageId, parsed);
    await updateQuestionBacklinksForPage(pageId, parsed);
    showNotification(`"${parsed.title}" saved successfully at ${new Date().toLocaleString()}`, 'success');
    markClean();
  };

  deleteBtn.onclick = async () => {
    const backlinks = await getBacklinks(pageId);
    const confirmed = confirm(
      'Are you sure you want to delete this page?\n\n' +
      'This also removes every URL pointing to it. This action cannot be undone.' +
      describeBacklinks(backlinks)
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
