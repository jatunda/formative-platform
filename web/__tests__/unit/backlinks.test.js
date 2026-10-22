import { describe, it, expect } from 'vitest';
import {
  PAGE_LINKS,
  QUESTION_LINKS,
  backlinkRemovals,
  diffBacklinks,
  resolveLinkTargets,
  staleBacklinkRemovals
} from '../../backlinks.js';

/** Parsed Page content whose one text item is `text`. */
function linking(text) {
  return { title: 'T', blocks: [{ type: 'question', content: [{ type: 'text', value: text }] }] };
}

describe('backlinks', () => {
  describe('resolveLinkTargets', () => {
    it('maps referenced Slugs to their entity ids, once each, dropping unknown Slugs', () => {
      const index = { loops: 'q1', 'loops-alias': 'q1', arrays: 'q2' };
      expect(resolveLinkTargets(['loops', 'missing', 'loops-alias', 'arrays'], index))
        .toEqual(['q1', 'q2']);
    });

    it('drops the excluded id, so a Page linking to itself gets no Backlink', () => {
      const index = { self: 'page-a', other: 'page-b' };
      expect(resolveLinkTargets(['self', 'other'], index, 'page-a')).toEqual(['page-b']);
    });
  });

  describe('diffBacklinks', () => {
    it('adds Backlinks for new targets and removes them for dropped ones', () => {
      expect(diffBacklinks(PAGE_LINKS, 'src', ['kept', 'dropped'], ['kept', 'added'])).toEqual({
        'backlinks/dropped/src': null,
        'backlinks/added/src': true,
      });
    });

    it('writes into the Question Backlink index for Question Links', () => {
      expect(diffBacklinks(QUESTION_LINKS, 'src', [], ['q1'])).toEqual({ 'questionBacklinks/q1/src': true });
    });

    it('changes nothing when the same targets come back in a different order', () => {
      expect(diffBacklinks(PAGE_LINKS, 'src', ['a', 'b'], ['b', 'a'])).toEqual({});
    });
  });

  describe('backlinkRemovals', () => {
    it('lists every entry matching the predicate, under that kind\'s index', () => {
      const pages = { live: {} };
      const index = {
        q1: { live: true, gone1: true },
        q2: { gone1: true, gone2: true },
        q3: { live: true },
      };

      expect(backlinkRemovals(QUESTION_LINKS, index, (_target, source) => !(source in pages))).toEqual({
        'questionBacklinks/q1/gone1': null,
        'questionBacklinks/q2/gone1': null,
        'questionBacklinks/q2/gone2': null,
      });
    });

    it('hands the predicate the target as well as the source', () => {
      const index = { a: { src: true }, b: { src: true } };
      expect(backlinkRemovals(PAGE_LINKS, index, (target) => target === 'b')).toEqual({
        'backlinks/b/src': null,
      });
    });

    it('returns nothing when the index is empty', () => {
      expect(backlinkRemovals(PAGE_LINKS, null, () => true)).toEqual({});
    });
  });

  describe('staleBacklinkRemovals', () => {
    it('removes Page Backlinks whose source Page is gone or no longer links to the target', () => {
      const pages = {
        still: linking('See [[target-a]].'),
        dropped: linking('No links any more.'),
      };
      const slugIndex = { 'target-a': 'a' };
      const index = { a: { still: true, dropped: true, gone: true } };

      expect(staleBacklinkRemovals(PAGE_LINKS, index, pages, slugIndex)).toEqual({
        'backlinks/a/dropped': null,
        'backlinks/a/gone': null,
      });
    });

    it('removes Question Backlinks whose source Page no longer has that Question Link', () => {
      const pages = { src: linking('[[q:loops-1]]') };
      const questionSlugIndex = { 'loops-1': 'q1', 'arrays-1': 'q2' };
      const index = { q1: { src: true }, q2: { src: true } };

      expect(staleBacklinkRemovals(QUESTION_LINKS, index, pages, questionSlugIndex)).toEqual({
        'questionBacklinks/q2/src': null,
      });
    });
  });
});
