import { describe, it, expect } from 'vitest';
import { createSoundPlayer, SOUNDS, SOUND_NAMES, BELL_SECONDS, ALARM_MAX_SECONDS } from '../../clock/sound.js';
import { createFakeAudioContext, audibleStarts } from '../helpers/fake-audio.js';

const bell = (key, at, sound = 'schoolBell') => ({ key, at, sound, repeat: false });
const alarm = (key, at, sound = 'beep') => ({ key, at, sound, repeat: true });
/** Sources that make any sound at all (one cut off before it starts never does). */
const sounding = (ctx) => ctx.sources.filter((s) => s.stopAt > s.startAt);
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
  it('lists thirteen voices, gentlest first', () => {
    expect(SOUNDS.map((sound) => SOUND_NAMES[sound])).toEqual([
      'Swell', 'Chime', 'Harp', 'Clock tower', 'Marimba', 'Songbird', 'Desk bell',
      'Wood block', 'Level up', 'Clap pattern', 'School bell', 'Beep', 'Buzzer',
    ]);
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

  it('plays the second half of the Westminster chime on the Clock tower voice, inside 5 seconds', () => {
    const [gSharp, fSharp, e, b] = [830.61, 739.99, 659.25, 493.88];
    const ctx = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: ctx }).play('clockTower');

    const notes = ctx.sources
      .filter((s) => [gSharp, fSharp, e, b].includes(s.frequency.value))
      .sort((x, y) => x.startAt - y.startAt);
    expect(notes.map((s) => s.frequency.value)).toEqual([gSharp, e, fSharp, b, b, fSharp, gSharp, e]);
    // Each phrase's last note is held before the next phrase starts.
    const gap = (i) => notes[i + 1].startAt - notes[i].startAt;
    expect(gap(3)).toBeGreaterThan(gap(0));
    expect(notes[7].startAt).toBeLessThan(5);
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
    // The last run finishes before the Bell is cut at 25 s.
    expect(Math.max(...bell.sources.map((s) => s.stopAt))).toBeLessThan(25 - 0.05);
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
    // Even Clock tower, the longest voice (6 s), starts again in the last few seconds.
    expect(Math.max(...plays)).toBeGreaterThan(20 + ALARM_MAX_SECONDS - 7);
    expect(Math.max(...ctx.sources.map((s) => s.stopAt))).toBeLessThanOrEqual(20 + ALARM_MAX_SECONDS + 0.5);
  });

  it.each(SOUNDS)('stops a %s ring given its own length right on time, voice and all', (sound) => {
    const ctx = createFakeAudioContext({ state: 'running' });
    // 3 s cuts into every voice, even Swell, which plays once and is done by 3.6 s.
    createSoundPlayer({ context: ctx }).schedule([{ key: 'b', at: 20, sound, repeat: true, seconds: 3 }]);

    expect(Math.min(...ctx.sources.map((s) => s.startAt))).toBe(20);
    // Nothing sounds past 23 s, even a voice that started just before.
    expect(sounding(ctx).every((s) => s.stopAt <= 23)).toBe(true);
    expect(sounding(ctx).some((s) => s.stopAt > 22)).toBe(true);
  });

  it('plays a sound now for a given length', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    ctx.currentTime = 3;
    createSoundPlayer({ context: ctx }).play('beep', { repeat: true, seconds: 5 });
    expect(sounding(ctx).every((s) => s.stopAt <= 8)).toBe(true);
    expect(sounding(ctx).some((s) => s.stopAt > 7.5)).toBe(true);
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
