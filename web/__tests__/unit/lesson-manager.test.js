import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createLessonCluster,
  createLessonClusterWithDB,
} from '../../lesson-manager.js';
import { DEFAULT_LESSON_TITLE } from '../../constants.js';
import { initializeDatabase } from '../../database-handle.js';

vi.mock('../../drag-drop-utils.js', () => ({
  setupDragHandlers: vi.fn(),
}));

// A tiny in-memory Realtime Database: paths map to values.
let store = {};
vi.mock('https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js', () => ({
  ref: (db, path) => ({ path }),
  get: async (r) => ({ exists: () => r.path in store, val: () => structuredClone(store[r.path]) ?? null }),
  set: async (r, value) => { store[r.path] = structuredClone(value); },
}));

const menuItems = () => [...document.querySelectorAll('[role="menu"] [role="menuitem"]')];
const menuItem = (text) => menuItems().find((b) => b.textContent === text);
const openMenu = (cluster) => cluster.querySelector('[aria-haspopup="menu"]').click();
const flush = () => new Promise((r) => setTimeout(r, 0));

function cluster(overrides = {}) {
  const el = createLessonCluster({
    lessonHash: 'hash1',
    dayIndex: 2,
    lessonIndex: 1,
    lessons: ['hash0', 'hash1', 'hash2'],
    lessonTitle: 'Test Lesson',
    classId: 'class1',
    onMoveLeft: vi.fn(),
    onMoveRight: vi.fn(),
    onMoveToPreviousDay: vi.fn(),
    onMoveToNextDay: vi.fn(),
    onRemove: vi.fn(),
    onClick: vi.fn(),
    ...overrides,
  });
  document.body.appendChild(el);
  return el;
}

