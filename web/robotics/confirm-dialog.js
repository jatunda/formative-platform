let overlayEl = null;

export function createConfirmDialogContainer() {
  overlayEl = document.createElement('div');
  overlayEl.className = 'robotics-confirm-overlay';
  return overlayEl;
}

export function showConfirm({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel' } = {}) {
  if (!overlayEl) return Promise.resolve(false);

  return new Promise((resolve) => {
    const close = (result) => {
      overlayEl.className = 'robotics-confirm-overlay';
      overlayEl.textContent = '';
      resolve(result);
    };

    const titleEl = document.createElement('h3');
    titleEl.className = 'robotics-confirm-title';
    titleEl.textContent = title;

    const messageEl = document.createElement('p');
    messageEl.className = 'robotics-confirm-message';
    messageEl.textContent = message;

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'robotics-btn robotics-btn-secondary';
    cancelBtn.textContent = cancelLabel;
    cancelBtn.addEventListener('click', () => close(false));

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'robotics-btn robotics-btn-danger';
    confirmBtn.textContent = confirmLabel;
    confirmBtn.addEventListener('click', () => close(true));

    const actions = document.createElement('div');
    actions.className = 'robotics-confirm-actions';
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    const dialog = document.createElement('div');
    dialog.className = 'robotics-confirm-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.appendChild(titleEl);
    dialog.appendChild(messageEl);
    dialog.appendChild(actions);

    overlayEl.textContent = '';
    overlayEl.appendChild(dialog);
    overlayEl.className = 'robotics-confirm-overlay robotics-confirm-overlay-visible';
  });
}
