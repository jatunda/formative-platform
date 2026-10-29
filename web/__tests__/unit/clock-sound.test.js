import { describe, it, expect } from 'vitest';
import { createSoundPlayer, SOUNDS, BELL_SECONDS, ALARM_MAX_SECONDS } from '../../clock/sound.js';
import { createFakeAudioContext, audibleStarts } from '../helpers/fake-audio.js';

const bell = (key, at, sound = 'schoolBell') => ({ key, at, sound, repeat: false });
const alarm = (key, at, sound = 'beep') => ({ key, at, sound, repeat: true });

describe('School Clock sound player', () => {
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

  it.each(SOUNDS)('generates the %s voice from oscillators, with no audio files', (sound) => {
    const ctx = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: ctx }).schedule([bell('b', 5, sound)]);
    expect(ctx.sources.length).toBeGreaterThan(0);
    expect(ctx.sources.every((s) => s.startAt >= 5 && s.stopAt > s.startAt)).toBe(true);
  });

  it('repeats an Alarm for at most 60 seconds', () => {
    const ctx = createFakeAudioContext({ state: 'running' });
    createSoundPlayer({ context: ctx }).schedule([alarm('a1', 20)]);

    const starts = ctx.sources.map((s) => s.startAt);
    expect(Math.min(...starts)).toBe(20);
    expect(Math.max(...starts)).toBeGreaterThan(20 + ALARM_MAX_SECONDS - 5);
    expect(Math.max(...ctx.sources.map((s) => s.stopAt))).toBeLessThanOrEqual(20 + ALARM_MAX_SECONDS + 0.5);
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
