// @ts-check
// Keyboard driving for the list of results under a search box (the Lesson
// search popup, the Page and Question link pickers, the Question picker).
// Focus stays in the search box so typing keeps filtering. The first result
// is highlighted whenever the list is (re)drawn; Arrow Down/Up move the
// highlight (no wrap-around) and keep it scrolled into view; Enter clicks it,
// so it does exactly what a click does; Escape, from anywhere in the popup,
// closes it. The mouse doesn't move the highlight. Screen readers follow the
// highlight through the combobox pattern (aria-activedescendant).

let listCount = 0;

/**
 * Wire the keys up. Call `refresh()` after every redraw of `list`; its
 * results are the `button`s inside it.
 * @param {{ popup: HTMLElement, input: HTMLInputElement, list: HTMLElement }} parts
 * @returns {{ refresh: () => void }}
 */
export function attachSearchListKeys({ popup, input, list }) {
  list.id = `search-list-${++listCount}`;
  list.setAttribute('role', 'listbox');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-controls', list.id);
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-autocomplete', 'list');

  /** @type {HTMLButtonElement[]} */
  let items = [];
  let at = -1;

  /** @param {number} index */
  function select(index) {
    items[at]?.removeAttribute('aria-selected');
    at = index;
    const item = items[at];
    if (!item) {
      input.removeAttribute('aria-activedescendant');
      return;
    }
    item.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', item.id);
    item.scrollIntoView?.({ block: 'nearest' });
  }

  function refresh() {
    items = [...list.querySelectorAll('button')];
    items.forEach((item, i) => {
      item.id = `${list.id}-option-${i}`;
      item.setAttribute('role', 'option');
    });
    at = -1;
    select(0);
  }

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      select(Math.max(0, Math.min(items.length - 1, at + step)));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      items[at]?.click();
    }
  });

  popup.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      popup.remove();
    }
  });

  return { refresh };
}
