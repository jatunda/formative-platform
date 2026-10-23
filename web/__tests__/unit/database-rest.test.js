import { describe, it, expect, vi } from 'vitest';
import { restUrl, readPath } from '../../database-rest.js';

describe('restUrl', () => {
  it('points a deployed page at the production database, each segment URL-encoded', () => {
    expect(restUrl(['practiceSetSlugIndex', 'café 1'], 'mrhsieh.app'))
      .toBe('https://formative-platform-default-rtdb.firebaseio.com/practiceSetSlugIndex/caf%C3%A9%201.json');
  });

  it('points local dev at the Database emulator', () => {
    expect(restUrl(['questions', 'q1'], '127.0.0.1'))
      .toBe('http://127.0.0.1:9000/questions/q1.json?ns=formative-platform-default-rtdb');
  });
});

describe('readPath', () => {
  it('resolves to the stored JSON, or null when nothing is stored', async () => {
    const fetch = vi.fn(async (url) => ({ ok: true, json: async () => (url.includes('q1') ? { stem: [] } : null) }));
    const env = { fetch, hostname: 'mrhsieh.app' };

    expect(await readPath(['questions', 'q1'], env)).toEqual({ stem: [] });
    expect(await readPath(['questions', 'missing'], env)).toBeNull();
  });

  it('rejects when the database answers with an error status', async () => {
    const fetch = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ error: 'Permission denied' }) }));

    await expect(readPath(['questions', 'q1'], { fetch, hostname: 'mrhsieh.app' }))
      .rejects.toThrow('Database read failed (401): questions/q1');
  });
});
