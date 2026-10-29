// @ts-check
// The School Clock's sound engine. Every sound is generated with Web Audio
// from a few named voices; there are no audio files. Rings are scheduled ahead
// on the audio clock, so they play on time even while timers in a background
// tab are throttled. The page hands it the rings it wants (each with a stable
// key) and the player keeps what has started, adds what's new and drops what
// hasn't started and is no longer wanted, so rescheduling never plays a ring
// twice. Browsers start a page's audio suspended; `resume()` after a click
// turns sound on.

/** @typedef {import('./clock-settings.js').SoundName} SoundName */

/** Every voice, in the order the page lists them. */
/** @type {SoundName[]} */
export const SOUNDS = ['chime', 'schoolBell', 'beep', 'buzzer'];

/** How long a Bell (or a preview) plays, in seconds. */
export const BELL_SECONDS = 3;
/** The longest an Alarm or the timer repeats before stopping on its own. */
export const ALARM_MAX_SECONDS = 60;

/**
 * One ring for the audio clock.
 * @typedef {{ key: string, at: number, sound: SoundName, repeat: boolean }} ScheduledRing
 *   `key` names the ring across reschedules; `at` is audio-clock seconds;
 *   `repeat` rings until dismissed (Alarms, the timer) rather than about 3 s (Bells).
 */

/** @typedef {'suspended' | 'running' | 'closed' | 'unavailable'} SoundState */

/**
 * @typedef {{
 *   state: () => SoundState,
 *   resume: () => Promise<void>,
 *   onStateChange: (listener: (state: SoundState) => void) => void,
 *   currentTime: () => number,
 *   setVolume: (volume: number) => void,
 *   schedule: (rings: ScheduledRing[]) => void,
 *   play: (sound: SoundName, options?: { repeat?: boolean }) => void,
 *   dismiss: () => void,
 *   close: () => void,
 * }} SoundPlayer
 */

/**
 * A voice plays once from `t` into `out` and returns how long that took (s).
 * @typedef {(ctx: BaseAudioContext, out: AudioNode, t: number, sources: AudioScheduledSourceNode[]) => number} Voice
 */

/**
 * One tone with a quick attack and a decay to silence.
 * @param {BaseAudioContext} ctx @param {AudioNode} out @param {AudioScheduledSourceNode[]} sources
 * @param {{ type: OscillatorType, freq: number, t: number, length: number, peak?: number }} tone
 * @returns {GainNode} the tone's envelope, for voices that modulate it
 */
function tone(ctx, out, sources, { type, freq, t, length, peak = 0.5 }) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(env);
  env.connect(out);
  osc.start(t);
  osc.stop(t + length);
  sources.push(osc);
  return env;
}

/** @type {Record<SoundName, Voice>} */
const VOICES = {
  // Two soft notes, high then low.
  chime(ctx, out, t, sources) {
    tone(ctx, out, sources, { type: 'sine', freq: 659.25, t, length: 0.75 });
    tone(ctx, out, sources, { type: 'sine', freq: 523.25, t: t + 0.75, length: 0.75 });
    return 1.5;
  },
  // An electric bell: a bright tone rattled by a fast tremolo.
  schoolBell(ctx, out, t, sources) {
    const env = tone(ctx, out, sources, { type: 'triangle', freq: 1250, t, length: 1, peak: 0.4 });
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.type = 'square';
    lfo.frequency.setValueAtTime(18, t);
    depth.gain.setValueAtTime(0.3, t);
    lfo.connect(depth);
    depth.connect(env.gain);
    lfo.start(t);
    lfo.stop(t + 1);
    sources.push(lfo);
    return 1;
  },
  // Beep-beep.
  beep(ctx, out, t, sources) {
    tone(ctx, out, sources, { type: 'square', freq: 880, t, length: 0.15, peak: 0.3 });
    tone(ctx, out, sources, { type: 'square', freq: 880, t: t + 0.25, length: 0.15, peak: 0.3 });
    return 0.5;
  },
  // A low, harsh buzz.
  buzzer(ctx, out, t, sources) {
    tone(ctx, out, sources, { type: 'sawtooth', freq: 140, t, length: 0.6, peak: 0.4 });
    return 0.75;
  },
};

/** @returns {SoundPlayer} */
function unavailablePlayer() {
  return {
    state: () => 'unavailable',
    resume: async () => {},
    onStateChange: () => {},
    currentTime: () => 0,
    setVolume: () => {},
    schedule: () => {},
    play: () => {},
    dismiss: () => {},
    close: () => {},
  };
}

/**
 * @param {{ context?: AudioContext | null, AudioContextClass?: typeof AudioContext, volume?: number }} [options]
 *   `context` is used as is (tests pass a fake); otherwise one is made from
 *   `AudioContextClass` (the browser's). Neither: a silent, 'unavailable' player.
 *   `volume` is 0–1 for every sound.
 * @returns {SoundPlayer}
 */
export function createSoundPlayer({ context, AudioContextClass, volume = 1 } = {}) {
  const ctx = context !== undefined ? context : AudioContextClass ? new AudioContextClass() : null;
  return ctx ? playerOn(ctx, volume) : unavailablePlayer();
}

/**
 * @param {AudioContext} ctx
 * @param {number} volume
 * @returns {SoundPlayer}
 */
function playerOn(ctx, volume) {
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);

  /** @typedef {{ at: number, end: number, sources: AudioScheduledSourceNode[], done: boolean }} Playing */
  /** @type {Map<string, Playing>} */
  const rings = new Map();
  /** @type {((state: SoundState) => void)[]} */
  const listeners = [];
  ctx.onstatechange = () => listeners.forEach((listener) => listener(/** @type {SoundState} */ (ctx.state)));
  let plays = 0;

  /** @param {ScheduledRing} ring */
  function add({ key, at, sound, repeat }) {
    const voice = VOICES[sound];
    const limit = repeat ? ALARM_MAX_SECONDS : BELL_SECONDS;
    /** @type {AudioScheduledSourceNode[]} */
    const sources = [];
    let offset = 0;
    while (offset < limit) offset += voice(ctx, master, at + offset, sources);
    rings.set(key, { at, end: at + offset, sources, done: false });
  }

  /** @param {Playing} ring */
  function silence(ring) {
    const now = ctx.currentTime;
    // Every source was started when the ring was added, so stop() is safe;
    // one stopped early and stopped again just ends at the earlier time.
    ring.sources.forEach((source) => source.stop(now));
    ring.done = true;
  }

  return {
    state: () => /** @type {SoundState} */ (ctx.state),
    resume: () => ctx.resume(),
    onStateChange: (listener) => { listeners.push(listener); },
    currentTime: () => ctx.currentTime,
    setVolume: (v) => { master.gain.value = v; },
    schedule(wanted) {
      const now = ctx.currentTime;
      const keys = new Set(wanted.map((r) => r.key));
      for (const [key, ring] of rings) {
        if (ring.end < now) rings.delete(key);
        else if (ring.at > now && !keys.has(key)) {
          silence(ring);
          rings.delete(key);
        }
      }
      for (const ring of wanted) if (!rings.has(ring.key)) add(ring);
    },
    play(sound, { repeat = false } = {}) {
      plays += 1;
      add({ key: `play:${plays}`, at: ctx.currentTime, sound, repeat });
    },
    dismiss() {
      const now = ctx.currentTime;
      for (const ring of rings.values()) if (ring.at <= now && !ring.done) silence(ring);
    },
    close() {
      ctx.close().catch(() => {});
    },
  };
}
