// The Robotics Tournament's confirm dialog: the shared in-app dialog
// (../confirm-dialog.js) in the arena's look, placed in the app's root.
import { createConfirmDialog } from '../confirm-dialog.js';

/** @type {ReturnType<typeof createConfirmDialog> | null} */
let confirmDialog = null;

export function createConfirmDialogContainer() {
  confirmDialog = createConfirmDialog({
    overlay: 'robotics-confirm-overlay',
    overlayVisible: 'robotics-confirm-overlay-visible',
    dialog: 'robotics-confirm-dialog',
    title: 'robotics-confirm-title',
    message: 'robotics-confirm-message',
    actions: 'robotics-confirm-actions',
    cancelButton: 'robotics-btn robotics-btn-secondary',
    confirmButton: 'robotics-btn robotics-btn-danger',
  });
  return confirmDialog.overlay;
}

export function showConfirm({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel' } = {}) {
  if (!confirmDialog) return Promise.resolve(false);
  return confirmDialog.show({ title, message, confirmLabel, cancelLabel });
}
