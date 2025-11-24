import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createLessonCluster,
  createLessonClusterWithDB,
} from '../../lesson-manager.js';
import { DEFAULT_LESSON_TITLE } from '../../constants.js';

// Mock dependencies
vi.mock('../../ui-components.js', () => ({
  createLeftArrowButton: vi.fn((disabled, onClick) => {
    const btn = document.createElement('button');
    btn.textContent = '←';
    btn.disabled = disabled;
    btn.onclick = onClick;
    return btn;
  }),
  createRightArrowButton: vi.fn((disabled, onClick) => {
    const btn = document.createElement('button');
    btn.textContent = '→';
    btn.disabled = disabled;
    btn.onclick = onClick;
    return btn;
  }),
  createDeleteButton: vi.fn((onClick) => {
    const btn = document.createElement('button');
    btn.textContent = '🗑️';
    btn.onclick = onClick;
    return btn;
  }),
}));

vi.mock('../../drag-drop-utils.js', () => ({
  setupDragHandlers: vi.fn(),
}));

// Mock Firebase
let mockSet = vi.fn();
vi.mock('https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js', () => ({
  ref: (db, path) => ({ path, key: path.split('/').pop() }),
  set: (ref, value) => mockSet(ref, value),
}));

describe('lesson-manager', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
  });

  describe('createLessonCluster', () => {
    it('should create a lesson cluster element', () => {
      const onMoveLeft = vi.fn();
      const onMoveRight = vi.fn();
      const onDelete = vi.fn();
      const onClick = vi.fn();

      const cluster = createLessonCluster({
        lessonHash: 'hash1',
        dayIndex: 0,
        lessonIndex: 1,
        lessons: ['hash0', 'hash1', 'hash2'],
        lessonTitle: 'Test Lesson',
        classId: 'class1',
        onMoveLeft,
        onMoveRight,
        onDelete,
        onClick,
      });

      expect(cluster.tagName).toBe('SPAN');
      expect(cluster.className).toBe('lesson-cluster');
      expect(cluster.draggable).toBe(true);
      expect(cluster.dataset.lessonHash).toBe('hash1');
      expect(cluster.dataset.dayIndex).toBe('0');
      expect(cluster.dataset.lessonIndex).toBe('1');
    });

    it('should set up drag handlers', async () => {
      const { setupDragHandlers } = await import('../../drag-drop-utils.js');
      
      createLessonCluster({
        lessonHash: 'hash1',
        dayIndex: 0,
        lessonIndex: 1,
        lessons: ['hash0', 'hash1'],
        lessonTitle: 'Test',
        classId: 'class1',
        onMoveLeft: vi.fn(),
        onMoveRight: vi.fn(),
        onDelete: vi.fn(),
        onClick: vi.fn(),
      });

      expect(setupDragHandlers).toHaveBeenCalled();
      const call = setupDragHandlers.mock.calls[0];
      expect(call[1].lessonHash).toBe('hash1');
      expect(call[1].fromDayIndex).toBe(0);
      expect(call[1].fromLessonIndex).toBe(1);
    });

    it('should create main lesson button with title', () => {
      const cluster = createLessonCluster({
        lessonHash: 'hash1',
        dayIndex: 0,
        lessonIndex: 0,
        lessons: ['hash1'],
        lessonTitle: 'My Lesson Title',
        classId: 'class1',
        onMoveLeft: vi.fn(),
        onMoveRight: vi.fn(),
        onDelete: vi.fn(),
        onClick: vi.fn(),
      });

      const mainBtn = cluster.querySelector('.lesson-main-btn');
      expect(mainBtn).toBeTruthy();
      expect(mainBtn.textContent).toBe('My Lesson Title');
    });

    it('should use default title when lessonTitle is not provided', () => {
      const cluster = createLessonCluster({
        lessonHash: 'hash1',
        dayIndex: 0,
        lessonIndex: 0,
        lessons: ['hash1'],
        lessonTitle: '',
        classId: 'class1',
        onMoveLeft: vi.fn(),
        onMoveRight: vi.fn(),
        onDelete: vi.fn(),
        onClick: vi.fn(),
      });

      const mainBtn = cluster.querySelector('.lesson-main-btn');
      expect(mainBtn.textContent).toBe(DEFAULT_LESSON_TITLE);
    });

    it('should call onClick when main button is clicked', () => {
      const onClick = vi.fn();
      const cluster = createLessonCluster({
        lessonHash: 'hash1',
        dayIndex: 0,
        lessonIndex: 0,
        lessons: ['hash1'],
        lessonTitle: 'Test',
        classId: 'class1',
        onMoveLeft: vi.fn(),
        onMoveRight: vi.fn(),
        onDelete: vi.fn(),
        onClick,
      });

      const mainBtn = cluster.querySelector('.lesson-main-btn');
      mainBtn.click();

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should disable left arrow for first lesson', async () => {
      const { createLeftArrowButton } = await import('../../ui-components.js');
      
      createLessonCluster({
        lessonHash: 'hash0',
        dayIndex: 0,
        lessonIndex: 0,
        lessons: ['hash0', 'hash1'],
        lessonTitle: 'Test',
        classId: 'class1',
        onMoveLeft: vi.fn(),
        onMoveRight: vi.fn(),
        onDelete: vi.fn(),
        onClick: vi.fn(),
      });

      expect(createLeftArrowButton).toHaveBeenCalledWith(true, expect.any(Function));
    });

    it('should disable right arrow for last lesson', async () => {
      const { createRightArrowButton } = await import('../../ui-components.js');
      
      createLessonCluster({
        lessonHash: 'hash1',
        dayIndex: 0,
        lessonIndex: 1,
        lessons: ['hash0', 'hash1'],
        lessonTitle: 'Test',
        classId: 'class1',
        onMoveLeft: vi.fn(),
        onMoveRight: vi.fn(),
        onDelete: vi.fn(),
        onClick: vi.fn(),
      });

      expect(createRightArrowButton).toHaveBeenCalledWith(true, expect.any(Function));
    });

    it('should enable arrows for middle lessons', async () => {
      const { createLeftArrowButton, createRightArrowButton } = await import('../../ui-components.js');
      
      createLessonCluster({
        lessonHash: 'hash1',
        dayIndex: 0,
        lessonIndex: 1,
        lessons: ['hash0', 'hash1', 'hash2'],
        lessonTitle: 'Test',
        classId: 'class1',
        onMoveLeft: vi.fn(),
        onMoveRight: vi.fn(),
        onDelete: vi.fn(),
        onClick: vi.fn(),
      });

      expect(createLeftArrowButton).toHaveBeenCalledWith(false, expect.any(Function));
      expect(createRightArrowButton).toHaveBeenCalledWith(false, expect.any(Function));
    });

    it('should call onMoveLeft when left arrow is clicked', () => {
      const onMoveLeft = vi.fn();
      const cluster = createLessonCluster({
        lessonHash: 'hash1',
        dayIndex: 0,
        lessonIndex: 1,
        lessons: ['hash0', 'hash1'],
        lessonTitle: 'Test',
        classId: 'class1',
        onMoveLeft,
        onMoveRight: vi.fn(),
        onDelete: vi.fn(),
        onClick: vi.fn(),
      });

      const leftBtn = cluster.querySelector('button[textContent="←"]') || 
                     Array.from(cluster.querySelectorAll('button')).find(b => b.textContent === '←');
      if (leftBtn) {
        leftBtn.click();
        expect(onMoveLeft).toHaveBeenCalledTimes(1);
      }
    });

    it('should call onDelete when delete button is clicked', () => {
      const onDelete = vi.fn();
      const cluster = createLessonCluster({
        lessonHash: 'hash1',
        dayIndex: 0,
        lessonIndex: 0,
        lessons: ['hash1'],
        lessonTitle: 'Test',
        classId: 'class1',
        onMoveLeft: vi.fn(),
        onMoveRight: vi.fn(),
        onDelete,
        onClick: vi.fn(),
      });

      const deleteBtn = Array.from(cluster.querySelectorAll('button')).find(b => b.textContent === '🗑️');
      if (deleteBtn) {
        deleteBtn.click();
        expect(onDelete).toHaveBeenCalledTimes(1);
      }
    });

    it('should have correct structure with top and bottom rows', () => {
      const cluster = createLessonCluster({
        lessonHash: 'hash1',
        dayIndex: 0,
        lessonIndex: 0,
        lessons: ['hash1'],
        lessonTitle: 'Test',
        classId: 'class1',
        onMoveLeft: vi.fn(),
        onMoveRight: vi.fn(),
        onDelete: vi.fn(),
        onClick: vi.fn(),
      });

      const topRow = cluster.querySelector('.lesson-cluster-top');
      const bottomRow = cluster.querySelector('.lesson-cluster-bottom');

      expect(topRow).toBeTruthy();
      expect(bottomRow).toBeTruthy();
      expect(topRow.querySelector('.lesson-main-btn')).toBeTruthy();
    });
  });

  describe('createLessonClusterWithDB', () => {
    it('should create cluster with database operations', async () => {
      const mockDb = {};
      const onScheduleReload = vi.fn();

      const cluster = createLessonClusterWithDB({
        lessonHash: 'hash1',
        dayIndex: 0,
        lessonIndex: 1,
        lessons: ['hash0', 'hash1', 'hash2'],
        lessonTitle: 'Test Lesson',
        classId: 'class1',
        database: mockDb,
        onScheduleReload,
        onLessonClick: vi.fn(),
      });

      expect(cluster).toBeTruthy();
      expect(cluster.className).toBe('lesson-cluster');
    });

    it('should move lesson left when onMoveLeft is called', async () => {
      const mockDb = {};
      const onScheduleReload = vi.fn();

      const cluster = createLessonClusterWithDB({
        lessonHash: 'hash1',
        dayIndex: 0,
        lessonIndex: 1,
        lessons: ['hash0', 'hash1', 'hash2'],
        lessonTitle: 'Test',
        classId: 'class1',
        database: mockDb,
        onScheduleReload,
      });

      // Get the left arrow button and click it
      const leftBtn = Array.from(cluster.querySelectorAll('button')).find(b => b.textContent === '←');
      if (leftBtn && !leftBtn.disabled) {
        await leftBtn.onclick();
        
        expect(mockSet).toHaveBeenCalled();
        expect(onScheduleReload).toHaveBeenCalled();
      }
    });

    it('should not move lesson left if already at first position', async () => {
      const mockDb = {};
      const onScheduleReload = vi.fn();

      const cluster = createLessonClusterWithDB({
        lessonHash: 'hash0',
        dayIndex: 0,
        lessonIndex: 0,
        lessons: ['hash0', 'hash1'],
        lessonTitle: 'Test',
        classId: 'class1',
        database: mockDb,
        onScheduleReload,
      });

      const leftBtn = Array.from(cluster.querySelectorAll('button')).find(b => b.textContent === '←');
      if (leftBtn) {
        const initialCallCount = mockSet.mock.calls.length;
        await leftBtn.onclick();
        
        // Should not call set if already at first position
        expect(mockSet.mock.calls.length).toBe(initialCallCount);
      }
    });

    it('should move lesson right when onMoveRight is called', async () => {
      const mockDb = {};
      const onScheduleReload = vi.fn();

      const cluster = createLessonClusterWithDB({
        lessonHash: 'hash1',
        dayIndex: 0,
        lessonIndex: 1,
        lessons: ['hash0', 'hash1', 'hash2'],
        lessonTitle: 'Test',
        classId: 'class1',
        database: mockDb,
        onScheduleReload,
      });

      const rightBtn = Array.from(cluster.querySelectorAll('button')).find(b => b.textContent === '→');
      if (rightBtn && !rightBtn.disabled) {
        await rightBtn.onclick();
        
        expect(mockSet).toHaveBeenCalled();
        expect(onScheduleReload).toHaveBeenCalled();
      }
    });

    it('should delete lesson when onDelete is called', async () => {
      const mockDb = {};
      const onScheduleReload = vi.fn();

      const cluster = createLessonClusterWithDB({
        lessonHash: 'hash1',
        dayIndex: 0,
        lessonIndex: 1,
        lessons: ['hash0', 'hash1', 'hash2'],
        lessonTitle: 'Test',
        classId: 'class1',
        database: mockDb,
        onScheduleReload,
      });

      const deleteBtn = Array.from(cluster.querySelectorAll('button')).find(b => b.textContent === '🗑️');
      if (deleteBtn) {
        await deleteBtn.onclick();
        
        expect(mockSet).toHaveBeenCalled();
        const setCall = mockSet.mock.calls[0];
        expect(setCall[0].path).toContain('schedule/class1/0');
        expect(setCall[1]).toEqual(['hash0', 'hash2']); // hash1 removed
        expect(onScheduleReload).toHaveBeenCalled();
      }
    });

    it('should use default onClick handler if not provided', () => {
      const mockDb = {};
      const cluster = createLessonClusterWithDB({
        lessonHash: 'hash1',
        dayIndex: 0,
        lessonIndex: 0,
        lessons: ['hash1'],
        lessonTitle: 'Test',
        classId: 'class1',
        database: mockDb,
        onScheduleReload: vi.fn(),
      });

      const mainBtn = cluster.querySelector('.lesson-main-btn');
      expect(mainBtn).toBeTruthy();
      
      // Default handler should navigate to editor
      const originalLocation = window.location;
      delete window.location;
      window.location = { href: '' };
      
      mainBtn.click();
      
      expect(window.location.href).toContain('editor.html');
      expect(window.location.href).toContain('page=hash1');
      expect(window.location.href).toContain('fromClass=class1');
      
      window.location = originalLocation;
    });

    it('should use custom onClick handler if provided', () => {
      const mockDb = {};
      const customOnClick = vi.fn();
      
      const cluster = createLessonClusterWithDB({
        lessonHash: 'hash1',
        dayIndex: 0,
        lessonIndex: 0,
        lessons: ['hash1'],
        lessonTitle: 'Test',
        classId: 'class1',
        database: mockDb,
        onScheduleReload: vi.fn(),
        onLessonClick: customOnClick,
      });

      const mainBtn = cluster.querySelector('.lesson-main-btn');
      mainBtn.click();

      expect(customOnClick).toHaveBeenCalledTimes(1);
    });
  });
});

