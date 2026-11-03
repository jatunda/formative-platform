// A stand-in for the browser's AudioContext (jsdom has none). It records every
// sound source started on it, so tests can see what would play and when.
// Time only moves when the test sets `ctx.currentTime`.

function fakeParam(value = 0) {
  return {
    value,
    setValueAtTime(v) { this.value = v; return this; },
    linearRampToValueAtTime() { return this; },
    exponentialRampToValueAtTime() { return this; },
    setTargetAtTime() { return this; },
  };
}

function fakeNode(extra = {}) {
  return {
    connected: [],
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
  const ctx = {
    currentTime: 0,
    state,
    onstatechange: null,
    destination: fakeNode({ isDestination: true }),
    /** Every oscillator ever made: { type, start, stop, stopped } */
    sources,
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
    createOscillator() {
      const osc = fakeNode({
        type: 'sine',
        frequency: fakeParam(440),
        startAt: null,
        stopAt: null,
        start(t = ctx.currentTime) { osc.startAt = t; },
        stop(t = ctx.currentTime) {
          if (osc.startAt === null) throw new Error('stop() before start()');
          osc.stopAt = osc.stopAt === null ? t : Math.min(osc.stopAt, t);
        },
      });
      sources.push(osc);
      return osc;
    },
  };
  return ctx;
}

/** Start times of the sources that will still be audible after `t` (not stopped before then). */
export function audibleStarts(ctx, t = ctx.currentTime) {
  return ctx.sources.filter((s) => s.stopAt === null || s.stopAt > t).map((s) => s.startAt);
}
