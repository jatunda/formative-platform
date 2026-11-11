// The first-time tooltip on a Readout that cycles: "Click to change what this
// shows". It shows the first time a clickable Readout is on show where it can
// be seen (once on the page, once in the mini player, each remembered on its
// own), and goes on a click, on Escape, or after a few seconds. It's a note
// right after the Readout, so screen readers reach it, and clicks pass through it.
import { el } from './dom.js';

export const CYCLE_HINT_TEXT = 'Click to change what this shows';
/** How long it shows, unless clicked away first. */
export const CYCLE_HINT_MS = 6000;

/**
 * @param {{ name: string, hints: ReturnType<typeof import('./clock-storage.js').createHintStore>,
 *   now: () => number }} options `name` is what `hints` remembers it by;
 *   `now` is the real clock (it times out in real seconds, whatever the speed)
 * @returns {{ element: HTMLElement, update: (clickable: boolean) => void, dismiss: () => void,
 *   listen: (doc: Document) => () => void }}
 *   `update` says whether its Readout can be clicked right now (it hides while
 *   not, and starts the first time it can while its document is visible);
 *   `dismiss` puts it away for good; `listen` puts it away on any click or
 *   Escape in `doc`, until the function it returns is called.
 */
export function createCycleHint({ name, hints, now }) {
  const element = el('p', { className: 'clock-cycle-hint', role: 'note', textContent: CYCLE_HINT_TEXT, hidden: true });
  /** 'waiting' to show, 'showing' since `since`, or 'done'. */
  let state = hints.seen(name) ? 'done' : 'waiting';
  let since = 0;
  function dismiss() {
    if (state !== 'showing') return;
    state = 'done';
    element.hidden = true;
  }
  return {
    element,
    update(clickable) {
      // Its own document: the page's, or the mini player's once it's in there.
      const visible = element.ownerDocument.visibilityState === 'visible';
      if (state === 'waiting' && clickable && visible) {
        state = 'showing';
        since = now();
        // Remembered as soon as it shows: a reload doesn't bring it back.
        hints.markSeen(name);
      }
      if (state === 'showing' && now() - since >= CYCLE_HINT_MS) state = 'done';
      element.hidden = !(state === 'showing' && clickable);
    },
    dismiss,
    listen(doc) {
      /** @param {KeyboardEvent} event */
      const onKeyDown = (event) => {
        if (event.key === 'Escape') dismiss();
      };
      // Caught on the way down, so the click that first shows it (choosing a
      // Division) doesn't also put it away, and before a click cycles (and
      // redraws) the Readout.
      doc.addEventListener('click', dismiss, true);
      doc.addEventListener('keydown', onKeyDown);
      return () => {
        doc.removeEventListener('click', dismiss, true);
        doc.removeEventListener('keydown', onKeyDown);
      };
    },
  };
}
