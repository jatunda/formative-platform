import { describe, it, expect } from 'vitest';
import { SCHOOL_YEARS } from '../../clock/school-years.js';

// Data integrity, run over every registered School Year, so a typo in a
// hand-edited file (like the PDF's Pep Rally Period 5 time) fails before deploy.

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = ['period', 'break', 'assembly'];

/** Every Segment list a Bell Schedule has: the shared one and each Division's own. */
function segmentLists(bellSchedule) {
  return [
    ['shared', bellSchedule.segments],
    ...Object.entries(bellSchedule.byDivision ?? {}),
  ];
}

describe.each(SCHOOL_YEARS.map((year) => [year.id, year]))('School Year %s', (_id, year) => {
  it('has a valid date range', () => {
    expect(year.start).toMatch(ISO_DATE);
    expect(year.end).toMatch(ISO_DATE);
    expect(year.start < year.end).toBe(true);
  });

  for (const [key, bellSchedule] of Object.entries(year.bellSchedules)) {
    describe(`Bell Schedule ${key}`, () => {
      it('has a name and at least one Segment for each Division', () => {
        expect(bellSchedule.name).toBeTruthy();
        for (const [, segments] of segmentLists(bellSchedule)) expect(segments.length).toBeGreaterThan(0);
        for (const division of Object.keys(bellSchedule.byDivision ?? {})) expect(['MS', 'HS']).toContain(division);
      });

      it('has Segments with a name, a valid kind and valid times', () => {
        for (const [, segments] of segmentLists(bellSchedule)) {
          for (const segment of segments) {
            expect(segment.name).toBeTruthy();
            expect(KINDS).toContain(segment.kind);
            expect(segment.start).toMatch(HHMM);
            expect(segment.end).toMatch(HHMM);
          }
        }
      });

      it("has each Division's Segments in order, with none overlapping", () => {
        for (const [list, segments] of segmentLists(bellSchedule)) {
          segments.forEach((segment, i) => {
            const where = `${key} (${list}) ${segment.name}`;
            expect(segment.start < segment.end, `${where} ends after it starts`).toBe(true);
            if (i > 0) {
              expect(segments[i - 1].end <= segment.start, `${where} starts after the one before ends`).toBe(true);
            }
          });
        }
      });
    });
  }

  it('has Weekday Defaults for Monday to Friday that name known Bell Schedules', () => {
    for (const weekday of [1, 2, 3, 4, 5]) {
      expect(Object.keys(year.bellSchedules)).toContain(year.weekdayDefaults[weekday]);
    }
  });

  it('has every Calendar Exception inside the year, naming a known Bell Schedule or a Day Label', () => {
    for (const exception of year.calendarExceptions) {
      const where = `exception on ${exception.date}`;
      expect(exception.date, where).toMatch(ISO_DATE);
      expect(year.start <= exception.date && exception.date <= year.end, `${where} is inside the year`).toBe(true);
      if (exception.division !== undefined) expect(['MS', 'HS'], where).toContain(exception.division);
      if (exception.kind === 'bellSchedule') {
        expect(Object.keys(year.bellSchedules), where).toContain(exception.bellSchedule);
      } else if (exception.kind === 'dayOff') {
        expect(exception.dayLabel, where).toBeTruthy();
      } else {
        expect(exception.kind, where).toBe('experienceWeek');
      }
    }
  });

  it('has at most one exception per date for each Division', () => {
    const seen = new Set();
    for (const exception of year.calendarExceptions) {
      const id = `${exception.date} ${exception.division ?? 'both'}`;
      expect(seen.has(id), `duplicate exception ${id}`).toBe(false);
      seen.add(id);
    }
  });
});
