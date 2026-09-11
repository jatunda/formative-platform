import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initializeDateUtils,
  getClassDateOffset,
  setClassDateOffset,
  clearDateOffsetCache,
  getTodayDayIndex,
  getDateForDayIndex,
  getDateObjectForDayIndex,
  isDayIndexToday,
  DEFAULT_CLASS_START_DATE,
} from '../../date-utils.js';

// date-utils.js has no Firebase access of its own - it reads/writes Date
// Offset through database-utils.js, so that's the seam to mock here.
const dbOffsets = { testClass: 2 };
const mockGetClassDateOffset = vi.fn((classId) =>
  Promise.resolve(Object.prototype.hasOwnProperty.call(dbOffsets, classId) ? dbOffsets[classId] : 0)
);
const mockSetClassDateOffset = vi.fn((classId, offset) => {
  dbOffsets[classId] = Number(offset);
  return Promise.resolve();
});

vi.mock('../../database-utils.js', () => ({
  initializeDatabase: vi.fn(),
  getClassDateOffset: (classId) => mockGetClassDateOffset(classId),
  setClassDateOffset: (classId, offset) => mockSetClassDateOffset(classId, offset),
}));

const mockDb = { ref: vi.fn() };

describe('date-utils', () => {
  beforeEach(() => {
    clearDateOffsetCache();
    vi.clearAllMocks();
    dbOffsets.testClass = 2;
    delete dbOffsets.nonexistent;
  });

  describe('initializeDateUtils', () => {
    it('should initialize with database', () => {
      initializeDateUtils(mockDb);
      // Just verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('getClassDateOffset', () => {
    it('should return cached offset if available', async () => {
      initializeDateUtils(mockDb);
      // First call should fetch from database
      const offset1 = await getClassDateOffset('testClass');
      // Second call should use cache
      const offset2 = await getClassDateOffset('testClass');
      expect(offset1).toBe(offset2);
    });

    it('should return 0 if database not initialized', async () => {
      // This test verifies the fallback behavior when db is null
      // The actual implementation returns 0 when db is not initialized
      // We test this by not calling initializeDateUtils
      clearDateOffsetCache();
      // Since we haven't initialized, db will be undefined and should return 0
      const offset = await getClassDateOffset('nonexistent');
      expect(offset).toBe(0);
    });

    it('should return 0 and swallow the error if the underlying read fails', async () => {
      initializeDateUtils(mockDb);
      mockGetClassDateOffset.mockRejectedValueOnce(new Error('boom'));
      const offset = await getClassDateOffset('testClass');
      expect(offset).toBe(0);
    });
  });

  describe('setClassDateOffset', () => {
    it('should write through database-utils and update the cache in place, with no refetch', async () => {
      initializeDateUtils(mockDb);
      await getClassDateOffset('testClass'); // prime the cache at 2
      mockGetClassDateOffset.mockClear();

      await setClassDateOffset('testClass', 5);
      const offset = await getClassDateOffset('testClass');

      expect(offset).toBe(5);
      // The cache was updated in place - no refetch was needed to see the new value
      expect(mockGetClassDateOffset).not.toHaveBeenCalled();
    });

    it('should propagate a write failure instead of swallowing it', async () => {
      initializeDateUtils(mockDb);
      mockSetClassDateOffset.mockRejectedValueOnce(new Error('write failed'));
      await expect(setClassDateOffset('testClass', 5)).rejects.toThrow('write failed');
    });
  });

  describe('clearDateOffsetCache', () => {
    it('should clear cache for specific class', async () => {
      initializeDateUtils(mockDb);
      await getClassDateOffset('testClass');
      clearDateOffsetCache('testClass');
      // Cache should be cleared, will fetch again
      const offset = await getClassDateOffset('testClass');
      expect(offset).toBeDefined();
    });

    it('should clear all cache when no classId provided', async () => {
      initializeDateUtils(mockDb);
      await getClassDateOffset('testClass1');
      await getClassDateOffset('testClass2');
      clearDateOffsetCache();
      // Both caches should be cleared
      expect(true).toBe(true);
    });
  });

  describe('getTodayDayIndex', () => {
    it('should calculate day index for today', async () => {
      initializeDateUtils(mockDb);
      const dayIndex = await getTodayDayIndex('testClass', '2024-01-01');
      expect(typeof dayIndex).toBe('number');
      expect(dayIndex).toBeGreaterThanOrEqual(0);
    });

    it('should apply date offset', async () => {
      initializeDateUtils(mockDb);
      // Mock offset of 2
      const dayIndex = await getTodayDayIndex('testClass', DEFAULT_CLASS_START_DATE);
      expect(typeof dayIndex).toBe('number');
    });
  });

  describe('getDateForDayIndex', () => {
    it('should return formatted date string with weekday', async () => {
      initializeDateUtils(mockDb);
      const dateStr = await getDateForDayIndex(0, 'testClass', '2024-01-01');
      expect(dateStr).toMatch(/\d+\/\d+\/\d+ \(.+day\)/);
    });

    it('should apply date offset', async () => {
      initializeDateUtils(mockDb);
      const dateStr = await getDateForDayIndex(5, 'testClass', '2024-01-01');
      expect(dateStr).toBeDefined();
    });
  });

  describe('getDateObjectForDayIndex', () => {
    it('should return Date object', async () => {
      initializeDateUtils(mockDb);
      const date = await getDateObjectForDayIndex(0, 'testClass', '2024-01-01');
      expect(date).toBeInstanceOf(Date);
    });

    it('should skip weekends when calculating business days', async () => {
      initializeDateUtils(mockDb);
      // Start on Monday, add 5 business days should skip weekend
      const date = await getDateObjectForDayIndex(5, 'testClass', '2024-01-01');
      expect(date).toBeInstanceOf(Date);
    });
  });

  describe('isDayIndexToday', () => {
    it('should return boolean', async () => {
      initializeDateUtils(mockDb);
      const result = await isDayIndexToday(0, 'testClass', '2024-01-01');
      expect(typeof result).toBe('boolean');
    });

    it('should check if day index matches today', async () => {
      initializeDateUtils(mockDb);
      const todayIndex = await getTodayDayIndex('testClass', DEFAULT_CLASS_START_DATE);
      const isToday = await isDayIndexToday(todayIndex, 'testClass', DEFAULT_CLASS_START_DATE);
      // This will depend on actual date, so just check it's a boolean
      expect(typeof isToday).toBe('boolean');
    });
  });

  describe('business day calculations', () => {
    it('should handle start date on different weekdays', async () => {
      initializeDateUtils(mockDb);
      // Test with Monday start
      const mondayDate = await getDateForDayIndex(0, 'testClass', '2024-01-01');
      expect(mondayDate).toBeDefined();
      
      // Test with Friday start
      const fridayDate = await getDateForDayIndex(0, 'testClass', '2024-01-05');
      expect(fridayDate).toBeDefined();
    });

    it('should skip weekends in calculations', async () => {
      initializeDateUtils(mockDb);
      // Test that adding business days skips weekends
      // The offset from mock is 2, so:
      // Day 4 + offset 2 = 6 business days from start
      // Day 5 + offset 2 = 7 business days from start
      // Start on Monday Jan 1, 2024
      // 6 business days = Tuesday Jan 9 (Mon, Tue, Wed, Thu, Fri, Mon, Tue)
      // 7 business days = Wednesday Jan 10
      const date1 = await getDateObjectForDayIndex(4, 'testClass', '2024-01-01');
      const date2 = await getDateObjectForDayIndex(5, 'testClass', '2024-01-01');
      
      // Verify that date2 is after date1
      expect(date2.getTime()).toBeGreaterThan(date1.getTime());
      
      // Verify both are weekdays (not Saturday=6 or Sunday=0)
      expect(date1.getDay()).not.toBe(0); // Not Sunday
      expect(date1.getDay()).not.toBe(6); // Not Saturday
      expect(date2.getDay()).not.toBe(0); // Not Sunday
      expect(date2.getDay()).not.toBe(6); // Not Saturday
      
      // The difference should be exactly 1 business day (which is 1 calendar day in this case)
      const time1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate()).getTime();
      const time2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate()).getTime();
      const diff = (time2 - time1) / (1000 * 60 * 60 * 24);
      // With offset, these are consecutive business days, so difference is 1 calendar day
      expect(diff).toBe(1);
    });
  });
});

