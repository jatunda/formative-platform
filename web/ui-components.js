// UI Component Helper Functions

/**
 * Create a styled button with the schedule-action-btn class
 * @param {string} text - The button text content
 * @param {() => void} onClick - The click handler function
 * @returns {HTMLButtonElement} The created button element
 */
export function createStyledButton(text, onClick) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.className = "schedule-action-btn";
  btn.onclick = onClick;
  return btn;
}

/**
 * Create a "New Lesson" button for a specific day
 * @param {number} dayIndex - The day index to add the lesson to
 * @param {(dayIndex: number) => void} addLessonCallback - Callback function to add lesson
 * @returns {HTMLButtonElement} The created button element
 */
export function createNewLessonButton(dayIndex, addLessonCallback) {
  const btn = document.createElement("button");
  btn.textContent = "New Lesson";
  btn.className = "schedule-action-btn new-lesson-btn";
  btn.onclick = () => addLessonCallback(dayIndex);
  return btn;
}

/**
 * Create a "Close" button that removes the popup from the DOM
 * @param {HTMLElement} popup - The popup element to remove when clicked
 * @returns {HTMLButtonElement} The created button element
 */
export function createCloseButton(popup) {
  const btn = document.createElement("button");
  btn.textContent = "Close";
  btn.className = "schedule-action-btn";
  btn.onclick = () => document.body.removeChild(popup);
  return btn;
}

/**
 * Create a left or right arrow button
 * @param {"left" | "right" | "up" | "down"} direction - The arrow direction
 * @param {boolean} isDisabled - Whether the button should be disabled
 * @param {() => void} onClick - The click handler function
 * @returns {HTMLButtonElement} The created button element
 */
export function createArrowButton(direction, isDisabled, onClick) {
  const btn = document.createElement("button");
  btn.textContent = direction === "left" ? "←" : "→";
  btn.className = "schedule-action-btn";
  btn.disabled = isDisabled;
  btn.onclick = onClick;
  return btn;
}

/**
 * Create a delete button with trash icon
 * @param {() => void} onClick - The click handler function
 * @returns {HTMLButtonElement} The created button element
 */
export function createDeleteButton(onClick) {
  const btn = document.createElement("button");
  btn.textContent = "🗑️";
  btn.className = "schedule-action-btn delete-btn";
  btn.onclick = onClick;
  return btn;
}

/**
 * Create an "Insert Day Here" button
 * @param {number} dayIndex - The day index where the new day should be inserted
 * @param {(dayIndex: number) => void} insertFunction - Function to insert the day
 * @returns {HTMLButtonElement} The created button element
 */
export function createInsertDayButton(dayIndex, insertFunction) {
  const btn = document.createElement("button");
  btn.textContent = "+ Insert Day Here";
  btn.className = "schedule-action-btn insert-day-btn";
  btn.onclick = () => insertFunction(dayIndex);
  return btn;
}

/**
 * Create a DOM element with optional class and text content
 * @param {string} tag - The HTML tag name
 * @param {string} [className=""] - The CSS class name(s)
 * @param {string} [textContent=""] - The text content
 * @returns {HTMLElement} The created element
 */
export function createElement(tag, className = "", textContent = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (textContent) element.textContent = textContent;
  return element;
}

/**
 * Create a button with up arrow (↑) with minimized width
 * @param {() => void} onClick - The click handler function
 * @returns {HTMLButtonElement} The created button element with up arrow
 */
export function createUpArrowButton(onClick) {
  const btn = createArrowButton("up", false, onClick);
  btn.textContent = "↑";
  // Minimize width to fit content only
  btn.style.width = "auto";
  btn.style.minWidth = "auto";
  btn.style.maxWidth = "none";
  btn.style.padding = "4px 8px";
  return btn;
}

/**
 * Create a button with down arrow (↓) with minimized width
 * @param {() => void} onClick - The click handler function
 * @returns {HTMLButtonElement} The created button element with down arrow
 */
export function createDownArrowButton(onClick) {
  const btn = createArrowButton("down", false, onClick);
  btn.textContent = "↓";
  // Minimize width to fit content only
  btn.style.width = "auto";
  btn.style.minWidth = "auto";
  btn.style.maxWidth = "none";
  btn.style.padding = "4px 8px";
  return btn;
}

/**
 * Create a button with left arrow (←) with minimized width
 * @param {boolean} isDisabled - Whether the button should be disabled
 * @param {() => void} onClick - The click handler function
 * @returns {HTMLButtonElement} The created button element with left arrow
 */
export function createLeftArrowButton(isDisabled, onClick) {
  const btn = createArrowButton("left", isDisabled, onClick);
  // Minimize width to fit content only
  btn.style.width = "auto";
  btn.style.minWidth = "auto";
  btn.style.maxWidth = "none";
  btn.style.padding = "4px 8px";
  return btn;
}

/**
 * Create a button with right arrow (→) with minimized width
 * @param {boolean} isDisabled - Whether the button should be disabled
 * @param {() => void} onClick - The click handler function
 * @returns {HTMLButtonElement} The created button element with right arrow
 */
export function createRightArrowButton(isDisabled, onClick) {
  const btn = createArrowButton("right", isDisabled, onClick);
  // Minimize width to fit content only
  btn.style.width = "auto";
  btn.style.minWidth = "auto";
  btn.style.maxWidth = "none";
  btn.style.padding = "4px 8px";
  return btn;
}

/**
 * Create a date offset control component
 * @param {number} currentOffset - The current date offset value
 * @param {(offset: number) => void} onOffsetChange - Callback function called when offset changes
 * @returns {HTMLElement & {updateOffset: (offset: number) => void}} The container element with updateOffset method
 */
export function createDateOffsetControl(currentOffset, onOffsetChange) {
  const container = document.createElement("div");
  container.className = "date-offset-control";
  
  const label = document.createElement("label");
  label.textContent = "Date Offset (days): ";
  label.style.marginRight = "8px";
  
  const input = document.createElement("input");
  input.type = "number";
  input.value = currentOffset;
  input.style.width = "80px";
  input.style.marginRight = "8px";
  
  const applyBtn = createStyledButton("Apply", () => {
    const newOffset = parseInt(input.value) || 0;
    onOffsetChange(newOffset);
  });
  applyBtn.style.width = "auto";
  applyBtn.style.padding = "4px 12px";
  applyBtn.style.fontSize = "0.9rem";
  
  container.appendChild(label);
  container.appendChild(input);
  container.appendChild(applyBtn);
  
  // Method to update the displayed offset
  container.updateOffset = (newOffset) => {
    input.value = newOffset;
  };
  
  return container;
}
