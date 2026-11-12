import { describe, it, expect } from 'vitest';
import { createSoundPlayer, ringLength, silentContext, SOUNDS, SOUND_NAMES, BELL_SECONDS, ALARM_MAX_SECONDS } from '../../clock/sound.js';
import { createFakeAudioContext, audibleStarts } from '../helpers/fake-audio.js';

const bell = (key, at, sound = 'softBell') => ({ key, at, sound, repeat: false });
const alarm = (key, at, sound = 'beep') => ({ key, at, sound, repeat: true });
/** A 5-second Bell of `sound` at 20 s, as the page rings one that stops on its own. */
const bellOf = (sound) => {
  const ctx = createFakeAudioContext({ state: 'running' });
  createSoundPlayer({ context: ctx }).schedule([{ key: 'b', at: 20, sound, repeat: true, seconds: 5 }]);
  return ctx;
};
/** Every node a source's sound passes through on its way out. */
const pathOf = (node) => (node.connected?.length ? [node, ...pathOf(node.connected[0])] : [node]);
/** When a source's loudness first ramps (its attack ends), counted from when it starts. */
const attackOf = (source) => {
  const ramps = pathOf(source).flatMap((n) => n.gain?.events ?? []).filter((e) => e.kind !== 'set');
  return Math.min(...ramps.map((e) => e.at)) - source.startAt;
};
const distinct = (values) => [...new Set(values)];

