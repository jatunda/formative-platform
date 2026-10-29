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

  it('load returns null when nothing is saved, the data is corrupt, or reading throws', () => {
    expect(createStorageAdapter('k', sessionStorage).load()).toBeNull();
    sessionStorage.setItem('k', '{not json');
    expect(createStorageAdapter('k', sessionStorage).load()).toBeNull();
    const blocked = { getItem() { throw new Error('SecurityError'); }, setItem() {} };
    expect(createStorageAdapter('k', blocked).load()).toBeNull();
  });
});
