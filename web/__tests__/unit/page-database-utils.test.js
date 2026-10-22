import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createNewPage,
  getPageFromDB,
  getAllPages,
  savePage,
  getAllSlugs,
  assignSlug,
  removeSlug,
  renameSlug,
  resolveSlugToPageId,
  deletePageAndSlugs,
  getBacklinks,
  commitSlugRename
} from '../../page-database-utils.js';
import { initializeDatabase } from '../../database-handle.js';

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

/** Parsed Page content whose one text item is `text`. */
function linking(text) {
  return { title: 'T', blocks: [{ type: 'question', content: [{ type: 'text', value: text }] }] };
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

    initializeDatabase({});
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
      await savePage('abc', { title: 'T', blocks: [{}] }, []);
      expect(getAtPath('pages/abc')).toEqual({ title: 'T', blocks: [{}] });
    });

    it('removes the Backlink for a Page Link the edit dropped, keeping the ones still linked', async () => {
      setAtPath('slugIndex', { kept: 'kept-id', dropped: 'dropped-id' });
      await savePage('src', linking('[[kept]] [[dropped]]'), []);

      await savePage('src', linking('[[kept]]'), []);

      expect(getAtPath('backlinks/dropped-id/src')).toBeUndefined();
      expect(getAtPath('backlinks/kept-id/src')).toBe(true);
      expect(getAtPath('pages/src/linksTo')).toEqual(['kept-id']);
    });

    it('removes the Question Backlink for a Question Link the edit dropped', async () => {
      await savePage('src', linking('two questions'), ['q-kept', 'q-dropped']);

      await savePage('src', linking('one question'), ['q-kept']);

      expect(getAtPath('questionBacklinks/q-dropped/src')).toBeUndefined();
      expect(getAtPath('questionBacklinks/q-kept/src')).toBe(true);
      expect(getAtPath('pages/src/questionLinksTo')).toEqual(['q-kept']);
    });

    it('clears the stored link lists when the Page no longer links to anything', async () => {
      setAtPath('slugIndex/target', 'target-id');
      await savePage('src', linking('[[target]]'), ['q1']);

      await savePage('src', linking('no links'), []);

      expect(getAtPath('pages/src')).toEqual(linking('no links'));
      expect(getAtPath('backlinks/target-id/src')).toBeUndefined();
      expect(getAtPath('questionBacklinks/q1/src')).toBeUndefined();
    });

    it('skips dangling Page Links and Page Links to itself', async () => {
      setAtPath('slugIndex/self', 'src');

      await savePage('src', linking('[[self]] [[nonexistent]]'), []);

      expect(getAtPath('backlinks')).toBeUndefined();
      expect(getAtPath('pages/src/linksTo')).toBeUndefined();
    });

    it('writes the content and every Backlink change in one atomic update', async () => {
      setAtPath('slugIndex/target', 'target-id');
      setAtPath('pages/src', { ...linking('old'), questionLinksTo: ['q-old'] });
      setAtPath('questionBacklinks/q-old/src', true);

      await savePage('src', linking('[[target]]'), ['q-new']);

      expect(mockSet).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith({
        'pages/src': { ...linking('[[target]]'), linksTo: ['target-id'], questionLinksTo: ['q-new'] },
        'backlinks/target-id/src': true,
        'questionBacklinks/q-old/src': null,
        'questionBacklinks/q-new/src': true,
      });
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
      await expect(assignSlug('abc', 'My Syllabus')).rejects.toThrow('Slugs must be lowercase letters, numbers, and hyphens only (e.g. "syllabus").');
      expect(getAtPath('slugIndex/My Syllabus')).toBeUndefined();
    });

    it('rejects a slug already owned by a different page', async () => {
      setAtPath('slugIndex/syllabus', 'other-page');
      await expect(assignSlug('abc', 'syllabus')).rejects.toThrow('The URL "/p/syllabus" is already in use by another page.');
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

    it('removes this page\'s own incoming backlinks entry', async () => {
      setAtPath('pages/abc', { title: 'To Delete' });
      setAtPath('backlinks/abc', { other: true });

      await deletePageAndSlugs('abc');

      expect(getAtPath('backlinks/abc')).toBeUndefined();
    });

    it('removes this page\'s outgoing backlink entries even when its linksTo no longer lists them', async () => {
      setAtPath('pages/abc', { title: 'To Delete', linksTo: ['target1'] });
      setAtPath('backlinks/target1/abc', true);
      setAtPath('backlinks/target2/abc', true);
      setAtPath('backlinks/target1/unrelated', true);

      await deletePageAndSlugs('abc');

      expect(getAtPath('backlinks/target1/abc')).toBeUndefined();
      expect(getAtPath('backlinks/target2/abc')).toBeUndefined();
      expect(getAtPath('backlinks/target1/unrelated')).toBe(true);
    });

    it('removes a stale self-Backlink only via its incoming entry, so no two update paths overlap', async () => {
      setAtPath('pages/abc', { title: 'To Delete' });
      setAtPath('backlinks/abc', { abc: true, other: true });

      await deletePageAndSlugs('abc');

      expect(Object.keys(mockUpdate.mock.calls[0][0])).not.toContain('backlinks/abc/abc');
      expect(getAtPath('backlinks/abc')).toBeUndefined();
    });

    it('removes this page from the Question Backlinks of every Question it linked to', async () => {
      setAtPath('pages/abc', { title: 'To Delete', questionLinksTo: ['q1', 'q2'] });
      setAtPath('questionBacklinks/q1', { abc: true, other: true });
      setAtPath('questionBacklinks/q2', { abc: true });
      setAtPath('questionBacklinks/q3', { other: true });

      await deletePageAndSlugs('abc');

      expect(getAtPath('questionBacklinks/q1/abc')).toBeUndefined();
      expect(getAtPath('questionBacklinks/q1/other')).toBe(true);
      expect(getAtPath('questionBacklinks/q2/abc')).toBeUndefined();
      expect(getAtPath('questionBacklinks/q3/other')).toBe(true);
    });

    it('removes a Question Backlink entry even when the page\'s questionLinksTo no longer lists it', async () => {
      // savePage overwrites the whole page record, so questionLinksTo only
      // reflects the latest save - an older entry can outlive it.
      setAtPath('pages/abc', { title: 'To Delete' });
      setAtPath('questionBacklinks/q1', { abc: true });

      await deletePageAndSlugs('abc');

      expect(getAtPath('questionBacklinks/q1/abc')).toBeUndefined();
    });

    it('deletes everything in one atomic update', async () => {
      setAtPath('pages/abc', { title: 'To Delete', questionLinksTo: ['q1'] });
      setAtPath('questionBacklinks/q1', { abc: true });
      setAtPath('slugIndex', { syllabus: 'abc' });

      await deletePageAndSlugs('abc');

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockSet).not.toHaveBeenCalled();
      expect(mockRemove).not.toHaveBeenCalled();
    });
  });

  describe('getBacklinks', () => {
    it('returns the source pageIds that link to this page', async () => {
      setAtPath('backlinks/target', { source1: true, source2: true });
      expect(await getBacklinks('target')).toEqual(['source1', 'source2']);
    });

    it('returns an empty array when nothing links here', async () => {
      expect(await getBacklinks('target')).toEqual([]);
    });
  });

  describe('renameSlug', () => {
    it('skips a backlinked page that no longer exists instead of recreating it', async () => {
      setAtPath('slugIndex/old-slug', 'abc');
      setAtPath('backlinks/abc', { gone: true });
      await renameSlug('abc', 'old-slug', 'new-slug');
      expect(getAtPath('pages/gone')).toBeUndefined();
      expect(getAtPath('slugIndex/new-slug')).toBe('abc');
    });

    it('swaps the slugIndex entry from old to new', async () => {
      setAtPath('slugIndex/old-slug', 'abc');
      await renameSlug('abc', 'old-slug', 'new-slug');
      expect(getAtPath('slugIndex/old-slug')).toBeUndefined();
      expect(getAtPath('slugIndex/new-slug')).toBe('abc');
    });

    it('rejects a malformed new slug without changing anything', async () => {
      setAtPath('slugIndex/old-slug', 'abc');
      await expect(renameSlug('abc', 'old-slug', 'Bad Slug')).rejects.toThrow('Slugs must be lowercase letters, numbers, and hyphens only (e.g. "syllabus").');
      expect(getAtPath('slugIndex/old-slug')).toBe('abc');
    });

    it('rejects a new slug already taken by a different page', async () => {
      setAtPath('slugIndex/old-slug', 'abc');
      setAtPath('slugIndex/new-slug', 'other-page');
      await expect(renameSlug('abc', 'old-slug', 'new-slug')).rejects.toThrow('The URL "/p/new-slug" is already in use by another page.');
      expect(getAtPath('slugIndex/old-slug')).toBe('abc');
    });

    it('rewrites every backlinked page\'s Page Link to the new slug', async () => {
      setAtPath('slugIndex/old-slug', 'abc');
      setAtPath('backlinks/abc', { source1: true });
      setAtPath('pages/source1', {
        title: 'Source',
        blocks: [{ type: 'question', content: [{ type: 'text', value: 'See [[old-slug|The Page]].' }] }]
      });

      await renameSlug('abc', 'old-slug', 'new-slug');

      expect(getAtPath('pages/source1').blocks[0].content[0].value).toBe('See [[new-slug|The Page]].');
    });

    it('does not touch a backlinked page that links via a different slug of the same target', async () => {
      setAtPath('slugIndex/old-slug', 'abc');
      setAtPath('backlinks/abc', { source1: true });
      const original = { title: 'Source', blocks: [{ type: 'question', content: [{ type: 'text', value: 'See [[other-slug]].' }] }] };
      setAtPath('pages/source1', original);

      await renameSlug('abc', 'old-slug', 'new-slug');

      expect(getAtPath('pages/source1')).toEqual(original);
    });
  });

  describe('commitSlugRename', () => {
    it('writes the caller\'s index swap and the rewritten Pages in one atomic update, skipping unchanged and missing Pages', async () => {
      setAtPath('pages/changes', { title: 'old' });
      setAtPath('pages/same', { title: 'untouched' });

      await commitSlugRename(
        { 'questionSlugIndex/a': null, 'questionSlugIndex/b': 'q1' },
        ['changes', 'same', 'gone'],
        (content) => (content.title === 'old' ? { title: 'new' } : content)
      );

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith({
        'questionSlugIndex/a': null,
        'questionSlugIndex/b': 'q1',
        'pages/changes': { title: 'new' },
      });
    });
  });
});
