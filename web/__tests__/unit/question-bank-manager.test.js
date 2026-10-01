import { describe, it, expect, beforeEach, vi } from 'vitest';
import { main } from '../../question-bank-manager.js';

vi.mock('../../firebase-config.js', () => ({ db: {} }));
vi.mock('../../teacher-nav.js', () => ({ renderTeacherNav: vi.fn() }));

const mockGetClasses = vi.fn(async () => ({}));
vi.mock('../../database-utils.js', () => ({
  initializeDatabase: vi.fn(),
  getClasses: (...args) => mockGetClasses(...args),
}));

const mockCreateNewQuestion = vi.fn(async () => 'new-question-id');
const mockGetAllQuestions = vi.fn(async () => null);
const mockGetAllQuestionSlugs = vi.fn(async () => ({}));
vi.mock('../../question-database-utils.js', () => ({
  initializeQuestionDatabase: vi.fn(),
  createNewQuestion: (...args) => mockCreateNewQuestion(...args),
  getAllQuestions: (...args) => mockGetAllQuestions(...args),
  getAllQuestionSlugs: (...args) => mockGetAllQuestionSlugs(...args),
}));

function renderDom() {
  document.body.innerHTML = `
    <button id="newQuestionBtn"></button>
    <select id="classFilter"><option value="">All classes</option></select>
    <input id="topicFilter" />
    <div id="questionList"></div>
  `;
}

describe('question-bank-manager', () => {
  beforeEach(() => {
    renderDom();
    mockGetClasses.mockReset().mockResolvedValue({ c1: { name: 'AP CS A' }, c2: { name: 'AP CS P' } });
    mockCreateNewQuestion.mockClear();
    mockGetAllQuestions.mockReset().mockResolvedValue(null);
    mockGetAllQuestionSlugs.mockReset().mockResolvedValue({});

    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
  });

  describe('main', () => {
    it('shows a message when there are no questions', async () => {
      await main();
      expect(document.getElementById('questionList').textContent).toContain('No questions match');
    });

    it('populates the Class filter from existing classes, sorted by name', async () => {
      await main();
      const options = [...document.getElementById('classFilter').options].map((o) => o.textContent);
      expect(options).toEqual(['All classes', 'AP CS A', 'AP CS P']);
    });

    it('lists each question with a derived label, class name, topic, and assigned Question Links', async () => {
      mockGetAllQuestions.mockResolvedValue({
        abc: { stem: [{ type: 'text', value: 'What is 2 + 2?' }], classId: 'c1', topic: 'arithmetic' },
      });
      mockGetAllQuestionSlugs.mockResolvedValue({ 'arithmetic-1': 'abc' });

      await main();

      const list = document.getElementById('questionList');
      expect(list.textContent).toContain('What is 2 + 2?');
      expect(list.textContent).toContain('AP CS A');
      expect(list.textContent).toContain('arithmetic');
      expect(list.querySelector('code').textContent).toBe('[[q:arithmetic-1]]');
    });

    it('falls back to a placeholder label for a question with no stem text yet', async () => {
      mockGetAllQuestions.mockResolvedValue({ abc: { stem: [], classId: null, topic: '' } });

      await main();

      const list = document.getElementById('questionList');
      expect(list.textContent).toContain('(empty question)');
      expect(list.textContent).toContain('(no class)');
      expect(list.textContent).toContain('(no topic)');
    });

    it('filters by selected class', async () => {
      mockGetAllQuestions.mockResolvedValue({
        a: { stem: [{ type: 'text', value: 'Class A question' }], classId: 'c1', topic: 't' },
        b: { stem: [{ type: 'text', value: 'Class P question' }], classId: 'c2', topic: 't' },
      });

      await main();
      document.getElementById('classFilter').value = 'c1';
      document.getElementById('classFilter').onchange();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const list = document.getElementById('questionList');
      expect(list.textContent).toContain('Class A question');
      expect(list.textContent).not.toContain('Class P question');
    });

    it('filters by topic substring, case-insensitively', async () => {
      mockGetAllQuestions.mockResolvedValue({
        a: { stem: [{ type: 'text', value: 'Loops question' }], classId: 'c1', topic: 'Loops' },
        b: { stem: [{ type: 'text', value: 'Arrays question' }], classId: 'c1', topic: 'Arrays' },
      });

      await main();
      document.getElementById('topicFilter').value = 'loop';
      document.getElementById('topicFilter').oninput();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const list = document.getElementById('questionList');
      expect(list.textContent).toContain('Loops question');
      expect(list.textContent).not.toContain('Arrays question');
    });

    it('creates a new question and navigates to its editor when New Question is clicked', async () => {
      await main();

      document.getElementById('newQuestionBtn').onclick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockCreateNewQuestion).toHaveBeenCalled();
      expect(window.location.href).toContain('question-editor.html?question=new-question-id');
    });
  });
});
