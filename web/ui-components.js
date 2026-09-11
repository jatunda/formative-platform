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
 * Create a Date Offset editing control: a "Current: N" badge, a "(Today is
 * Day N)" indicator, an input + Apply button, and an optional "Go to Today"
 * button. Has no data or notification dependencies of its own - persistence,
 * the today-index computation, and any scroll behavior are all supplied by
 * the caller, so the same control works both in teacher.js's full-schedule
 * view and in a lesson-planning.html per-class pane.
 * @param {Object} config
 * @param {number} config.currentOffset - The current date offset value
 * @param {(newOffset: number) => Promise<void>} config.onApply - Persist the new offset (and notify the user of success/failure); the control re-renders its display only if this resolves, and swallows a thrown failure since the caller already handled it
 * @param {() => Promise<number>} config.computeTodayDayIndex - Resolve today's Day Index for display, called on mount and after a successful apply. Never called when config.compact is true.
 * @param {() => void} [config.onGoToToday] - If provided, a "Go to Today" button is rendered
 * @param {boolean} [config.compact=false] - Shorten the label and drop the "(Today is Day N)" indicator, for placements too narrow for the full control (e.g. one per pane on the Lesson Planning page)
 * @returns {HTMLElement & {updateOffset: (offset: number) => Promise<void>}} The container element with an updateOffset method
 */
export function createDateOffsetControl({ currentOffset, onApply, computeTodayDayIndex, onGoToToday, compact = false }) {
  const container = document.createElement("div");
  container.className = "date-offset-control";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.gap = "8px";

  const label = document.createElement("label");
  label.textContent = compact ? "Offset:" : "Date Offset (days): ";

  const currentDisplay = document.createElement("span");
  currentDisplay.className = "current-offset-display";
  currentDisplay.textContent = `Current: ${currentOffset}`;
  currentDisplay.style.fontWeight = "bold";
  currentDisplay.style.color = "#007cba";
  currentDisplay.style.backgroundColor = "#e8f4fd";
  currentDisplay.style.padding = "4px 8px";
  currentDisplay.style.borderRadius = "4px";
  currentDisplay.style.border = "1px solid #b3d9f7";
  currentDisplay.style.fontSize = "0.9rem";

  const todayDisplay = document.createElement("span");
  todayDisplay.className = "today-dayindex-display";
  todayDisplay.style.fontSize = "0.85rem";
  todayDisplay.style.color = "#666";
  todayDisplay.style.fontStyle = "italic";

  async function refreshTodayDisplay() {
    if (compact) return;
    const todayDayIndex = await computeTodayDayIndex();
    todayDisplay.textContent = `(Today is Day ${todayDayIndex})`;
  }
  refreshTodayDisplay();

  const input = document.createElement("input");
  input.type = "number";
  input.value = currentOffset;
  input.style.width = "80px";
  input.placeholder = "New offset";

  const applyBtn = createStyledButton("Apply", async () => {
    const newOffset = parseInt(input.value) || 0;
    try {
      await onApply(newOffset);
      currentDisplay.textContent = `Current: ${newOffset}`;
      await refreshTodayDisplay();
    } catch (error) {
      // onApply is responsible for notifying the user of the failure
    }
  });
  applyBtn.style.width = "auto";
  applyBtn.style.padding = "4px 12px";
  applyBtn.style.fontSize = "0.9rem";

  container.appendChild(label);
  container.appendChild(currentDisplay);
  if (!compact) {
    container.appendChild(todayDisplay);
  }
  container.appendChild(input);
  container.appendChild(applyBtn);

  if (onGoToToday) {
    const goToTodayBtn = createStyledButton("Go to Today", onGoToToday);
    goToTodayBtn.className = "schedule-action-btn go-to-today-btn";
    goToTodayBtn.style.padding = "4px 12px";
    goToTodayBtn.style.fontSize = "0.9rem";
    container.appendChild(goToTodayBtn);
  }

  // Method to update the displayed offset (e.g. after switching classes)
  container.updateOffset = async (newOffset) => {
    input.value = newOffset;
    currentDisplay.textContent = `Current: ${newOffset}`;
    await refreshTodayDisplay();
  };

  return container;
}
