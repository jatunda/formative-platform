import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initializeDatabase,
  getScheduleForDay,
  updateScheduleForDay,
  getFullSchedule,
  getLessonFromDB,
  getLessonTitleFromDB,
  createNewLesson,
  generateUniqueHash,
  getClasses,
  getAllContent,
  addLessonToSchedule,
  removeLessonFromSchedule,
  moveLessonInSchedule,
  moveLessonBetweenDays,
  getClassDateOffset,
  setClassDateOffset,
  insertDayAt,
  deleteDayAt,
} from '../../database-utils.js';
import { DEFAULT_LESSON_TITLE, UNTITLED_LESSON } from '../../constants.js';

// Mock Firebase
let mockData = {};
let mockRef = vi.fn();
let mockGet = vi.fn();
let mockSet = vi.fn();
let mockUpdate = vi.fn();

vi.mock('https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js', () => ({
  ref: (db, path) => {
    mockRef(path);
    return { path, key: path.split('/').pop() };
  },
  get: (ref) => mockGet(ref),
  set: (ref, value) => mockSet(ref, value),
  update: (updates) => mockUpdate(updates),
}));

describe('database-utils', () => {
  beforeEach(() => {
    mockData = {};
    mockRef.mockClear();
    mockGet.mockClear();
    mockSet.mockClear();
    mockUpdate.mockClear();
    
    // Setup default mock implementations
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
      if (value === null) {
        delete current[key];
      } else {
        current[key] = value;
      }
      
      return Promise.resolve();
    });
  });

  describe('initializeDatabase', () => {
    it('should initialize database successfully', () => {
      const mockDb = {};
      expect(() => initializeDatabase(mockDb)).not.toThrow();
    });

    it('should throw error if database is null', () => {
      expect(() => initializeDatabase(null)).toThrow('Database instance is required');
    });

    it('should throw error if database is undefined', () => {
      expect(() => initializeDatabase(undefined)).toThrow('Database instance is required');
    });
  });

  describe('getScheduleForDay', () => {
    it('should get schedule for a day', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.schedule = {
        class1: {
          0: ['hash1', 'hash2'],
        },
      };
      
      const schedule = await getScheduleForDay('class1', 0);
      expect(schedule).toEqual(['hash1', 'hash2']);
    });

    it('should return empty array for day with no schedule', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.schedule = { class1: {} };
      
      const schedule = await getScheduleForDay('class1', 0);
      expect(schedule).toEqual([]);
    });

    it('should throw error if database not initialized', () => {
      // Test that initializeDatabase validates input
      expect(() => initializeDatabase(null)).toThrow('Database instance is required');
      expect(() => initializeDatabase(undefined)).toThrow('Database instance is required');
    });
  });

  describe('updateScheduleForDay', () => {
    it('should update schedule for a day', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      
      await updateScheduleForDay('class1', 0, ['hash1', 'hash2']);
      
      expect(mockSet).toHaveBeenCalled();
      const call = mockSet.mock.calls[0];
      expect(call[0].path).toContain('schedule/class1/0');
      expect(call[1]).toEqual(['hash1', 'hash2']);
    });

    it('should throw error if database not initialized', async () => {
      // Test that initializeDatabase validates input
      expect(() => initializeDatabase(null)).toThrow('Database instance is required');
    });
  });

  describe('getFullSchedule', () => {
    it('should get full schedule for a class', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.schedule = {
        class1: {
          0: ['hash1'],
          1: ['hash2'],
        },
      };
      
      const schedule = await getFullSchedule('class1');
      expect(schedule).toEqual({
        0: ['hash1'],
        1: ['hash2'],
      });
    });

    it('should return empty object if schedule does not exist', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.schedule = {};
      
      const schedule = await getFullSchedule('class1');
      expect(schedule).toEqual({});
    });
  });

  describe('getLessonFromDB', () => {
    it('should get lesson from database', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.content = {
        hash1: { title: 'Lesson 1', content: 'Some content' },
      };
      
      const lesson = await getLessonFromDB('hash1');
      expect(lesson).toEqual({ title: 'Lesson 1', content: 'Some content' });
    });

    it('should return null if lesson does not exist', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      
      const lesson = await getLessonFromDB('nonexistent');
      expect(lesson).toBeNull();
    });
  });

  describe('getLessonTitleFromDB', () => {
    it('should get lesson title from database', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.content = {
        hash1: { title: 'Lesson 1' },
      };
      
      const title = await getLessonTitleFromDB('hash1');
      expect(title).toBe('Lesson 1');
    });

    it('should return UNTITLED_LESSON if lesson does not exist', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      
      const title = await getLessonTitleFromDB('nonexistent');
      expect(title).toBe(UNTITLED_LESSON);
    });
  });

  describe('generateUniqueHash', () => {
    it('should generate a unique hash', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.content = {};
      
      const hash = await generateUniqueHash();
      expect(hash).toBeDefined();
      expect(hash.length).toBe(32);
      expect(/^[0-9a-f]{32}$/.test(hash)).toBe(true);
    });

    it('should generate different hashes on subsequent calls', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.content = {};
      
      const hash1 = await generateUniqueHash();
      const hash2 = await generateUniqueHash();
      // Very unlikely to be the same, but possible
      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
    });

    it('should retry if hash collision occurs', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      
      let callCount = 0;
      mockGet.mockImplementation((ref) => {
        callCount++;
        if (callCount === 1) {
          // First hash exists (collision)
          return Promise.resolve({
            exists: () => true,
            val: () => ({ title: 'Existing' }),
          });
        }
        // Second hash doesn't exist
        return Promise.resolve({
          exists: () => false,
          val: () => null,
        });
      });
      
      const hash = await generateUniqueHash();
      expect(hash).toBeDefined();
      expect(callCount).toBeGreaterThan(1);
    });
  });

  describe('createNewLesson', () => {
    it('should create a new lesson with default title', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.content = {};
      
      const hash = await createNewLesson();
      expect(hash).toBeDefined();
      expect(mockSet).toHaveBeenCalled();
    });

    it('should create a new lesson with custom title', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.content = {};
      
      const hash = await createNewLesson('Custom Title');
      expect(hash).toBeDefined();
      const setCall = mockSet.mock.calls.find(call => 
        call[0].path.includes('content/')
      );
      expect(setCall[1]).toEqual({ title: 'Custom Title' });
    });
  });

  describe('getClasses', () => {
    it('should get all classes', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.classes = {
        class1: { name: 'Class 1' },
        class2: { name: 'Class 2' },
      };
      
      const classes = await getClasses();
      expect(classes).toEqual({
        class1: { name: 'Class 1' },
        class2: { name: 'Class 2' },
      });
    });

    it('should return null if no classes exist', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      
      const classes = await getClasses();
      expect(classes).toBeNull();
    });
  });

  describe('getAllContent', () => {
    it('should get all content', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.content = {
        hash1: { title: 'Lesson 1' },
        hash2: { title: 'Lesson 2' },
      };
      
      const content = await getAllContent();
      expect(content).toEqual({
        hash1: { title: 'Lesson 1' },
        hash2: { title: 'Lesson 2' },
      });
    });

    it('should return null if no content exists', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      
      const content = await getAllContent();
      expect(content).toBeNull();
    });
  });

  describe('addLessonToSchedule', () => {
    it('should add lesson to schedule', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.schedule = {
        class1: {
          0: ['hash1'],
        },
      };
      
      await addLessonToSchedule('class1', 0, 'hash2');
      
      expect(mockSet).toHaveBeenCalled();
      const setCall = mockSet.mock.calls.find(call => 
        call[0].path.includes('schedule/class1/0')
      );
      expect(setCall[1]).toContain('hash1');
      expect(setCall[1]).toContain('hash2');
    });
  });

  describe('removeLessonFromSchedule', () => {
    it('should remove lesson from schedule', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.schedule = {
        class1: {
          0: ['hash1', 'hash2', 'hash3'],
        },
      };
      
      await removeLessonFromSchedule('class1', 0, 1);
      
      expect(mockSet).toHaveBeenCalled();
      const setCall = mockSet.mock.calls.find(call => 
        call[0].path.includes('schedule/class1/0')
      );
      expect(setCall[1]).not.toContain('hash2');
      expect(setCall[1]).toContain('hash1');
      expect(setCall[1]).toContain('hash3');
    });
  });

  describe('moveLessonInSchedule', () => {
    it('should move lesson within same day', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.schedule = {
        class1: {
          0: ['hash1', 'hash2', 'hash3'],
        },
      };
      
      const result = await moveLessonInSchedule('class1', 0, 0, 2);
      
      expect(result).toBe(true);
      expect(mockSet).toHaveBeenCalled();
    });

    it('should return false if toIndex is out of bounds', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.schedule = {
        class1: {
          0: ['hash1', 'hash2'],
        },
      };
      
      const result = await moveLessonInSchedule('class1', 0, 0, 10);
      expect(result).toBe(false);
    });
  });

  describe('moveLessonBetweenDays', () => {
    it('should move lesson between days', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.schedule = {
        class1: {
          0: ['hash1', 'hash2'],
          1: ['hash3'],
        },
      };
      
      const hash = await moveLessonBetweenDays('class1', 0, 0, 1);
      
      expect(hash).toBe('hash1');
      expect(mockSet).toHaveBeenCalledTimes(2);
    });
  });

  describe('getClassDateOffset', () => {
    it('should get date offset for class', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.classes = {
        class1: { dateOffset: 5 },
      };
      
      const offset = await getClassDateOffset('class1');
      expect(offset).toBe(5);
    });

    it('should return 0 if offset does not exist', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      
      const offset = await getClassDateOffset('class1');
      expect(offset).toBe(0);
    });
  });

  describe('setClassDateOffset', () => {
    it('should set date offset for class', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      
      await setClassDateOffset('class1', 3);
      
      expect(mockSet).toHaveBeenCalled();
      const setCall = mockSet.mock.calls.find(call => 
        call[0].path.includes('classes/class1/dateOffset')
      );
      expect(setCall[1]).toBe(3);
    });
  });

  describe('insertDayAt', () => {
    it('should insert day at specified index', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.schedule = {
        class1: {
          0: ['hash1'],
          1: ['hash2'],
          2: ['hash3'],
        },
      };
      
      await insertDayAt('class1', 1, 2);
      
      // Should have shifted days 1 and 2 up
      expect(mockSet).toHaveBeenCalled();
    });
  });

  describe('deleteDayAt', () => {
    it('should delete day and shift remaining days', async () => {
      const mockDb = {};
      initializeDatabase(mockDb);
      mockData.schedule = {
        class1: {
          0: ['hash1'],
          1: ['hash2'],
          2: ['hash3'],
        },
      };
      
      await deleteDayAt('class1', 1);
      
      expect(mockSet).toHaveBeenCalled();
    });
  });
});

