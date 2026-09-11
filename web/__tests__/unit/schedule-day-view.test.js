import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setupLessonDropHandlers,
  makeDeleteDayHandler,
  makeInsertDayHandler,
} from '../../schedule-day-view.js';
import { setupDragHandlers } from '../../drag-drop-utils.js';

// Mock Firebase - schedule-day-view.js reads/writes schedule/{classId}/{dayIndex}
// directly for the drop handler.
let mockData = {};
let mockSet = vi.fn();

vi.mock('https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js', () => ({
  ref: (db, path) => ({ path }),
  get: (ref) => {
    const value = mockData[ref.path];
    return Promise.resolve({
      exists: () => value !== undefined,
      val: () => value,
    });
  },
  set: (ref, value) => {
    mockSet(ref.path, value);
    mockData[ref.path] = value;
    return Promise.resolve();
  },
}));

const mockInsertDayAt = vi.fn();
const mockDeleteDayAt = vi.fn();

vi.mock('../../database-utils.js', () => ({
  insertDayAt: (...args) => mockInsertDayAt(...args),
  deleteDayAt: (...args) => mockDeleteDayAt(...args),
  generateUniqueHash: vi.fn(),
}));

const mockShowNotification = vi.fn();
vi.mock('../../notification-utils.js', () => ({
  showNotification: (...args) => mockShowNotification(...args),
}));

// Polyfill DragEvent for jsdom, matching drag-drop-utils.test.js's pattern
if (typeof DragEvent === 'undefined') {
  global.DragEvent = class DragEvent extends Event {
    constructor(type, eventInitDict = {}) {
      super(type, eventInitDict);
      this.dataTransfer = eventInitDict.dataTransfer || { getData: vi.fn(), dropEffect: '' };
    }
  };
}

function dispatchDrop(element, dragData) {
  const event = new DragEvent('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', {
    value: { getData: () => JSON.stringify(dragData) },
  });
  element.dispatchEvent(event);
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Puts drag-drop-utils.js's module-level activeDragData into a real
// in-progress-drag state, the way a lesson tile being dragged would.
function startDrag(dragData) {
  const source = document.createElement('div');
  setupDragHandlers(source, dragData);
  const event = new DragEvent('dragstart', { bubbles: true });
  Object.defineProperty(event, 'dataTransfer', { value: { setData: vi.fn() } });
  source.dispatchEvent(event);
}

function dispatchDragOver(element) {
  const event = new DragEvent('dragover', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: { dropEffect: '' } });
  element.dispatchEvent(event);
  return event;
}

describe('schedule-day-view', () => {
  let tdLessons;
  let onReload;
  const db = {};

  beforeEach(() => {
    mockData = {};
    vi.clearAllMocks();
    tdLessons = document.createElement('td');
    document.body.appendChild(tdLessons);
    onReload = vi.fn();
  });

  describe('setupLessonDropHandlers', () => {
    it('moves a lesson dropped from the same Class', async () => {
      mockData['schedule/class1/0'] = ['hashA', 'hashB'];
      mockData['schedule/class1/1'] = ['hashC'];

      setupLessonDropHandlers(tdLessons, 1, { classId: 'class1', db, onReload });
      await dispatchDrop(tdLessons, {
        lessonHash: 'hashB',
        fromDayIndex: 0,
        fromLessonIndex: 1,
        classId: 'class1',
      });

      expect(mockData['schedule/class1/0']).toEqual(['hashA']);
      expect(mockData['schedule/class1/1']).toEqual(['hashC', 'hashB']);
      expect(onReload).toHaveBeenCalled();
    });

    it('ignores a lesson dropped from a different Class (Lesson Planning cross-pane guard)', async () => {
      mockData['schedule/class1/0'] = ['hashA'];
      mockData['schedule/class1/1'] = ['hashC'];

      setupLessonDropHandlers(tdLessons, 1, { classId: 'class1', db, onReload });
      await dispatchDrop(tdLessons, {
        lessonHash: 'hashA',
        fromDayIndex: 0,
        fromLessonIndex: 0,
        classId: 'class2',
      });

      expect(mockSet).not.toHaveBeenCalled();
      expect(onReload).not.toHaveBeenCalled();
    });

    it('ignores a drop onto the same day it came from', async () => {
      mockData['schedule/class1/0'] = ['hashA'];

      setupLessonDropHandlers(tdLessons, 0, { classId: 'class1', db, onReload });
      await dispatchDrop(tdLessons, {
        lessonHash: 'hashA',
        fromDayIndex: 0,
        fromLessonIndex: 0,
        classId: 'class1',
      });

      expect(mockSet).not.toHaveBeenCalled();
      expect(onReload).not.toHaveBeenCalled();
    });

    it('accepts the hover state while dragging a lesson from the same Class', () => {
      setupLessonDropHandlers(tdLessons, 1, { classId: 'class1', db, onReload });
      startDrag({ lessonHash: 'hashA', fromDayIndex: 0, fromLessonIndex: 0, classId: 'class1' });

      const event = dispatchDragOver(tdLessons);

      expect(event.defaultPrevented).toBe(true);
      expect(tdLessons.classList.contains('td-drop-hover')).toBe(true);
    });

    it('rejects the hover state while dragging a lesson from a different Class', () => {
      setupLessonDropHandlers(tdLessons, 1, { classId: 'class1', db, onReload });
      startDrag({ lessonHash: 'hashA', fromDayIndex: 0, fromLessonIndex: 0, classId: 'class2' });

      const event = dispatchDragOver(tdLessons);

      expect(event.defaultPrevented).toBe(false);
      expect(tdLessons.classList.contains('td-drop-hover')).toBe(false);
    });
  });

  describe('makeDeleteDayHandler', () => {
    beforeEach(() => {
      global.confirm = vi.fn(() => true);
    });

    it('deletes the day and reloads when confirmed', async () => {
      mockDeleteDayAt.mockResolvedValue(undefined);
      const handler = makeDeleteDayHandler('class1', onReload);

      await handler(3);

      expect(mockDeleteDayAt).toHaveBeenCalledWith('class1', 3);
      expect(onReload).toHaveBeenCalled();
    });

    it('does nothing when the confirmation is declined', async () => {
      global.confirm = vi.fn(() => false);
      const handler = makeDeleteDayHandler('class1', onReload);

      await handler(3);

      expect(mockDeleteDayAt).not.toHaveBeenCalled();
      expect(onReload).not.toHaveBeenCalled();
    });

    it('notifies and does not reload if deleteDayAt fails', async () => {
      mockDeleteDayAt.mockRejectedValue(new Error('boom'));
      const handler = makeDeleteDayHandler('class1', onReload);

      await handler(3);

      expect(mockShowNotification).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error');
      expect(onReload).not.toHaveBeenCalled();
    });
  });

  describe('makeInsertDayHandler', () => {
    it('inserts the day and reloads on success', async () => {
      mockInsertDayAt.mockResolvedValue(undefined);
      const handler = makeInsertDayHandler('class1', 5, onReload);

      await handler(2);

      expect(mockInsertDayAt).toHaveBeenCalledWith('class1', 2, 5);
      expect(onReload).toHaveBeenCalled();
    });

    it('notifies and does not reload if insertDayAt fails', async () => {
      mockInsertDayAt.mockRejectedValue(new Error('boom'));
      const handler = makeInsertDayHandler('class1', 5, onReload);

      await handler(2);

      expect(mockShowNotification).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error');
      expect(onReload).not.toHaveBeenCalled();
    });
  });
});
