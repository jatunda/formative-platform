import { describe, it, expect } from 'vitest';
import { scheduleLessonRemovals } from '../../schedule-lessons.js';

describe('scheduleLessonRemovals', () => {
  it('takes the matching Lessons out of every day that has one, leaving emptied days empty and other days alone', () => {
    const lessons = { live: {} };
    const schedules = {
      // Dense Day Indices come back from Firebase as an array, with gaps as null
      classA: [['live', 'gone1'], null, ['gone1'], ['live']],
      // Sparse ones come back as an object
      classB: { 5: ['gone2', 'live', 'gone1'] },
      classC: [['live']],
    };

    expect(scheduleLessonRemovals(schedules, (lessonId) => !(lessonId in lessons))).toEqual({
      'schedule/classA/0': ['live'],
      'schedule/classA/2': [],
      'schedule/classB/5': ['live'],
    });
  });

  it('returns nothing when there are no Schedules', () => {
    expect(scheduleLessonRemovals(null, () => true)).toEqual({});
  });
});
