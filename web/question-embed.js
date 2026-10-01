// Hydrates the `.question-embed-placeholder` blocks content-renderer.js
// leaves behind for each [[q:slug]] Question Link (see docs/adr/0010 and
// content-renderer.js's expandQuestionLinkLines). Kept as an explicit,
// separate async pass rather than built into renderContent/renderContentItems
// themselves, so those stay 100% synchronous and DB-call-free - callers opt
// into this afterward. An embedded Question here has no Frontier/summary
// chrome around it - it's just question-widget.js's own Attempt/Outcome
// behavior, nothing persisted (same as everywhere else - see docs/adr/0012).
import { getAllQuestionSlugs, getQuestionFromDB } from './question-database-utils.js';
import { renderQuestionWidget } from './question-widget.js';
import { QUESTION_NOT_FOUND } from './constants.js';

/**
 * Find every Question Link placeholder inside containerEl and mount the
 * interactive widget for it, fetching all distinct referenced Questions in
 * parallel. Safe to call on a container with no placeholders (no-op).
 * @param {HTMLElement} containerEl
 * @returns {Promise<void>}
 */
export async function mountQuestionEmbeds(containerEl) {
  const placeholders = [...containerEl.querySelectorAll('.question-embed-placeholder')];
  if (placeholders.length === 0) return;

  const uniqueSlugs = [...new Set(placeholders.map((el) => el.dataset.questionSlug))];
  const allSlugs = await getAllQuestionSlugs();

  const questionDataBySlug = {};
  await Promise.all(uniqueSlugs.map(async (slug) => {
    const questionId = allSlugs[slug];
    questionDataBySlug[slug] = questionId ? await getQuestionFromDB(questionId) : null;
  }));

  for (const placeholder of placeholders) {
    const data = questionDataBySlug[placeholder.dataset.questionSlug];
    if (!data) {
      placeholder.textContent = QUESTION_NOT_FOUND;
      placeholder.classList.add('question-embed-not-found');
      continue;
    }
    renderQuestionWidget(placeholder, data);
  }
}
