import { describe, it, expect, beforeEach, vi } from 'vitest';
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
      expect(submitBtn(container).disabled).toBe(true);
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

    it('keeps showing the wrong explanation after a different option is picked, before resubmitting', () => {
      renderQuestionWidget(container, QUESTION);

      radios(container)[1].click();
      submitBtn(container).click();
      expect(container.textContent).toContain('Off by one.');

      radios(container)[2].click(); // picks "22" without submitting yet
      expect(container.textContent).toContain('Off by one.');

      const wrongRow = radios(container)[1].closest('.question-widget-option');
      expect(wrongRow.classList.contains('question-widget-option-wrong')).toBe(true);
      expect(radios(container)[2].checked).toBe(true); // the new pick is still selected
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
      renderQuestionWidget(container, QUESTION, { onOutcome: (o) => outcomes.push(o) });

      radios(container)[1].click();
      submitBtn(container).click();
      radios(container)[2].click();
      submitBtn(container).click();
      // question is finished now; Submit stays visible but grayed out/disabled
      expect(submitBtn(container).disabled).toBe(true);
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

    it('submits on Enter even after focus has dropped to <body> (re-render removed the focused radio)', () => {
      const widget = renderQuestionWidget(container, QUESTION);
      radios(container)[0].click();

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(widget.getState().finished).toBe(true);
    });

    it('only the most recently used widget responds when several are on the page', () => {
      const other = document.createElement('div');
      document.body.appendChild(other);
      const first = renderQuestionWidget(container, QUESTION);
      const second = renderQuestionWidget(other, QUESTION);

      radios(container)[0].click(); // interacting with the first makes it active
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(first.getState().finished).toBe(true);
      expect(second.getState().finished).toBe(false);
    });

    it('ignores Enter aimed at a focused button (lets the button handle it)', () => {
      const widget = renderQuestionWidget(container, QUESTION);
      radios(container)[0].click();
      const otherButton = document.createElement('button');
      document.body.appendChild(otherButton);

      otherButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(widget.getState().finished).toBe(false);
    });

    it('ignores Enter aimed at a focused text input (lets it handle its own Enter)', () => {
      const widget = renderQuestionWidget(container, QUESTION);
      radios(container)[0].click();
      const textInput = document.createElement('input');
      textInput.type = 'text';
      document.body.appendChild(textInput);

      textInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(widget.getState().finished).toBe(false);
    });

    it('ignores Enter held with a modifier key (e.g. Ctrl+Enter)', () => {
      const widget = renderQuestionWidget(container, QUESTION);
      radios(container)[0].click();

      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));

      expect(widget.getState().finished).toBe(false);
    });

    it('stops listening after destroy', () => {
      const widget = renderQuestionWidget(container, QUESTION);
      radios(container)[0].click();
      const stateBefore = widget.getState();
      widget.destroy();

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(stateBefore.finished).toBe(false);
      expect(container.innerHTML).toBe('');
    });

    it('advertises the Enter shortcut on the Submit button', () => {
      renderQuestionWidget(container, QUESTION);
      expect(submitBtn(container).textContent).toContain('Enter');
    });

    it('does nothing on Enter when nothing is selected yet', () => {
      const widget = renderQuestionWidget(container, QUESTION);

      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(widget.getState().finished).toBe(false);
    });
  });

  it('gives each widget its own radio group so embedded questions do not uncheck each other', () => {
    const other = document.createElement('div');
    document.body.appendChild(other);
    renderQuestionWidget(container, QUESTION);
    renderQuestionWidget(other, QUESTION);

    expect(radios(container)[0].name).not.toBe(radios(other)[0].name);
  });

  it('adds the celebration effect to the correct option on a correct answer', () => {
    renderQuestionWidget(container, QUESTION);
    radios(container)[0].click();
    submitBtn(container).click();

    const correctRow = radios(container)[0].closest('.question-widget-option');
    expect(correctRow.classList.contains('question-widget-celebrate')).toBe(true);
  });

  it('does not celebrate a missed question', () => {
    renderQuestionWidget(container, QUESTION);
    radios(container)[1].click();
    submitBtn(container).click();
    radios(container)[2].click();
    submitBtn(container).click();

    expect(container.querySelector('.question-widget-celebrate')).toBeNull();
  });

  describe('restoreState fidelity', () => {
    it('reproduces a finished first-try-correct state without re-running interaction', () => {
      const restoreState = { selectedIndex: 0, lastSubmittedWrongIndex: null, attemptCount: 0, finished: true, outcome: 'firstTry' };
      const outcomes = [];

      renderQuestionWidget(container, QUESTION, { restoreState, onOutcome: (o) => outcomes.push(o) });

      expect(container.textContent).toContain('Correct, 2 + 2 is 4.');
      expect(submitBtn(container).disabled).toBe(true);
      expect(outcomes).toEqual([]); // restoring must not re-fire onOutcome
    });

    it('reproduces a mid-retry wrong state, ready for a second attempt', () => {
      const restoreState = { selectedIndex: 1, lastSubmittedWrongIndex: 1, attemptCount: 1, finished: false, outcome: null };

      renderQuestionWidget(container, QUESTION, { restoreState });

      expect(container.textContent).toContain('Off by one.');
      expect(radios(container)[1].checked).toBe(true);
      expect(submitBtn(container).disabled).toBe(false);
    });

    it('restores a finished Question silently: no celebration, no sound, no focus taken', () => {
      const AudioContext = vi.fn();
      window.AudioContext = AudioContext;
      const elsewhere = document.createElement('button');
      document.body.appendChild(elsewhere);
      elsewhere.focus();
      const restoreState = { selectedIndex: 0, lastSubmittedWrongIndex: null, attemptCount: 0, finished: true, outcome: 'firstTry' };

      try {
        renderQuestionWidget(container, QUESTION, { restoreState, autoFocus: true });
      } finally {
        delete window.AudioContext;
      }

      expect(container.querySelector('.question-widget-celebrate')).toBeNull();
      expect(AudioContext).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(elsewhere);
    });

    it('drops a saved pick that no longer points at an Option (the Question was edited)', () => {
      const restoreState = { selectedIndex: 7, lastSubmittedWrongIndex: 7, attemptCount: 1, finished: false, outcome: null };
      const widget = renderQuestionWidget(container, QUESTION, { restoreState });

      expect(submitBtn(container).disabled).toBe(true);
      container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(widget.getState()).toMatchObject({ selectedIndex: null, lastSubmittedWrongIndex: null, attemptCount: 1 });
    });

    it('reports every state change (a pick and a submit) to onStateChange', () => {
      const changes = [];
      renderQuestionWidget(container, QUESTION, { onStateChange: (s) => changes.push(s) });

      radios(container)[1].click();
      submitBtn(container).click();

      expect(changes).toEqual([
        { selectedIndex: 1, lastSubmittedWrongIndex: null, attemptCount: 0, finished: false, outcome: null },
        { selectedIndex: 1, lastSubmittedWrongIndex: 1, attemptCount: 1, finished: false, outcome: null },
      ]);
    });

    it('reproduces a missed state with the correct answer revealed', () => {
      const restoreState = { selectedIndex: 2, lastSubmittedWrongIndex: null, attemptCount: 2, finished: true, outcome: 'missed' };

      renderQuestionWidget(container, QUESTION, { restoreState });

      expect(container.textContent).toContain('Correct, 2 + 2 is 4.');
      const wrongRow = radios(container)[2].closest('.question-widget-option');
      expect(wrongRow.classList.contains('question-widget-option-wrong')).toBe(true);
    });
  });

  it('keeps Submit visible but grayed out once finished, rather than removing it (an embedded Question Link)', () => {
    renderQuestionWidget(container, QUESTION);
    radios(container)[0].click();
    submitBtn(container).click();

    const btn = submitBtn(container);
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(true);
  });

  describe('nextButton option (Practice Set delivery)', () => {
    function callerNext() {
      const btn = document.createElement('button');
      btn.className = 'caller-next';
      return btn;
    }

    it("puts the caller's Next in Submit's slot once finished, removing Submit", () => {
      const next = callerNext();
      renderQuestionWidget(container, QUESTION, { nextButton: next });
      radios(container)[0].click();
      expect(submitBtn(container)).not.toBeNull();
      expect(container.contains(next)).toBe(false);

      submitBtn(container).click();

      expect(submitBtn(container)).toBeNull();
      expect(container.querySelector('.question-widget-options').nextElementSibling).toBe(next);
    });

    it("shows the caller's Next, not Submit, when restoring an already-finished Question", () => {
      const next = callerNext();
      renderQuestionWidget(container, QUESTION, {
        nextButton: next,
        restoreState: { selectedIndex: 0, lastSubmittedWrongIndex: null, attemptCount: 0, finished: true, outcome: 'firstTry' },
      });

      expect(submitBtn(container)).toBeNull();
      expect(container.querySelector('.question-widget-options').nextElementSibling).toBe(next);
    });
  });

  it('shows an Option with no Explanation as an empty Explanation instead of failing', () => {
    const question = {
      ...QUESTION,
      options: QUESTION.options.map(({ explanation: _unused, ...option }) => option),
    };
    renderQuestionWidget(container, question);
    const correctIndex = question.options.findIndex((o) => o.correct);
    radios(container)[correctIndex].click();

    expect(() => submitBtn(container).click()).not.toThrow();
    expect(container.querySelector('.question-widget-explanation').textContent).toBe('');
  });

  it('ignores a change event on an option once finished (defensive no-op against synthetic events)', () => {
    const widget = renderQuestionWidget(container, QUESTION);
    radios(container)[0].click();
    submitBtn(container).click(); // finishes, firstTry correct
    const stateBefore = widget.getState();

    radios(container)[1].dispatchEvent(new Event('change', { bubbles: true }));

    expect(widget.getState()).toEqual(stateBefore);
  });

  describe('autoFocus option', () => {
    it('focuses the first option on mount when autoFocus is set', () => {
      renderQuestionWidget(container, QUESTION, { autoFocus: true });

      expect(document.activeElement).toBe(radios(container)[0]);
    });

    it('does not focus anything on mount by default (e.g. embedded Questions in a Lesson)', () => {
      renderQuestionWidget(container, QUESTION);

      expect(document.activeElement).not.toBe(radios(container)[0]);
    });

    it('focuses the restored selection instead of the first option, when restoring a mid-retry state', () => {
      const restoreState = { selectedIndex: 1, lastSubmittedWrongIndex: 1, attemptCount: 1, finished: false, outcome: null };

      renderQuestionWidget(container, QUESTION, { restoreState, autoFocus: true });

      expect(document.activeElement).toBe(radios(container)[1]);
    });

    it('does not focus a disabled radio when restoring an already-finished state', () => {
      const restoreState = { selectedIndex: 0, lastSubmittedWrongIndex: null, attemptCount: 0, finished: true, outcome: 'firstTry' };

      renderQuestionWidget(container, QUESTION, { restoreState, autoFocus: true });

      expect(document.activeElement).not.toBe(radios(container)[0]);
    });
  });

  describe('focus retention across re-renders', () => {
    it('moves focus onto the newly selected radio when focus was already inside the widget', () => {
      renderQuestionWidget(container, QUESTION);
      const radio = radios(container)[0];
      radio.checked = true;
      radio.focus();
      radio.dispatchEvent(new Event('change', { bubbles: true }));

      expect(document.activeElement).toBe(radios(container)[0]);
    });

    it('does not pull focus into the widget on re-render when focus was elsewhere', () => {
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      renderQuestionWidget(container, QUESTION);
      outside.focus();

      const radio = radios(container)[0];
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));

      expect(document.activeElement).toBe(outside);
    });

    it('does not refocus a radio that becomes disabled by the render triggered by finishing', () => {
      renderQuestionWidget(container, QUESTION);
      radios(container)[0].click();
      radios(container)[0].focus();

      submitBtn(container).click(); // finishes; re-render disables all radios

      expect(document.activeElement).not.toBe(radios(container)[0]);
    });
  });

  describe('inline formatting in Options and Explanations', () => {
    const STYLED = {
      stem: [{ type: 'text', value: 'Which line prints hi?' }],
      options: [
        {
          text: 'Use `print("hi")`, **bold**, *italic*, [docs](https://example.com)',
          correct: true,
          explanation: 'Right: `print` writes **output**, *see* [docs](https://example.com).',
          mistakeCategory: null,
        },
        {
          text: '`x < y && y > "z"`',
          correct: false,
          explanation: 'No: `echo` is **shell**, *not* [Python](https://python.org).',
          mistakeCategory: 'misconception',
        },
      ],
    };

    function optionLabel(index) {
      return container.querySelectorAll('.question-widget-option label')[index];
    }

    it('renders inline code, bold, italic and a link in an Option', () => {
      renderQuestionWidget(container, STYLED);
      const label = optionLabel(0);

      expect(label.querySelector('code').textContent).toBe('print("hi")');
      expect(label.querySelector('strong').textContent).toBe('bold');
      expect(label.querySelector('em').textContent).toBe('italic');
      const link = label.querySelector('a');
      expect(link.textContent).toBe('docs');
      expect(link.getAttribute('href')).toBe('https://example.com');
      expect(label.textContent).not.toContain('`');
      expect(label.textContent).not.toContain('**');
    });

    it('keeps <, >, & and " in Option text escaped, as literal characters', () => {
      renderQuestionWidget(container, STYLED);
      const code = optionLabel(1).querySelector('code');

      expect(code.textContent).toBe('x < y && y > "z"');
      expect(code.children).toHaveLength(0);
    });

    it('still selects a formatted Option by clicking its label text', () => {
      renderQuestionWidget(container, STYLED);

      optionLabel(0).querySelector('strong').click();

      expect(radios(container)[0].checked).toBe(true);
      expect(submitBtn(container).disabled).toBe(false);
    });

    it('formats a mid-retry wrong Explanation', () => {
      renderQuestionWidget(container, STYLED);
      radios(container)[1].click();
      submitBtn(container).click();
      const explanation = container.querySelector('.question-widget-explanation');

      expect(explanation.querySelector('code').textContent).toBe('echo');
      expect(explanation.querySelector('strong').textContent).toBe('shell');
      expect(explanation.querySelector('em').textContent).toBe('not');
      expect(explanation.querySelector('a').getAttribute('href')).toBe('https://python.org');
    });

    it('formats the revealed correct Explanation', () => {
      renderQuestionWidget(container, STYLED);
      radios(container)[0].click();
      submitBtn(container).click();
      const explanation = container.querySelector('.question-widget-explanation');

      expect(explanation.querySelector('code').textContent).toBe('print');
      expect(explanation.querySelector('strong').textContent).toBe('output');
      expect(explanation.querySelector('em').textContent).toBe('see');
      expect(explanation.querySelector('a').textContent).toBe('docs');
    });
  });

  describe('whole Option box selects', () => {
    function boxes(c) {
      return [...c.querySelectorAll('.question-widget-option')];
    }

    it('selects an Option when its box is clicked outside the label, and focuses its radio', () => {
      const widget = renderQuestionWidget(container, QUESTION);

      boxes(container)[2].click();

      expect(widget.getState().selectedIndex).toBe(2);
      expect(radios(container)[2].checked).toBe(true);
      expect(document.activeElement).toBe(radios(container)[2]);
    });

    it('selects an Option when its showing Explanation is clicked', () => {
      const widget = renderQuestionWidget(container, QUESTION);
      radios(container)[1].click();
      submitBtn(container).click(); // wrong: "Off by one." shows on Option 1
      radios(container)[2].click(); // compare against another Option

      container.querySelector('.question-widget-explanation').click();

      expect(widget.getState().selectedIndex).toBe(1);
      expect(document.activeElement).toBe(radios(container)[1]);
    });

    it('leaves a click on a link inside an Explanation to the link', () => {
      const question = {
        stem: QUESTION.stem,
        options: [
          QUESTION.options[0],
          { ...QUESTION.options[1], explanation: 'See [docs](https://example.com).' },
        ],
      };
      const widget = renderQuestionWidget(container, question);
      radios(container)[1].click();
      submitBtn(container).click();
      radios(container)[0].click();

      container.querySelector('.question-widget-explanation a').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(widget.getState().selectedIndex).toBe(0);
    });

    it('selects once (no double state change) when the label itself is clicked', () => {
      const states = [];
      renderQuestionWidget(container, QUESTION, { onStateChange: (s) => states.push(s) });

      container.querySelectorAll('.question-widget-option-text')[1].click();

      expect(states).toHaveLength(1);
      expect(states[0].selectedIndex).toBe(1);
    });

    it('does not change the selection once the Question is finished', () => {
      const widget = renderQuestionWidget(container, QUESTION);
      radios(container)[0].click();
      submitBtn(container).click();
      const before = widget.getState();

      boxes(container)[2].click();
      container.querySelector('.question-widget-explanation').click();

      expect(widget.getState()).toEqual(before);
    });

    it('marks the selected Option box, following the selection', () => {
      renderQuestionWidget(container, QUESTION);
      const selected = () => boxes(container).map((b) => b.classList.contains('question-widget-option-selected'));
      expect(selected()).toEqual([false, false, false]);

      boxes(container)[1].click();
      expect(selected()).toEqual([false, true, false]);

      radios(container)[2].click();
      expect(selected()).toEqual([false, false, true]);
    });

    it('marks the widget as answering until finished (drives the pointer cursor and hover)', () => {
      renderQuestionWidget(container, QUESTION);
      const options = () => container.querySelector('.question-widget-options');
      expect(options().classList.contains('question-widget-options-answering')).toBe(true);

      radios(container)[0].click();
      submitBtn(container).click();

      expect(options().classList.contains('question-widget-options-answering')).toBe(false);
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
