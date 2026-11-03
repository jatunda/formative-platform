// A modal dialog on the School Clock page (the Settings drawer, the Look
// sheet, the timer picker): shown over a scrim, with the rest of the page
// inert behind it. Focus moves into it when it opens and Tab wraps around
// inside it; Escape, the scrim or `close()` closes it, and focus goes back to
// the button that opened it.

/** What Tab can land on (a radio group is one stop: its checked radio). */
const TABBABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** @param {HTMLElement} root */
function tabStops(root) {
  return /** @type {HTMLElement[]} */ ([...root.querySelectorAll(TABBABLE)])
    .filter((node) => !node.closest('[hidden]') && !(/** @type {HTMLInputElement} */ (node).disabled)
      && !(node instanceof HTMLInputElement && node.type === 'radio' && !node.checked));
}

/**
 * @param {{ dialog: HTMLElement, scrim: HTMLElement, behind: () => Element[],
 *   onChange: (open: boolean) => void }} options
 *   `behind` gives the page parts made inert while it's open; `onChange` hears it open and close.
 */
export function createModal({ dialog, scrim, behind, onChange }) {
  /** @type {HTMLElement} */
  let opener;
  dialog.hidden = true;
  scrim.hidden = true;

  const isOpen = () => !dialog.hidden;

  /** @param {boolean} on */
  function show(on) {
    dialog.hidden = !on;
    scrim.hidden = !on;
    for (const node of behind()) node.toggleAttribute('inert', on);
    onChange(on);
  }

  /**
   * Open it, focusing `focus` (else its first control), and remember `from`
   * to hand focus back to.
   * @param {HTMLElement} from @param {HTMLElement} [focus]
   */
  function open(from, focus) {
    opener = from;
    show(true);
    (focus ?? tabStops(dialog)[0]).focus();
  }

  /** Close it (it's open: only its own controls and the scrim close it). */
  function close() {
    show(false);
    opener.focus();
  }

  /** @param {KeyboardEvent} event */
  function onKeyDown(event) {
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      // Nothing else on the page (Readouts edit mode) also takes this Escape.
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const stops = tabStops(dialog);
    const [first, last] = [stops[0], stops.at(-1)];
    const to = event.shiftKey
      ? (document.activeElement === first || !dialog.contains(document.activeElement) ? last : null)
      : (document.activeElement === last || !dialog.contains(document.activeElement) ? first : null);
    if (!to) return;
    event.preventDefault();
    to.focus();
  }
  document.addEventListener('keydown', onKeyDown, true);
  scrim.addEventListener('click', close);

  return {
    open,
    close,
    isOpen,
    destroy: () => document.removeEventListener('keydown', onKeyDown, true),
  };
}
