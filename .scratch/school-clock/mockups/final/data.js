// Fake data for the design reference. Reuses ticket 01's scenes
// (../shared/data.js) and adds what 03 needs: seconds per scene, the Next
// School Day the Day Strip shows during Off-Hours, the timer scenes, edit
// mode, unknown date, simulated time, the hint and toasts.
(function () {
  const M = window.MockData;
  const base = Object.fromEntries(M.STATES.map((s) => [s.id, s]));
  const sc = (id) => base[id].scene;

  // The current second of each scene, so "seconds on" clock times are right.
  const SEC = { period: 43, passing: 20, break: 48, assembly: 30, before: 0, after: 0, dayoff: 12, experience: 12, summer: 12 };

  // What the Day Strip shows: today's Segments during school, the Next School
  // Day's during Off-Hours (`next` says which day), nothing in Summer and
  // Experience Week (schedule null) or on an unknown date.
  const STRIP_NEXT = {
    before: { schedule: 'all', label: 'Tue, Oct 27 · All Day', today: true },
    after: { schedule: 'even', label: 'Wed, Oct 28 · Even Day' },
    dayoff: { schedule: 'all', label: 'Mon, Nov 30 · All Day' },
  };

  const withSec = (s, id) => ({ ...s, sec: SEC[id] ?? 0, strip: STRIP_NEXT[id] || (s.schedule ? { schedule: s.schedule } : null) });

  const P = withSec(sc('period'), 'period');
  const RING = { ...withSec(base.ringing.scene, 'period'), sec: 0, facts: { ...base.ringing.scene.facts } };
  const ring = base.ringing.ring;

  const READOUTS = withSec(sc('readouts'), 'period');
  // Edit mode with room for one more (the limit is three Readouts).
  const EDIT = { ...READOUTS, small: [{ value: '7:43', mode: 'elapsed', caption: 'since start' }] };

  const TIMER = {
    ...P,
    timer: { value: '4:12', total: '5:00', left: 252 / 300, paused: false },
  };
  const TIMER_PAUSED = { ...P, timer: { value: '2:05', total: '5:00', left: 125 / 300, paused: true } };
  const TIMER_READOUTS = {
    ...READOUTS,
    timer: { value: '9:48', total: '10:00', left: 588 / 600, paused: false },
  };

  const UNKNOWN = {
    kind: 'unknown',
    kindLabel: 'Time only',
    headline: 'Tue, Aug 15, 2028',
    tag: '',
    dayLabel: '',
    date: 'Tue, Aug 15, 2028',
    division: 'HS',
    span: null,
    progress: null,
    big: { value: '10:12', mode: 'clock', caption: 'now', suffix: 'AM' },
    small: [],
    line: 'No school calendar for this date yet',
    upNext: null,
    schedule: null,
    strip: null,
    sec: 5,
  };

  const SIMULATED = { ...P, simulated: 'Simulated time · Tue, Oct 27, 10:12:43 AM · this tab only' };

  const S = (id, title, scene, extra = {}) => ({ id, title, scene, ...extra });
  const STATES = [
    S('period', 'In a Period', P),
    S('readouts', 'Several Readouts', READOUTS),
    S('edit', 'Editing Readouts', EDIT, { edit: true }),
    S('passing', 'Passing Period', withSec(sc('passing'), 'passing')),
    S('break', 'Break (Nutrition)', withSec(sc('break'), 'break')),
    S('assembly', 'Assembly (Chapel)', withSec(sc('assembly'), 'assembly')),
    S('before', 'Before school', withSec(sc('before'), 'before')),
    S('after', 'After school', withSec(sc('after'), 'after')),
    S('dayoff', 'Day off', withSec(sc('dayoff'), 'dayoff')),
    S('experience', 'Experience Week', withSec(sc('experience'), 'experience')),
    S('summer', 'Summer', withSec(sc('summer'), 'summer')),
    S('unknown', 'Unknown date', UNKNOWN),
    S('simulated', 'Simulated time', SIMULATED),
    S('ringing', 'Alarm ringing', RING, { overlay: 'ringing', ring }),
    S('sound', 'Sound blocked', P, { overlay: 'sound' }),
    S('timer', 'Timer running', TIMER),
    S('timer-paused', 'Timer paused', TIMER_PAUSED),
    S('timer-readouts', 'Timer with Readouts', TIMER_READOUTS),
    S('timer-ringing', 'Timer done, ringing', { ...TIMER, timer: { value: '0:00', total: '5:00', left: 0, paused: false } }, {
      overlay: 'ringing',
      ring: { kind: 'Timer', title: 'Time is up', detail: '5:00 timer' },
    }),
    S('picker', 'Timer picker', P, { overlay: 'picker' }),
    S('settings', 'Settings drawer', P, { overlay: 'settings' }),
    S('look', 'Settings: theme picker', P, { overlay: 'settings', scrollTo: 'look' }),
    S('alarm', 'Settings: add Period Alarm', P, { overlay: 'alarm' }),
    S('alarm-clock', 'Settings: add Clock Alarm', P, { overlay: 'alarm-clock' }),
    S('first', 'First visit', { ...P, division: '' }, { overlay: 'first' }),
    S('hint', 'First visit: Pick a theme hint', P, { overlay: 'hint' }),
    S('toast', 'Toast: Alarm deleted, Undo', P, { overlay: 'toast' }),
    S('toast-error', 'Toast: could not save', P, { overlay: 'toast-error' }),
    S('mini', 'Mini player', P, { mini: true }),
    S('mini-passing', 'Mini player, Passing', withSec(sc('passing'), 'passing'), { mini: true }),
    S('mini-ringing', 'Mini player, ringing', RING, { mini: true, overlay: 'ringing', ring }),
    S('mini-timer', 'Mini player, timer', TIMER, { mini: true }),
  ];

  window.FinalData = { STATES };
})();
