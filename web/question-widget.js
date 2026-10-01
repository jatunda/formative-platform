// The interactive MCQ widget shared by Practice Set delivery (practice-view.js)
// and Question Link embedding in Lessons/Pages (question-embed.js). Owns only
// the single-question Attempt/Outcome interaction (see CONTEXT.md's Attempt
// and Question Outcome entries) - it does not render a "Next" control or know
// anything about a Frontier/other questions. Advancing to a next question is
// entirely the caller's concern: practice-view.js shows its own Next button
// once onOutcome fires; an embedded single question in a Lesson/Page has
// nothing further to show at all.
import { renderContentItems } from './content-renderer.js';

/**
 * Mount an interactive Question into containerEl.
 * @param {HTMLElement} containerEl
 * @param {{stem: Array, options: Array<{text: string, correct: boolean, explanation: string, mistakeCategory: string|null}>}} questionData
 * @param {{restoreState?: object, onOutcome?: (outcome: "firstTry"|"secondTry"|"missed") => void}} [options]
 * @returns {{getState: () => object, destroy: () => void}}
 */
export function renderQuestionWidget(containerEl, questionData, { restoreState, onOutcome } = {}) {
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
    if (event.key === "Enter") submit();
  }

  function render() {
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
      input.name = "question-widget-option";
      input.checked = state.selectedIndex === index;
      input.disabled = state.finished;
      input.addEventListener("change", () => selectOption(index));

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

    if (!state.finished) {
      const submitBtn = document.createElement("button");
      submitBtn.type = "button";
      submitBtn.className = "schedule-action-btn question-widget-submit";
      submitBtn.textContent = "Submit";
      submitBtn.disabled = state.selectedIndex === null;
      submitBtn.onclick = submit;
      containerEl.appendChild(submitBtn);
    }
  }

  containerEl.addEventListener("keydown", handleKeydown);
  render();

  return {
    getState: () => ({ ...state }),
    destroy: () => {
      containerEl.removeEventListener("keydown", handleKeydown);
      containerEl.innerHTML = "";
    },
  };
}