describe('lesson-manager', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    store = {};
    initializeDatabase({});
  });

  describe('createLessonCluster', () => {
    it('is a draggable cluster carrying its placement', async () => {
      const { setupDragHandlers } = await import('../../drag-drop-utils.js');
      const el = cluster();

      expect(el.className).toBe('lesson-cluster');
      expect(el.draggable).toBe(true);
      expect(el.dataset.lessonHash).toBe('hash1');
      expect(el.dataset.dayIndex).toBe('2');
      expect(el.dataset.lessonIndex).toBe('1');
      expect(setupDragHandlers).toHaveBeenCalledWith(el, {
        lessonHash: 'hash1', fromDayIndex: 2, fromLessonIndex: 1, classId: 'class1',
      });
    });

    it('is one row: the title button and a ⋮ button, nothing else', () => {
      const el = cluster();
      const buttons = [...el.querySelectorAll('button')];

      expect(buttons.length).toBe(2);
      expect(buttons[0].classList.contains('lesson-main-btn')).toBe(true);
      expect(buttons[0].textContent).toBe('Test Lesson');
      expect(buttons[1].textContent).toBe('⋮');
      expect(buttons[0].parentElement).toBe(buttons[1].parentElement);
    });

    it('names the ⋮ button after the Lesson for screen readers', () => {
      const btn = cluster().querySelector('[aria-haspopup="menu"]');
      expect(btn.getAttribute('aria-label')).toBe('Actions for Test Lesson');
    });

    it('falls back to the default title', () => {
      const el = cluster({ lessonTitle: '' });
      expect(el.querySelector('.lesson-main-btn').textContent).toBe(DEFAULT_LESSON_TITLE);
    });

    it('shows the full title as the title button\'s only tooltip, so a title cut off with … can be read', () => {
      const long = 'A very long Lesson title that the schedule row cuts off with an ellipsis';
      const el = cluster({ lessonTitle: long });
      const btn = el.querySelector('.lesson-main-btn');
      expect(btn.title).toBe(long);
      // No ancestor in the cluster carries a competing tooltip.
      for (let node = btn.parentElement; node; node = node.parentElement) {
        expect(node.hasAttribute('title')).toBe(false);
      }
    });

    it('uses the default title as the tooltip when the Lesson has none', () => {
      const el = cluster({ lessonTitle: '' });
      expect(el.querySelector('.lesson-main-btn').title).toBe(DEFAULT_LESSON_TITLE);
    });

    it('opens the Lesson on a title click', () => {
      const onClick = vi.fn();
      cluster({ onClick }).querySelector('.lesson-main-btn').click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('⋮ opens the five actions in plain words', () => {
      openMenu(cluster());
      expect(menuItems().map((b) => b.textContent)).toEqual([
        'Move left', 'Move right', 'Move to previous day', 'Move to next day', 'Remove from this day',
      ]);
      expect(menuItems().every((b) => !b.disabled)).toBe(true);
    });

    it('disables Move left on the first Lesson', () => {
      openMenu(cluster({ lessonIndex: 0, lessonHash: 'hash0' }));
      expect(menuItem('Move left').disabled).toBe(true);
      expect(menuItem('Move right').disabled).toBe(false);
    });

    it('disables Move right on the last Lesson', () => {
      openMenu(cluster({ lessonIndex: 2, lessonHash: 'hash2' }));
      expect(menuItem('Move right').disabled).toBe(true);
      expect(menuItem('Move left').disabled).toBe(false);
    });

    it('disables Move to previous day at Day Index 0', () => {
      openMenu(cluster({ dayIndex: 0 }));
      expect(menuItem('Move to previous day').disabled).toBe(true);
      expect(menuItem('Move to next day').disabled).toBe(false);
    });

    it.each([
      ['Move left', 'onMoveLeft'],
      ['Move right', 'onMoveRight'],
      ['Move to previous day', 'onMoveToPreviousDay'],
      ['Move to next day', 'onMoveToNextDay'],
      ['Remove from this day', 'onRemove'],
    ])('%s runs %s', async (label, handler) => {
      const fn = vi.fn();
      openMenu(cluster({ [handler]: fn }));
      menuItem(label).click();
      await flush();
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('createLessonClusterWithDB', () => {
    function dbCluster(overrides = {}) {
      const onScheduleReload = vi.fn();
      const el = createLessonClusterWithDB({
        lessonHash: 'hash1',
        dayIndex: 2,
        lessonIndex: 1,
        lessons: ['hash0', 'hash1', 'hash2'],
        lessonTitle: 'Test',
        classId: 'class1',
        onScheduleReload,
        ...overrides,
      });
      document.body.appendChild(el);
      return { el, onScheduleReload };
    }

    async function choose(el, label) {
      openMenu(el);
      menuItem(label).click();
      await flush();
    }

    beforeEach(() => {
      store['schedule/class1/1'] = ['p0'];
      store['schedule/class1/2'] = ['hash0', 'hash1', 'hash2'];
      store['schedule/class1/3'] = ['n0', 'n1'];
    });

    it('Move left swaps with the Lesson before it', async () => {
      const { el, onScheduleReload } = dbCluster();
      await choose(el, 'Move left');
      expect(store['schedule/class1/2']).toEqual(['hash1', 'hash0', 'hash2']);
      expect(onScheduleReload).toHaveBeenCalled();
    });

    it('Move right swaps with the Lesson after it', async () => {
      const { el, onScheduleReload } = dbCluster();
      await choose(el, 'Move right');
      expect(store['schedule/class1/2']).toEqual(['hash0', 'hash2', 'hash1']);
      expect(onScheduleReload).toHaveBeenCalled();
    });

    it('Move to previous day appends it to the end of that day', async () => {
      const { el, onScheduleReload } = dbCluster();
      await choose(el, 'Move to previous day');
      expect(store['schedule/class1/1']).toEqual(['p0', 'hash1']);
      expect(store['schedule/class1/2']).toEqual(['hash0', 'hash2']);
      expect(onScheduleReload).toHaveBeenCalled();
    });

    it('Move to next day appends it to the end of that day', async () => {
      const { el } = dbCluster();
      await choose(el, 'Move to next day');
      expect(store['schedule/class1/3']).toEqual(['n0', 'n1', 'hash1']);
      expect(store['schedule/class1/2']).toEqual(['hash0', 'hash2']);
    });

    it('Move to next day works when that day is outside what is shown (not yet in the Schedule)', async () => {
      const { el } = dbCluster({ dayIndex: 3, lessonIndex: 1, lessonHash: 'n1', lessons: ['n0', 'n1'] });
      await choose(el, 'Move to next day');
      expect(store['schedule/class1/4']).toEqual(['n1']);
      expect(store['schedule/class1/3']).toEqual(['n0']);
    });

    it('Remove from this day removes only the placement, with no confirm', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm');
      store['content/hash1'] = { title: 'Test' };
      const { el, onScheduleReload } = dbCluster();
      await choose(el, 'Remove from this day');
      expect(store['schedule/class1/2']).toEqual(['hash0', 'hash2']);
      expect(store['content/hash1']).toEqual({ title: 'Test' });
      expect(document.querySelector('[role="alertdialog"]')).toBeNull();
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(onScheduleReload).toHaveBeenCalled();
    });

    it('opens the editor by default on a title click', () => {
      const { el } = dbCluster();
      const originalLocation = window.location;
      delete window.location;
      window.location = { href: '' };

      el.querySelector('.lesson-main-btn').click();

      expect(window.location.href).toBe('editor.html?page=hash1&fromClass=class1');
      window.location = originalLocation;
    });

    it('uses a custom title-click handler when given', () => {
      const onLessonClick = vi.fn();
      const { el } = dbCluster({ onLessonClick });
      el.querySelector('.lesson-main-btn').click();
      expect(onLessonClick).toHaveBeenCalledTimes(1);
    });
  });
});
