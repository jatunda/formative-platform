import { describe, it, expect } from 'vitest';
import { PAGE_LINKS, QUESTION_LINKS, diffBacklinks, resolveLinkTargets } from '../../backlinks.js';

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
      const { updates, linksChanged } = diffBacklinks(PAGE_LINKS, 'src', ['kept', 'dropped'], ['kept', 'added']);
      expect(updates).toEqual({
        'backlinks/dropped/src': null,
        'backlinks/added/src': true,
      });
      expect(linksChanged).toBe(true);
    });

    it('writes into the Question Backlink index for Question Links', () => {
      const { updates } = diffBacklinks(QUESTION_LINKS, 'src', [], ['q1']);
      expect(updates).toEqual({ 'questionBacklinks/q1/src': true });
    });

    it('reports no change when the same targets come back in a different order', () => {
      const { updates, linksChanged } = diffBacklinks(PAGE_LINKS, 'src', ['a', 'b'], ['b', 'a']);
      expect(updates).toEqual({});
      expect(linksChanged).toBe(false);
    });

    it('reports a change when only the number of targets differs', () => {
      const { linksChanged } = diffBacklinks(PAGE_LINKS, 'src', ['a', 'a'], ['a']);
      expect(linksChanged).toBe(true);
    });
  });

});
