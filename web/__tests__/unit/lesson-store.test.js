import { describe, it, expect, beforeEach } from 'vitest';
import { createLessonStore } from '../../lesson-store.js';
import { createMockDatabase, mockStorePort as storeFor } from '../helpers/mock-firebase.js';

let db;
let lessons;

async function read(path) {
  const snap = await db.get(db.ref(path));
  return snap.exists() ? snap.val() : null;
}

describe('lesson-store', () => {
  beforeEach(() => {
    db = createMockDatabase();
    lessons = createLessonStore(storeFor(db));
  });

  describe('save / get', () => {
    it('reads back a saved Lesson', async () => {
      await lessons.save('abc', { title: 'Fractions', blocks: [] });
      expect(await lessons.get('abc')).toEqual({ title: 'Fractions', blocks: [] });
    });

    it('returns null for a Lesson that does not exist', async () => {
      expect(await lessons.get('missing')).toBeNull();
    });
  });

  describe('getTitle', () => {
    it("returns a Lesson's title", async () => {
      await lessons.save('abc', { title: 'Fractions', blocks: [] });
      expect(await lessons.getTitle('abc')).toBe('Fractions');
    });

    it('returns null when the Lesson does not exist', async () => {
      expect(await lessons.getTitle('missing')).toBeNull();
    });
  });

  describe('listTitles', () => {
    it('maps every Lesson id to its title (null when it has none)', async () => {
      await lessons.save('a', { title: 'Alpha', blocks: [] });
      await lessons.save('b', { blocks: [] });
      expect(await lessons.listTitles()).toEqual({ a: 'Alpha', b: null });
    });

    it('returns an empty map when there are no Lessons', async () => {
      expect(await lessons.listTitles()).toEqual({});
    });
  });

  describe('newId', () => {
    it('returns a 32-character hex id no Lesson uses yet', async () => {
      const id = await lessons.newId();
      expect(id).toMatch(/^[0-9a-f]{32}$/);
      expect(await lessons.get(id)).toBeNull();
    });

    it('skips an id a Lesson already uses', async () => {
      const taken = 'aa'.repeat(16);
      const free = 'bb'.repeat(16);
      await lessons.save(taken, { title: 'Taken' });
      const bytes = [new Uint8Array(16).fill(0xaa), new Uint8Array(16).fill(0xbb)];
      const original = crypto.getRandomValues;
      crypto.getRandomValues = (arr) => { arr.set(bytes.shift()); return arr; };
      try {
        expect(await lessons.newId()).toBe(free);
      } finally {
        crypto.getRandomValues = original;
      }
    });
  });

  describe('create', () => {
    it('saves a new Lesson under a fresh id and returns the id', async () => {
      const id = await lessons.create({ title: 'Empty Lesson' });
      expect(await read(`content/${id}`)).toEqual({ title: 'Empty Lesson' });
    });
  });

  describe('duplicate', () => {
    it('saves a copy titled "(Copy)" under a new id', async () => {
      const { id, lesson } = await lessons.duplicate({ title: 'Original', blocks: [{ type: 'text' }] });
      expect(lesson).toEqual({ title: 'Original (Copy)', blocks: [{ type: 'text' }] });
      expect(await lessons.get(id)).toEqual(lesson);
    });
  });

  describe('Schedule uses and delete', () => {
    beforeEach(() => {
      db.reset({
        content: {
          doomed: { title: 'Doomed' },
          keep: { title: 'Keep' },
        },
        classes: {
          p2: { name: 'Period 2', displayOrder: 2 },
          p1: { name: 'Period 1', displayOrder: 1 },
          p3: { name: 'Period 3', displayOrder: 3 },
          p4: { displayOrder: 4 },
        },
        schedule: {
          p1: { 0: ['keep'], 3: ['doomed', 'keep'], 7: ['doomed'] },
          // Dense Day Indices come back from Firebase as an array
          p2: [['doomed', 'doomed'], ['keep']],
          p3: { 1: ['keep'] },
          p4: { 5: ['doomed'] },
        },
      });
    });

    it('lists every Class and Day Index that uses a Lesson, in Class display order', async () => {
      expect(await lessons.findScheduleUses('doomed')).toEqual([
        { classId: 'p1', className: 'Period 1', dayIndices: [3, 7] },
        { classId: 'p2', className: 'Period 2', dayIndices: [0] },
        // A Class with no name falls back to its id
        { classId: 'p4', className: 'p4', dayIndices: [5] },
      ]);
    });

    it('reads gaps in an array-shaped Schedule, and lists a Class with no record first', async () => {
      db.reset({
        content: { doomed: { title: 'Doomed' } },
        classes: { p1: { name: 'Period 1', displayOrder: 1 } },
        schedule: {
          p1: [['doomed']],
          orphan: [null, null, ['doomed']],
        },
      });

      expect(await lessons.findScheduleUses('doomed')).toEqual([
        { classId: 'orphan', className: 'orphan', dayIndices: [2] },
        { classId: 'p1', className: 'Period 1', dayIndices: [0] },
      ]);

      await lessons.delete('doomed');
      expect(await read('schedule/orphan')).toEqual([null, null, []]);
    });

    it('lists no uses for a Lesson no Schedule has', async () => {
      expect(await lessons.findScheduleUses('keep-not-scheduled')).toEqual([]);
    });

    it('lists no uses when there are no Schedules or Classes at all', async () => {
      db.reset({ content: { doomed: { title: 'Doomed' } } });
      expect(await lessons.findScheduleUses('doomed')).toEqual([]);
    });

    it('deletes the Lesson and every Schedule reference to it, leaving emptied days as gaps', async () => {
      await lessons.delete('doomed');

      expect(await lessons.get('doomed')).toBeNull();
      expect(await lessons.get('keep')).toEqual({ title: 'Keep' });
      expect(await read('schedule/p1')).toEqual({ 0: ['keep'], 3: ['keep'], 7: [] });
      expect(await read('schedule/p2')).toEqual([[], ['keep']]);
      expect(await read('schedule/p3')).toEqual({ 1: ['keep'] });
      expect(await read('schedule/p4')).toEqual({ 5: [] });
    });

    it('makes the whole delete one atomic update', async () => {
      const port = storeFor(db);
      const updates = [];
      const spied = createLessonStore({
        read: port.read,
        update: (u) => { updates.push(u); return port.update(u); },
      });

      await spied.delete('doomed');

      expect(updates).toEqual([{
        'content/doomed': null,
        'schedule/p1/3': ['keep'],
        'schedule/p1/7': [],
        'schedule/p2/0': [],
        'schedule/p4/5': [],
      }]);
    });
  });
});
