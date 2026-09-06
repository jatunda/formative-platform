/**
 * Drag and Drop Utility Functions
 * Provides reusable drag-and-drop functionality for lesson scheduling
 */

// The drag payload for the drag currently in progress, if any. Browsers only
// let dragover handlers read dataTransfer's *types*, not its data, so a
// drop target can't inspect what's being dragged over it via dataTransfer
// alone. Since drag source and drop target always live on the same page
// here, tracking it in memory instead sidesteps that restriction entirely.
let activeDragData = null;

/**
 * Setup drag handlers for a draggable element
 * @param {HTMLElement} element - The draggable element
 * @param {Object} dragData - The data to transfer during drag
 * @param {string} dragData.lessonHash - The lesson hash/ID
 * @param {number} dragData.fromDayIndex - The source day index
 * @param {number} dragData.fromLessonIndex - The source lesson index
 * @param {Object} [options] - Optional configuration
 * @param {number} [options.dragOpacity=0.5] - Opacity to apply during drag
 */
export function setupDragHandlers(element, dragData, options = {}) {
  const { dragOpacity = 0.5 } = options;

  element.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    element.style.opacity = dragOpacity.toString();
    activeDragData = dragData;
  });

  element.addEventListener("dragend", () => {
    element.style.opacity = "1";
    activeDragData = null;
  });
}

/**
 * Get the drag data for the drag currently in progress (see setupDragHandlers),
 * so a drop target's dragover handler can decide whether to accept it.
 * @returns {Object|null}
 */
export function getActiveDragData() {
  return activeDragData;
}

/**
 * Setup drop handlers for a drop target element
 * @param {HTMLElement} element - The drop target element
 * @param {Function} onDrop - Callback function called when an item is dropped
 * @param {Object} [options] - Optional configuration
 * @param {string} [options.hoverClass="td-drop-hover"] - CSS class to add on hover
 * @param {(dragData: Object|null) => boolean} [options.canDrop] - Whether the
 *   in-progress drag may be dropped here. When it returns false, dragover's
 *   default is left un-prevented, so the browser shows its native
 *   "not allowed" cursor and never fires a drop event on this element.
 */
export function setupDropHandlers(element, onDrop, options = {}) {
  const { hoverClass = "td-drop-hover", canDrop } = options;

  element.addEventListener("dragover", (e) => {
    if (canDrop && !canDrop(activeDragData)) {
      element.classList.remove(hoverClass);
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    element.classList.add(hoverClass);
  });

  element.addEventListener("dragleave", () => {
    element.classList.remove(hoverClass);
  });

  element.addEventListener("drop", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove(hoverClass);

    let data;
    try {
      data = JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch {
      return;
    }

    await onDrop(data, e);
  });
}

/**
 * Parse drag data from a drop event
 * @param {DragEvent} event - The drop event
 * @returns {Object|null} The parsed drag data, or null if parsing fails
 */
export function parseDragData(event) {
  try {
    return JSON.parse(event.dataTransfer.getData("text/plain"));
  } catch {
    return null;
  }
}

