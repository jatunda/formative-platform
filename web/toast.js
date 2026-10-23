// @ts-check
// A single, reused toast: showing a new message replaces the current one and
// restarts its fade timer, so repeated triggers never stack. Shared by the
// Robotics Tournament (robotics/toast.js) and Practice Set delivery
// (practice-view.js); each styles it via its own base class.

const TOAST_VISIBLE_MS = 2500;

/**
 * Create a toast element (not yet in the document - the caller places it).
 * Visible state is `<baseClass> <baseClass>-visible`, plus
 * `<baseClass>-<variant>` when shown with a variant.
 * @param {string} baseClass
 * @returns {{element: HTMLElement, show: (message: string, options?: {variant?: string}) => void, dismiss: () => void}}
 */
export function createToast(baseClass) {
  const element = document.createElement('div');
  element.className = baseClass;
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let hideTimerId;

  function dismiss() {
    clearTimeout(hideTimerId);
    element.className = baseClass;
  }

  /**
   * @param {string} message
   * @param {{variant?: string}} [options]
   */
  function show(message, { variant } = {}) {
    clearTimeout(hideTimerId);
    element.textContent = message;
    element.className = `${baseClass} ${baseClass}-visible${variant ? ` ${baseClass}-${variant}` : ''}`;
    hideTimerId = setTimeout(dismiss, TOAST_VISIBLE_MS);
  }

  return { element, show, dismiss };
}
