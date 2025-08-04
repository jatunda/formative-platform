// UI Component Helper Functions

// Use CSS classes for styled buttons
export function createStyledButton(text, onClick) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.className = "schedule-action-btn";
  btn.onclick = onClick;
  return btn;
}

// Button helper functions
export function createNewLessonButton(dayIndex, addLessonCallback) {
  const btn = document.createElement("button");
  btn.textContent = "+ New Lesson";
  btn.className = "schedule-action-btn new-lesson-btn";
  btn.onclick = () => addLessonCallback(dayIndex);
  return btn;
}

export function createCloseButton(popup) {
  const btn = document.createElement("button");
  btn.textContent = "Close";
  btn.className = "schedule-action-btn";
  btn.onclick = () => document.body.removeChild(popup);
  return btn;
}

export function createArrowButton(direction, isDisabled, onClick) {
  const btn = document.createElement("button");
  btn.textContent = direction === "left" ? "←" : "→";
  btn.className = "schedule-action-btn";
  btn.disabled = isDisabled;
  btn.onclick = onClick;
  return btn;
}

export function createDeleteButton(onClick) {
  const btn = document.createElement("button");
  btn.textContent = "🗑️";
  btn.className = "schedule-action-btn delete-btn";
  btn.onclick = onClick;
  return btn;
}

export function createInsertDayButton(dayIndex, insertFunction) {
  const btn = document.createElement("button");
  btn.textContent = "+ Insert Day Here";
  btn.className = "schedule-action-btn insert-day-btn";
  btn.onclick = () => insertFunction(dayIndex);
  return btn;
}

// Utility function to create DOM elements with classes
export function createElement(tag, className = "", textContent = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (textContent) element.textContent = textContent;
  return element;
}

// Create a button with up arrow (↑)
export function createUpArrowButton(onClick) {
  const btn = createArrowButton("up", false, onClick);
  btn.textContent = "↑";
  return btn;
}

// Create a button with down arrow (↓)
export function createDownArrowButton(onClick) {
  const btn = createArrowButton("down", false, onClick);
  btn.textContent = "↓";
  return btn;
}

// Create date offset control component
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
