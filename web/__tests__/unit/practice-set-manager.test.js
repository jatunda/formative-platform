import { describe, it, expect, beforeEach, vi } from 'vitest';
import { main } from '../../practice-set-manager.js';

vi.mock('../../firebase-config.js', () => ({ db: {} }));
vi.mock('../../teacher-nav.js', () => ({ renderTeacherNav: vi.fn() }));

const mockCreateNewPracticeSet = vi.fn(async () => 'new-practice-set-id');
const mockGetAllPracticeSets = vi.fn(async () => null);
const mockGetAllPracticeSetSlugs = vi.fn(async () => ({}));
vi.mock('../../practice-set-database-utils.js', () => ({
  initializePracticeSetDatabase: vi.fn(),
  createNewPracticeSet: (...args) => mockCreateNewPracticeSet(...args),
  getAllPracticeSets: (...args) => mockGetAllPracticeSets(...args),
  getAllPracticeSetSlugs: (...args) => mockGetAllPracticeSetSlugs(...args),
}));

describe('practice-set-manager', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="practiceSetList"></div><button id="newPracticeSetBtn"></button>';
    mockCreateNewPracticeSet.mockClear();
    mockGetAllPracticeSets.mockReset().mockResolvedValue(null);
    mockGetAllPracticeSetSlugs.mockReset().mockResolvedValue({});

    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
  });

  describe('main', () => {
    it('shows a message when there are no practice sets', async () => {
      await main();
      expect(document.getElementById('practiceSetList').textContent).toContain('No practice sets yet');
    });

    it('lists each practice set with its title, question count, and assigned slugs', async () => {
      mockGetAllPracticeSets.mockResolvedValue({
        abc: { title: 'Unit 3 Review', questionIds: ['q1', 'q2'] },
        def: { title: 'Daily Practice', questionIds: ['q1'] },
      });
      mockGetAllPracticeSetSlugs.mockResolvedValue({ 'unit-3-review': 'abc' });

      await main();

      const list = document.getElementById('practiceSetList');
      expect(list.textContent).toContain('Unit 3 Review');
      expect(list.textContent).toContain('2 questions');
      expect(list.textContent).toContain('Daily Practice');
      expect(list.textContent).toContain('1 question');
      expect(list.querySelectorAll('a[href="/practice/unit-3-review"]')).toHaveLength(1);
    });

    it('shows a placeholder for a practice set with no assigned slug', async () => {
      mockGetAllPracticeSets.mockResolvedValue({ abc: { title: 'Draft', questionIds: [] } });

      await main();

      expect(document.getElementById('practiceSetList').textContent).toContain('No URL assigned');
    });

    it('falls back to the untitled label for a practice set with no title', async () => {
      mockGetAllPracticeSets.mockResolvedValue({ abc: { questionIds: [] } });

      await main();

      expect(document.getElementById('practiceSetList').textContent).toContain('(untitled)');
    });

    it('creates a new practice set and navigates to its editor when New Practice Set is clicked', async () => {
      await main();

      document.getElementById('newPracticeSetBtn').onclick();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockCreateNewPracticeSet).toHaveBeenCalled();
      expect(window.location.href).toContain('practice-set-editor.html?practiceSet=new-practice-set-id');
    });
  });
});
