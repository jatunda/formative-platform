import { describe, it, expect } from 'vitest';
import { fullMatrix, describeFailure, classify, KNOWN_FAILURES, parseFullArgs, fullRunFailed } from '../../scripts/clock-check-matrix.js';

describe('fullMatrix', () => {
  const runs = fullMatrix();
  const renders = runs.flatMap((run) => run.states.flatMap((state) => run.sizes.map((size) => ({ ...run, state, size }))));

  it('crosses one, two and three Readouts with edit mode, the timer and the sound prompt', () => {
    const configs = new Set(runs.map((r) => `${r.layout}|${r.editing}|${r.timer}|${r.soundOn}`));
    for (const layout of [null, 'countdown,clock', 'countdown,clock,countup']) {
      for (const editing of [false, true]) {
        for (const timer of [false, true]) {
          for (const soundOn of [false, true]) expect(configs.has(`${layout}|${editing}|${timer}|${soundOn}`)).toBe(true);
        }
      }
    }
  });

  it('checks every school state at the default sizes and the two short phones', () => {
    const period = renders.filter((r) => r.state === 'period' && r.layout === null && !r.editing && !r.timer && !r.soundOn);
    expect(period.map((r) => r.size).sort()).toEqual(
      ['1280x720', '1440x900', '1920x1080', '360x740', '375x667', '390x844', '480x320'],
    );
  });

  it('checks the unknown date (time only) once per sound setting and size, since it shows no layout, edit mode or timer', () => {
    const unknown = renders.filter((r) => r.state === 'unknown');
    expect(unknown).toHaveLength(2 * 7);
    expect(new Set(unknown.map((r) => r.soundOn))).toEqual(new Set([false, true]));
  });

  it('never checks the same render twice', () => {
    const keys = renders.map((r) => `${r.layout}|${r.editing}|${r.timer}|${r.soundOn}|${r.state}|${r.size}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(renders).toHaveLength(10 * 24 * 7 + 14);
  });

  it('names each run uniquely, for its screenshots', () => {
    const names = runs.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('3r-edit-timer-soundon');
    expect(names).toContain('1r');
  });
});

describe('describeFailure', () => {
  const clean = { scroll: { x: false, y: false }, stage: { fits: true, above: 0, below: 0 }, agenda: null, overlaps: [], errors: [], violations: [] };

  it('says nothing for a clean render', () => {
    expect(describeFailure(clean)).toEqual([]);
  });

  it('names every problem a render has', () => {
    expect(describeFailure({
      scroll: { x: true, y: true },
      stage: { fits: false, above: 12, below: 3 },
      agenda: { reachable: false, listHeight: 25, rowBottom: 700.4, listBottom: 690.6, visible: 667 },
      overlaps: ['Day Label', 'small Readout 1'],
      errors: ['boom'],
      violations: ['color-contrast: 2 node(s)'],
    })).toEqual([
      'scrolls sideways', 'scrolls down',
      "agenda's last row out of reach (list 25px tall, row bottom 700, list bottom 691, visible height 667)",
      'stage spills out of its row (12px above, 3px below)',
      'ring overlaps Day Label, small Readout 1', 'boom', 'color-contrast: 2 node(s)',
    ]);
  });
});

describe('classify', () => {
  const render = { layout: 'countdown,clock', editing: true, timer: false, soundOn: false, state: 'period', size: '375x667' };
  const known = [{ ticket: 52, match: { editing: true, sizes: ['375x667'], states: ['period', 'before'] } }];

  it('passes a clean render nobody expects to fail', () => {
    expect(classify({ ...render, size: '390x844', ok: true }, known)).toEqual({ outcome: 'passed' });
  });

  it('reports a ticketed failure as known, naming its ticket', () => {
    expect(classify({ ...render, ok: false }, known)).toEqual({ outcome: 'known', ticket: 52 });
  });

  it('reports a ticketed failure that now passes as stale, so the list is kept true', () => {
    expect(classify({ ...render, state: 'before', ok: true }, known)).toEqual({ outcome: 'stale', ticket: 52 });
  });

  it('reports any other failure as unexpected', () => {
    expect(classify({ ...render, editing: false, ok: false }, known)).toEqual({ outcome: 'unexpected' });
    expect(classify({ ...render, state: 'after', ok: false }, known)).toEqual({ outcome: 'unexpected' });
  });

  it('matches every field a known failure names, and any value of the ones it leaves out', () => {
    const exact = [{ ticket: 52, match: { layouts: ['countdown,clock,countup'], editing: false, timer: false, soundOn: false, states: ['before'], sizes: ['375x667'] } }];
    const three = { layout: 'countdown,clock,countup', editing: false, timer: false, soundOn: false, state: 'before', size: '375x667' };
    expect(classify({ ...three, ok: false }, exact).outcome).toBe('known');
    expect(classify({ ...three, layout: null, ok: false }, exact).outcome).toBe('unexpected');
    expect(classify({ ...three, timer: true, ok: false }, exact).outcome).toBe('unexpected');
    expect(classify({ ...three, soundOn: true, ok: false }, exact).outcome).toBe('unexpected');
  });
});

describe('KNOWN_FAILURES', () => {
  it('are each owned by a ticket', () => {
    for (const known of KNOWN_FAILURES) expect(known.ticket).toEqual(expect.any(Number));
  });
});

describe('parseFullArgs', () => {
  it('runs 6 pages at a time by default', () => {
    expect(parseFullArgs([])).toEqual({ jobs: 6 });
  });

  it('takes --jobs as a positive whole number', () => {
    expect(parseFullArgs(['--jobs', '3'])).toEqual({ jobs: 3 });
  });

  it.each([[['--jobs', 'abc']], [['--jobs', '0']], [['--jobs', '-2']], [['--jobs', '1.5']], [['--jobs']]])(
    'refuses %j, which would start no pages', (argv) => {
      expect(() => parseFullArgs(argv)).toThrow(/--jobs takes a positive whole number/);
    },
  );

  it('refuses an unknown option', () => {
    expect(() => parseFullArgs(['--job', '3'])).toThrow(/Unknown option --job/);
  });
});

describe('fullRunFailed', () => {
  it('fails a run that checked no renders', () => {
    expect(fullRunFailed([])).toBe(true);
  });

  it('passes a run of passed and known renders', () => {
    expect(fullRunFailed([{ outcome: 'passed' }, { outcome: 'known', ticket: 52 }])).toBe(false);
  });

  it('fails on any unexpected or stale render', () => {
    expect(fullRunFailed([{ outcome: 'passed' }, { outcome: 'unexpected' }])).toBe(true);
    expect(fullRunFailed([{ outcome: 'passed' }, { outcome: 'stale', ticket: 53 }])).toBe(true);
  });
});
