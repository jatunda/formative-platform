// UI Component Helper Functions

/**
 * Wrap a button's click handler so that if the resulting work takes longer
 * than `delayMs`, the button disables itself and shows `workingLabel` until
 * it settles - so a slow auto-save operation (e.g. inserting a day) doesn't
 * look like the click did nothing. Fast operations (the common case) never
 * show anything, since the timer is cleared before it fires.
 * @param {HTMLButtonElement} btn - The button whose own text/disabled state gets restored
 * @param {(...args: any[]) => any} onClick - The original click handler (sync or async)
 * @param {{delayMs?: number, workingLabel?: string}} [options]
 * @returns {(...args: any[]) => Promise<any>}
 */
export function withWorkingIndicator(btn, onClick, { delayMs = 1000, workingLabel = "Working…" } = {}) {
  return async (...args) => {
    const originalText = btn.textContent;
    const originalDisabled = btn.disabled;
    let showed = false;
    const timer = setTimeout(() => {
      showed = true;
      btn.disabled = true;
      btn.textContent = workingLabel;
    }, delayMs);

    try {
      return await onClick(...args);
    } finally {
      clearTimeout(timer);
      if (showed) {
        btn.textContent = originalText;
        btn.disabled = originalDisabled;
      }
    }
  };
}

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
  btn.onclick = withWorkingIndicator(btn, onClick);
  return btn;
}

/**
 * Create a compact icon-only button; `label` names the action as both its
 * tooltip and its accessible label, since the icon alone says nothing to a
 * screen reader.
 * @param {string} icon - The icon (emoji) shown on the button
 * @param {string} label - What the button does, e.g. "New Lesson"
 * @param {() => any} onClick - The click handler function
 * @returns {HTMLButtonElement} The created button element
 */
export function createIconButton(icon, label, onClick) {
  const btn = document.createElement("button");
  btn.textContent = icon;
  btn.title = label;
  btn.setAttribute("aria-label", label);
  btn.className = "schedule-icon-btn";
  // An hourglass, not the default "Working…" text, so a slow click doesn't
  // stretch the compact button and shove the row around.
  btn.onclick = withWorkingIndicator(btn, onClick, { workingLabel: "⏳" });
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
  btn.onclick = withWorkingIndicator(btn, onClick);
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
  btn.onclick = withWorkingIndicator(btn, () => insertFunction(dayIndex));
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
 * Read a Skip/Delay amount box: the magnitude of a whole number, falling
 * back to 1 for zero, blank, or non-numeric input.
 * @param {{value: string}} input
 * @returns {number}
 */
export function getShiftAmount(input) {
  const magnitude = Math.abs(parseInt(input.value, 10));
  return Number.isFinite(magnitude) && magnitude > 0 ? magnitude : 1;
}

export const SKIP_DELAY_HELP =
  "Delay: lessons move to later dates (e.g. after a snow day). Skip: lessons move to earlier dates, jumping ahead.";

/**
 * Create a "?" icon whose hover/focus tooltip shows `text` (CSS-only, see
 * .info-tooltip in style.css).
 * @param {string} text
 * @returns {HTMLSpanElement}
 */
export function createInfoTooltip(text) {
  const icon = document.createElement("span");
  icon.className = "info-tooltip";
  icon.textContent = "?";
  icon.tabIndex = 0;
  const tip = document.createElement("span");
  tip.className = "info-tooltip-text";
  tip.textContent = text;
  icon.appendChild(tip);
  return icon;
}

/**
 * Create the Skip / Delay Date Offset control: a label, an optional
 * "Current: N" badge, an optional "(Today is Day N)" indicator, a "?"
 * tooltip, an amount box (default 1), Skip and Delay buttons that apply
 * instantly, and an optional "Go to Today" button. Delay raises the Date
 * Offset by the amount, Skip lowers it. Has no data or notification
 * dependencies of its own - persistence, the today-index computation, and
 * any scroll behavior are all supplied by the caller, so the same control
 * serves the all-classes Bulk Offset Shift, each Class's Lesson Planning
 * pane, and the Full Schedule page.
 * @param {Object} config
 * @param {string} config.label - Text shown before the control
 * @param {number} [config.currentOffset] - The Class's current Date Offset; omit (e.g. for the all-classes shift) to show no badge
 * @param {(delta: number) => Promise<void>} config.onShift - Persist the signed change (+amount for Delay, -amount for Skip) and notify the user; the control updates its displays only if this resolves, and swallows a thrown failure since the caller already handled it
 * @param {() => Promise<number>} [config.computeTodayDayIndex] - If provided, "(Today is Day N)" is shown, refreshed on mount and after each shift
 * @param {() => void} [config.onGoToToday] - If provided, a "Go to Today" button is rendered
 * @returns {HTMLElement & {updateOffset: (offset: number) => Promise<void>}} The container element with an updateOffset method
 */
export function createDateOffsetControl({ label, currentOffset, onShift, computeTodayDayIndex, onGoToToday }) {
  const container = document.createElement("div");
  container.className = "date-offset-control";

  let offset = currentOffset;

  const labelEl = document.createElement("label");
  labelEl.textContent = label;
  container.appendChild(labelEl);

  const currentDisplay = document.createElement("span");
  currentDisplay.className = "current-offset-display";
  const renderCurrent = () => { currentDisplay.textContent = `Current: ${offset}`; };
  if (offset !== undefined) {
    renderCurrent();
    container.appendChild(currentDisplay);
  }

  const todayDisplay = document.createElement("span");
  todayDisplay.className = "today-dayindex-display";
  async function refreshTodayDisplay() {
    if (!computeTodayDayIndex) return;
    todayDisplay.textContent = `(Today is Day ${await computeTodayDayIndex()})`;
  }
  if (computeTodayDayIndex) {
    container.appendChild(todayDisplay);
    refreshTodayDisplay();
  }

  container.appendChild(createInfoTooltip(SKIP_DELAY_HELP));

  const amountInput = document.createElement("input");
  amountInput.type = "number";
  amountInput.className = "offset-shift-amount";
  amountInput.value = "1";
  amountInput.min = "1";
  amountInput.setAttribute("aria-label", "Number of days");
  container.appendChild(amountInput);

  const shiftButton = (text, sign, title) => {
    const btn = createStyledButton(text, async () => {
      const delta = sign * getShiftAmount(amountInput);
      try {
        await onShift(delta);
      } catch {
        return; // onShift is responsible for notifying the user of the failure
      }
      if (offset !== undefined) {
        offset += delta;
        renderCurrent();
      }
      await refreshTodayDisplay();
    });
    btn.title = title;
    return btn;
  };
  container.appendChild(shiftButton("Skip", -1, "Lessons move to earlier dates"));
  container.appendChild(shiftButton("Delay", 1, "Lessons move to later dates"));

  if (onGoToToday) {
    const goToTodayBtn = createStyledButton("Go to Today", onGoToToday);
    goToTodayBtn.className = "schedule-action-btn go-to-today-btn";
    container.appendChild(goToTodayBtn);
  }

  // Method to update the displayed offset (e.g. after switching classes)
  container.updateOffset = async (newOffset) => {
    offset = newOffset;
    renderCurrent();
    await refreshTodayDisplay();
  };

  return container;
}
