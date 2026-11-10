// A stand-in for the browser's AudioContext (jsdom has none). It records every
// sound source started on it, so tests can see what would play and when, and
// every value an audio param is set or ramped to (`param.events`), so tests can
// see a voice's envelope and pitch glides. Time only moves when the test sets
// `ctx.currentTime`.

function fakeParam(value = 0) {
  return {
    value,
    /** Every scheduled change: { kind: 'set' | 'linear' | 'exponential' | 'target', value, at } */
    events: [],
    setValueAtTime(v, at) { this.value = v; this.events.push({ kind: 'set', value: v, at }); return this; },
    linearRampToValueAtTime(v, at) { this.events.push({ kind: 'linear', value: v, at }); return this; },
    exponentialRampToValueAtTime(v, at) { this.events.push({ kind: 'exponential', value: v, at }); return this; },
    setTargetAtTime(v, at) { this.events.push({ kind: 'target', value: v, at }); return this; },
  };
}

function fakeNode(extra = {}) {
  return {
    connected: [],
    // A node can feed another node or an audio param (an oscillator driving
    // another's frequency, say); either way the target is recorded.
    connect(target) { this.connected.push(target); return target; },
    disconnect() { this.connected = []; },
    ...extra,
  };
}

/**
 * @param {{ state?: 'suspended' | 'running' }} [options] browsers start a
 *   page's context suspended until a click, so that's the default.
 */
export function createFakeAudioContext({ state = 'suspended' } = {}) {
  const sources = [];
  /** A source node (oscillator or buffer source) that records when it plays. */
  const source = (extra) => {
    const node = fakeNode({
      startAt: null,
      stopAt: null,
      start(t = ctx.currentTime) { node.startAt = t; },
      stop(t = ctx.currentTime) {
        if (node.startAt === null) throw new Error('stop() before start()');
        node.stopAt = node.stopAt === null ? t : Math.min(node.stopAt, t);
      },
      ...extra,
    });
    sources.push(node);
    return node;
  };
  const ctx = {
    currentTime: 0,
    sampleRate: 48000,
    state,
    onstatechange: null,
    destination: fakeNode({ isDestination: true }),
    /** Every source ever made (oscillators and buffer sources): { kind, startAt, stopAt, ... } */
    sources,
    /** Every buffer ever made. */
    buffers: [],
    async resume() { ctx.setState('running'); },
    async close() { ctx.setState('closed'); },
    /** What the browser does when it suspends or resumes the context itself. */
    setState(next) {
      ctx.state = next;
      ctx.onstatechange?.();
    },
    createGain() {
      return fakeNode({ gain: fakeParam(1) });
    },
    createBiquadFilter() {
      return fakeNode({ isFilter: true, type: 'lowpass', frequency: fakeParam(350), Q: fakeParam(1) });
    },
    createOscillator() {
      const osc = source({
        kind: 'oscillator',
        type: 'sine',
        wave: null,
        frequency: fakeParam(440),
        setPeriodicWave(wave) { osc.type = 'custom'; osc.wave = wave; },
      });
      return osc;
    },
    createPeriodicWave(real, imag) {
      return { real: [...real], imag: [...imag] };
    },
    createBuffer(channels, length, sampleRate) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      const buffer = { numberOfChannels: channels, length, sampleRate, getChannelData: (i) => data[i] };
      ctx.buffers.push(buffer);
      return buffer;
    },
    createBufferSource() {
      return source({ kind: 'buffer', buffer: null });
    },
  };
  return ctx;
}

/** Start times of the sources that will still be audible after `t` (not stopped before then). */
export function audibleStarts(ctx, t = ctx.currentTime) {
  return ctx.sources.filter((s) => s.stopAt === null || s.stopAt > t).map((s) => s.startAt);
}
