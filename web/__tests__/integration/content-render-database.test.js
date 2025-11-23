import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseDSL } from '../../dsl.js';
import { renderContent, renderMultipleContent } from '../../content-renderer.js';
import {
  initializeDatabase,
  getLessonFromDB,
  getScheduleForDay,
} from '../../database-utils.js';

// Mock Firebase
let mockData = {};
let mockGet = vi.fn();

vi.mock('https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js', () => ({
  ref: (db, path) => ({ path, key: path.split('/').pop() }),
  get: (ref) => mockGet(ref),
  set: vi.fn(),
}));

describe('Content Rendering and Database Integration', () => {
  beforeEach(() => {
    mockData = {
      content: {
        hash1: {
          title: 'Lesson 1',
          content: `# Lesson 1

First question

---

Second question`,
        },
        hash2: {
          title: 'Lesson 2',
          content: `# Lesson 2

\`\`\`javascript
console.log("test");
\`\`\``,
        },
      },
      schedule: {
        class1: {
          0: ['hash1', 'hash2'],
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

    const mockDb = {};
    initializeDatabase(mockDb);
  });

  it('should fetch lesson from database and render it', async () => {
    const lesson = await getLessonFromDB('hash1');
    expect(lesson).toBeTruthy();
    
    if (lesson && lesson.content) {
      const parsed = parseDSL(lesson.content);
      const container = document.createElement('div');
      renderContent(parsed, container);
      
      expect(container.querySelector('.lesson-title')).toBeTruthy();
      expect(container.textContent).toContain('Lesson 1');
    }
  });

  it('should render multiple lessons from schedule', async () => {
    const schedule = await getScheduleForDay('class1', 0);
    expect(schedule.length).toBeGreaterThan(0);
    
    const lessons = await Promise.all(
      schedule.map(hash => getLessonFromDB(hash))
    );
    
    const parsedLessons = lessons
      .filter(lesson => lesson && lesson.content)
      .map(lesson => parseDSL(lesson.content));
    
    if (parsedLessons.length > 0) {
      const container = document.createElement('div');
      renderMultipleContent(parsedLessons, container);
      
      const titles = container.querySelectorAll('.lesson-title');
      expect(titles.length).toBe(parsedLessons.length);
    }
  });

  it('should handle missing lesson gracefully', async () => {
    const lesson = await getLessonFromDB('nonexistent');
    expect(lesson).toBeNull();
    
    // Should not crash when trying to render null
    const container = document.createElement('div');
    renderContent(null, container);
    expect(container.textContent).toContain('Content not found');
  });
});

