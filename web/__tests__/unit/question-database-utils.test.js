import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initializeQuestionDatabase,
  createNewQuestion,
  getQuestionFromDB,
  getAllQuestions,
  saveQuestion,
  resolveClassNameToId,
  getAllQuestionSlugs,
  assignQuestionSlug,
  removeQuestionSlug,
  renameQuestionSlug,
  resolveQuestionSlugToId,
  deleteQuestionAndSlugs,
  getQuestionBacklinks,
  updateQuestionBacklinksForPage
} from '../../question-database-utils.js';

// Mock Firebase - same in-memory path-keyed store pattern as page-database-utils.test.js
let mockData = {};
let mockGet = vi.fn();
let mockSet = vi.fn();
let mockUpdate = vi.fn();
let mockRemove = vi.fn();

vi.mock('https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js', () => ({
  ref: (db, path = '') => ({ path }),
  get: (ref) => mockGet(ref),
  set: (ref, value) => mockSet(ref, value),
  update: (ref, updates) => mockUpdate(updates),
  remove: (ref) => mockRemove(ref),
}));

const mockGenerateUniqueHash = vi.fn(async () => 'question-hash-1');
vi.mock('../../database-utils.js', () => ({
  generateUniqueHash: (...args) => mockGenerateUniqueHash(...args),
}));

function getAtPath(path) {
  const parts = path.split('/').filter(Boolean);
  let value = mockData;
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }
  return value;
}

function setAtPath(path, value) {
  const parts = path.split('/').filter(Boolean);
  let current = mockData;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  const key = parts[parts.length - 1];
  if (value === null) {
    delete current[key];
  } else {
    current[key] = value;
  }
}

