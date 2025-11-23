import { describe, it, expect } from 'vitest';
import { buildPath } from '../../constants.js';

describe('buildPath', () => {
  it('should join path segments with slashes', () => {
    expect(buildPath('schedule', 'class1', '0')).toBe('schedule/class1/0');
  });

  it('should handle two segments', () => {
    expect(buildPath('schedule', 'class1')).toBe('schedule/class1');
  });

  it('should handle single segment', () => {
    expect(buildPath('schedule')).toBe('schedule');
  });

  it('should filter out falsy values', () => {
    expect(buildPath('schedule', null, 'class1', undefined, '0')).toBe('schedule/class1/0');
  });

  it('should handle empty string segments', () => {
    expect(buildPath('schedule', '', 'class1')).toBe('schedule/class1');
  });

  it('should handle multiple segments', () => {
    expect(buildPath('a', 'b', 'c', 'd', 'e')).toBe('a/b/c/d/e');
  });

  it('should return empty string for all falsy segments', () => {
    expect(buildPath(null, undefined, '')).toBe('');
  });
});

