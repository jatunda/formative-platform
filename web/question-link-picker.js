// Modal picker for inserting a Question Link ([[q:slug|Label]]) while
// editing a Lesson or Page - mirrors page-link-picker.js closely, filtered
// to Questions that have at least one Question Slug assigned (a Question
// with none has no valid [[q:slug]] form to embed, same reasoning as
// page-link-picker.js excluding a Page with no Slug).
import { getAllQuestions, getAllQuestionSlugs } from './question-database-utils.js';
import { deriveQuestionLabel } from './question-label.js';

/**
 * Show a popup listing every linkable Question. Selecting one calls
 * onSelect with {slug, label} for the first of that Question's Slugs
 * (alphabetically), mirroring showPageLinkPicker's same choice when a target
 * has more than one.
 * @param {{onSelect: (result: {slug: string, label: string}) => void}} options
 */
export function showQuestionLinkPicker({ onSelect }) {
  (async () => {
    try {
      const [allQuestions, allSlugs] = await Promise.all([getAllQuestions(), getAllQuestionSlugs()]);

      const slugsByQuestion = {};
      for (const [slug, questionId] of Object.entries(allSlugs || {})) {
        if (!slugsByQuestion[questionId]) slugsByQuestion[questionId] = [];
        slugsByQuestion[questionId].push(slug);
      }

      const linkableQuestions = Object.entries(allQuestions || {})
        .map(([questionId, data]) => ({
          label: deriveQuestionLabel(data),
          slug: (slugsByQuestion[questionId] || []).sort()[0]
        }))
        .filter((question) => question.slug)
        .sort((a, b) => a.label.localeCompare(b.label));

      if (linkableQuestions.length === 0) {
        alert('No linkable questions found - a question needs at least one Question Link assigned before you can link to it.');
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
      searchInput.placeholder = 'Search questions...';
      searchInput.className = 'lesson-popup-search';

      const resultsDiv = document.createElement('div');
      resultsDiv.className = 'lesson-popup-results';

      function renderResults(filter) {
        resultsDiv.innerHTML = '';
        const filterLower = filter.trim().toLowerCase();
        const matches = linkableQuestions.filter((question) => question.label.toLowerCase().includes(filterLower));

        if (matches.length === 0) {
          const noRes = document.createElement('div');
          noRes.textContent = 'No matching questions.';
          resultsDiv.appendChild(noRes);
          return;
        }

        for (const question of matches) {
          const btn = document.createElement('button');
          btn.textContent = `${question.label} ([[q:${question.slug}]])`;
          btn.className = 'schedule-action-btn lesson-popup-result-btn';
          btn.onclick = () => {
            document.body.removeChild(popup);
            onSelect({ slug: question.slug, label: question.label });
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
      console.error('Error loading questions:', error);
      alert('Error loading questions. Please try again.');
    }
  })();
}
