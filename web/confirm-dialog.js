// @ts-check
// The in-app confirm dialog, drawn by the page itself instead of the browser's
// confirm() (which browsers can silently block, leaving the button looking
// dead). It shows a message with Cancel and Confirm buttons and resolves with
// the choice. Focus moves to Confirm when it opens, Tab stays inside it, Enter
// presses the focused button (Confirm unless Cancel was Tabbed to), Escape
// cancels, and focus goes back to whatever had it before (the button that
// asked).
//
// `showConfirm` mounts one shared dialog on document.body, styled by
// style.css. A page with its own look (the Robotics Tournament) makes its own
// with `createConfirmDialog(classes)` and places `overlay` itself.

/**
 * @typedef {{ overlay: string, overlayVisible: string, dialog: string, title: string,
 *   message: string, actions: string, cancelButton: string, confirmButton: string }} ConfirmDialogClasses
 * @typedef {{ title?: string, message: string, confirmLabel?: string, cancelLabel?: string }} ConfirmOptions
 */

/** @type {ConfirmDialogClasses} */
const DEFAULT_CLASSES = {
  overlay: 'confirm-overlay',
  overlayVisible: 'confirm-overlay-visible',
  dialog: 'confirm-dialog',
  title: 'confirm-title',
  message: 'confirm-message',
  actions: 'confirm-actions',
  cancelButton: 'confirm-cancel-btn',
  confirmButton: 'confirm-confirm-btn',
};

/**
 * @param {string} tag @param {string} className @param {string} [text]
 */
function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let messageCount = 0;

/**
 * Make a confirm dialog whose overlay the caller places in the page.
 * @param {ConfirmDialogClasses} [classes]
 * @returns {{ overlay: HTMLElement, show: (options: ConfirmOptions) => Promise<boolean> }}
 */
export function createConfirmDialog(classes = DEFAULT_CLASSES) {
  const overlay = el('div', classes.overlay);

  /** @param {ConfirmOptions} options */
  function show({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel' }) {
    const opener = /** @type {HTMLElement | null} */ (document.activeElement);

    return new Promise((resolve) => {
      const cancelBtn = /** @type {HTMLButtonElement} */ (el('button', classes.cancelButton, cancelLabel));
      const confirmBtn = /** @type {HTMLButtonElement} */ (el('button', classes.confirmButton, confirmLabel));
      cancelBtn.type = 'button';
      confirmBtn.type = 'button';

      /** @param {boolean} result */
      const close = (result) => {
        overlay.className = classes.overlay;
        overlay.textContent = '';
        opener?.focus();
        resolve(result);
      };
      cancelBtn.addEventListener('click', () => close(false));
      confirmBtn.addEventListener('click', () => close(true));

      const dialog = el('div', classes.dialog);
      dialog.setAttribute('role', 'alertdialog');
      dialog.setAttribute('aria-modal', 'true');
      if (title) dialog.appendChild(el('h3', classes.title, title));
      const messageEl = el('p', classes.message, message);
      messageEl.id = `confirm-message-${++messageCount}`;
      dialog.setAttribute('aria-describedby', messageEl.id);
      dialog.appendChild(messageEl);
      const actions = el('div', classes.actions);
      actions.append(cancelBtn, confirmBtn);
      dialog.appendChild(actions);

      dialog.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          close(false);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          close(document.activeElement !== cancelBtn);
        } else if (event.key === 'Tab') {
          event.preventDefault();
          (document.activeElement === cancelBtn ? confirmBtn : cancelBtn).focus();
        }
      });

      overlay.textContent = '';
      overlay.appendChild(dialog);
      overlay.className = `${classes.overlay} ${classes.overlayVisible}`;
      confirmBtn.focus();
    });
  }

  return { overlay, show };
}

/** @type {ReturnType<typeof createConfirmDialog> | null} */
let shared = null;

/**
 * Ask in the page's shared confirm dialog.
 * @param {ConfirmOptions} options
 * @returns {Promise<boolean>} true for Confirm, false for Cancel or Escape
 */
export function showConfirm(options) {
  if (!shared || !shared.overlay.isConnected) {
    shared = createConfirmDialog();
    document.body.appendChild(shared.overlay);
  }
  return shared.show(options);
}
