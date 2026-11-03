// Fake, hard-coded data for the School Clock mockups. Nothing here is computed
// from a real clock; every value is what the screen would show at that moment.
// Times are 24h "H:MM" so the timeline can be laid out proportionally.
(function () {
  const LABELS = {
    'Period 1': 'CSP',
    'Period 2': 'CSP',
    'Period 3': 'AP CSA',
    'Period 4': 'Prep',
    'Period 5': 'Intro CS',
    'Period 6': 'AP CSA',
    'Period 7': 'Robotics',
  };

  // All Day (Mon/Tue/Fri), HS, 2026-27 style times.
  const ALL_DAY = [
    ['Period 1', 'period', '8:00', '8:50'],
    ['Period 2', 'period', '8:55', '9:45'],
    ['Nutrition', 'break', '9:45', '10:00'],
    ['Period 3', 'period', '10:05', '10:55'],
    ['Period 4', 'period', '11:00', '11:50'],
    ['Lunch', 'break', '11:50', '12:30'],
    ['Period 5', 'period', '12:35', '13:25'],
    ['Period 6', 'period', '13:30', '14:20'],
    ['Period 7', 'period', '14:25', '15:10'],
  ];

  // HS Even Day (Wed): Chapel before Period 4.
  const EVEN_DAY = [
    ['Period 2', 'period', '8:00', '9:25'],
    ['Nutrition', 'break', '9:25', '9:40'],
    ['Chapel', 'assembly', '9:45', '10:25'],
    ['Period 4', 'period', '10:30', '11:55'],
    ['Lunch', 'break', '11:55', '12:35'],
    ['Period 6', 'period', '12:40', '14:05'],
    ['Seminar', 'period', '14:10', '15:10'],
  ];

  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const show = (t) => {
    const [h, m] = t.split(':').map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`;
  };
  const build = (rows) =>
    rows.map(([name, kind, start, end]) => ({
      name,
      kind,
      label: LABELS[name] || '',
      short: name.startsWith('Period ') ? 'P' + name.slice(7) : name === 'Nutrition' ? 'Nut' : name,
      start: show(start),
      end: show(end),
      startMin: toMin(start),
      endMin: toMin(end),
    }));

  const SCHEDULES = { all: build(ALL_DAY), even: build(EVEN_DAY) };

  const P3 = {
    kind: 'period',
    kindLabel: 'Period',
    headline: 'Period 3',
    tag: 'AP CSA',
    dayLabel: 'All Day',
    date: 'Tue, Oct 27',
    division: 'HS',
    span: { start: '10:05', end: '10:55' },
    progress: 463 / 3000,
    big: { value: '42:17', mode: 'left', caption: 'left' },
    small: [],
    facts: { elapsed: '7:43', clock: '10:12', ends: '10:55' },
    upNext: { name: 'Period 4', label: 'Prep', at: '11:00', in: 'in 47m' },
    schedule: 'all',
    nowMin: 612.7,
  };

  const BASE = {
    period: P3,
    readouts: {
      ...P3,
      small: [
        { value: '7:43', mode: 'elapsed', caption: 'since start' },
        { value: '10:12', mode: 'clock', caption: 'now', suffix: 'AM' },
      ],
    },
    passing: {
      kind: 'passing',
      kindLabel: 'Passing Period',
      headline: 'Passing Period',
      tag: '',
      dayLabel: 'All Day',
      date: 'Tue, Oct 27',
      division: 'HS',
      span: { start: '10:55', end: '11:00' },
      progress: 140 / 300,
      big: { value: '2:40', mode: 'left', caption: 'until Period 4' },
      small: [],
      facts: { elapsed: '2:20', clock: '10:57', ends: '11:00' },
      upNext: { name: 'Period 4', label: 'Prep', at: '11:00', in: 'in 2:40' },
      schedule: 'all',
      nowMin: 657.3,
    },
    break: {
      kind: 'break',
      kindLabel: 'Break',
      headline: 'Nutrition',
      tag: '',
      dayLabel: 'Even Day',
      date: 'Wed, Oct 28',
      division: 'HS',
      span: { start: '9:25', end: '9:40' },
      progress: 348 / 900,
      big: { value: '9:12', mode: 'left', caption: 'left' },
      small: [],
      facts: { elapsed: '5:48', clock: '9:30', ends: '9:40' },
      upNext: { name: 'Chapel', label: '', at: '9:45', in: 'in 14m' },
      schedule: 'even',
      nowMin: 570.8,
    },
    assembly: {
      kind: 'assembly',
      kindLabel: 'Assembly',
      headline: 'Chapel',
      tag: '',
      dayLabel: 'Even Day',
      date: 'Wed, Oct 28',
      division: 'HS',
      span: { start: '9:45', end: '10:25' },
      progress: 1110 / 2400,
      big: { value: '21:30', mode: 'left', caption: 'left' },
      small: [],
      facts: { elapsed: '18:30', clock: '10:03', ends: '10:25' },
      upNext: { name: 'Period 4', label: 'Prep', at: '10:30', in: 'in 26m' },
      schedule: 'even',
      nowMin: 603.5,
    },
    before: {
      kind: 'offhours',
      kindLabel: 'Before school',
      headline: 'Before school',
      tag: '',
      dayLabel: 'All Day',
      date: 'Tue, Oct 27',
      division: 'HS',
      span: null,
      progress: null,
      big: { value: '42:00', mode: 'until', caption: 'until school starts' },
      small: [],
      facts: { elapsed: '16h 10m', clock: '7:18', ends: '8:00' },
      line: 'Period 1 starts in 42m · 8:00 AM',
      upNext: { name: 'Period 1', label: 'CSP', at: '8:00', in: 'in 42m' },
      schedule: 'all',
      nowMin: 438,
    },
    after: {
      kind: 'offhours',
      kindLabel: 'After school',
      headline: 'After school',
      tag: '',
      dayLabel: 'All Day',
      date: 'Tue, Oct 27',
      division: 'HS',
      span: null,
      progress: null,
      big: { value: '1:15:00', mode: 'since', caption: 'since school ended' },
      small: [],
      facts: { elapsed: '1:15:00', clock: '4:25', ends: '3:10' },
      line: 'Next: Wed, Oct 28 · Even Day · starts in 15h 35m',
      upNext: { name: 'Wed, Oct 28', label: 'Even Day', at: '8:00', in: 'in 15h 35m' },
      schedule: 'all',
      nowMin: 985,
    },
    dayoff: {
      kind: 'dayoff',
      kindLabel: 'Day off',
      headline: 'Thanksgiving Break',
      tag: '',
      dayLabel: 'Thanksgiving Break',
      date: 'Wed, Nov 25',
      division: 'HS',
      span: null,
      progress: null,
      big: { value: '4d 17h', mode: 'until', caption: 'until Mon, Nov 30' },
      small: [],
      facts: { elapsed: '', clock: '2:30', ends: '' },
      line: 'Back Mon, Nov 30 · All Day',
      upNext: { name: 'Mon, Nov 30', label: 'All Day', at: '8:00', in: 'in 4d 17h' },
      schedule: null,
    },
    experience: {
      kind: 'experience',
      kindLabel: 'Experience Week',
      headline: 'HS Experience Week',
      tag: '',
      dayLabel: 'HS Experience Week',
      date: 'Wed, Jan 20',
      division: 'HS',
      span: null,
      progress: null,
      big: { value: '4d 21h', mode: 'until', caption: 'until Mon, Jan 25' },
      small: [],
      facts: { elapsed: '', clock: '10:12', ends: '' },
      line: 'Enjoy the trips · back Mon, Jan 25',
      upNext: { name: 'Mon, Jan 25', label: 'All Day', at: '8:00', in: 'in 4d 21h' },
      schedule: null,
    },
    summer: {
      kind: 'summer',
      kindLabel: 'Summer',
      headline: 'Day 12 of Summer',
      tag: '',
      dayLabel: 'Summer',
      date: 'Tue, Jun 8',
      division: 'HS',
      span: null,
      progress: null,
      big: { value: '10:12', mode: 'clock', caption: 'now', suffix: 'AM' },
      small: [],
      facts: { elapsed: '', clock: '10:12', ends: '' },
      line: 'Have a great summer',
      upNext: null,
      schedule: null,
    },
  };

  const RING_SCENE = {
    ...P3,
    progress: 2700 / 3000,
    big: { value: '5:00', mode: 'left', caption: 'left' },
    facts: { elapsed: '45:00', clock: '10:50', ends: '10:55' },
    nowMin: 650,
  };

  const TIMER_SCENE = {
    ...P3,
    timer: { value: '4:12', total: '5:00', progress: 48 / 300, paused: false },
  };

  // Every addressable state: `#<state>` or `#<state>&theme=light`.
  const STATES = [
    { id: 'period', title: 'In a Period', scene: BASE.period },
    { id: 'readouts', title: 'Several Readouts', scene: BASE.readouts },
    { id: 'passing', title: 'Passing Period', scene: BASE.passing },
    { id: 'break', title: 'Break (Nutrition)', scene: BASE.break },
    { id: 'assembly', title: 'Assembly (Chapel)', scene: BASE.assembly },
    { id: 'before', title: 'Before school', scene: BASE.before },
    { id: 'after', title: 'After school', scene: BASE.after },
    { id: 'dayoff', title: 'Day off', scene: BASE.dayoff },
    { id: 'experience', title: 'Experience Week', scene: BASE.experience },
    { id: 'summer', title: 'Summer', scene: BASE.summer },
    {
      id: 'ringing',
      title: 'Alarm ringing',
      scene: RING_SCENE,
      overlay: 'ringing',
      ring: { kind: 'Period Alarm', title: 'Wrap-up time', detail: '5 min before the end of Period 3' },
    },
    { id: 'sound', title: 'Sound blocked', scene: BASE.period, overlay: 'sound' },
    { id: 'timer', title: 'Timer running', scene: TIMER_SCENE },
    { id: 'picker', title: 'Timer picker', scene: BASE.period, overlay: 'picker' },
    { id: 'settings', title: 'Settings drawer', scene: BASE.period, overlay: 'settings' },
    { id: 'alarm', title: 'Add Period Alarm', scene: BASE.period, overlay: 'alarm' },
    { id: 'first', title: 'First visit', scene: { ...BASE.period, division: '' }, overlay: 'first' },
    { id: 'mini', title: 'Mini player', scene: BASE.period, mini: true },
    { id: 'mini-passing', title: 'Mini player, Passing', scene: BASE.passing, mini: true },
    {
      id: 'mini-ringing',
      title: 'Mini player, ringing',
      scene: RING_SCENE,
      mini: true,
      overlay: 'ringing',
      ring: { kind: 'Period Alarm', title: 'Wrap-up time', detail: '5 min before the end of Period 3' },
    },
  ];

  const ALARMS = [
    { name: 'Wrap-up time', detail: '5 min before the end · Periods 1–7 · Block Days', on: true, sound: 'Chime' },
    { name: 'Halfway check', detail: 'Halfway · Period 3, Period 6', on: true, sound: 'Beep' },
    { name: 'Morning duty', detail: '7:55 AM · every School Day', on: false, sound: 'School bell' },
  ];

  const BELL_SCHEDULES = [
    { name: 'All Day', block: false },
    { name: 'Even Day', block: true },
    { name: 'Odd Day', block: true },
    { name: 'Late Start Even', block: true },
    { name: 'HS Super Seminar Even', block: true },
    { name: 'Finals', block: false },
    { name: 'All School Convocation', block: false },
    { name: 'Pep Rally', block: false },
  ];

  window.MockData = { STATES, SCHEDULES, LABELS, ALARMS, BELL_SCHEDULES };
})();
