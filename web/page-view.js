import { db } from './firebase-config.js';
import { renderContent } from './content-renderer.js';
import {
  initializePageDatabase,
  resolveSlugToPageId,
  getPageFromDB
} from './page-database-utils.js';
import { initializeQuestionDatabase } from './question-database-utils.js';
import { mountQuestionEmbeds } from './question-embed.js';
import { PAGE_NOT_FOUND } from './constants.js';

/**
 * Extract the Slug from a /p/<slug> URL path.
 */
export function getSlugFromPath(pathname) {
  const match = pathname.match(/\/p\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function initializePage() {
  initializePageDatabase(db);
  initializeQuestionDatabase(db);

  const contentEl = document.getElementById('content');
  // The production /p/<slug> path is served by the pageSSR Cloud Function,
  // never by this static file directly - the ?slug= fallback exists so this
  // same page-view.html can be opened directly for local dev/testing, where
  // there's no server-side rewrite to produce a /p/<slug> path at all.
  const slug = getSlugFromPath(window.location.pathname)
    || new URLSearchParams(window.location.search).get('slug');

  if (!slug) {
    contentEl.textContent = PAGE_NOT_FOUND;
    return;
  }

  const pageId = await resolveSlugToPageId(slug);
  if (!pageId) {
    contentEl.textContent = PAGE_NOT_FOUND;
    return;
  }

  const data = await getPageFromDB(pageId);
  renderContent(data, contentEl);
  await mountQuestionEmbeds(contentEl);
}

if (document.getElementById('content')) {
  initializePage();
}
