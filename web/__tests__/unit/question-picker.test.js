import { describe, it, expect, beforeEach, vi } from 'vitest';
import { showQuestionPicker } from '../../question-picker.js';

const mockGetAllQuestions = vi.fn();
vi.mock('../../question-database-utils.js', () => ({
  getAllQuestions: (...args) => mockGetAllQuestions(...args),
}));

const mockGetClasses = vi.fn();
vi.mock('../../database-utils.js', () => ({
  getClasses: (...args) => mockGetClasses(...args),
}));

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('showQuestionPicker', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.alert = vi.fn();
    global.console.error = vi.fn();
    mockGetAllQuestions.mockReset();
    mockGetClasses.mockReset().mockResolvedValue({ c1: { name: 'AP CS A' }, c2: { name: 'AP CS P' } });
  });

  it('lists every question with its derived label and topic', async () => {
    mockGetAllQuestions.mockResolvedValue({
      q1: { stem: [{ type: 'text', value: 'What is 2 + 2?' }], classId: 'c1', topic: 'arithmetic' },
    });

    showQuestionPicker({ onSelect: vi.fn() });
    await flush();

    const buttons = [...document.querySelectorAll('.lesson-popup-result-btn')].map((b) => b.textContent);
    expect(buttons).toEqual(['What is 2 + 2? (arithmetic)']);
  });

  it('populates the Class dropdown from existing classes, sorted by name', async () => {
    mockGetAllQuestions.mockResolvedValue({ q1: { stem: [], classId: 'c1', topic: '' } });

    showQuestionPicker({ onSelect: vi.fn() });
    await flush();

    const options = [...document.querySelector('select').options].map((o) => o.textContent);
    expect(options).toEqual(['All classes', 'AP CS A', 'AP CS P']);
  });

  it('filters results by selected class', async () => {
    mockGetAllQuestions.mockResolvedValue({
      q1: { stem: [{ type: 'text', value: 'Class A question' }], classId: 'c1', topic: '' },
      q2: { stem: [{ type: 'text', value: 'Class P question' }], classId: 'c2', topic: '' },
    });

    showQuestionPicker({ onSelect: vi.fn() });
    await flush();

    const select = document.querySelector('select');
    select.value = 'c1';
    select.onchange();

    const buttons = [...document.querySelectorAll('.lesson-popup-result-btn')].map((b) => b.textContent);
    expect(buttons).toEqual(['Class A question']);
  });

  it('filters results by topic or stem text as the search input changes', async () => {
    mockGetAllQuestions.mockResolvedValue({
      q1: { stem: [{ type: 'text', value: 'Loops question' }], classId: 'c1', topic: 'loops' },
      q2: { stem: [{ type: 'text', value: 'Arrays question' }], classId: 'c1', topic: 'arrays' },
    });

    showQuestionPicker({ onSelect: vi.fn() });
    await flush();

    const searchInput = document.querySelector('.lesson-popup-search');
    searchInput.value = 'loop';
    searchInput.oninput();

    const buttons = [...document.querySelectorAll('.lesson-popup-result-btn')].map((b) => b.textContent);
    expect(buttons).toEqual(['Loops question (loops)']);
  });

  it('alerts and shows no popup when there are no questions', async () => {
    mockGetAllQuestions.mockResolvedValue({});

    showQuestionPicker({ onSelect: vi.fn() });
    await flush();

    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('No questions found'));
    expect(document.querySelector('.lesson-popup')).toBeFalsy();
  });

  it('calls onSelect with the questionId and label, and closes the popup', async () => {
    mockGetAllQuestions.mockResolvedValue({
      q1: { stem: [{ type: 'text', value: 'What is 2 + 2?' }], classId: 'c1', topic: 'arithmetic' },
    });
    const onSelect = vi.fn();

    showQuestionPicker({ onSelect });
    await flush();

    document.querySelector('.lesson-popup-result-btn').click();

    expect(onSelect).toHaveBeenCalledWith({ questionId: 'q1', label: 'What is 2 + 2?' });
    expect(document.querySelector('.lesson-popup')).toBeFalsy();
  });

  it('closes the popup via the Close button without calling onSelect', async () => {
    mockGetAllQuestions.mockResolvedValue({ q1: { stem: [{ type: 'text', value: 'Q' }], classId: 'c1', topic: '' } });
    const onSelect = vi.fn();

    showQuestionPicker({ onSelect });
    await flush();

    document.querySelector('.popup-close-btn').click();

    expect(onSelect).not.toHaveBeenCalled();
    expect(document.querySelector('.lesson-popup')).toBeFalsy();
  });

  it('alerts on a database error without throwing', async () => {
    mockGetAllQuestions.mockRejectedValue(new Error('network down'));

    expect(() => showQuestionPicker({ onSelect: vi.fn() })).not.toThrow();
    await flush();

    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Error loading questions'));
  });
});
