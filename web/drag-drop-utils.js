/**
 * Drag and Drop Utility Functions
 * Provides reusable drag-and-drop functionality for lesson scheduling
 */

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
  });
  
  element.addEventListener("dragend", () => {
    element.style.opacity = "1";
  });
}

/**
 * Setup drop handlers for a drop target element
 * @param {HTMLElement} element - The drop target element
 * @param {Function} onDrop - Callback function called when an item is dropped
 * @param {Object} [options] - Optional configuration
 * @param {string} [options.hoverClass="td-drop-hover"] - CSS class to add on hover
 */
export function setupDropHandlers(element, onDrop, options = {}) {
  const { hoverClass = "td-drop-hover" } = options;
  
  element.addEventListener("dragover", (e) => {
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

