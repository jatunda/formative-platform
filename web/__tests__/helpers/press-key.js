/**
 * Dispatch a bubbling, cancelable keydown on `target` and return the event,
 * so a test can check `defaultPrevented`.
 * @param {EventTarget} target @param {string} key
 */
export function pressKey(target, key) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}
