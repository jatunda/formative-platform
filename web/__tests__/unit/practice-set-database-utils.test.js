import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initializePracticeSetDatabase,
  createNewPracticeSet,
  getPracticeSetFromDB,
  getAllPracticeSets,
  savePracticeSet,
  getAllPracticeSetSlugs,
  assignPracticeSetSlug,
  removePracticeSetSlug,
  renamePracticeSetSlug,
  resolvePracticeSetSlugToId,
  deletePracticeSetAndSlugs
} from '../../practice-set-database-utils.js';

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

const mockGenerateUniqueHash = vi.fn(async () => 'practice-set-hash-1');
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

describe('practice-set-database-utils', () => {
  beforeEach(() => {
    mockData = {};
    mockGenerateUniqueHash.mockClear();
    mockGenerateUniqueHash.mockResolvedValue('practice-set-hash-1');

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

    initializePracticeSetDatabase({});
  });

  describe('createNewPracticeSet', () => {
    it('creates a practice set with the default title under a generated id', async () => {
      const practiceSetId = await createNewPracticeSet();
      expect(practiceSetId).toBe('practice-set-hash-1');
      expect(getAtPath('practiceSets/practice-set-hash-1')).toEqual({ title: 'Empty Practice Set' });
      expect(mockGenerateUniqueHash).toHaveBeenCalledWith('practiceSets');
    });

    it('creates a practice set with a custom title', async () => {
      const practiceSetId = await createNewPracticeSet('Unit 3 Review');
      expect(getAtPath(`practiceSets/${practiceSetId}`)).toEqual({ title: 'Unit 3 Review' });
    });
  });

  describe('getPracticeSetFromDB / getAllPracticeSets / savePracticeSet', () => {
    it('returns null for a practice set that does not exist', async () => {
      expect(await getPracticeSetFromDB('missing')).toBeNull();
    });

    it('saves and retrieves a practice set', async () => {
      await savePracticeSet('abc', { title: 'Unit 3', questionIds: ['q1', 'q2'] });
      expect(await getPracticeSetFromDB('abc')).toEqual({ title: 'Unit 3', questionIds: ['q1', 'q2'] });
    });

    it('throws when saving content missing a title or questionIds', async () => {
      await expect(savePracticeSet('abc', { questionIds: [] })).rejects.toThrow('Invalid practice set');
      await expect(savePracticeSet('abc', { title: 'T', questionIds: null })).rejects.toThrow('Invalid practice set');
    });

    it('returns all practice sets', async () => {
      setAtPath('practiceSets', { a: { title: 'A' }, b: { title: 'B' } });
      expect(await getAllPracticeSets()).toEqual({ a: { title: 'A' }, b: { title: 'B' } });
    });
  });

  describe('assignPracticeSetSlug / removePracticeSetSlug / resolvePracticeSetSlugToId', () => {
    it('assigns a free slug', async () => {
      await assignPracticeSetSlug('abc', 'unit-3-review');
      expect(getAtPath('practiceSetSlugIndex/unit-3-review')).toBe('abc');
    });

    it('rejects a malformed slug', async () => {
      await expect(assignPracticeSetSlug('abc', 'Unit 3')).rejects.toThrow('lowercase letters');
    });

    it('rejects a slug already owned by a different practice set', async () => {
      setAtPath('practiceSetSlugIndex/unit-3-review', 'other-set');
      await expect(assignPracticeSetSlug('abc', 'unit-3-review')).rejects.toThrow('already in use');
    });

    it('removes a slug', async () => {
      setAtPath('practiceSetSlugIndex/unit-3-review', 'abc');
      await removePracticeSetSlug('unit-3-review');
      expect(getAtPath('practiceSetSlugIndex/unit-3-review')).toBeUndefined();
    });

    it('resolves a known slug', async () => {
      setAtPath('practiceSetSlugIndex/unit-3-review', 'abc');
      expect(await resolvePracticeSetSlugToId('unit-3-review')).toBe('abc');
    });

    it('returns null for an unknown slug', async () => {
      expect(await resolvePracticeSetSlugToId('missing')).toBeNull();
    });
  });

  describe('renamePracticeSetSlug', () => {
    it('swaps the slugIndex entry from old to new with a bare update, no other writes', async () => {
      setAtPath('practiceSetSlugIndex/old-slug', 'abc');
      await renamePracticeSetSlug('abc', 'old-slug', 'new-slug');
      expect(getAtPath('practiceSetSlugIndex/old-slug')).toBeUndefined();
      expect(getAtPath('practiceSetSlugIndex/new-slug')).toBe('abc');
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith({
        'practiceSetSlugIndex/old-slug': null,
        'practiceSetSlugIndex/new-slug': 'abc',
      });
    });

    it('rejects a malformed new slug without changing anything', async () => {
      setAtPath('practiceSetSlugIndex/old-slug', 'abc');
      await expect(renamePracticeSetSlug('abc', 'old-slug', 'Bad Slug')).rejects.toThrow('lowercase letters');
      expect(getAtPath('practiceSetSlugIndex/old-slug')).toBe('abc');
    });

    it('rejects a new slug already taken by a different practice set', async () => {
      setAtPath('practiceSetSlugIndex/old-slug', 'abc');
      setAtPath('practiceSetSlugIndex/new-slug', 'other-set');
      await expect(renamePracticeSetSlug('abc', 'old-slug', 'new-slug')).rejects.toThrow('already in use');
      expect(getAtPath('practiceSetSlugIndex/old-slug')).toBe('abc');
    });
  });

  describe('deletePracticeSetAndSlugs', () => {
    it('deletes the practice set and every slug pointing to it, leaving others untouched', async () => {
      setAtPath('practiceSets/abc', { title: 'To Delete' });
      setAtPath('practiceSets/other', { title: 'Keep Me' });
      setAtPath('practiceSetSlugIndex', { 'unit-3': 'abc', 'unit-3-review': 'abc', unrelated: 'other' });

      await deletePracticeSetAndSlugs('abc');

      expect(getAtPath('practiceSets/abc')).toBeUndefined();
      expect(getAtPath('practiceSets/other')).toEqual({ title: 'Keep Me' });
      expect(getAtPath('practiceSetSlugIndex/unit-3')).toBeUndefined();
      expect(getAtPath('practiceSetSlugIndex/unit-3-review')).toBeUndefined();
      expect(getAtPath('practiceSetSlugIndex/unrelated')).toBe('other');
    });
  });
});
