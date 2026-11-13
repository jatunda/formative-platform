// @ts-check
// A small ⋮ action menu: a button that opens a list of actions next to it.
// Like the in-app confirm dialog (confirm-dialog.js), it is keyboard-operable:
// focus moves to the first action when it opens, Arrow Up/Down (and Home/End)
// move between actions that can apply, Enter/Space run one, and Escape closes
// it with focus back on the ⋮ button. A press anywhere outside it, Tab, or a
// scroll/resize (it is placed against the button) also closes it.
//
// The menu is mounted on document.body with fixed positioning, so a scrolling
// or clipped container (a day's Lessons cell) can't cut it off.

/**
 * @typedef {{ label: string, disabled?: boolean, onSelect: () => any }} MenuItem
 */

/** Gap kept between the menu and the viewport edge, in px. */
const EDGE = 8;

/** @type {(() => void) | null} */
let closeOpenMenu = null;

/**
 * Place the menu below the anchor (left edges lined up), flipping above it or
 * pulling left when it would run off the viewport.
 * @param {HTMLElement} menu @param {HTMLElement} anchor
 */
function place(menu, anchor) {
  const a = anchor.getBoundingClientRect();
  const m = menu.getBoundingClientRect();
  // On a phone whose page is wider than the screen (a day with many Lessons),
  // the visible part is the visual viewport, not the whole layout width.
  const vv = window.visualViewport;
  const view = vv
    ? { left: vv.offsetLeft, top: vv.offsetTop, width: vv.width, height: vv.height }
    : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  const left = Math.max(view.left + EDGE, Math.min(a.left, view.left + view.width - m.width - EDGE));
  const fitsBelow = a.bottom + m.height <= view.top + view.height - EDGE;
  const top = fitsBelow ? a.bottom : Math.max(view.top + EDGE, a.top - m.height);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

/**
 * Make a ⋮ button that opens a menu of actions.
 * @param {string} label - Names the menu, as tooltip and accessible label
 * @param {() => MenuItem[]} getItems - Read each time the menu opens
 * @returns {HTMLButtonElement}
 */
export function createMenuButton(label, getItems) {
  const anchor = document.createElement('button');
  anchor.type = 'button';
  anchor.textContent = '⋮';
  anchor.className = 'action-menu-btn';
  anchor.title = label;
  anchor.setAttribute('aria-label', label);
  anchor.setAttribute('aria-haspopup', 'menu');
  anchor.setAttribute('aria-expanded', 'false');

  /** @type {(() => void) | null} */
  let close = null;

  function open() {
    closeOpenMenu?.();

    const menu = document.createElement('div');
    menu.className = 'action-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', label);

    const buttons = getItems().map(({ label: text, disabled = false, onSelect }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'action-menu-item';
      btn.setAttribute('role', 'menuitem');
      btn.textContent = text;
      btn.disabled = disabled;
      btn.addEventListener('click', () => {
        dismiss();
        anchor.focus();
        onSelect();
      });
      return btn;
    });
    menu.append(...buttons);
    const enabled = buttons.filter((b) => !b.disabled);

    /** @param {Event} event */
    const onOutside = (event) => {
      const target = /** @type {Node} */ (event.target);
      if (!menu.contains(target) && !anchor.contains(target)) dismiss();
    };
    const onViewportChange = () => dismiss();

    function dismiss() {
      menu.remove();
      anchor.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
      close = null;
      closeOpenMenu = null;
    }

    menu.addEventListener('keydown', (event) => {
      const at = enabled.indexOf(/** @type {HTMLButtonElement} */ (document.activeElement));
      /** @type {Record<string, number>} */
      const moves = {
        ArrowDown: (at + 1) % enabled.length,
        ArrowUp: (at - 1 + enabled.length) % enabled.length,
        Home: 0,
        End: enabled.length - 1,
      };
      if (event.key in moves) {
        event.preventDefault();
        enabled[moves[event.key]]?.focus();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
        anchor.focus();
      } else if (event.key === 'Tab') {
        dismiss();
      }
    });

    document.body.appendChild(menu);
    place(menu, anchor);
    anchor.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);
    close = dismiss;
    closeOpenMenu = dismiss;
    enabled[0]?.focus();
  }

  anchor.addEventListener('click', () => {
    if (close) close();
    else open();
  });

  return anchor;
}
