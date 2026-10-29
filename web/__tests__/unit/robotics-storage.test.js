import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLocalStorageAdapter } from '../../robotics/storage.js';

describe('createLocalStorageAdapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lets storage errors propagate, rather than passing an unreadable storage off as nothing saved', () => {
    vi.stubGlobal('localStorage', {
      getItem() { throw new Error('SecurityError'); },
      setItem() { throw new Error('QuotaExceededError'); },
    });
    const adapter = createLocalStorageAdapter('robotics-tournament');
    expect(() => adapter.load()).toThrow('SecurityError');
    expect(() => adapter.save({})).toThrow('QuotaExceededError');
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
