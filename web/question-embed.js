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

// renderQuestionWidget's returned handle must be destroy()ed to drop its
// document-level keydown listener. Callers like editor.js's updatePreview
// re-render the same containerEl's content (wiping the old placeholder DOM)
// and call this function again on a debounce, with no chance to destroy the
// widgets from the previous call themselves - so track them here, keyed by
// containerEl, and destroy the previous batch on the next mount into that
// same container.
const widgetsByContainer = new WeakMap();

/**
 * Find every Question Link placeholder inside containerEl and mount the
 * interactive widget for it, fetching all distinct referenced Questions in
 * parallel. Safe to call on a container with no placeholders (no-op).
 * @param {HTMLElement} containerEl
 * @returns {Promise<void>}
 */
export async function mountQuestionEmbeds(containerEl) {
  const previousWidgets = widgetsByContainer.get(containerEl);
  if (previousWidgets) {
    previousWidgets.forEach((widget) => widget.destroy());
    widgetsByContainer.delete(containerEl);
  }

  const placeholders = [...containerEl.querySelectorAll('.question-embed-placeholder')];
  if (placeholders.length === 0) return;

  const uniqueSlugs = [...new Set(placeholders.map((el) => el.dataset.questionSlug))];
  const allSlugs = await getAllQuestionSlugs();

  const questionDataBySlug = {};
  await Promise.all(uniqueSlugs.map(async (slug) => {
    const questionId = allSlugs[slug];
    questionDataBySlug[slug] = questionId ? await getQuestionFromDB(questionId) : null;
  }));

  const widgets = [];
  for (const placeholder of placeholders) {
    const data = questionDataBySlug[placeholder.dataset.questionSlug];
    if (!data) {
      placeholder.textContent = QUESTION_NOT_FOUND;
      placeholder.classList.add('question-embed-not-found');
      continue;
    }
    widgets.push(renderQuestionWidget(placeholder, data));
  }
  widgetsByContainer.set(containerEl, widgets);
}
