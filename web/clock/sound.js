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

/** Every voice's name for people, in the order the page lists them (gentlest first). */
/** @type {Readonly<Record<SoundName, string>>} */
export const SOUND_NAMES = Object.freeze({
  chime: 'Chime',
  clockTower: 'Clock tower',
  marimba: 'Marimba',
  deskBell: 'Desk bell',
  woodBlock: 'Wood block',
  schoolBell: 'School bell',
  beep: 'Beep',
  buzzer: 'Buzzer',
});

/** Every voice, in the order the page lists them. */
/** @type {readonly SoundName[]} */
export const SOUNDS = Object.freeze(/** @type {SoundName[]} */ (Object.keys(SOUND_NAMES)));

/** How long a preview (or any ring not set to repeat) plays, in seconds. */
export const BELL_SECONDS = 3;
/** The longest a ring (Bell, Alarm or the timer) repeats before stopping on its own. */
export const ALARM_MAX_SECONDS = 60;
/** How long a Bell rings before stopping on its own, unless the teacher keeps Bells ringing until dismissed. */
export const BELL_AUTO_DISMISS_SECONDS = 5;

/**
 * One ring for the audio clock.
 * @typedef {{ key: string, at: number, sound: SoundName, repeat: boolean, seconds?: number }} ScheduledRing
 *   `key` names the ring across reschedules; `at` is audio-clock seconds;
 *   `repeat` rings until dismissed (every Bell, Alarm and the timer) rather than about 3 s (a preview);
 *   `seconds`, when given, is exactly how long it rings (a Bell that stops on its own), cut off mid-voice.
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
 *   play: (sound: SoundName, options?: { repeat?: boolean, seconds?: number }) => void,
 *   dismiss: () => void,
 *   close: () => void,
 * }} SoundPlayer
 */

/**
 * Starts a source at `start` and stops it at `stop` (or sooner, where the ring is cut off).
 * @typedef {(source: AudioScheduledSourceNode, start: number, stop: number) => void} Track
 */

/**
 * A voice plays once from `t` into `out` and returns how long that took (s).
 * @typedef {(ctx: BaseAudioContext, out: AudioNode, t: number, track: Track) => number} Voice
 */

/**
 * One tone with a quick attack and a decay to silence.
 * @param {BaseAudioContext} ctx @param {AudioNode} out @param {Track} track
 * @param {{ type: OscillatorType, freq: number, t: number, length: number, peak?: number, attack?: number, bendTo?: number }} tone
 *   `attack` is the rise time (s); `bendTo` glides the pitch there over the first 50 ms.
 * @returns {GainNode} the tone's envelope, for voices that modulate it
 */
function tone(ctx, out, track, { type, freq, t, length, peak = 0.5, attack = 0.01, bendTo }) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (bendTo) osc.frequency.exponentialRampToValueAtTime(bendTo, t + 0.05);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(peak, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(env);
  env.connect(out);
  track(osc, t, t + length);
  return env;
}

/**
 * A struck note: a few sine partials (multiples of `freq`, as `[ratio, peak,
 * length]`), the higher ones dying away sooner, as on a real bell or bar.
 * @param {BaseAudioContext} ctx @param {AudioNode} out @param {Track} track
 * @param {number} freq @param {number} t @param {[number, number, number][]} partials
 */
function strike(ctx, out, track, freq, t, partials) {
  for (const [ratio, peak, length] of partials) tone(ctx, out, track, { type: 'sine', freq: freq * ratio, t, length, peak });
}

// Partials of a tubular bell, a small hand bell and a marimba bar. Bells have
// slightly "out of tune" upper partials, which is what makes them sound like
// bells; a marimba bar is tuned so its second partial is two octaves up.
const TUBULAR = /** @type {[number, number, number][]} */ ([[1, 0.3, 1.8], [2, 0.12, 1.2], [3.01, 0.06, 0.7], [4.17, 0.03, 0.4]]);
const HAND_BELL = /** @type {[number, number, number][]} */ ([[1, 0.3, 1.4], [2.76, 0.1, 0.6], [5.4, 0.04, 0.25]]);
const MARIMBA_BAR = /** @type {[number, number, number][]} */ ([[1, 0.38, 0.5], [4, 0.07, 0.12]]);

