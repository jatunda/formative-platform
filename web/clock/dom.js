// A tiny DOM helper shared by the School Clock's page modules.

/**
 * A DOM element: `props` are set as properties, except hyphenated names
 * ('aria-label'), which are set as attributes.
 * @param {string} tag @param {object} [props] @param {(Node | string)[]} [children]
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.includes('-')) node.setAttribute(key, value);
    else node[key] = value;
  }
  node.append(...children);
  return node;
}
