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

/**
 * Every voice's name for people, in the order the page lists them (gentlest
 * first). Its keys are the `SoundName`s.
 */
export const SOUND_NAMES = Object.freeze({
  swell: 'Swell',
  chime: 'Chime',
  harp: 'Harp',
  clockTower: 'Clock tower',
  marimba: 'Marimba',
  songbird: 'Songbird',
  deskBell: 'Desk bell',
  woodBlock: 'Wood block',
  levelUp: 'Level up',
  clapPattern: 'Clap pattern',
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
 *   `seconds`, when given, is when it starts no new pass (a Bell that stops on its own); the pass
 *   playing then finishes naturally, so the ring lasts `ringLength(sound, seconds)`.
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
 * Starts a source at `start` and stops it at `stop`.
 * @typedef {(source: AudioScheduledSourceNode, start: number, stop: number) => void} Track
 */

/**
 * A voice plays once from `t` into `out` and returns how long that took (s).
 * @typedef {(ctx: BaseAudioContext, out: AudioNode, t: number, track: Track) => number} Voice
 */

/**
 * How a tone's level moves: `decay` rises over its attack and dies away to
 * silence by its end; `gate` starts at its peak, holds, and cuts off over the
 * last 12 ms; `steady` stays at its peak (for a voice that shapes it after).
 * @typedef {'decay' | 'gate' | 'steady'} Envelope
 */

/**
 * One tone: an oscillator through a low-pass filter (if given) and its own
 * level into `out`.
 * @param {BaseAudioContext} ctx @param {AudioNode} out @param {Track} track
 * @param {{ type?: OscillatorType, wave?: PeriodicWave, freq: number, t: number, length: number, peak?: number,
 *   attack?: number, bendTo?: number, bendLength?: number, envelope?: Envelope,
 *   filter?: { from: number, to: number, over: number, q: number } }} tone
 *   `wave` takes the place of `type` (a sine when neither); `attack` is the
 *   rise time (s); `bendTo` glides the pitch there over `bendLength` (50 ms
 *   unless given); `filter` closes from `from` Hz to `to` Hz over `over` s.
 * @returns {{ osc: OscillatorNode, env: GainNode }} for voices that modulate them
 */
function tone(ctx, out, track, {
  type = 'sine', wave, freq, t, length, peak = 0.5, attack = 0.01, bendTo, bendLength = 0.05, envelope = 'decay', filter,
}) {
  const osc = ctx.createOscillator();
  const lowpass = filter ? ctx.createBiquadFilter() : null;
  const env = ctx.createGain();
  if (wave) osc.setPeriodicWave(wave);
  else osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (bendTo) osc.frequency.exponentialRampToValueAtTime(bendTo, t + bendLength);
  if (lowpass && filter) {
    lowpass.type = 'lowpass';
    lowpass.Q.value = filter.q;
    lowpass.frequency.setValueAtTime(filter.from, t);
    lowpass.frequency.exponentialRampToValueAtTime(filter.to, t + filter.over);
  }
  if (envelope === 'decay') {
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + length);
  } else {
    env.gain.setValueAtTime(peak, t);
    if (envelope === 'gate') {
      env.gain.setValueAtTime(peak, t + length - 0.012);
      env.gain.linearRampToValueAtTime(0.0001, t + length);
    }
  }
  if (lowpass) {
    osc.connect(lowpass);
    lowpass.connect(env);
  } else {
    osc.connect(env);
  }
  env.connect(out);
  track(osc, t, t + length);
  return { osc, env };
}

/**
 * A struck note: a few sine partials (multiples of `freq`, as `[ratio, peak,
 * length]`), the higher ones dying away sooner, as on a real bell or bar.
 * @param {BaseAudioContext} ctx @param {AudioNode} out @param {Track} track
 * @param {number} freq @param {number} t @param {[number, number, number][]} partials
 */
function strike(ctx, out, track, freq, t, partials) {
  for (const [ratio, peak, length] of partials) tone(ctx, out, track, { freq: freq * ratio, t, length, peak });
}

/**
 * A pulse wave (a narrow square, like an old game console's) with only its
 * first few harmonics, so even a high note keeps its energy under about 3 kHz.
 * @param {BaseAudioContext} ctx @param {number} duty 0–1 @param {number} harmonics
 * @returns {PeriodicWave}
 */
function pulseWave(ctx, duty, harmonics) {
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let n = 1; n <= harmonics; n += 1) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
  return ctx.createPeriodicWave(real, imag);
}

/** Noise buffers already made, by context and length, so every ring reuses one. */
/** @type {WeakMap<BaseAudioContext, Map<number, AudioBuffer>>} */
const NOISE = new WeakMap();

