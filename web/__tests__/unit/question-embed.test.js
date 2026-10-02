import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mountQuestionEmbeds } from '../../question-embed.js';
import { QUESTION_NOT_FOUND } from '../../constants.js';

const mockGetAllQuestionSlugs = vi.fn();
const mockGetQuestionFromDB = vi.fn();
vi.mock('../../question-database-utils.js', () => ({
  getAllQuestionSlugs: (...args) => mockGetAllQuestionSlugs(...args),
  getQuestionFromDB: (...args) => mockGetQuestionFromDB(...args),
}));

const mockRenderQuestionWidget = vi.fn();
vi.mock('../../question-widget.js', () => ({
  renderQuestionWidget: (...args) => mockRenderQuestionWidget(...args),
}));

function placeholder(slug) {
  const el = document.createElement('div');
  el.className = 'question-embed-placeholder';
  el.dataset.questionSlug = slug;
  return el;
}

describe('mountQuestionEmbeds', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    mockGetAllQuestionSlugs.mockReset();
    mockGetQuestionFromDB.mockReset();
    mockRenderQuestionWidget.mockReset();
  });

  it('does nothing when there are no placeholders', async () => {
    await mountQuestionEmbeds(container);
    expect(mockGetAllQuestionSlugs).not.toHaveBeenCalled();
  });

  it('mounts a widget into each placeholder for a resolvable slug', async () => {
    container.appendChild(placeholder('loops-1'));
    mockGetAllQuestionSlugs.mockResolvedValue({ 'loops-1': 'q1' });
    const data = { stem: [], options: [] };
    mockGetQuestionFromDB.mockResolvedValue(data);

    await mountQuestionEmbeds(container);

    expect(mockGetQuestionFromDB).toHaveBeenCalledWith('q1');
    expect(mockRenderQuestionWidget).toHaveBeenCalledWith(container.querySelector('.question-embed-placeholder'), data);
  });

  it('fetches each distinct slug only once, even with repeated placeholders', async () => {
    container.appendChild(placeholder('loops-1'));
    container.appendChild(placeholder('loops-1'));
    mockGetAllQuestionSlugs.mockResolvedValue({ 'loops-1': 'q1' });
    mockGetQuestionFromDB.mockResolvedValue({ stem: [], options: [] });

    await mountQuestionEmbeds(container);

    expect(mockGetQuestionFromDB).toHaveBeenCalledTimes(1);
    expect(mockRenderQuestionWidget).toHaveBeenCalledTimes(2);
  });

  it('shows a "not found" notice for a slug with no matching question, without throwing', async () => {
    const el = placeholder('missing-slug');
    container.appendChild(el);
    mockGetAllQuestionSlugs.mockResolvedValue({});

    await mountQuestionEmbeds(container);

    expect(el.textContent).toBe(QUESTION_NOT_FOUND);
    expect(el.classList.contains('question-embed-not-found')).toBe(true);
    expect(mockRenderQuestionWidget).not.toHaveBeenCalled();
  });

  it('shows a "not found" notice when the slug resolves but the question record is gone', async () => {
    const el = placeholder('loops-1');
    container.appendChild(el);
    mockGetAllQuestionSlugs.mockResolvedValue({ 'loops-1': 'q1' });
    mockGetQuestionFromDB.mockResolvedValue(null);

    await mountQuestionEmbeds(container);

    expect(el.textContent).toBe(QUESTION_NOT_FOUND);
  });

  it('mounts multiple different placeholders independently', async () => {
    container.appendChild(placeholder('loops-1'));
    container.appendChild(placeholder('loops-2'));
    mockGetAllQuestionSlugs.mockResolvedValue({ 'loops-1': 'q1', 'loops-2': 'q2' });
    mockGetQuestionFromDB.mockImplementation(async (id) => ({ stem: [], options: [], id }));

    await mountQuestionEmbeds(container);

    expect(mockRenderQuestionWidget).toHaveBeenCalledTimes(2);
  });

  it('destroys widgets from a previous mount before mounting new ones into the same container', async () => {
    const firstDestroy = vi.fn();
    mockRenderQuestionWidget.mockReturnValueOnce({ destroy: firstDestroy });
    mockGetAllQuestionSlugs.mockResolvedValue({ 'loops-1': 'q1' });
    mockGetQuestionFromDB.mockResolvedValue({ stem: [], options: [] });

    container.appendChild(placeholder('loops-1'));
    await mountQuestionEmbeds(container);
    expect(firstDestroy).not.toHaveBeenCalled();

    // Simulates the editor's updatePreview wiping and re-rendering the same
    // preview pane (a new DSL parse) before the debounced re-mount fires.
    const secondDestroy = vi.fn();
    mockRenderQuestionWidget.mockReturnValueOnce({ destroy: secondDestroy });
    container.innerHTML = '';
    container.appendChild(placeholder('loops-1'));
    await mountQuestionEmbeds(container);

    expect(firstDestroy).toHaveBeenCalledTimes(1);
    expect(secondDestroy).not.toHaveBeenCalled();
  });
});
