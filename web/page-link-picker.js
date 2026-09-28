// Modal picker for inserting a Page Link ([[slug|Title]]) while editing -
// mirrors lesson-search.js's popup shape and CSS classes, but with a plain
// substring filter rather than fuzzy scoring: Pages are expected to number
// in the dozens, not the hundreds a Lesson search needs to handle well.
import { getAllPages, getAllSlugs } from './page-database-utils.js';
import { UNTITLED_PAGE_LOWERCASE } from './constants.js';

/**
 * Show a popup listing every linkable Page - one with at least one Slug
 * assigned, since a Page with none has no valid URL to embed. Selecting one
 * calls onSelect with {slug, title} for the first of that Page's Slugs
 * (alphabetically) - which exact alias to use, if it has several, is a
 * detail the teacher can adjust afterward if they specifically want a
 * different one.
 * @param {{onSelect: (result: {slug: string, title: string}) => void}} options
 */
export function showPageLinkPicker({ onSelect }) {
  (async () => {
    try {
      const [allPages, allSlugs] = await Promise.all([getAllPages(), getAllSlugs()]);

      const slugsByPage = {};
      for (const [slug, pageId] of Object.entries(allSlugs || {})) {
        if (!slugsByPage[pageId]) slugsByPage[pageId] = [];
        slugsByPage[pageId].push(slug);
      }

      const linkablePages = Object.entries(allPages || {})
        .map(([pageId, data]) => ({
          pageId,
          title: data.title || UNTITLED_PAGE_LOWERCASE,
          slug: (slugsByPage[pageId] || []).sort()[0]
        }))
        .filter((page) => page.slug)
        .sort((a, b) => a.title.localeCompare(b.title));

      if (linkablePages.length === 0) {
        alert('No linkable pages found - a page needs at least one URL assigned before you can link to it.');
        return;
      }

      const popup = document.createElement('div');
      popup.className = 'lesson-popup';

      const box = document.createElement('div');
      box.className = 'lesson-popup-box';

      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close';
      closeBtn.className = 'schedule-action-btn popup-close-btn';
      closeBtn.onclick = () => document.body.removeChild(popup);

      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search pages by title...';
      searchInput.className = 'lesson-popup-search';

      const resultsDiv = document.createElement('div');
      resultsDiv.className = 'lesson-popup-results';

      function renderResults(filter) {
        resultsDiv.innerHTML = '';
        const filterLower = filter.trim().toLowerCase();
        const matches = linkablePages.filter((page) => page.title.toLowerCase().includes(filterLower));

        if (matches.length === 0) {
          const noRes = document.createElement('div');
          noRes.textContent = 'No matching pages.';
          resultsDiv.appendChild(noRes);
          return;
        }

        for (const page of matches) {
          const btn = document.createElement('button');
          btn.textContent = `${page.title} (/p/${page.slug})`;
          btn.className = 'schedule-action-btn lesson-popup-result-btn';
          btn.onclick = () => {
            document.body.removeChild(popup);
            onSelect({ slug: page.slug, title: page.title });
          };
          resultsDiv.appendChild(btn);
        }
      }

      searchInput.oninput = () => renderResults(searchInput.value);
      renderResults('');

      box.appendChild(closeBtn);
      box.appendChild(searchInput);
      box.appendChild(resultsDiv);
      popup.appendChild(box);
      document.body.appendChild(popup);

      setTimeout(() => searchInput.focus(), 100);
    } catch (error) {
      console.error('Error loading pages:', error);
      alert('Error loading pages. Please try again.');
    }
  })();
}
