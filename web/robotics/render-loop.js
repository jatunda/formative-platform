// Input types where selectionStart/selectionEnd/setSelectionRange are valid to call;
// other types (e.g. "number") throw InvalidStateError if you touch them.
const SELECTABLE_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'password']);

/** Locate the focused element within root by its childNode index path, so it can be found again after a rebuild. */
function captureFocusPath(root) {
  const active = document.activeElement;
  if (!active || active === root || !root.contains(active)) return null;
  const path = [];
  const siblingCounts = [];
  let node = active;
  while (node && node !== root) {
    const parent = node.parentNode;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.childNodes, node));
    siblingCounts.unshift(parent.childNodes.length);
    node = parent;
  }
  const hasSelection = SELECTABLE_INPUT_TYPES.has(active.type);
  return {
    path,
    siblingCounts,
    tagName: active.tagName,
    selectionStart: hasSelection ? active.selectionStart : null,
    selectionEnd: hasSelection ? active.selectionEnd : null,
  };
}

/**
 * Re-focus (and restore cursor position for) the element at a path captured by captureFocusPath,
 * if it still exists. Also requires every ancestor along that path to still have the same
 * childNode count it had at capture time: a list that grew or shrank (e.g. a row removed) means
 * a sibling has shifted into the captured position, and that sibling — not whatever was focused
 * before — would wrongly receive focus, so restoration is skipped rather than guessed at.
 */
function restoreFocusPath(root, focusPath) {
  if (!focusPath) return;
  let node = root;
  for (let i = 0; i < focusPath.path.length; i++) {
    if (node?.childNodes.length !== focusPath.siblingCounts[i]) return;
    node = node.childNodes[focusPath.path[i]];
  }
  if (!node || node.tagName !== focusPath.tagName) return;
  node.focus();
  if (focusPath.selectionStart !== null && typeof node.setSelectionRange === 'function') {
    node.setSelectionRange(focusPath.selectionStart, focusPath.selectionEnd);
  }
}

/**
 * Owns the one mechanism every full-DOM-rebuild render needs to survive a live interaction:
 * a rebuild (mount.innerHTML = '') would otherwise tear down the actual click target mid-
 * interaction, because a field's "change" event commits during the browser's blur-handling
 * phase of a click, which runs before that same click's mouseup/click phase - a synchronous
 * rebuild there destroys the node the click was headed for. Deferring the rebuild past the
 * current event (a macrotask, not a microtask - a blur-triggered microtask can still run
 * before the pending click/mouseup) isn't enough on its own, though: mousedown and mouseup are
 * two separate native events with a real (if short) gap between them while the mouse button is
 * physically held, and a macrotask queued during mousedown's blur/change readily fires inside
 * that gap. So a requested render additionally waits out any mouse button that's currently
 * down - once mouseup fires, the browser dispatches that click synchronously right after it (no
 * macrotask boundary in between), so by the time the deferred paint actually runs, the whole
 * native click sequence has already landed on the pre-rebuild DOM. captureFocusPath/
 * restoreFocusPath then carry whatever has focus across the rebuild itself.
 *
 * @param {object} options
 * @param {HTMLElement} options.mount - element whose contents are fully replaced on every paint
 * @param {() => Node} options.render - builds the tree for the current state
 * @param {() => void} [options.onPainted] - runs after every real paint (e.g. auto-scroll)
 * @returns {{requestRender: (afterRender?: () => void) => void, renderNow: () => void, destroy: () => void}}
 */
export function createRenderLoop({ mount, render, onPainted }) {
  let renderTimer = null;
  let mouseButtonDown = false;
  let renderPendingUntilMouseUp = false;
  let afterRenderCallbacks = [];

  function onMouseDownCapture() {
    mouseButtonDown = true;
  }
  function onMouseUpCapture() {
    mouseButtonDown = false;
    if (renderPendingUntilMouseUp) {
      renderPendingUntilMouseUp = false;
      scheduleRender();
    }
  }
  document.addEventListener('mousedown', onMouseDownCapture, true);
  document.addEventListener('mouseup', onMouseUpCapture, true);

  function paint() {
    const focusPath = captureFocusPath(mount);
    mount.innerHTML = '';
    mount.appendChild(render());
    restoreFocusPath(mount, focusPath);
    onPainted?.();
    const callbacks = afterRenderCallbacks;
    afterRenderCallbacks = [];
    callbacks.forEach((callback) => callback());
  }

  function scheduleRender() {
    if (mouseButtonDown) {
      renderPendingUntilMouseUp = true;
      return;
    }
    if (renderTimer !== null) return;
    renderTimer = setTimeout(() => {
      renderTimer = null;
      if (mouseButtonDown) {
        renderPendingUntilMouseUp = true;
        return;
      }
      paint();
    }, 0);
  }

  // Queues a one-off callback for code that needs the freshly-rebuilt DOM (e.g. to tag a
  // specific node for a one-off animation) rather than whatever is still live right now.
  function requestRender(afterRender) {
    if (afterRender) afterRenderCallbacks.push(afterRender);
    scheduleRender();
  }

  function renderNow() {
    if (renderTimer !== null) {
      clearTimeout(renderTimer);
      renderTimer = null;
    }
    renderPendingUntilMouseUp = false;
    paint();
  }

  function destroy() {
    if (renderTimer !== null) {
      clearTimeout(renderTimer);
      renderTimer = null;
    }
    document.removeEventListener('mousedown', onMouseDownCapture, true);
    document.removeEventListener('mouseup', onMouseUpCapture, true);
  }

  paint();

  return { requestRender, renderNow, destroy };
}
