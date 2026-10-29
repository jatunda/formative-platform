import { describe, it, expect, beforeEach } from 'vitest';
import { createStorageAdapter } from '../../storage.js';

describe('createStorageAdapter', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('round-trips through whichever Storage it is given', () => {
    const tab = createStorageAdapter('layout', sessionStorage);
    tab.save({ layout: 'big' });
    expect(tab.load()).toEqual({ layout: 'big' });
    expect(sessionStorage.getItem('layout')).toBe('{"layout":"big"}');
    expect(localStorage.getItem('layout')).toBeNull();
  });

  it('uses localStorage when no Storage is given', () => {
    createStorageAdapter('prefs').save({ a: 1 });
    expect(JSON.parse(localStorage.getItem('prefs'))).toEqual({ a: 1 });
  });

  it('load returns null when nothing is saved or the data is corrupt', () => {
    expect(createStorageAdapter('k', sessionStorage).load()).toBeNull();
    sessionStorage.setItem('k', '{not json');
    expect(createStorageAdapter('k', sessionStorage).load()).toBeNull();
  });

  const blocked = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); },
  };

  it('lets storage errors propagate by default', () => {
    const adapter = createStorageAdapter('k', blocked);
    expect(() => adapter.load()).toThrow('SecurityError');
    expect(() => adapter.save({})).toThrow('QuotaExceededError');
  });

  it('when quiet, an unreadable storage loads as nothing saved and a failed save is dropped', () => {
    const adapter = createStorageAdapter('k', blocked, { quiet: true });
    expect(adapter.load()).toBeNull();
    expect(() => adapter.save({})).not.toThrow();
  });
});
