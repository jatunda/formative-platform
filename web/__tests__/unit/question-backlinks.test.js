import { describe, it, expect } from 'vitest';
import { questionBacklinkRemovals } from '../../question-backlinks.js';

describe('questionBacklinkRemovals', () => {
  it('lists every entry pointing at a Page that no longer exists', () => {
    const pages = { live: {} };
    const index = {
      q1: { live: true, gone1: true },
      q2: { gone1: true, gone2: true },
      q3: { live: true },
    };

    expect(questionBacklinkRemovals(index, (pageId) => !(pageId in pages))).toEqual({
      'questionBacklinks/q1/gone1': null,
      'questionBacklinks/q2/gone1': null,
      'questionBacklinks/q2/gone2': null,
    });
  });

  it('returns nothing when the index is empty', () => {
    expect(questionBacklinkRemovals(null, () => true)).toEqual({});
  });
});
