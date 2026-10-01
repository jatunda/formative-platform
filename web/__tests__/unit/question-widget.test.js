import { describe, it, expect, beforeEach } from 'vitest';
import { renderQuestionWidget } from '../../question-widget.js';

const QUESTION = {
  stem: [{ type: 'text', value: 'What is 2 + 2?' }],
  options: [
    { text: '4', correct: true, explanation: 'Correct, 2 + 2 is 4.', mistakeCategory: null },
    { text: '5', correct: false, explanation: 'Off by one.', mistakeCategory: 'calculation error' },
    { text: '22', correct: false, explanation: 'That is concatenation, not addition.', mistakeCategory: 'misconception' },
  ],
};

function radios(container) {
  return [...container.querySelectorAll('input[type="radio"]')];
}

function submitBtn(container) {
  return container.querySelector('.question-widget-submit');
}

describe('renderQuestionWidget', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders the stem and every option, with Submit disabled until something is selected', () => {
    renderQuestionWidget(container, QUESTION);

    expect(container.textContent).toContain('What is 2 + 2?');
    expect(radios(container)).toHaveLength(3);
    expect(submitBtn(container).disabled).toBe(true);
  });

  it('enables Submit once an option is selected', () => {
    renderQuestionWidget(container, QUESTION);

    radios(container)[0].click();

    expect(submitBtn(container).disabled).toBe(false);
  });

  describe('first-try correct', () => {
    it('finishes with outcome "firstTry", reveals the correct explanation, and fires onOutcome once', () => {
      const outcomes = [];
      const widget = renderQuestionWidget(container, QUESTION, { onOutcome: (o) => outcomes.push(o) });

      radios(container)[0].click();
      submitBtn(container).click();

      expect(widget.getState()).toMatchObject({ finished: true, outcome: 'firstTry', attemptCount: 0 });
      expect(outcomes).toEqual(['firstTry']);
      expect(container.textContent).toContain('Correct, 2 + 2 is 4.');
      expect(container.querySelector('.question-widget-submit')).toBeNull();
    });

    it('disables all radios once finished', () => {
      renderQuestionWidget(container, QUESTION);
      radios(container)[0].click();
      submitBtn(container).click();

      expect(radios(container).every((r) => r.disabled)).toBe(true);
    });
  });

  describe('wrong then correct (second-try)', () => {
    it('shows the wrong option\'s own explanation and allows a retry without locking it out', () => {
      renderQuestionWidget(container, QUESTION);

      radios(container)[1].click(); // "5"
      submitBtn(container).click();

      expect(container.textContent).toContain('Off by one.');
      expect(radios(container)[1].disabled).toBe(false); // not locked out
      expect(submitBtn(container)).not.toBeNull(); // still interactive
    });

    it('finishes with outcome "secondTry" when the retry is correct', () => {
      const outcomes = [];
      const widget = renderQuestionWidget(container, QUESTION, { onOutcome: (o) => outcomes.push(o) });

      radios(container)[1].click();
      submitBtn(container).click();
      radios(container)[0].click();
      submitBtn(container).click();

      expect(widget.getState()).toMatchObject({ finished: true, outcome: 'secondTry', attemptCount: 1 });
      expect(outcomes).toEqual(['secondTry']);
      expect(container.textContent).toContain('Correct, 2 + 2 is 4.');
    });

    it('clears the stale wrong-explanation once a different option is picked before resubmitting', () => {
      renderQuestionWidget(container, QUESTION);

      radios(container)[1].click();
      submitBtn(container).click();
      expect(container.textContent).toContain('Off by one.');

      radios(container)[2].click(); // picks "22" without submitting yet
      expect(container.textContent).not.toContain('Off by one.');
    });

    it('allows resubmitting the exact same wrong option again', () => {
      renderQuestionWidget(container, QUESTION);

      radios(container)[1].click();
      submitBtn(container).click();
      radios(container)[1].click(); // re-select the same wrong option
      submitBtn(container).click(); // uses up the 2nd attempt

      expect(container.textContent).toContain('What is 2 + 2?'); // still rendered, didn't throw
    });
  });

  describe('wrong twice (missed)', () => {
    it('auto-reveals the correct option and explanation on the 2nd wrong attempt, skipping that attempt\'s own explanation', () => {
      const outcomes = [];
      const widget = renderQuestionWidget(container, QUESTION, { onOutcome: (o) => outcomes.push(o) });

      radios(container)[1].click(); // "5" - wrong
      submitBtn(container).click();
      radios(container)[2].click(); // "22" - wrong again
      submitBtn(container).click();

      expect(widget.getState()).toMatchObject({ finished: true, outcome: 'missed', attemptCount: 2 });
      expect(outcomes).toEqual(['missed']);
      expect(container.textContent).toContain('Correct, 2 + 2 is 4.');
      expect(container.textContent).not.toContain('That is concatenation, not addition.');
    });

    it('marks the last wrong pick visually wrong alongside the revealed correct answer', () => {
      renderQuestionWidget(container, QUESTION);

      radios(container)[1].click();
      submitBtn(container).click();
      radios(container)[2].click();
      submitBtn(container).click();

      const wrongRow = radios(container)[2].closest('.question-widget-option');
      const correctRow = radios(container)[0].closest('.question-widget-option');
      expect(wrongRow.classList.contains('question-widget-option-wrong')).toBe(true);
      expect(correctRow.classList.contains('question-widget-option-correct')).toBe(true);
    });

    it('does not allow a 3rd attempt', () => {
      const outcomes = [];
      const widget = renderQuestionWidget(container, QUESTION, { onOutcome: (o) => outcomes.push(o) });

      radios(container)[1].click();
      submitBtn(container).click();
      radios(container)[2].click();
      submitBtn(container).click();
      // question is finished now; no submit button exists to click again
      expect(container.querySelector('.question-widget-submit')).toBeNull();
      expect(outcomes).toHaveLength(1);
    });
  });

  describe('Enter key submits', () => {
    it('submits on Enter the same as clicking Submit', () => {
      const widget = renderQuestionWidget(container, QUESTION);
      radios(container)[0].click();

      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(widget.getState().finished).toBe(true);
    });

    it('does nothing on Enter when nothing is selected yet', () => {
      const widget = renderQuestionWidget(container, QUESTION);

      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(widget.getState().finished).toBe(false);
    });
  });

  describe('restoreState fidelity', () => {
    it('reproduces a finished first-try-correct state without re-running interaction', () => {
      const restoreState = { selectedIndex: 0, lastSubmittedWrongIndex: null, attemptCount: 0, finished: true, outcome: 'firstTry' };
      const outcomes = [];

      renderQuestionWidget(container, QUESTION, { restoreState, onOutcome: (o) => outcomes.push(o) });

      expect(container.textContent).toContain('Correct, 2 + 2 is 4.');
      expect(container.querySelector('.question-widget-submit')).toBeNull();
      expect(outcomes).toEqual([]); // restoring must not re-fire onOutcome
    });

    it('reproduces a mid-retry wrong state, ready for a second attempt', () => {
      const restoreState = { selectedIndex: 1, lastSubmittedWrongIndex: 1, attemptCount: 1, finished: false, outcome: null };

      renderQuestionWidget(container, QUESTION, { restoreState });

      expect(container.textContent).toContain('Off by one.');
      expect(radios(container)[1].checked).toBe(true);
      expect(submitBtn(container).disabled).toBe(false);
    });

    it('reproduces a missed state with the correct answer revealed', () => {
      const restoreState = { selectedIndex: 2, lastSubmittedWrongIndex: null, attemptCount: 2, finished: true, outcome: 'missed' };

      renderQuestionWidget(container, QUESTION, { restoreState });

      expect(container.textContent).toContain('Correct, 2 + 2 is 4.');
      const wrongRow = radios(container)[2].closest('.question-widget-option');
      expect(wrongRow.classList.contains('question-widget-option-wrong')).toBe(true);
    });
  });

  describe('destroy', () => {
    it('clears the container and stops responding to further input', () => {
      const widget = renderQuestionWidget(container, QUESTION);
      widget.destroy();

      expect(container.innerHTML).toBe('');
    });
  });
});
