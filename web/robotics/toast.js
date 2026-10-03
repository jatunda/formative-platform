const TOAST_VISIBLE_MS = 2500;

let toastEl = null;
let hideTimerId = null;

export function createToastContainer() {
  clearTimeout(hideTimerId);
  toastEl = document.createElement('div');
  toastEl.className = 'robotics-toast';
  toastEl.setAttribute('role', 'status');
  toastEl.setAttribute('aria-live', 'polite');
  return toastEl;
}

export function showToast(message, { isError = false } = {}) {
  if (!toastEl) return;
  clearTimeout(hideTimerId);
  toastEl.textContent = message;
  toastEl.className = `robotics-toast robotics-toast-visible${isError ? ' robotics-toast-error' : ''}`;
  hideTimerId = setTimeout(() => {
    toastEl.className = 'robotics-toast';
  }, TOAST_VISIBLE_MS);
}
