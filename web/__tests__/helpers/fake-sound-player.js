// A stand-in for the School Clock's sound player (clock/sound.js), for page
// tests. It records what the page asks it to do; its audio clock and state are
// set by the test.

/**
 * @param {{ state?: 'suspended' | 'running' | 'unavailable', time?: number }} [options]
 *   pages load with sound suspended, so that's the default; `time` is the audio clock (s).
 */
export function createFakeSoundPlayer({ state = 'suspended', time = 0 } = {}) {
  const listeners = [];
  const player = {
    time,
    current: state,
    /** Every list the page has passed to schedule(), oldest first. */
    schedules: [],
    /** The rings the page wants right now (the last schedule() call). */
    get scheduled() { return player.schedules.at(-1) ?? []; },
    /** Sounds played straight away: { sound, repeat } */
    played: [],
    dismissals: 0,
    volume: null,
    closed: false,
    /** What the browser does when it suspends or resumes audio. */
    setState(next) {
      player.current = next;
      listeners.forEach((listener) => listener(next));
    },
    state: () => player.current,
    resume: async () => player.setState('running'),
    onStateChange: (listener) => { listeners.push(listener); },
    currentTime: () => player.time,
    setVolume: (v) => { player.volume = v; },
    schedule: (rings) => { player.schedules.push(rings); },
    play: (sound, { repeat = false } = {}) => { player.played.push({ sound, repeat }); },
    dismiss: () => { player.dismissals += 1; },
    close: () => { player.closed = true; },
  };
  return player;
}
