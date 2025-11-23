import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initializeDatabase,
  getScheduleForDay,
  updateScheduleForDay,
} from '../../database-utils.js';
import {
  initializeDateUtils,
  getTodayDayIndex,
  getDateForDayIndex,
  isDayIndexToday,
} from '../../date-utils.js';

// Mock Firebase
let mockData = {};
let mockGet = vi.fn();
let mockSet = vi.fn();

vi.mock('https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js', () => ({
  ref: (db, path) => ({ path, key: path.split('/').pop() }),
  get: (ref) => mockGet(ref),
  set: (ref, value) => mockSet(ref, value),
}));

describe('Database and Date Integration', () => {
  beforeEach(() => {
    mockData = {
      schedule: {
        class1: {
          0: ['hash1', 'hash2'],
        },
      },
      classes: {
        class1: {
          dateOffset: 2,
        },
      },
    };

    mockGet.mockImplementation((ref) => {
      const pathParts = ref.path.split('/').filter(Boolean);
      let value = mockData;
      
      for (const part of pathParts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return Promise.resolve({
            exists: () => false,
            val: () => null,
          });
        }
      }
      
      return Promise.resolve({
        exists: () => value !== undefined && value !== null,
        val: () => value,
      });
    });

    mockSet.mockImplementation((ref, value) => {
      const pathParts = ref.path.split('/').filter(Boolean);
      let current = mockData;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!(part in current) || typeof current[part] !== 'object') {
          current[part] = {};
        }
        current = current[part];
      }
      
      const key = pathParts[pathParts.length - 1];
      current[key] = value;
      return Promise.resolve();
    });

    const mockDb = {};
    initializeDatabase(mockDb);
    initializeDateUtils(mockDb);
  });

  it('should get schedule for today using date calculations', async () => {
    const todayIndex = await getTodayDayIndex('class1', '2024-01-01');
    const schedule = await getScheduleForDay('class1', todayIndex);
    
    expect(typeof todayIndex).toBe('number');
    expect(Array.isArray(schedule)).toBe(true);
  });

  it('should check if a day index represents today', async () => {
    const todayIndex = await getTodayDayIndex('class1', '2024-01-01');
    const isToday = await isDayIndexToday(todayIndex, 'class1', '2024-01-01');
    
    expect(typeof isToday).toBe('boolean');
  });

  it('should get formatted date for a scheduled day', async () => {
    const dayIndex = 5;
    const dateStr = await getDateForDayIndex(dayIndex, 'class1', '2024-01-01');
    
    expect(dateStr).toMatch(/\d+\/\d+\/\d+ \(.+day\)/);
    
    // Verify we can get schedule for that day
    const schedule = await getScheduleForDay('class1', dayIndex);
    expect(Array.isArray(schedule)).toBe(true);
  });

  it('should handle date offset affecting schedule access', async () => {
    // With offset of 2, day index calculations are adjusted
    const dayIndex = 0;
    const dateStr = await getDateForDayIndex(dayIndex, 'class1', '2024-01-01');
    
    // Should still be able to access schedule
    const schedule = await getScheduleForDay('class1', dayIndex);
    expect(Array.isArray(schedule)).toBe(true);
  });
});