describe('question-database-utils', () => {
  beforeEach(() => {
    mockData = {};
    mockGenerateUniqueHash.mockClear();
    mockGenerateUniqueHash.mockResolvedValue('question-hash-1');

    mockGet.mockReset();
    mockGet.mockImplementation((ref) => {
      const value = getAtPath(ref.path);
      return Promise.resolve({ exists: () => value !== undefined, val: () => value });
    });

    mockSet.mockReset();
    mockSet.mockImplementation((ref, value) => {
      setAtPath(ref.path, value);
      return Promise.resolve();
    });

    mockUpdate.mockReset();
    mockUpdate.mockImplementation((updates) => {
      for (const [path, value] of Object.entries(updates)) {
        setAtPath(path, value);
      }
      return Promise.resolve();
    });

    mockRemove.mockReset();
    mockRemove.mockImplementation((ref) => {
      setAtPath(ref.path, null);
      return Promise.resolve();
    });

    initializeQuestionDatabase({});
  });

  describe('createNewQuestion', () => {
    it('creates a question under a generated id with a placeholder field', async () => {
      const questionId = await createNewQuestion();
      expect(questionId).toBe('question-hash-1');
      expect(getAtPath('questions/question-hash-1')).toHaveProperty('createdAt');
      expect(mockGenerateUniqueHash).toHaveBeenCalledWith('questions');
    });
  });

  describe('getQuestionFromDB / getAllQuestions / saveQuestion', () => {
    it('returns null for a question that does not exist', async () => {
      expect(await getQuestionFromDB('missing')).toBeNull();
    });

    it('saves and retrieves a question', async () => {
      const parsed = { stem: [{ type: 'text', value: 'Q' }], options: [], classId: 'c1', topic: 't' };
      await saveQuestion('abc', parsed);
      expect(await getQuestionFromDB('abc')).toEqual(parsed);
    });

    it('throws when saving content missing stem or options', async () => {
      await expect(saveQuestion('abc', { options: [] })).rejects.toThrow('Invalid question content');
      await expect(saveQuestion('abc', { stem: [] })).rejects.toThrow('Invalid question content');
    });

    it('returns all questions', async () => {
      setAtPath('questions', { a: { stem: [] }, b: { stem: [] } });
      expect(await getAllQuestions()).toEqual({ a: { stem: [] }, b: { stem: [] } });
    });
  });

  describe('resolveClassNameToId', () => {
    it('resolves a class by exact name match', async () => {
      setAtPath('classes', { c1: { name: 'AP CS A' }, c2: { name: 'AP CS P' } });
      expect(await resolveClassNameToId('AP CS A')).toBe('c1');
    });

    it('trims whitespace before matching', async () => {
      setAtPath('classes', { c1: { name: 'AP CS A' } });
      expect(await resolveClassNameToId('  AP CS A  ')).toBe('c1');
    });

    it('throws when no class matches', async () => {
      setAtPath('classes', { c1: { name: 'AP CS A' } });
      await expect(resolveClassNameToId('Nonexistent')).rejects.toThrow('No class named');
    });

    it('throws when multiple classes share the same name', async () => {
      setAtPath('classes', { c1: { name: 'Period 1' }, c2: { name: 'Period 1' } });
      await expect(resolveClassNameToId('Period 1')).rejects.toThrow('Multiple classes');
    });
  });

  describe('assignQuestionSlug / removeQuestionSlug / resolveQuestionSlugToId', () => {
    it('assigns a free slug', async () => {
      await assignQuestionSlug('abc', 'loops-1');
      expect(getAtPath('questionSlugIndex/loops-1')).toBe('abc');
    });

    it('rejects a malformed slug', async () => {
      await expect(assignQuestionSlug('abc', 'Loops 1')).rejects.toThrow('lowercase letters');
    });

    it('rejects a slug already owned by a different question', async () => {
      setAtPath('questionSlugIndex/loops-1', 'other-question');
      await expect(assignQuestionSlug('abc', 'loops-1')).rejects.toThrow('already in use');
    });

    it('removes a slug', async () => {
      setAtPath('questionSlugIndex/loops-1', 'abc');
      await removeQuestionSlug('loops-1');
      expect(getAtPath('questionSlugIndex/loops-1')).toBeUndefined();
    });

    it('resolves a known slug', async () => {
      setAtPath('questionSlugIndex/loops-1', 'abc');
      expect(await resolveQuestionSlugToId('loops-1')).toBe('abc');
    });

    it('returns null for an unknown slug', async () => {
      expect(await resolveQuestionSlugToId('missing')).toBeNull();
    });
  });

  describe('getQuestionBacklinks / updateQuestionBacklinksForPage', () => {
    it('returns the source pageIds that link to this question', async () => {
      setAtPath('questionBacklinks/target', { page1: true, page2: true });
      expect(await getQuestionBacklinks('target')).toEqual(['page1', 'page2']);
    });

    it('adds a backlink for a newly-referenced question', async () => {
      setAtPath('questionSlugIndex/loops-1', 'question-id');
      const parsed = { title: 'T', blocks: [{ type: 'question', content: [{ type: 'text', value: '[[q:loops-1]]' }] }] };

      await updateQuestionBacklinksForPage('page-id', parsed);

      expect(getAtPath('questionBacklinks/question-id/page-id')).toBe(true);
      expect(getAtPath('pages/page-id/questionLinksTo')).toEqual(['question-id']);
    });

    it('removes a stale backlink when a link is deleted from the content', async () => {
      setAtPath('pages/page-id/questionLinksTo', ['old-target']);
      setAtPath('questionBacklinks/old-target/page-id', true);
      const parsed = { title: 'T', blocks: [{ type: 'question', content: [{ type: 'text', value: 'no links here' }] }] };

      await updateQuestionBacklinksForPage('page-id', parsed);

      expect(getAtPath('questionBacklinks/old-target/page-id')).toBeUndefined();
      expect(getAtPath('pages/page-id/questionLinksTo')).toBeUndefined();
    });

    it('does nothing when the set of linked questions has not changed', async () => {
      setAtPath('questionSlugIndex/loops-1', 'question-id');
      setAtPath('pages/page-id/questionLinksTo', ['question-id']);
      setAtPath('questionBacklinks/question-id/page-id', true);
      const parsed = { title: 'T', blocks: [{ type: 'question', content: [{ type: 'text', value: '[[q:loops-1]]' }] }] };

      await updateQuestionBacklinksForPage('page-id', parsed);

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('renameQuestionSlug', () => {
    it('swaps the questionSlugIndex entry from old to new', async () => {
      setAtPath('questionSlugIndex/old-slug', 'abc');
      await renameQuestionSlug('abc', 'old-slug', 'new-slug');
      expect(getAtPath('questionSlugIndex/old-slug')).toBeUndefined();
      expect(getAtPath('questionSlugIndex/new-slug')).toBe('abc');
    });

    it('rejects a new slug already taken by a different question', async () => {
      setAtPath('questionSlugIndex/old-slug', 'abc');
      setAtPath('questionSlugIndex/new-slug', 'other-question');
      await expect(renameQuestionSlug('abc', 'old-slug', 'new-slug')).rejects.toThrow('already in use');
      expect(getAtPath('questionSlugIndex/old-slug')).toBe('abc');
    });

    it('rewrites every backlinked page\'s Question Link to the new slug', async () => {
      setAtPath('questionSlugIndex/old-slug', 'abc');
      setAtPath('questionBacklinks/abc', { page1: true });
      setAtPath('pages/page1', {
        title: 'Source',
        blocks: [{ type: 'question', content: [{ type: 'text', value: 'Try [[q:old-slug|Practice]].' }] }]
      });

      await renameQuestionSlug('abc', 'old-slug', 'new-slug');

      expect(getAtPath('pages/page1').blocks[0].content[0].value).toBe('Try [[q:new-slug|Practice]].');
    });
  });

  describe('deleteQuestionAndSlugs', () => {
    it('deletes the question and every slug pointing to it, leaving others untouched', async () => {
      setAtPath('questions/abc', { stem: [] });
      setAtPath('questions/other', { stem: [] });
      setAtPath('questionSlugIndex', { 'loops-1': 'abc', 'loops-2': 'abc', unrelated: 'other' });

      await deleteQuestionAndSlugs('abc');

      expect(getAtPath('questions/abc')).toBeUndefined();
      expect(getAtPath('questions/other')).toEqual({ stem: [] });
      expect(getAtPath('questionSlugIndex/loops-1')).toBeUndefined();
      expect(getAtPath('questionSlugIndex/loops-2')).toBeUndefined();
      expect(getAtPath('questionSlugIndex/unrelated')).toBe('other');
    });

    it('removes this question\'s own incoming backlinks entry', async () => {
      setAtPath('questions/abc', { stem: [] });
      setAtPath('questionBacklinks/abc', { page1: true });

      await deleteQuestionAndSlugs('abc');

      expect(getAtPath('questionBacklinks/abc')).toBeUndefined();
    });
  });
});
