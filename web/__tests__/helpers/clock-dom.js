// Finding School Clock controls the way a person (or a screen reader) names
// them, so page tests don't depend on the markup around each control.

const squash = (text) => text.replace(/\s+/g, ' ').trim();

/**
 * A node's accessible name, as far as the clock's markup needs: its
 * aria-label, else the elements its aria-labelledby names, else its <label>,
 * else (for a button or link) its own text.
 * @param {Element} node
 */
export function accessibleName(node) {
  const label = node.getAttribute('aria-label');
  if (label !== null) return squash(label);
  const labelledBy = node.getAttribute('aria-labelledby');
  if (labelledBy) {
    return squash(labelledBy.split(/\s+/).map((id) => node.ownerDocument.getElementById(id)?.textContent ?? '').join(' '));
  }
  const ownLabel = node.labels?.[0] ?? node.closest('label');
  if (ownLabel) {
    // The label's own words, not the options of a select inside it.
    const words = ownLabel.cloneNode(true);
    words.querySelectorAll('select, textarea').forEach((n) => n.remove());
    return squash(words.textContent);
  }
  return squash(node.textContent);
}

/** Whether `node` is shown (neither it nor an ancestor is hidden). @param {Element} node */
export const isShown = (node) => !node.closest('[hidden]');

/**
 * The form control (input, select or textarea) named `name`, shown or not.
 * @param {string} name @param {ParentNode} [root]
 * @returns {HTMLInputElement & HTMLSelectElement}
 */
export function field(name, root = document) {
  return /** @type {any} */ ([...root.querySelectorAll('input, select, textarea')].find((n) => accessibleName(n) === name));
}

/** Tick or untick a checkbox or switch as a click would. @param {string} name @param {ParentNode} [root] */
export function toggle(name, root = document) {
  field(name, root).click();
}

/** Set a text field, select or slider and fire the event the page listens for. */
export function setValue(name, value, root = document) {
  const node = field(name, root);
  node.value = value;
  node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input'));
}
