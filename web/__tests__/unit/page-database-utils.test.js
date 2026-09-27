import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initializePageDatabase,
  isValidSlugFormat,
  createNewPage,
  getPageFromDB,
  getAllPages,
  savePage,
  getAllSlugs,
  assignSlug,
  removeSlug,
  resolveSlugToPageId,
  deletePageAndSlugs
} from '../../page-database-utils.js';

// Mock Firebase - same in-memory path-keyed store pattern as database-utils.test.js
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

const mockGenerateUniqueHash = vi.fn(async () => 'page-hash-1');
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

describe('page-database-utils', () => {
  beforeEach(() => {
    mockData = {};
    mockGenerateUniqueHash.mockClear();
    mockGenerateUniqueHash.mockResolvedValue('page-hash-1');

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

    initializePageDatabase({});
  });

  describe('isValidSlugFormat', () => {
    it('accepts a single lowercase word', () => {
      expect(isValidSlugFormat('syllabus')).toBe(true);
    });

    it('accepts lowercase words joined by single hyphens', () => {
      expect(isValidSlugFormat('syllabus-2026')).toBe(true);
    });

    it('rejects uppercase letters', () => {
      expect(isValidSlugFormat('Syllabus')).toBe(false);
    });

    it('rejects spaces', () => {
      expect(isValidSlugFormat('my syllabus')).toBe(false);
    });

    it('rejects a leading or trailing hyphen', () => {
      expect(isValidSlugFormat('-syllabus')).toBe(false);
      expect(isValidSlugFormat('syllabus-')).toBe(false);
    });

    it('rejects repeated hyphens', () => {
      expect(isValidSlugFormat('syllabus--2026')).toBe(false);
    });

    it('rejects an empty string or non-string input', () => {
      expect(isValidSlugFormat('')).toBe(false);
      expect(isValidSlugFormat(null)).toBe(false);
      expect(isValidSlugFormat(42)).toBe(false);
    });
  });

  describe('createNewPage', () => {
    it('creates a page with the default title under a generated id', async () => {
      const pageId = await createNewPage();
      expect(pageId).toBe('page-hash-1');
      expect(getAtPath('pages/page-hash-1')).toEqual({ title: 'Empty Page' });
      expect(mockGenerateUniqueHash).toHaveBeenCalledWith('pages');
    });

    it('creates a page with a custom title', async () => {
      const pageId = await createNewPage('Syllabus');
      expect(getAtPath(`pages/${pageId}`)).toEqual({ title: 'Syllabus' });
    });
  });

  describe('getPageFromDB', () => {
    it('returns the page data when it exists', async () => {
      setAtPath('pages/abc', { title: 'Found', blocks: [] });
      expect(await getPageFromDB('abc')).toEqual({ title: 'Found', blocks: [] });
    });

    it('returns null when the page does not exist', async () => {
      expect(await getPageFromDB('missing')).toBeNull();
    });
  });

  describe('getAllPages', () => {
    it('returns all pages', async () => {
      setAtPath('pages', { a: { title: 'A' }, b: { title: 'B' } });
      expect(await getAllPages()).toEqual({ a: { title: 'A' }, b: { title: 'B' } });
    });

    it('returns null when there are no pages', async () => {
      expect(await getAllPages()).toBeNull();
    });
  });

  describe('savePage', () => {
    it('saves valid parsed content', async () => {
      await savePage('abc', { title: 'T', blocks: [{}] });
      expect(getAtPath('pages/abc')).toEqual({ title: 'T', blocks: [{}] });
    });

    it('throws on missing title or blocks', async () => {
      await expect(savePage('abc', { title: '', blocks: [] })).rejects.toThrow('Invalid page content');
      await expect(savePage('abc', { title: 'T', blocks: null })).rejects.toThrow('Invalid page content');
    });
  });

  describe('getAllSlugs', () => {
    it('returns the slug index', async () => {
      setAtPath('slugIndex', { syllabus: 'abc' });
      expect(await getAllSlugs()).toEqual({ syllabus: 'abc' });
    });

    it('returns an empty object when there are no slugs', async () => {
      expect(await getAllSlugs()).toEqual({});
    });
  });

  describe('assignSlug', () => {
    it('assigns a free slug to a page', async () => {
      await assignSlug('abc', 'syllabus');
      expect(getAtPath('slugIndex/syllabus')).toBe('abc');
    });

    it('rejects a malformed slug without writing anything', async () => {
      await expect(assignSlug('abc', 'My Syllabus')).rejects.toThrow('lowercase letters');
      expect(getAtPath('slugIndex/My Syllabus')).toBeUndefined();
    });

    it('rejects a slug already owned by a different page', async () => {
      setAtPath('slugIndex/syllabus', 'other-page');
      await expect(assignSlug('abc', 'syllabus')).rejects.toThrow('already in use');
      expect(getAtPath('slugIndex/syllabus')).toBe('other-page');
    });

    it('allows re-assigning a slug already owned by the same page', async () => {
      setAtPath('slugIndex/syllabus', 'abc');
      await expect(assignSlug('abc', 'syllabus')).resolves.not.toThrow();
    });
  });

  describe('removeSlug', () => {
    it('removes a slug', async () => {
      setAtPath('slugIndex/syllabus', 'abc');
      await removeSlug('syllabus');
      expect(getAtPath('slugIndex/syllabus')).toBeUndefined();
    });
  });

  describe('resolveSlugToPageId', () => {
    it('resolves a known slug to its page id', async () => {
      setAtPath('slugIndex/syllabus', 'abc');
      expect(await resolveSlugToPageId('syllabus')).toBe('abc');
    });

    it('returns null for an unknown slug', async () => {
      expect(await resolveSlugToPageId('missing')).toBeNull();
    });
  });

  describe('deletePageAndSlugs', () => {
    it('deletes the page and every slug pointing to it, leaving others untouched', async () => {
      setAtPath('pages/abc', { title: 'To Delete' });
      setAtPath('pages/other', { title: 'Keep Me' });
      setAtPath('slugIndex', { syllabus: 'abc', 'syllabus-2026': 'abc', unrelated: 'other' });

      await deletePageAndSlugs('abc');

      expect(getAtPath('pages/abc')).toBeUndefined();
      expect(getAtPath('pages/other')).toEqual({ title: 'Keep Me' });
      expect(getAtPath('slugIndex/syllabus')).toBeUndefined();
      expect(getAtPath('slugIndex/syllabus-2026')).toBeUndefined();
      expect(getAtPath('slugIndex/unrelated')).toBe('other');
    });

    it('does nothing to slugs when the page has none', async () => {
      setAtPath('pages/abc', { title: 'To Delete' });
      await deletePageAndSlugs('abc');
      expect(getAtPath('pages/abc')).toBeUndefined();
    });
  });
});
