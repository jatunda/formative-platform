import { describe, it, expect, beforeEach, vi } from 'vitest';

// Each test gets a fresh copy of the module, so "never initialized" is real.
let handle;

beforeEach(async () => {
  vi.resetModules();
  handle = await import('../../database-handle.js');
});

describe('database-handle', () => {
  it('hands back the database a page initialized it with', () => {
    const database = { name: 'test double' };
    handle.initializeDatabase(database);
    expect(handle.getDb()).toBe(database);
  });

  it('refuses to hand out a database before one is set', () => {
    expect(() => handle.getDb()).toThrow('Database not initialized. Call initializeDatabase first.');
  });

  it('requires a database instance', () => {
    expect(() => handle.initializeDatabase(null)).toThrow('Database instance is required');
    expect(() => handle.initializeDatabase(undefined)).toThrow('Database instance is required');
  });
});