describe('School Clock sound player', () => {
  it('lists twenty-three voices, A to Z by the name people see', () => {
    expect(SOUNDS.map((sound) => SOUND_NAMES[sound])).toEqual([
      'Beep', 'Bubble pops', 'Buzzer', 'Chime', 'Clap pattern', 'Clock tower', 'Cuckoo clock', 'Desk bell',
      'Digital alarm clock', 'Harp', 'Level up', 'Marimba', 'Music box', 'School bell', "Ship's klaxon",
      'Singing bowl', 'Soft bell', 'Songbird', 'Sparkle', 'Swell', 'Ta-da', 'Twin-bell alarm clock', 'Wood block',
    ]);
  });

  it('keeps the gentle bell as Soft bell and names the loud hallway bell School bell', () => {
    expect(SOUND_NAMES.softBell).toBe('Soft bell');
    expect(SOUND_NAMES.hallwayBell).toBe('School bell');
  });

  it('strikes the Soft bell eight times in each burst, whenever it starts', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: ctx }).play('softBell');
    // One flutter per burst: the gain every partial of that burst passes through.
    const flutters = distinct(ctx.sources.map((s) => s.connected[0].connected[0]));
    expect(flutters.map((gain) => gain.gain.events.filter((e) => e.kind === 'linear').length)).toEqual([8, 8]);
  });

  describe('School bell (the loud hallway bell)', () => {
    /** The gain that hammers the gong: the one in the voice's path with a rise for every strike. */
    const clapper = (source) => pathOf(source).find((n) => (n.gain?.events ?? []).filter((e) => e.kind === 'linear').length > 10);
    const strikes = (source) => clapper(source).gain.events.filter((e) => e.kind === 'linear').map((e) => e.at);

    it('hammers a metal gong fast enough to rattle, in one long continuous ring', () => {
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).play('hallwayBell');
      const hits = strikes(ctx.sources[0]);
      const gaps = hits.slice(1).map((at, i) => at - hits[i]);
      // About 20 strikes a second: a rattle, not a flutter.
      expect(gaps.every((gap) => gap >= 1 / 30 && gap <= 1 / 15)).toBe(true);
      // One ring of about 3 s, with no break in the strikes.
      expect(hits[hits.length - 1] - hits[0]).toBeGreaterThanOrEqual(2.8);
      // Every strike lands hard: the level jumps well above where the last one left it.
      const rises = clapper(ctx.sources[0]).gain.events.filter((e) => e.kind === 'linear').map((e) => e.value);
      const falls = clapper(ctx.sources[0]).gain.events.filter((e) => e.kind === 'exponential' && e.value > 0.001).map((e) => e.value);
      expect(Math.min(...rises)).toBeGreaterThan(2 * Math.max(...falls));
    });

    it('rings bright metal partials that laptop and projector speakers play cleanly', () => {
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).play('hallwayBell');
      const freqs = ctx.sources.map((s) => s.frequency.value);
      expect(Math.min(...freqs)).toBeGreaterThanOrEqual(400);
      expect(Math.max(...freqs)).toBeLessThanOrEqual(3200);
      // Inharmonic partials, as on a struck gong, not a pure tone or its octaves.
      const ratios = distinct(freqs.map((f) => +(f / Math.min(...freqs)).toFixed(1)));
      expect(ratios.length).toBeGreaterThanOrEqual(3);
      expect(ratios.some((r) => !Number.isInteger(r))).toBe(true);
    });

    it('rings once as a preview, twice as a Bell that stops on its own, and repeats with a short gap as an Alarm', () => {
      const preview = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: preview }).play('hallwayBell');
      expect(distinct(preview.sources.map((s) => s.startAt))).toEqual([0]);

      const bell = bellOf('hallwayBell');
      expect(distinct(bell.sources.map((s) => s.startAt))).toEqual([20, 24]);
      expect(Math.max(...bell.sources.map((s) => s.stopAt))).toBeCloseTo(20 + ringLength('hallwayBell', 5));

      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).schedule([alarm('a', 20, 'hallwayBell')]);
      const firstEnds = Math.max(...ctx.sources.filter((s) => s.startAt < 24).map((s) => s.stopAt));
      // A short gap of quiet before it rings again.
      expect(24 - firstEnds).toBeGreaterThanOrEqual(0.3);
      expect(24 - firstEnds).toBeLessThanOrEqual(1);
    });
  });

  describe('Digital alarm clock (loud)', () => {
    it('beeps a square wave in quick groups of four, then a short pause', () => {
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).play('digitalAlarm');
      const group = ctx.sources.filter((s) => s.startAt < 1).sort((a, b) => a.startAt - b.startAt);
      expect(group).toHaveLength(4);
      // Quick beeps, each cut off cleanly before the next.
      const gaps = group.slice(1).map((s, i) => s.startAt - group[i].startAt);
      expect(gaps.every((gap) => gap >= 0.1 && gap <= 0.15)).toBe(true);
      expect(group.every((s, i) => i === 0 || s.startAt > group[i - 1].stopAt)).toBe(true);
      // A pause of at least a beep group's length before the next group.
      const next = ctx.sources.filter((s) => s.startAt >= 1 && s.startAt < 2);
      expect(next.length).toBe(4);
      expect(Math.min(...next.map((s) => s.startAt)) - group[3].stopAt).toBeGreaterThanOrEqual(0.4);
    });

    it('beeps a square wave a laptop speaker plays cleanly, higher than Beep', () => {
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).play('digitalAlarm');
      for (const s of ctx.sources) {
        // A square wave has only odd harmonics; it keeps them under about 3 kHz.
        const harmonics = s.wave.imag.map((h, n) => (Math.abs(h) > 1e-6 ? n : 0)).filter(Boolean);
        expect(harmonics).toEqual([1, 3]);
        expect(s.frequency.value * Math.max(...harmonics)).toBeLessThanOrEqual(3200);
        expect(s.frequency.value).toBeGreaterThan(880);
      }
    });

    it('plays five groups in a Bell that stops on its own, and repeats on an Alarm', () => {
      const bell = bellOf('digitalAlarm');
      const groups = distinct(bell.sources.map((s) => Math.floor(s.startAt - 20)));
      expect(groups).toEqual([0, 1, 2, 3, 4]);
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).schedule([alarm('a', 20, 'digitalAlarm')]);
      expect(ctx.sources).toHaveLength(60 * 4);
    });
  });

  describe('Twin-bell alarm clock (loud)', () => {
    /** Each bell's hammer: the gain in a source's path that rises once per strike. */
    const hammer = (source) => pathOf(source).find((n) => (n.gain?.events ?? []).filter((e) => e.kind === 'linear').length > 10);
    const play = () => {
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).play('twinBell');
      return ctx.sources.filter((s) => s.startAt === 0);
    };

    it('rings two small bells a little apart in pitch, in a range laptop speakers play cleanly', () => {
      const sources = play();
      const freqs = sources.map((s) => s.frequency.value);
      expect(Math.min(...freqs)).toBeGreaterThanOrEqual(400);
      expect(Math.max(...freqs)).toBeLessThanOrEqual(3200);
      const hammers = distinct(sources.map(hammer));
      expect(hammers).toHaveLength(2);
      const [low, high] = hammers.map((h) => Math.min(...sources.filter((s) => hammer(s) === h).map((s) => s.frequency.value))).sort((a, b) => a - b);
      // Slightly different bells: under a whole tone apart, but not the same note.
      expect(high / low).toBeGreaterThan(1.03);
      expect(high / low).toBeLessThan(1.12);
    });

    it('rattles the hammer very fast between the two bells, a jangling trill', () => {
      const [first, second] = distinct(play().map(hammer));
      const hits = (h) => h.gain.events.filter((e) => e.kind === 'linear').map((e) => e.at);
      const all = [...hits(first).map((at) => [at, 1]), ...hits(second).map((at) => [at, 2])].sort((a, b) => a[0] - b[0]);
      // The hammer goes back and forth: every strike hits the other bell.
      expect(all.every(([, bell], i) => i === 0 || bell !== all[i - 1][1])).toBe(true);
      // Faster than School bell's 20 strikes a second.
      const gaps = all.slice(1).map(([at], i) => at - all[i][0]);
      expect(gaps.every((gap) => gap > 0 && gap <= 1 / 25)).toBe(true);
      expect(all[all.length - 1][0] - all[0][0]).toBeGreaterThanOrEqual(1.8);
    });

    it('rings twice in a Bell that stops on its own, and repeats with a short gap on an Alarm', () => {
      const bell = bellOf('twinBell');
      expect(distinct(bell.sources.map((s) => s.startAt))).toEqual([20, 23]);
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).schedule([alarm('a', 20, 'twinBell')]);
      const firstEnds = Math.max(...ctx.sources.filter((s) => s.startAt < 23).map((s) => s.stopAt));
      expect(23 - firstEnds).toBeGreaterThanOrEqual(0.3);
    });
  });

  describe("Ship's klaxon (loud)", () => {
    const honks = (ctx) => distinct(ctx.sources.map((s) => s.startAt));

    it('honks a harsh, buzzy horn: layered buzzy waves, a hair apart, filtered under 3 kHz', () => {
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).play('klaxon');
      const honk = ctx.sources.filter((s) => s.startAt === 0);
      expect(honk.map((s) => s.type).sort()).toEqual(['sawtooth', 'square']);
      expect(honk[0].frequency.value).not.toBe(honk[1].frequency.value);
      for (const s of honk) {
        const filter = pathOf(s).find((n) => n.isFilter);
        expect(filter.type).toBe('lowpass');
        expect(Math.max(...filter.frequency.events.map((e) => e.value))).toBeLessThanOrEqual(3000);
      }
    });

    it('sweeps up once per honk ("ah-OO-gah") and holds, never wailing up and down like a siren', () => {
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).play('klaxon');
      for (const s of ctx.sources) {
        const pitches = s.frequency.events.map((e) => e.value);
        expect(pitches).toHaveLength(2);
        expect(pitches[1] / pitches[0]).toBeGreaterThan(1.3);
        expect(Math.min(...pitches)).toBeGreaterThanOrEqual(400);
        // The sweep is quick; most of the honk holds the top note.
        const [, rise] = s.frequency.events;
        expect(rise.at - s.startAt).toBeLessThan((s.stopAt - s.startAt) / 2);
      }
    });

    it('honks three times in a Bell that stops on its own, with a long gap after each honk', () => {
      const bell = bellOf('klaxon');
      expect(honks(bell)).toEqual([20, 22, 24]);
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).schedule([alarm('a', 20, 'klaxon')]);
      const firstEnds = Math.max(...ctx.sources.filter((s) => s.startAt < 22).map((s) => s.stopAt));
      expect(22 - firstEnds).toBeGreaterThanOrEqual(0.75);
    });
  });

  describe('Singing bowl (calm)', () => {
    const strikeOf = (ctx) => ctx.sources.filter((s) => s.startAt === 0);

    it('strikes one bowl: a low-mid note with out-of-tune partials, each two sines a hair apart so they beat slowly', () => {
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).play('singingBowl');
      const freqs = strikeOf(ctx).map((s) => s.frequency.value).sort((a, b) => a - b);
      expect(freqs[0]).toBeGreaterThanOrEqual(400);
      expect(freqs[0]).toBeLessThan(600);
      expect(freqs[freqs.length - 1]).toBeLessThanOrEqual(3000);
      // In pairs a hair apart: a slow "wah-wah" beat of under 2 a second.
      const pairs = [];
      for (let i = 0; i < freqs.length; i += 2) pairs.push([freqs[i], freqs[i + 1]]);
      expect(pairs.length).toBeGreaterThanOrEqual(3);
      expect(pairs.every(([a, b]) => b - a > 0.2 && b - a < 2)).toBe(true);
      // The partials sit between harmonics, as on real metal.
      const ratios = pairs.slice(1).map(([a, b]) => (a + b) / (pairs[0][0] + pairs[0][1]));
      expect(ratios.every((r) => Math.abs(r - Math.round(r)) > 0.1)).toBe(true);
    });

    it('fades slowly, over several seconds', () => {
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).play('singingBowl');
      expect(Math.max(...strikeOf(ctx).map((s) => s.stopAt))).toBeGreaterThanOrEqual(5);
    });

    it('strikes once per Bell, and again after a quiet gap on an Alarm', () => {
      expect(distinct(bellOf('singingBowl').sources.map((s) => s.startAt))).toEqual([20]);
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).schedule([alarm('a', 20, 'singingBowl')]);
      const strikes = distinct(ctx.sources.map((s) => s.startAt));
      const firstEnds = Math.max(...ctx.sources.filter((s) => s.startAt === 20).map((s) => s.stopAt));
      expect(strikes[1] - firstEnds).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Music box (calm)', () => {
    // Twinkle, Twinkle, Little Star's first line, in C: C C G G A A G, F F E E D D C.
    const [C, D, E, F, G, A] = [523.25, 587.33, 659.25, 698.46, 783.99, 880];
    const TWINKLE = [C, C, G, G, A, A, G, F, F, E, E, D, D, C];
    const tune = (ctx) => ctx.sources.filter((s) => TWINKLE.includes(s.frequency.value)).sort((a, b) => a.startAt - b.startAt);

    it('plays the first line of Twinkle, Twinkle, Little Star (public domain), holding the end of each half', () => {
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).play('musicBox');
      const notes = tune(ctx);
      expect(notes.map((s) => s.frequency.value)).toEqual(TWINKLE);
      const gap = (i) => +(notes[i + 1].startAt - notes[i].startAt).toFixed(3);
      // Even beats, but the seventh note is held twice as long.
      expect(gap(6)).toBeCloseTo(2 * gap(0));
      expect([0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12].map(gap).every((g) => g === gap(0))).toBe(true);
    });

    it('plucks bright metal tines: a quick attack, a little detuned, with a high partial under 3 kHz', () => {
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).play('musicBox');
      const first = ctx.sources.filter((s) => s.startAt === 0);
      expect(first.every((s) => attackOf(s) < 0.02)).toBe(true);
      const freqs = first.map((s) => s.frequency.value).sort((a, b) => a - b);
      expect(freqs[0]).toBe(C);
      // A twin a hair sharp, and a partial up high.
      expect(freqs[1] - C).toBeGreaterThan(0.5);
      expect(freqs[1] - C).toBeLessThan(5);
      expect(freqs[freqs.length - 1]).toBeGreaterThan(2 * C);
      expect(ctx.sources.every((s) => s.frequency.value <= 3000)).toBe(true);
    });

    it('plays the tune once per Bell, and again after a gap on an Alarm', () => {
      expect(tune(bellOf('musicBox')).filter((s) => s.frequency.value === G)).toHaveLength(3);
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).schedule([alarm('a', 20, 'musicBox')]);
      const second = tune(ctx)[TWINKLE.length].startAt;
      expect(Math.max(...ctx.sources.filter((s) => s.startAt < second).map((s) => s.stopAt))).toBeLessThanOrEqual(second - 0.5);
    });
  });

  describe('Sparkle (sparkly)', () => {
    const peakOf = (s) => Math.max(...pathOf(s).flatMap((n) => n.gain?.events ?? []).map((e) => e.value));
    const run = () => {
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).play('sparkle');
      return ctx.sources.filter((s) => s.startAt < 2).sort((a, b) => a.startAt - b.startAt);
    };

    it('twinkles a quick run of high, pure, bell-like notes under 3 kHz that ring into each other', () => {
      const notes = run();
      const starts = distinct(notes.map((s) => s.startAt));
      expect(starts.length).toBeGreaterThanOrEqual(8);
      expect(notes.every((s) => s.type === 'sine')).toBe(true);
      expect(notes.every((s) => s.frequency.value >= 1200 && s.frequency.value <= 3000)).toBe(true);
      // Each note still rings when the next ones start: a shimmer, not a tune.
      const first = notes.filter((s) => s.startAt === starts[0]);
      expect(first.every((s) => s.stopAt > starts[2])).toBe(true);
      // It jumps around rather than walking up a scale.
      const pitches = starts.map((t) => Math.min(...notes.filter((s) => s.startAt === t).map((s) => s.frequency.value)));
      const ups = pitches.slice(1).map((p, i) => p > pitches[i]);
      expect(ups).toContain(true);
      expect(ups).toContain(false);
    });

    it('fades as it goes, like fairy dust settling', () => {
      const notes = run();
      expect(peakOf(notes[notes.length - 1])).toBeLessThan(peakOf(notes[0]) / 2);
    });

    it('twinkles twice per Bell', () => {
      const starts = distinct(bellOf('sparkle').sources.map((s) => s.startAt));
      expect(starts.filter((t) => t === 20 || t === 22.5)).toEqual([20, 22.5]);
      expect(Math.max(...starts)).toBeLessThan(25);
    });
  });

  describe('Cuckoo clock (cute)', () => {
    const calls = (ctx) => {
      const notes = [...ctx.sources].sort((a, b) => a.startAt - b.startAt);
      const out = [];
      for (let i = 0; i < notes.length; i += 2) out.push([notes[i], notes[i + 1]]);
      return out;
    };

    it('calls "cuck-oo": a falling minor third on a soft, hollow, flute-like tone', () => {
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).play('cuckoo');
      const [[cuck, oo]] = calls(ctx);
      expect(cuck.frequency.value / oo.frequency.value).toBeCloseTo(2 ** (3 / 12), 3);
      expect(oo.startAt).toBeGreaterThan(cuck.stopAt - 0.05);
      expect(oo.stopAt - oo.startAt).toBeGreaterThan(cuck.stopAt - cuck.startAt);
      for (const s of ctx.sources) {
        expect(s.type).toBe('triangle');
        expect(s.frequency.value).toBeGreaterThanOrEqual(400);
        const filter = pathOf(s).find((n) => n.isFilter);
        expect(Math.max(...filter.frequency.events.map((e) => e.value))).toBeLessThanOrEqual(3000);
        // Soft: it breathes in, rather than striking.
        expect(attackOf(s)).toBeGreaterThanOrEqual(0.02);
      }
    });

    it('calls three times in a Bell that stops on its own, then a long quiet gap on an Alarm', () => {
      expect(calls(bellOf('cuckoo'))).toHaveLength(3);
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).schedule([alarm('a', 20, 'cuckoo')]);
      const all = calls(ctx);
      expect(all[3][0].startAt - all[2][1].stopAt).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Bubble pops (cute)', () => {
    const pops = () => {
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).play('bubblePops');
      return ctx.sources.filter((s) => s.startAt < 1).sort((a, b) => a.startAt - b.startAt);
    };

    it('pops a few quick, soft bubbles, each a short upward bloop, rising pop to pop', () => {
      const all = pops();
      expect(all.length).toBeGreaterThanOrEqual(4);
      for (const s of all) {
        const [from, to] = s.frequency.events.map((e) => e.value);
        expect(to).toBeGreaterThan(from);
        expect(from).toBeGreaterThanOrEqual(400);
        expect(to).toBeLessThanOrEqual(3000);
        expect(s.stopAt - s.startAt).toBeLessThan(0.1);
      }
      const froms = all.map((s) => s.frequency.value);
      expect(froms).toEqual([...froms].sort((a, b) => a - b));
      expect(new Set(froms).size).toBe(froms.length);
      // An uneven, bubbly rhythm, not a steady beat.
      const gaps = all.slice(1).map((s, i) => +(s.startAt - all[i].startAt).toFixed(3));
      expect(new Set(gaps).size).toBeGreaterThan(1);
    });

    it('pops four times in a Bell that stops on its own', () => {
      const lowest = pops()[0].frequency.value;
      const firstPops = bellOf('bubblePops').sources.filter((s) => s.frequency.value === lowest);
      expect(firstPops.map((s) => s.startAt - 20)).toEqual([0, 1.5, 3, 4.5]);
    });
  });

  describe('Ta-da (cute)', () => {
    const [C5, G5, C6, E6] = [523.25, 783.99, 1046.5, 1318.51];

    it('flourishes up a few quick xylophone notes, then ends on a bright C-major chord', () => {
      const ctx = createFakeAudioContext({ state: 'running' });
      createSoundPlayer({ context: ctx }).play('taDa');
      const starts = distinct(ctx.sources.filter((s) => s.startAt < 2).map((s) => s.startAt)).sort((a, b) => a - b);
      const at = (t) => ctx.sources.filter((s) => s.startAt === t).map((s) => s.frequency.value);
      const chordAt = starts[starts.length - 1];
      expect([C5, G5, C6, E6].every((f) => at(chordAt).includes(f))).toBe(true);
      const lead = starts.slice(0, -1).map((t) => Math.min(...at(t)));
      expect(lead.length).toBeGreaterThanOrEqual(3);
      expect(lead).toEqual([...lead].sort((a, b) => a - b));
      // Each bar is struck: a quick attack, with a partial three times up, kept under 3 kHz.
      expect(ctx.sources.every((s) => attackOf(s) < 0.02)).toBe(true);
      expect(ctx.sources.every((s) => s.frequency.value <= 3000)).toBe(true);
      expect(ctx.sources.some((s) => s.frequency.value === 3 * C5)).toBe(true);
    });

    it('plays twice per Bell', () => {
      const chords = bellOf('taDa').sources.filter((s) => s.frequency.value === E6).map((s) => s.startAt);
      expect(chords).toHaveLength(2);
      expect(chords[1] - chords[0]).toBeCloseTo(2.5);
    });
  });

  it('plays a scheduled Bell at its audio time for about 3 seconds, then stops on its own', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    const player = createSoundPlayer({ context: ctx });

    player.schedule([bell('b1', 10)]);

    const starts = ctx.sources.map((s) => s.startAt);
    expect(starts.length).toBeGreaterThan(0);
    expect(Math.min(...starts)).toBe(10);
    const lastStop = Math.max(...ctx.sources.map((s) => s.stopAt));
    expect(lastStop).toBeGreaterThanOrEqual(10 + BELL_SECONDS - 0.5);
    expect(lastStop).toBeLessThanOrEqual(10 + BELL_SECONDS + 0.5);
  });

  it.each(SOUNDS)('generates the %s voice with Web Audio, with no audio files', (sound) => {
    const ctx = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: ctx }).schedule([bell('b', 5, sound)]);
    expect(ctx.sources.length).toBeGreaterThan(0);
    expect(ctx.sources.every((s) => s.startAt >= 5 && s.stopAt > s.startAt)).toBe(true);
  });

  it('plays the second half of the Westminster chime on the Clock tower voice, at an unhurried tower tempo', () => {
    const [gSharp, fSharp, e, b] = [830.61, 739.99, 659.25, 493.88];
    const ctx = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: ctx }).play('clockTower');

    const notes = ctx.sources
      .filter((s) => [gSharp, fSharp, e, b].includes(s.frequency.value))
      .sort((x, y) => x.startAt - y.startAt);
    expect(notes.map((s) => s.frequency.value)).toEqual([gSharp, e, fSharp, b, b, fSharp, gSharp, e]);
    // A strike every 0.6 s; each phrase's last note is held a beat longer before the next phrase.
    const gap = (i) => +(notes[i + 1].startAt - notes[i].startAt).toFixed(2);
    expect([0, 1, 2, 4, 5, 6].map(gap)).toEqual([0.6, 0.6, 0.6, 0.6, 0.6, 0.6]);
    expect(gap(3)).toBe(1.2);
  });

  it('plays one whole pass of Clock tower on a Bell, past the 5 s, then repeats it cleanly on an Alarm', () => {
    const bell = bellOf('clockTower');
    expect(distinct(bell.sources.map((s) => s.startAt)).filter((t) => t >= 23)).toEqual([23, 23.6, 24.2, 24.8]);
    // The last held note rings out its full 1.8 s.
    expect(Math.max(...bell.sources.map((s) => s.stopAt))).toBeCloseTo(26.6);

    const ctx = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: ctx }).schedule([alarm('a', 20, 'clockTower')]);
    const second = ctx.sources.filter((s) => s.startAt >= 27.5 && s.startAt < 35);
    expect(Math.min(...second.map((s) => s.startAt))).toBe(27.5);
    // The first pass has died away before the second starts.
    expect(ctx.sources.filter((s) => s.startAt < 27.5).every((s) => s.stopAt <= 27.5)).toBe(true);
  });

  it('fades Swell in over about a second, an A-major chord that shimmers, once per Bell', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: ctx }).play('swell');
    expect(ctx.sources.every((s) => attackOf(s) >= 1)).toBe(true);
    // Each note of A, E, A, C# is two sines a hair apart.
    const notes = ctx.sources.map((s) => s.frequency.value).sort((a, b) => a - b);
    expect(notes.map(Math.round)).toEqual([439, 441, 658, 660, 879, 881, 1108, 1110]);

    expect(distinct(bellOf('swell').sources.map((s) => s.startAt))).toEqual([20]);
  });

  it('starts every other voice quickly', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: ctx }).play('chime');
    expect(ctx.sources.every((s) => attackOf(s) < 0.1)).toBe(true);
  });

  it('plucks Harp strings up a C pentatonic scale, each through a closing filter under 3 kHz, twice per Bell', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: ctx }).play('harp');
    const sweep = ctx.sources.filter((s) => s.startAt < 1).sort((a, b) => a.startAt - b.startAt);
    expect(sweep.map((s) => Math.round(s.frequency.value))).toEqual([523, 587, 659, 784, 880, 1047, 1175, 1319]);
    for (const string of sweep) {
      expect(string.type).toBe('sawtooth');
      const filter = pathOf(string).find((n) => n.isFilter);
      expect(filter.type).toBe('lowpass');
      const [opens, closes] = filter.frequency.events;
      expect(opens.value).toBeLessThanOrEqual(3000);
      expect(closes.value).toBeLessThan(opens.value);
    }

    const lowC = (ctx) => ctx.sources.filter((s) => s.frequency.value === 523.25).map((s) => s.startAt);
    expect(lowC(bellOf('harp'))).toEqual([20, 22.5]);
  });

  it('sings Songbird as three rising chirps then a falling trill, all gliding between 1.7 and 2.9 kHz, twice per Bell', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: ctx }).play('songbird');
    const call = ctx.sources.filter((s) => s.startAt < 1).sort((a, b) => a.startAt - b.startAt);
    const glides = call.map((s) => s.frequency.events.map((e) => e.value));
    expect(glides.flat().every((f) => f >= 1700 && f <= 2900)).toBe(true);
    const rises = glides.map(([from, to]) => to > from);
    expect(rises).toEqual([true, true, true, false, false, false, false, false, false, false]);
    // The trill steps down.
    const trill = glides.slice(3).map(([from]) => from);
    expect(trill).toEqual([...trill].sort((a, b) => b - a));

    const callStarts = (c) => c.sources.filter((s) => s.frequency.value === 1800).map((s) => +s.startAt.toFixed(2));
    expect(callStarts(bellOf('songbird'))).toEqual([20, 20.17, 20.34, 22.5, 22.67, 22.84]);
  });

  it('plays Level up on a game-console pulse wave: a rising run, then a held C6 that wobbles, three times per Bell', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: ctx }).play('levelUp');
    const notes = ctx.sources.filter((s) => s.wave).sort((a, b) => a.startAt - b.startAt);
    // Only four harmonics, so even the high notes stay under about 3 kHz.
    expect(notes[0].wave.imag.filter((h) => h !== 0)).toHaveLength(4);
    const held = notes.find((s) => s.frequency.value === 1046.5);
    const run = notes.filter((s) => s.startAt < held.startAt);
    expect(run).toHaveLength(9);
    expect(run[run.length - 1].frequency.value).toBeGreaterThan(run[0].frequency.value);
    expect(held).toBe(notes[9]);
    // A slow oscillator nudges the held note's pitch up and down.
    const wobble = ctx.sources.find((s) => !s.wave && pathOf(s).includes(held.frequency));
    expect(wobble.frequency.value).toBeLessThan(20);
    expect(wobble.startAt).toBe(held.startAt);

    const bell = bellOf('levelUp');
    const helds = bell.sources.filter((s) => s.frequency.value === 1046.5);
    expect(helds.map((s) => Math.round(s.startAt - 20))).toEqual([0, 2, 4]);
    // No fourth run starts at 6 s; the third is over before then.
    expect(Math.max(...bell.sources.map((s) => s.stopAt))).toBeLessThan(26);
  });

  it('claps Clap pattern (clap, clap, clap-clap-clap) from filtered noise with no pitch, twice per Bell', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: ctx }).play('clapPattern');
    expect(ctx.sources.every((s) => s.kind === 'buffer')).toBe(true);
    const claps = ctx.sources.filter((s) => s.startAt < 2).map((s) => +s.startAt.toFixed(2));
    expect(claps).toEqual([0, 0.36, 0.72, 0.9, 1.08]);
    for (const clap of ctx.sources) {
      const [band, cap] = pathOf(clap).filter((n) => n.isFilter);
      expect(band.type).toBe('bandpass');
      expect(cap.type).toBe('lowpass');
      expect(cap.frequency.value).toBeLessThanOrEqual(3000);
    }

    const bell = bellOf('clapPattern');
    expect(bell.sources.map((s) => +(s.startAt - 20).toFixed(2))).toEqual([0, 0.36, 0.72, 0.9, 1.08, 2.5, 2.86, 3.22, 3.4, 3.58]);
  });

  it('claps the same noise on every ring, made once per audio context', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    const player = createSoundPlayer({ context: ctx });
    player.play('clapPattern');
    player.play('clapPattern');
    expect(ctx.buffers).toHaveLength(1);
    expect(distinct(ctx.sources.map((s) => s.buffer))).toEqual(ctx.buffers);

    const noise = (c) => [...c.buffers[0].getChannelData(0)];
    expect(noise(ctx).some((v) => v !== 0)).toBe(true);
    expect(noise(ctx).every((v) => v >= -1 && v <= 1)).toBe(true);
    expect(noise(bellOf('clapPattern'))).toEqual(noise(ctx));
  });

  it('repeats an Alarm for at most 60 seconds', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: ctx }).schedule([alarm('a1', 20)]);

    const starts = ctx.sources.map((s) => s.startAt);
    expect(Math.min(...starts)).toBe(20);
    expect(Math.max(...starts)).toBeGreaterThan(20 + ALARM_MAX_SECONDS - 5);
    expect(Math.max(...ctx.sources.map((s) => s.stopAt))).toBeLessThanOrEqual(20 + ALARM_MAX_SECONDS + 0.5);
  });

  it.each(SOUNDS)('repeats the %s voice through a ringing Alarm, for at most 60 seconds', (sound) => {
    const ctx = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: ctx }).schedule([alarm('a', 20, sound)]);
    const plays = distinct(ctx.sources.map((s) => s.startAt));
    expect(Math.min(...plays)).toBe(20);
    // Even Clock tower, the longest voice (7.5 s), starts again in the last few seconds.
    expect(Math.max(...plays)).toBeGreaterThan(20 + ALARM_MAX_SECONDS - 8);
    expect(Math.max(...ctx.sources.map((s) => s.stopAt))).toBeLessThanOrEqual(20 + ALARM_MAX_SECONDS + 0.5);
  });

  it.each(SOUNDS)("starts no new pass of %s after a ring's own length, and lets the last pass finish", (sound) => {
    const ctx = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: ctx }).schedule([{ key: 'b', at: 20, sound, repeat: true, seconds: 3 }]);
    const long = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: long }).schedule([alarm('a', 20, sound)]);

    // Every source plays exactly as it would on an Alarm: nothing is cut or faded...
    const timing = (c) => c.sources.map((s) => [s.startAt, s.stopAt]);
    expect(timing(ctx)).toEqual(timing(long).slice(0, ctx.sources.length));
    const fadesOut = (s) => pathOf(s).some((n) => n.gain?.events.some((e) => e.kind === 'linear' && e.value === 0));
    expect(ctx.sources.some(fadesOut)).toBe(false);
    // ...and the Alarm's next pass, which the ring leaves out, starts at or after 3 s.
    expect(long.sources[ctx.sources.length].startAt).toBeGreaterThanOrEqual(23);
    // The ring lasts as long as its sound does.
    expect(Math.max(...ctx.sources.map((s) => s.stopAt))).toBeCloseTo(20 + ringLength(sound, 3));
  });

  it('works out how long a ring lasts: a long voice past its 5 s, a short one repeating until 5 s then finishing', () => {
    expect(ringLength('clockTower', 5)).toBeCloseTo(6.6);
    // Soft bell: passes at 0 and 3 s, each ringing 2.6 s.
    expect(ringLength('softBell', 5)).toBeCloseTo(5.6);
    // Chime: passes at 0, 1.5, 3 and 4.5 s, each 1.5 s.
    expect(ringLength('chime', 5)).toBeCloseTo(6);
    // Beep: ten passes, the last at 4.5 s.
    expect(ringLength('beep', 5)).toBeCloseTo(4.9);
  });

  it('measures a ring on a silent context that takes any node or param call a voice could make', () => {
    const ctx = silentContext();
    const out = ctx.createDynamicsCompressor();
    const reverb = ctx.createConvolver();
    reverb.buffer = ctx.createBuffer(2, ctx.sampleRate * 2, ctx.sampleRate);
    reverb.connect(out).connect(ctx.destination);
    const panner = ctx.createStereoPanner();
    panner.pan.setTargetAtTime(0.5, 0, 0.1);
    panner.pan.cancelScheduledValues(0);
    const osc = ctx.createOscillator();
    osc.detune.value = 5;
    osc.frequency.setValueCurveAtTime(new Float32Array([1, 2]), 0, 1);
    osc.connect(panner);
    osc.start(0);
    expect(() => osc.stop(1)).not.toThrow();
    // A number read from it is no number, so a loop over a buffer's samples never runs...
    expect(ctx.createBuffer(1, 10, 48000).getChannelData(0).length + 1).toBeNaN();
    // ...and nothing on it is a promise or an iterable.
    expect(osc.then).toBeUndefined();
    expect(osc[Symbol.iterator]).toBeUndefined();
  });

  it("repeats a short voice until a Bell's 5 s, then finishes its last pass", () => {
    const bell = bellOf('chime');
    expect(distinct(bell.sources.map((s) => s.startAt - 20))).toEqual([0, 0.75, 1.5, 2.25, 3, 3.75, 4.5, 5.25]);
    expect(Math.max(...bell.sources.map((s) => s.stopAt))).toBeCloseTo(26);
  });

  it('plays a sound now for a given length, finishing its last pass', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    ctx.currentTime = 3;
    createSoundPlayer({ context: ctx }).play('chime', { repeat: true, seconds: 5 });
    expect(Math.max(...ctx.sources.map((s) => s.startAt))).toBeCloseTo(8.25);
    expect(Math.max(...ctx.sources.map((s) => s.stopAt))).toBeCloseTo(9);
  });

  it('dismiss stops a Bell at once, even in the pass it finishes after its 5 s', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    const player = createSoundPlayer({ context: ctx });
    player.schedule([{ key: 'b', at: 20, sound: 'clockTower', repeat: true, seconds: 5 }]);

    ctx.currentTime = 25.5;
    player.dismiss();

    expect(audibleStarts(ctx)).toEqual([]);
  });

  it('dismiss stops whatever is sounding, but not rings still to come', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    const player = createSoundPlayer({ context: ctx });
    player.schedule([alarm('now', 1), bell('later', 100)]);

    ctx.currentTime = 15;
    player.dismiss();

    expect(audibleStarts(ctx)).not.toHaveLength(0);
    expect(audibleStarts(ctx).every((t) => t >= 100)).toBe(true);
  });

  it('scheduling the same ring again does not play it twice', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    const player = createSoundPlayer({ context: ctx });
    player.schedule([bell('b1', 10)]);
    const once = ctx.sources.length;

    player.schedule([bell('b1', 10), bell('b2', 50)]);
    ctx.currentTime = 11; // b1 is now sounding; it is still in the next window
    player.schedule([bell('b1', 10), bell('b2', 50)]);

    expect(ctx.sources.filter((s) => s.startAt < 20)).toHaveLength(once);
    expect(audibleStarts(ctx, 10).filter((t) => t < 20)).toHaveLength(once);
  });

  it('a dismissed ring stays dismissed when the window is rescheduled', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    const player = createSoundPlayer({ context: ctx });
    player.schedule([alarm('a1', 10)]);
    ctx.currentTime = 12;
    player.dismiss();
    player.schedule([alarm('a1', 10)]);
    expect(audibleStarts(ctx)).toEqual([]);
  });

  it('rescheduling drops rings that have not started and are no longer due (e.g. Bells turned off)', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    const player = createSoundPlayer({ context: ctx });
    player.schedule([bell('b1', 10), bell('b2', 50)]);
    ctx.currentTime = 11;

    player.schedule([]);

    // b1 has started, so it finishes; b2 never plays.
    expect(audibleStarts(ctx).some((t) => t >= 50)).toBe(false);
    expect(audibleStarts(ctx).some((t) => t < 13)).toBe(true);
  });

  it('forgets rings once they have finished, so it does not hold on to every ring of the day', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    const player = createSoundPlayer({ context: ctx });
    player.schedule([bell('b1', 10)]);
    const once = ctx.sources.length;

    ctx.currentTime = 20;
    player.schedule([]); // b1 ended at 13
    // Asked for again, it's new to the player (the page never asks for a ring
    // that long gone: its window starts a second back).
    player.schedule([bell('b1', 10)]);

    expect(ctx.sources).toHaveLength(2 * once);
  });

  it('plays now: a preview, or a ring that just came due', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    ctx.currentTime = 42;
    const player = createSoundPlayer({ context: ctx });
    player.play('chime');
    expect(Math.min(...ctx.sources.map((s) => s.startAt))).toBe(42);
    expect(Math.max(...ctx.sources.map((s) => s.stopAt))).toBeLessThanOrEqual(42 + BELL_SECONDS + 0.5);
  });

  it('sets one volume for every sound', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    const player = createSoundPlayer({ context: ctx, volume: 0.8 });
    player.schedule([bell('b1', 1, 'beep')]);
    const master = (node) => (node.connected.includes(ctx.destination) ? node : master(node.connected[0]));
    const out = master(ctx.sources[0]);
    expect(out.gain.value).toBe(0.8);
    player.setVolume(0.25);
    expect(out.gain.value).toBe(0.25);
  });

  it('starts suspended, tells listeners when the context resumes or is suspended again', async () => {
    const ctx = createFakeAudioContext();
    const player = createSoundPlayer({ context: ctx });
    const seen = [];
    player.onStateChange((state) => seen.push(state));

    expect(player.state()).toBe('suspended');
    await player.resume();
    expect(player.state()).toBe('running');
    ctx.setState('suspended');
    expect(seen).toEqual(['running', 'suspended']);
  });

  it('reports the audio clock in seconds', () => {
    const ctx = createFakeAudioContext();
    const player = createSoundPlayer({ context: ctx });
    ctx.currentTime = 7.5;
    expect(player.currentTime()).toBe(7.5);
  });

  it('closes its context when the page is done with it', async () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    const player = createSoundPlayer({ context: ctx });
    player.close();
    expect(ctx.state).toBe('closed');
  });

  it('is a silent, unavailable player in a browser without Web Audio', async () => {
    const player = createSoundPlayer({ context: null });
    expect(player.state()).toBe('unavailable');
    player.schedule([bell('b', 1)]);
    player.play('beep');
    player.dismiss();
    player.setVolume(1);
    player.onStateChange(() => {});
    player.close();
    await player.resume();
    expect(player.currentTime()).toBe(0);
  });

  it('builds its context from the browser AudioContext class', () => {
    let made = 0;
    class Ctx { constructor() { made += 1; return createFakeAudioContext(); } }
    const player = createSoundPlayer({ AudioContextClass: Ctx });
    expect(made).toBe(1);
    expect(player.state()).toBe('suspended');
    expect(createSoundPlayer({ AudioContextClass: undefined }).state()).toBe('unavailable');
  });
});
