import { describe, it, expect, beforeEach } from 'vitest';
import { createSlugIndex, isValidSlugFormat } from '../../slug-index.js';
import { createMockDatabase } from '../helpers/mock-firebase.js';

const LESSONS = {
  indexPath: 'lessonSlugIndex',
  formatExample: 'unit-1',
  takenMessage: (slug) => `"/l/${slug}" is already in use by another lesson.`,
};
const QUIZZES = {
  indexPath: 'quizSlugIndex',
  formatExample: 'quiz-1',
  takenMessage: (slug) => `"/z/${slug}" is already in use by another quiz.`,
};

let db;

/** Adapts the Firebase test double to the Slug index's store port. */
function storeFor(mockDb) {
  return {
    read: async (path) => {
      const snap = await mockDb.get(mockDb.ref(path));
      return snap.exists() ? snap.val() : null;
    },
    update: (updates) => mockDb.update(updates),
  };
}

async function read(path) {
  const snap = await db.get(db.ref(path));
  return snap.exists() ? snap.val() : null;
}

describe('slug-index', () => {
  let lessons;
  let quizzes;

  beforeEach(() => {
    db = createMockDatabase();
    lessons = createSlugIndex(LESSONS, storeFor(db));
    quizzes = createSlugIndex(QUIZZES, storeFor(db));
  });

  describe('claim', () => {
    it('claims a free Slug for an entity', async () => {
      await lessons.claim('lesson-a', 'unit-1');
      expect(await lessons.resolve('unit-1')).toBe('lesson-a');
    });

    it('rejects a malformed Slug with the namespace\'s example, writing nothing', async () => {
      await expect(lessons.claim('lesson-a', 'Unit 1')).rejects.toThrow(
        'Slugs must be lowercase letters, numbers, and hyphens only (e.g. "unit-1").'
      );
      expect(await read('lessonSlugIndex')).toBeNull();
    });

    it('refuses a Slug already taken by another entity, with the namespace\'s message', async () => {
      await lessons.claim('lesson-a', 'unit-1');
      await expect(lessons.claim('lesson-b', 'unit-1')).rejects.toThrow(
        '"/l/unit-1" is already in use by another lesson.'
      );
      expect(await lessons.resolve('unit-1')).toBe('lesson-a');
    });

    it('lets an entity re-claim a Slug it already owns', async () => {
      await lessons.claim('lesson-a', 'unit-1');
      await lessons.claim('lesson-a', 'unit-1');
      expect(await lessons.resolve('unit-1')).toBe('lesson-a');
    });
  });

  describe('rename', () => {
    it('moves the Slug to the new text, still pointing at the same entity', async () => {
      await lessons.claim('lesson-a', 'old-slug');
      await lessons.rename('lesson-a', 'old-slug', 'new-slug');
      expect(await lessons.resolve('old-slug')).toBeNull();
      expect(await lessons.resolve('new-slug')).toBe('lesson-a');
    });

    it('rejects a malformed new Slug without changing anything', async () => {
      await lessons.claim('lesson-a', 'old-slug');
      await expect(lessons.rename('lesson-a', 'old-slug', 'Bad Slug')).rejects.toThrow('(e.g. "unit-1")');
      expect(await lessons.resolve('old-slug')).toBe('lesson-a');
    });

    it('rejects a new Slug taken by another entity without changing anything', async () => {
      await lessons.claim('lesson-a', 'old-slug');
      await lessons.claim('lesson-b', 'new-slug');
      await expect(lessons.rename('lesson-a', 'old-slug', 'new-slug')).rejects.toThrow(
        '"/l/new-slug" is already in use by another lesson.'
      );
      expect(await lessons.resolve('old-slug')).toBe('lesson-a');
      expect(await lessons.resolve('new-slug')).toBe('lesson-b');
    });
  });

  describe('renameUpdates', () => {
    it('returns the swap as update paths without writing, so a caller can fold it into one atomic update', async () => {
      await lessons.claim('lesson-a', 'old-slug');
      const updates = await lessons.renameUpdates('lesson-a', 'old-slug', 'new-slug');
      expect(updates).toEqual({
        'lessonSlugIndex/old-slug': null,
        'lessonSlugIndex/new-slug': 'lesson-a',
      });
      expect(await lessons.resolve('old-slug')).toBe('lesson-a');
    });

    it('validates the new Slug the same way rename does', async () => {
      await lessons.claim('lesson-b', 'new-slug');
      await expect(lessons.renameUpdates('lesson-a', 'old-slug', 'new-slug')).rejects.toThrow('already in use');
    });
  });

  describe('release', () => {
    it('frees one Slug, leaving the entity\'s other Slugs in place', async () => {
      await lessons.claim('lesson-a', 'unit-1');
      await lessons.claim('lesson-a', 'unit-1-intro');
      await lessons.release('unit-1');
      expect(await lessons.resolve('unit-1')).toBeNull();
      expect(await lessons.resolve('unit-1-intro')).toBe('lesson-a');
    });

    it('lets another entity claim a released Slug', async () => {
      await lessons.claim('lesson-a', 'unit-1');
      await lessons.release('unit-1');
      await lessons.claim('lesson-b', 'unit-1');
      expect(await lessons.resolve('unit-1')).toBe('lesson-b');
    });
  });

  describe('releaseAllUpdates', () => {
    it('returns removals for every Slug the entity holds, without writing, leaving other entities\' Slugs alone', async () => {
      await lessons.claim('lesson-a', 'unit-1');
      await lessons.claim('lesson-a', 'unit-1-intro');
      await lessons.claim('lesson-b', 'unit-2');
      await quizzes.claim('lesson-a', 'unit-1');

      const updates = await lessons.releaseAllUpdates('lesson-a');

      expect(updates).toEqual({
        'lessonSlugIndex/unit-1': null,
        'lessonSlugIndex/unit-1-intro': null,
      });
      expect(await lessons.resolve('unit-1')).toBe('lesson-a');
    });

    it('returns no updates for an entity with no Slugs', async () => {
      expect(await lessons.releaseAllUpdates('lesson-a')).toEqual({});
    });
  });

  describe('getAll', () => {
    it('returns the namespace\'s whole Slug -> entity map', async () => {
      await lessons.claim('lesson-a', 'unit-1');
      await lessons.claim('lesson-b', 'unit-2');
      await quizzes.claim('quiz-a', 'quiz-1');
      expect(await lessons.getAll()).toEqual({ 'unit-1': 'lesson-a', 'unit-2': 'lesson-b' });
    });

    it('returns {} for an empty namespace', async () => {
      expect(await lessons.getAll()).toEqual({});
    });
  });

  describe('isValidSlugFormat', () => {
    it.each(['syllabus', 'syllabus-2026', 'a1-b2-c3'])('accepts %j', (slug) => {
      expect(isValidSlugFormat(slug)).toBe(true);
    });

    it.each(['', 'Syllabus', 'unit 3', '-unit', 'unit-', 'unit--3', 'q:loops', null, 3])('rejects %j', (slug) => {
      expect(isValidSlugFormat(slug)).toBe(false);
    });
  });

  describe('namespaces', () => {
    it('keeps the same Slug text separate across namespaces', async () => {
      await lessons.claim('lesson-a', 'shared');
      await quizzes.claim('quiz-a', 'shared');
      expect(await lessons.resolve('shared')).toBe('lesson-a');
      expect(await quizzes.resolve('shared')).toBe('quiz-a');
    });
  });

  describe('resolve', () => {
    it('returns null for an unknown Slug', async () => {
      expect(await lessons.resolve('missing')).toBeNull();
    });
  });
});