/**
 * A buffer of white noise. Seeded, so every ring (and every test) gets the same
 * noise; made once per context and length.
 * @param {BaseAudioContext} ctx @param {number} seconds
 * @returns {AudioBuffer}
 */
function noiseBuffer(ctx, seconds) {
  const made = NOISE.get(ctx) ?? new Map();
  NOISE.set(ctx, made);
  const cached = made.get(seconds);
  if (cached) return cached;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 12345;
  for (let i = 0; i < data.length; i += 1) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    data[i] = (seed / 1073741824) - 1;
  }
  made.set(seconds, buffer);
  return buffer;
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
  // A soft pad: an open A-major chord that fades in over a second and out over
  // two, each note two sines a hair apart so it shimmers. The only voice with
  // no attack. Once per Bell, so on repeat it breathes slowly.
  swell(ctx, out, t, track) {
    const NOTES = [[440, 0.07], [659.25, 0.06], [880, 0.04], [1108.73, 0.035]];
    const env = ctx.createGain();
    env.connect(out);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(1, t + 1.1);
    env.gain.setValueAtTime(1, t + 1.5);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
    for (const [freq, peak] of NOTES) {
      for (const detune of [-1.2, 1.2]) {
        tone(ctx, env, track, { freq: freq + detune, t, length: 3.6, peak: peak * 1.6, envelope: 'steady' });
      }
    }
    return 5;
  },
  // Two soft notes, high then low.
  chime(ctx, out, t, track) {
    tone(ctx, out, track, { type: 'sine', freq: 659.25, t, length: 0.75 });
    tone(ctx, out, track, { type: 'sine', freq: 523.25, t: t + 0.75, length: 0.75 });
    return 1.5;
  },
  // A harp glissando: eight plucked strings up a C pentatonic scale (C5 to
  // E6), each a sawtooth through a low-pass filter that closes quickly, which
  // is what a plucked string does. The filter keeps the highs under 3 kHz.
  // Twice per Bell.
  harp(ctx, out, t, track) {
    const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
    SCALE.forEach((freq, i) => {
      const at = t + i * 0.075;
      const last = i === SCALE.length - 1;
      tone(ctx, out, track, {
        type: 'sawtooth', freq, t: at, length: last ? 1.6 : 1.1, peak: last ? 0.22 : 0.16, attack: 0.004,
        filter: { from: Math.min(freq * 4, 3000), to: freq * 1.2, over: 0.35, q: 0.7 },
      });
    });
    return 2.5;
  },
  // The second half of the Westminster chime on tubular bells, once per Bell:
  // two phrases (G#, E, F#, B, then B, F#, G#, E), each ending on a held note.
  // A strike every 0.6 s, unhurried like a real tower; one pass takes 6.6 s,
  // so a Bell plays it once, past its 5 seconds, to the end.
  clockTower(ctx, out, t, track) {
    const [gSharp, fSharp, e, b] = [830.61, 739.99, 659.25, 493.88];
    [[gSharp, e, fSharp, b], [b, fSharp, gSharp, e]].forEach((phrase, p) => {
      phrase.forEach((freq, i) => strike(ctx, out, track, freq, t + p * 3 + i * 0.6, TUBULAR));
    });
    return 7.5;
  },
  // A quick rising arpeggio (C, E, G, C) on a wooden bar, twice per Bell.
  marimba(ctx, out, t, track) {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => strike(ctx, out, track, freq, t + i * 0.12, MARIMBA_BAR));
    return 1.5;
  },
  // A songbird: three rising "tsee" chirps, then a quick falling trill, then
  // quiet. Pure sines gliding between 1.7 and 2.9 kHz, where the ear is most
  // sensitive: it cuts through chatter without being loud. Twice per Bell.
  songbird(ctx, out, t, track) {
    /** @param {number} at @param {number} from @param {number} to @param {number} length @param {number} peak */
    const chirp = (at, from, to, length, peak) => tone(ctx, out, track, {
      freq: from, bendTo: to, bendLength: length, t: at, length, peak, attack: length * 0.3,
    });
    for (let i = 0; i < 3; i += 1) chirp(t + i * 0.17, 1800, 2700, 0.09, 0.4);
    for (let i = 0; i < 7; i += 1) chirp(t + 0.62 + i * 0.05, 2900 - i * 120, 2500 - i * 110, 0.04, 0.32);
    return 2.5;
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
  // Level up: a fast rising run of three little arpeggios, each a step higher,
  // then a held C6 with a wobble, on a narrow pulse wave like an old game
  // console. Three times per Bell; a Bell starts no fourth at 6 s.
  levelUp(ctx, out, t, track) {
    const wave = pulseWave(ctx, 0.25, 4);
    const RUN = [523.25, 659.25, 783.99, 587.33, 739.99, 880, 659.25, 830.61, 987.77];
    /** @param {number} freq @param {number} at @param {number} length @param {number} peak */
    const note = (freq, at, length, peak) => tone(ctx, out, track, { wave, freq, t: at, length, peak, envelope: 'gate' }).osc;
    RUN.forEach((freq, i) => note(freq, t + i * 0.055, 0.05, 0.17));
    const holdAt = t + RUN.length * 0.055;
    const hold = note(1046.5, holdAt, 0.42, 0.2);
    const wobble = ctx.createOscillator();
    const depth = ctx.createGain();
    wobble.frequency.setValueAtTime(9, holdAt);
    depth.gain.setValueAtTime(14, holdAt);
    wobble.connect(depth);
    depth.connect(hold.frequency);
    track(wobble, holdAt, holdAt + 0.42);
    return 2;
  },
  // The clap pattern teachers use to get a room's attention: clap, clap,
  // clap-clap-clap. Band-passed noise with no pitch, each clap three tiny
  // bursts and a short tail, like real hands. Twice per Bell.
  clapPattern(ctx, out, t, track) {
    const noise = noiseBuffer(ctx, 0.2);
    for (const offset of [0, 0.36, 0.72, 0.9, 1.08]) {
      const at = t + offset;
      const source = ctx.createBufferSource();
      const band = ctx.createBiquadFilter();
      const cap = ctx.createBiquadFilter();
      const env = ctx.createGain();
      source.buffer = noise;
      band.type = 'bandpass';
      band.frequency.value = 1300;
      band.Q.value = 1.1;
      // Noise has as much energy up high as anywhere: cap it near 3 kHz.
      cap.type = 'lowpass';
      cap.frequency.value = 2600;
      env.gain.setValueAtTime(0.0001, at);
      for (const burst of [0, 0.011, 0.022]) {
        env.gain.setValueAtTime(1.6, at + burst);
        env.gain.exponentialRampToValueAtTime(0.3, at + burst + 0.009);
      }
      env.gain.setValueAtTime(1.3, at + 0.031);
      env.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      source.connect(band);
      band.connect(cap);
      cap.connect(env);
      env.connect(out);
      track(source, at, at + 0.17);
    }
    return 2.5;
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

/**
 * Plays `voice` from `at` pass after pass, starting no new pass once `limit`
 * seconds have gone by; the last pass plays to its natural end.
 * @param {BaseAudioContext} ctx @param {AudioNode} out @param {Voice} voice
 * @param {number} at @param {number} limit @param {Track} track
 * @returns {number} when its last source stops (audio-clock seconds)
 */
function ringOut(ctx, out, voice, at, limit, track) {
  let end = at;
  /** @type {Track} */
  const measured = (source, start, stop) => {
    end = Math.max(end, stop);
    track(source, start, stop);
  };
  let offset = 0;
  do offset += voice(ctx, out, at + offset, measured); while (offset < limit);
  return end;
}

/**
 * A stand-in audio context that makes no sound, for measuring how long a
 * voice plays without one.
 * @returns {BaseAudioContext}
 */
function silentContext() {
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect() {}, setPeriodicWave() {}, gain: param(), frequency: param(), Q: param() });
  return /** @type {BaseAudioContext} */ (/** @type {unknown} */ ({
    sampleRate: 1,
    createGain: node,
    createOscillator: node,
    createBiquadFilter: node,
    createBufferSource: node,
    createPeriodicWave: () => ({}),
    createBuffer: (/** @type {number[]} */ ...args) => ({ getChannelData: () => new Float32Array(args[1]) }),
  }));
}

/**
 * How long a ring of `sound` lasts when it starts no new pass after `seconds`
 * (a Bell that stops on its own): to the natural end of its last pass. Worked
 * out from the voice itself, so the page can close the ring card when the
 * sound ends, even in a throttled tab.
 * @param {SoundName} sound @param {number} seconds
 * @returns {number} seconds
 */
export function ringLength(sound, seconds) {
  const ctx = silentContext();
  return ringOut(ctx, ctx.createGain(), VOICES[sound], 0, seconds, () => {});
}

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
    const limit = seconds ?? (repeat ? ALARM_MAX_SECONDS : BELL_SECONDS);
    /** @type {AudioScheduledSourceNode[]} */
    const sources = [];
    /** @type {Track} */
    const track = (source, start, stop) => {
      source.start(start);
      source.stop(stop);
      sources.push(source);
    };
    const end = ringOut(ctx, master, VOICES[sound], at, limit, track);
    rings.set(key, { at, end, sources, done: false });
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
