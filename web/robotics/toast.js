// The Robotics app's one toast, built on the shared toast module.
import { createToast } from '../toast.js';

let toast = null;

export function createToastContainer() {
  if (toast) toast.dismiss();
  toast = createToast('robotics-toast');
  return toast.element;
}

export function showToast(message, { isError = false } = {}) {
  if (!toast) return;
  toast.show(message, isError ? { variant: 'error' } : {});
}
