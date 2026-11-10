// The first-time tooltip on a Readout that cycles: "Click to change what this
// shows". It shows the first time a clickable Readout is on show (once on the
// page, once in the mini player, each remembered on its own), and goes on a
// click, on Escape, or after a few seconds. It's a note right after the
// Readout, so screen readers reach it, and clicks pass through it.
import { el } from './dom.js';

export const CYCLE_HINT_TEXT = 'Click to change what this shows';
/** How long it shows, unless clicked away first. */
export const CYCLE_HINT_MS = 6000;

/**
 * @param {{ name: string, hints: ReturnType<typeof import('./clock-storage.js').createHintStore>,
 *   now: () => number }} options `name` is what `hints` remembers it by;
 *   `now` is the real clock (it times out in real seconds, whatever the speed)
 * @returns {{ element: HTMLElement, update: (clickable: boolean) => void, dismiss: () => void }}
 *   `update` says whether its Readout can be clicked right now (it hides while
 *   not, and starts the first time it can); `dismiss` puts it away for good.
 */
export function createCycleHint({ name, hints, now }) {
  const element = el('p', { className: 'clock-cycle-hint', role: 'note', textContent: CYCLE_HINT_TEXT, hidden: true });
  /** 'waiting' to show, 'showing' since `since`, or 'done'. */
  let state = hints.seen(name) ? 'done' : 'waiting';
  let since = 0;
  return {
    element,
    update(clickable) {
      if (state === 'waiting' && clickable) {
        state = 'showing';
        since = now();
        // Remembered as soon as it shows: a reload doesn't bring it back.
        hints.markSeen(name);
      }
      if (state === 'showing' && now() - since >= CYCLE_HINT_MS) state = 'done';
      element.hidden = !(state === 'showing' && clickable);
    },
    dismiss() {
      if (state !== 'showing') return;
      state = 'done';
      element.hidden = true;
    },
  };
}
