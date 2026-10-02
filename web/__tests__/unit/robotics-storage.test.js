import { describe, it, expect, beforeEach } from 'vitest';
import { createLocalStorageAdapter } from '../../robotics/storage.js';

describe('createLocalStorageAdapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('load returns null when nothing has been saved yet', () => {
    const adapter = createLocalStorageAdapter('robotics-tournament');
    expect(adapter.load()).toBeNull();
  });

  it('save then load round-trips the state object', () => {
    const adapter = createLocalStorageAdapter('robotics-tournament');
    const state = { teams: [{ id: 't1', name: 'Alpha', members: [] }] };
    adapter.save(state);
    expect(adapter.load()).toEqual(state);
  });

  it('load returns null and does not throw when stored data is corrupt', () => {
    localStorage.setItem('robotics-tournament', '{not valid json');
    const adapter = createLocalStorageAdapter('robotics-tournament');
    expect(adapter.load()).toBeNull();
  });

  it('uses a distinct key per adapter instance so two keys do not collide', () => {
    const a = createLocalStorageAdapter('key-a');
    const b = createLocalStorageAdapter('key-b');
    a.save({ value: 1 });
    b.save({ value: 2 });
    expect(a.load()).toEqual({ value: 1 });
    expect(b.load()).toEqual({ value: 2 });
  });
});
