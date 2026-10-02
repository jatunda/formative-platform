// The interactive MCQ widget shared by Practice Set delivery (practice-view.js)
// and Question Link embedding in Lessons/Pages (question-embed.js). Owns only
// the single-question Attempt/Outcome interaction (see CONTEXT.md's Attempt
// and Question Outcome entries) - it does not render a "Next" control or know
// anything about a Frontier/other questions. Advancing to a next question is
// entirely the caller's concern: practice-view.js shows its own Next button
// once onOutcome fires; an embedded single question in a Lesson/Page has
// nothing further to show at all.
import { renderContentItems } from './content-renderer.js';
import { celebrate, playCorrectSound } from './celebration.js';

// Enter-to-submit is handled at the document level, not on containerEl:
// every interaction re-renders the widget, which removes the focused radio
// from the DOM and drops focus to <body>, so a keydown listener on the
// container would never see the keypress. With several widgets on one page
// (multiple Question Links in a Lesson), only the one the student most
// recently created or interacted with responds.
let widgetCounter = 0;
let activeWidgetId = null;

const ENTER_IGNORED_TAGS = new Set(['BUTTON', 'A', 'TEXTAREA', 'SELECT']);

function isTypingOrActivating(target) {
  if (!target || !target.tagName) return false;
  if (ENTER_IGNORED_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  return target.tagName === 'INPUT' && target.type !== 'radio';
}

/**
 * Mount an interactive Question into containerEl.
 * @param {HTMLElement} containerEl
 * @param {{stem: Array, options: Array<{text: string, correct: boolean, explanation: string, mistakeCategory: string|null}>}} questionData
 * @param {{restoreState?: object, onOutcome?: (outcome: "firstTry"|"secondTry"|"missed") => void}} [options]
 * @returns {{getState: () => object, destroy: () => void}}
 */
export function renderQuestionWidget(containerEl, questionData, { restoreState, onOutcome } = {}) {
  widgetCounter += 1;
  const widgetId = widgetCounter;
  // Unique per widget so radios in two embedded Questions on the same page
  // don't share one browser radio group and uncheck each other.
  const radioName = `question-widget-option-${widgetId}`;
  activeWidgetId = widgetId;
  const state = restoreState
    ? { ...restoreState }
    : {
      selectedIndex: null,
      // Which option's wrong-Explanation is currently displayed, mid-retry
      // (before the question is finished). Distinct from selectedIndex: if
      // the student picks a *different* option after a wrong attempt but
      // hasn't resubmitted yet, the stale feedback for the old pick clears.
      lastSubmittedWrongIndex: null,
      attemptCount: 0,
      finished: false,
      outcome: null,
    };

  function selectOption(index) {
    if (state.finished) return;
    state.selectedIndex = index;
    // Picking a different option than the one just-submitted-wrong clears
    // its stale Explanation - that feedback belongs to a specific submitted
    // attempt, not to whatever happens to be selected right now.
    if (index !== state.lastSubmittedWrongIndex) {
      state.lastSubmittedWrongIndex = null;
    }
    render();
  }

  function submit() {
    if (state.finished || state.selectedIndex === null) return;
    const selected = questionData.options[state.selectedIndex];

    if (selected.correct) {
      state.finished = true;
      state.outcome = state.attemptCount === 0 ? "firstTry" : "secondTry";
      state.lastSubmittedWrongIndex = null;
      render();
      playCorrectSound();
      celebrate(containerEl.querySelector('.question-widget-option-correct'));
      if (onOutcome) onOutcome(state.outcome);
      return;
    }

    state.attemptCount += 1;
    if (state.attemptCount >= 2) {
      // Per CONTEXT.md's Attempt entry: the 2nd wrong Attempt auto-reveals
      // the correct Option and ends the question - it does not also show
      // this 2nd wrong pick's own Explanation first.
      state.finished = true;
      state.outcome = "missed";
      state.lastSubmittedWrongIndex = null;
      render();
      if (onOutcome) onOutcome(state.outcome);
    } else {
      state.lastSubmittedWrongIndex = state.selectedIndex;
      render();
    }
  }

  function handleKeydown(event) {
    if (event.key !== "Enter" || activeWidgetId !== widgetId) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (state.finished || state.selectedIndex === null) return;
    // Let a focused button/link/text field handle its own Enter natively.
    if (isTypingOrActivating(event.target)) return;
    event.preventDefault();
    submit();
  }

  function markActive() {
    activeWidgetId = widgetId;
  }

  function render() {
    // Re-rendering destroys the focused radio; remember whether focus was
    // inside this widget so it can be put back on the selected option, which
    // keeps arrow-key option switching working between renders.
    const hadFocus = containerEl.contains(document.activeElement);
    containerEl.innerHTML = "";

    const stemEl = document.createElement("div");
    stemEl.className = "question-widget-stem";
    renderContentItems(questionData.stem, stemEl);
    containerEl.appendChild(stemEl);

    const optionsEl = document.createElement("div");
    optionsEl.className = "question-widget-options";

    questionData.options.forEach((option, index) => {
      const row = document.createElement("div");
      row.className = "question-widget-option";

      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = radioName;
      input.checked = state.selectedIndex === index;
      input.disabled = state.finished;
      input.addEventListener("change", () => {
        markActive();
        selectOption(index);
      });

      label.appendChild(input);
      label.appendChild(document.createTextNode(option.text));
      row.appendChild(label);

      const isRevealedCorrect = state.finished && option.correct;
      const isMidRetryWrong = !state.finished && state.lastSubmittedWrongIndex === index;
      const isMissedWrongPick = state.finished && state.outcome === "missed" && index === state.selectedIndex && !option.correct;

      if (isRevealedCorrect || isMidRetryWrong) {
        row.classList.add(isRevealedCorrect ? "question-widget-option-correct" : "question-widget-option-wrong");
        const explanation = document.createElement("p");
        explanation.className = "question-widget-explanation";
        explanation.textContent = option.explanation;
        row.appendChild(explanation);
      } else if (isMissedWrongPick) {
        row.classList.add("question-widget-option-wrong");
      }

      optionsEl.appendChild(row);
    });

    containerEl.appendChild(optionsEl);

    // Stays mounted (grayed out via :disabled) rather than disappearing once
    // finished, so the transition to Next reads as "this control is now
    // done" instead of an abrupt layout jump.
    const submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.className = "primary-action-btn question-widget-submit";
    submitBtn.append("Submit ");
    const hint = document.createElement("kbd");
    hint.className = "key-hint";
    hint.textContent = "Enter ↵";
    submitBtn.appendChild(hint);
    submitBtn.title = "Submit (shortcut: Enter)";
    submitBtn.disabled = state.finished || state.selectedIndex === null;
    submitBtn.onclick = submit;
    containerEl.appendChild(submitBtn);

    if (hadFocus) {
      const radios = containerEl.querySelectorAll('input[type="radio"]');
      const toFocus = radios[state.selectedIndex];
      if (toFocus && !toFocus.disabled) toFocus.focus();
    }
  }

  document.addEventListener("keydown", handleKeydown);
  containerEl.addEventListener("pointerdown", markActive);
  containerEl.addEventListener("focusin", markActive);
  render();

  return {
    getState: () => ({ ...state }),
    destroy: () => {
      document.removeEventListener("keydown", handleKeydown);
      containerEl.removeEventListener("pointerdown", markActive);
      containerEl.removeEventListener("focusin", markActive);
      if (activeWidgetId === widgetId) activeWidgetId = null;
      containerEl.innerHTML = "";
    },
  };
}