// The sound design: every voice sits between about 400 Hz and 3 kHz, where
// laptop and projector speakers are loud and the ear cuts through room chatter
// best; none lingers on a steady harsh tone; each has its own rhythm and
// timbre so different Alarms are told apart; and each leaves a gap before it
// repeats, so an Alarm ringing for a minute keeps breathing.
/** @type {Record<SoundName, Voice>} */
const VOICES = {
  // Two soft notes, high then low.
  chime(ctx, out, t, track) {
    tone(ctx, out, track, { type: 'sine', freq: 659.25, t, length: 0.75 });
    tone(ctx, out, track, { type: 'sine', freq: 523.25, t: t + 0.75, length: 0.75 });
    return 1.5;
  },
  // The second half of the Westminster chime on tubular bells, once per Bell:
  // two phrases (G#, E, F#, B, then B, F#, G#, E), each ending on a held note.
  // It fits inside a Bell's 5 seconds.
  clockTower(ctx, out, t, track) {
    const [gSharp, fSharp, e, b] = [830.61, 739.99, 659.25, 493.88];
    [[gSharp, e, fSharp, b], [b, fSharp, gSharp, e]].forEach((phrase, p) => {
      phrase.forEach((freq, i) => strike(ctx, out, track, freq, t + p * 2.2 + i * 0.45, TUBULAR));
    });
    return 6;
  },
  // A quick rising arpeggio (C, E, G, C) on a wooden bar, twice per Bell.
  marimba(ctx, out, t, track) {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => strike(ctx, out, track, freq, t + i * 0.12, MARIMBA_BAR));
    return 1.5;
  },
  // One bright ding, like a hotel desk bell or a kitchen timer.
  deskBell(ctx, out, t, track) {
    strike(ctx, out, track, 1046.5, t, HAND_BELL);
    return 1.5;
  },
  // Tok-tok: two hollow knocks, three times per Bell.
  woodBlock(ctx, out, t, track) {
    for (const at of [t, t + 0.16]) {
      tone(ctx, out, track, { type: 'sine', freq: 1100, bendTo: 850, t: at, length: 0.12, peak: 0.6, attack: 0.003 });
      tone(ctx, out, track, { type: 'sine', freq: 2420, t: at, length: 0.05, peak: 0.12, attack: 0.003 });
    }
    return 1;
  },
  // Ring-ring: a bell struck about ten times a second, in two short bursts.
  // Gentler than a hallway bell: pure tones, a lower pitch, a shallow
  // flutter rather than a hard rattle, and a gap to breathe.
  schoolBell(ctx, out, t, track) {
    const RATE = 10;
    for (const [from, to] of [[t, t + 0.8], [t + 1.2, t + 2.0]]) {
      const env = ctx.createGain();
      env.connect(out);
      env.gain.setValueAtTime(0.0001, from);
      for (let at = from; at < to; at += 1 / RATE) {
        env.gain.linearRampToValueAtTime(0.32, at + 0.005);
        env.gain.exponentialRampToValueAtTime(0.2, at + 1 / RATE);
      }
      env.gain.exponentialRampToValueAtTime(0.0001, to + 0.6);
      for (const [ratio, mix] of [[1, 1], [2.76, 0.3], [5.4, 0.1]]) {
        const osc = ctx.createOscillator();
        const level = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880 * ratio, from);
        level.gain.setValueAtTime(mix * 0.85, from);
        osc.connect(level);
        level.connect(env);
        track(osc, from, to + 0.6);
      }
    }
    return 3;
  },
  // Beep-beep.
  beep(ctx, out, t, track) {
    tone(ctx, out, track, { type: 'square', freq: 880, t, length: 0.15, peak: 0.3 });
    tone(ctx, out, track, { type: 'square', freq: 880, t: t + 0.25, length: 0.15, peak: 0.3 });
    return 0.5;
  },
  // A low, harsh buzz.
  buzzer(ctx, out, t, track) {
    tone(ctx, out, track, { type: 'sawtooth', freq: 140, t, length: 0.6, peak: 0.4 });
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
  function add({ key, at, sound, repeat, seconds }) {
    const voice = VOICES[sound];
    const limit = seconds ?? (repeat ? ALARM_MAX_SECONDS : BELL_SECONDS);
    const cut = seconds === undefined ? Infinity : at + seconds;
    /** @type {AudioScheduledSourceNode[]} */
    const sources = [];
    /** @type {Track} */
    const track = (source, start, stop) => {
      source.start(start);
      source.stop(Math.max(start, Math.min(stop, cut)));
      sources.push(source);
    };
    let out = /** @type {AudioNode} */ (master);
    if (seconds !== undefined) {
      // A short fade into the cut, so it doesn't click.
      const fade = ctx.createGain();
      fade.gain.setValueAtTime(1, Math.max(at, cut - 0.05));
      fade.gain.linearRampToValueAtTime(0, cut);
      fade.connect(master);
      out = fade;
    }
    let offset = 0;
    while (offset < limit) offset += voice(ctx, out, at + offset, track);
    rings.set(key, { at, end: Math.min(at + offset, cut), sources, done: false });
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
    play(sound, { repeat = false, seconds } = {}) {
      plays += 1;
      add({ key: `play:${plays}`, at: ctx.currentTime, sound, repeat, seconds });
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
