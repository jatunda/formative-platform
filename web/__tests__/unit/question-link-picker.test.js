import { describe, it, expect, beforeEach, vi } from 'vitest';
import { showQuestionLinkPicker } from '../../question-link-picker.js';

const mockGetAllQuestions = vi.fn();
const mockGetAllQuestionSlugs = vi.fn();
vi.mock('../../question-database-utils.js', () => ({
  getAllQuestions: (...args) => mockGetAllQuestions(...args),
  getAllQuestionSlugs: (...args) => mockGetAllQuestionSlugs(...args),
}));

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('showQuestionLinkPicker', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.alert = vi.fn();
    global.console.error = vi.fn();
    mockGetAllQuestions.mockReset();
    mockGetAllQuestionSlugs.mockReset();
  });

  it('lists every question that has at least one Question Slug, sorted by derived label', async () => {
    mockGetAllQuestions.mockResolvedValue({
      qB: { stem: [{ type: 'text', value: 'Zebra question' }] },
      qA: { stem: [{ type: 'text', value: 'Apple question' }] },
    });
    mockGetAllQuestionSlugs.mockResolvedValue({ 'zebra-slug': 'qB', 'apple-slug': 'qA' });

    showQuestionLinkPicker({ onSelect: vi.fn() });
    await flush();

    const buttons = [...document.querySelectorAll('.lesson-popup-result-btn')].map((b) => b.textContent);
    expect(buttons).toEqual(['Apple question ([[q:apple-slug]])', 'Zebra question ([[q:zebra-slug]])']);
  });

  it('excludes a question with no Question Slug assigned', async () => {
    mockGetAllQuestions.mockResolvedValue({
      linkable: { stem: [{ type: 'text', value: 'Has a slug' }] },
      draft: { stem: [{ type: 'text', value: 'No slug yet' }] },
    });
    mockGetAllQuestionSlugs.mockResolvedValue({ 'has-a-slug': 'linkable' });

    showQuestionLinkPicker({ onSelect: vi.fn() });
    await flush();

    const buttons = [...document.querySelectorAll('.lesson-popup-result-btn')].map((b) => b.textContent);
    expect(buttons).toEqual(['Has a slug ([[q:has-a-slug]])']);
  });

  it('picks the alphabetically-first slug when a question has more than one', async () => {
    mockGetAllQuestions.mockResolvedValue({ qA: { stem: [{ type: 'text', value: 'Multi-slug question' }] } });
    mockGetAllQuestionSlugs.mockResolvedValue({ 'z-alias': 'qA', 'a-alias': 'qA' });

    showQuestionLinkPicker({ onSelect: vi.fn() });
    await flush();

    const button = document.querySelector('.lesson-popup-result-btn');
    expect(button.textContent).toBe('Multi-slug question ([[q:a-alias]])');
  });

  it('alerts and shows no popup when there are no linkable questions', async () => {
    mockGetAllQuestions.mockResolvedValue({ draft: { stem: [{ type: 'text', value: 'No slug' }] } });
    mockGetAllQuestionSlugs.mockResolvedValue({});

    showQuestionLinkPicker({ onSelect: vi.fn() });
    await flush();

    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('No linkable questions'));
    expect(document.querySelector('.lesson-popup')).toBeFalsy();
  });

  it('filters results as the search input changes', async () => {
    mockGetAllQuestions.mockResolvedValue({
      qA: { stem: [{ type: 'text', value: 'Loops question' }] },
      qB: { stem: [{ type: 'text', value: 'Arrays question' }] },
    });
    mockGetAllQuestionSlugs.mockResolvedValue({ loops: 'qA', arrays: 'qB' });

    showQuestionLinkPicker({ onSelect: vi.fn() });
    await flush();

    const searchInput = document.querySelector('.lesson-popup-search');
    searchInput.value = 'loop';
    searchInput.oninput();

    const buttons = [...document.querySelectorAll('.lesson-popup-result-btn')].map((b) => b.textContent);
    expect(buttons).toEqual(['Loops question ([[q:loops]])']);
  });

  it('calls onSelect with the slug and label, and closes the popup', async () => {
    mockGetAllQuestions.mockResolvedValue({ qA: { stem: [{ type: 'text', value: 'Loops question' }] } });
    mockGetAllQuestionSlugs.mockResolvedValue({ loops: 'qA' });
    const onSelect = vi.fn();

    showQuestionLinkPicker({ onSelect });
    await flush();

    document.querySelector('.lesson-popup-result-btn').click();

    expect(onSelect).toHaveBeenCalledWith({ slug: 'loops', label: 'Loops question' });
    expect(document.querySelector('.lesson-popup')).toBeFalsy();
  });

  it('closes the popup via the Close button without calling onSelect', async () => {
    mockGetAllQuestions.mockResolvedValue({ qA: { stem: [{ type: 'text', value: 'Loops question' }] } });
    mockGetAllQuestionSlugs.mockResolvedValue({ loops: 'qA' });
    const onSelect = vi.fn();

    showQuestionLinkPicker({ onSelect });
    await flush();

    document.querySelector('.popup-close-btn').click();

    expect(onSelect).not.toHaveBeenCalled();
    expect(document.querySelector('.lesson-popup')).toBeFalsy();
  });

  it('alerts on a database error without throwing', async () => {
    mockGetAllQuestions.mockRejectedValue(new Error('network down'));

    expect(() => showQuestionLinkPicker({ onSelect: vi.fn() })).not.toThrow();
    await flush();

    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Error loading questions'));
  });
});
