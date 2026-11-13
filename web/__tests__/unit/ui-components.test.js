import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createStyledButton,
  createIconButton,
  createCloseButton,
  createArrowButton,
  createInsertDayButton,
  createElement,
  createUpArrowButton,
  createDownArrowButton,
  createDateOffsetControl,
  getShiftAmount,
  withWorkingIndicator,
  savingSpinner,
} from '../../ui-components.js';
import { lineIcon } from '../../line-icons.js';

describe('ui-components', () => {
  let popup;

  beforeEach(() => {
    popup = document.createElement('div');
    document.body.appendChild(popup);
  });

  describe('createStyledButton', () => {
    it('should create a button with correct text and class', () => {
      const onClick = vi.fn();
      const button = createStyledButton('Test Button', onClick);
      
      expect(button.tagName).toBe('BUTTON');
      expect(button.textContent).toBe('Test Button');
      expect(button.className).toBe('schedule-action-btn');
    });

    it('should call onClick when clicked', () => {
      const onClick = vi.fn();
      const button = createStyledButton('Test', onClick);
      
      button.click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('createIconButton', () => {
    it('shows the icon, and names the action in a tooltip and an accessible label', () => {
      const button = createIconButton('➕', 'New Lesson', vi.fn());

      expect(button.textContent).toBe('➕');
      expect(button.title).toBe('New Lesson');
      expect(button.getAttribute('aria-label')).toBe('New Lesson');
    });

    it('runs its handler when clicked', () => {
      const onClick = vi.fn();
      createIconButton('🔗', 'Link Lesson', onClick).click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('can show a flat line icon instead of text', () => {
      const icon = lineIcon('link', 'line-icon');
      const button = createIconButton(icon, 'Link Lesson', vi.fn());

      expect(button.firstChild).toBe(icon);
      expect(button.textContent).toBe('');
      expect(button.getAttribute('aria-label')).toBe('Link Lesson');
    });

    it('shows the saving spinner in place of its icon while a slow change saves', async () => {
      vi.useFakeTimers();
      try {
        const icon = lineIcon('link', 'line-icon');
        let finish;
        const button = createIconButton(icon, 'Link Lesson', () => new Promise((r) => { finish = r; }));

        const done = button.onclick();
        await vi.advanceTimersByTimeAsync(1000);
        expect(button.querySelector('svg').getAttribute('class')).toBe('line-icon line-icon-spin');

        finish();
        await done;
        expect(button.firstChild).toBe(icon);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('savingSpinner', () => {
    it('is the flat spinner icon with the spinning class, a fresh element each time', () => {
      const spinner = savingSpinner();
      expect(spinner.getAttribute('class')).toBe('line-icon line-icon-spin');
      expect(spinner.innerHTML).toBe(lineIcon('spinner', 'x').innerHTML);
      expect(savingSpinner()).not.toBe(spinner);
    });
  });

  describe('createCloseButton', () => {
    it('should create button that removes popup when clicked', () => {
      const button = createCloseButton(popup);
      
      expect(button.textContent).toBe('Close');
      button.click();
      
      expect(document.body.contains(popup)).toBe(false);
    });
  });

  describe('createArrowButton', () => {
    it('should create left arrow button', () => {
      const onClick = vi.fn();
      const button = createArrowButton('left', false, onClick);
      
      expect(button.textContent).toBe('←');
      expect(button.disabled).toBe(false);
    });

    it('should create right arrow button', () => {
      const onClick = vi.fn();
      const button = createArrowButton('right', false, onClick);
      
      expect(button.textContent).toBe('→');
    });

    it('should disable button when isDisabled is true', () => {
      const onClick = vi.fn();
      const button = createArrowButton('left', true, onClick);
      
      expect(button.disabled).toBe(true);
    });

    it('should call onClick when clicked', () => {
      const onClick = vi.fn();
      const button = createArrowButton('left', false, onClick);
      
      button.click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('createInsertDayButton', () => {
    it('should create button with correct text', () => {
      const insertFn = vi.fn();
      const button = createInsertDayButton(5, insertFn);
      
      expect(button.textContent).toBe('+ Insert Day Here');
      expect(button.className).toBe('schedule-action-btn insert-day-btn');
    });

    it('should call insertFunction with dayIndex when clicked', () => {
      const insertFn = vi.fn();
      const button = createInsertDayButton(7, insertFn);
      
      button.click();
      expect(insertFn).toHaveBeenCalledWith(7);
    });
  });

  describe('createElement', () => {
    it('should create element with tag name', () => {
      const element = createElement('div');
      expect(element.tagName).toBe('DIV');
    });

    it('should apply className when provided', () => {
      const element = createElement('div', 'test-class');
      expect(element.className).toBe('test-class');
    });

    it('should set textContent when provided', () => {
      const element = createElement('p', '', 'Test text');
      expect(element.textContent).toBe('Test text');
    });

    it('should handle empty className and textContent', () => {
      const element = createElement('span');
      expect(element.className).toBe('');
      expect(element.textContent).toBe('');
    });
  });

  describe('createUpArrowButton', () => {
    it('should create button with up arrow', () => {
      const onClick = vi.fn();
      const button = createUpArrowButton(onClick);
      
      expect(button.textContent).toBe('↑');
      expect(button.style.width).toBe('auto');
    });
  });

  describe('createDownArrowButton', () => {
    it('should create button with down arrow', () => {
      const onClick = vi.fn();
      const button = createDownArrowButton(onClick);
      
      expect(button.textContent).toBe('↓');
      expect(button.style.width).toBe('auto');
    });
  });

  describe('getShiftAmount', () => {
    it('reads a positive whole amount', () => {
      expect(getShiftAmount({ value: '3' })).toBe(3);
    });

    it('uses the magnitude of a negative entry', () => {
      expect(getShiftAmount({ value: '-4' })).toBe(4);
    });

    it('falls back to 1 for zero or non-numeric input', () => {
      expect(getShiftAmount({ value: '0' })).toBe(1);
      expect(getShiftAmount({ value: 'abc' })).toBe(1);
    });
  });

  describe('createDateOffsetControl', () => {
    function makeControl(overrides = {}) {
      return createDateOffsetControl({
        label: 'Offset:',
        currentOffset: 5,
        onShift: vi.fn().mockResolvedValue(undefined),
        ...overrides,
      });
    }

    // Let any pending refreshTodayDisplay() microtasks settle
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const buttonTexts = (control) => [...control.querySelectorAll('button')].map((b) => b.textContent);
    const button = (control, text) => [...control.querySelectorAll('button')].find((b) => b.textContent === text);
    const amount = (control) => control.querySelector('input.offset-shift-amount');

    it('shows the label, the current offset, an amount box defaulting to 1, and Skip/Delay buttons', () => {
      const control = makeControl();

      expect(control.querySelector('label').textContent).toBe('Offset:');
      expect(control.querySelector('.current-offset-display').textContent).toBe('Current: 5');
      expect(amount(control).value).toBe('1');
      expect(buttonTexts(control)).toEqual(['Skip', 'Delay']);
    });

    it('explains Skip and Delay in a "?" tooltip', () => {
      const control = makeControl();
      const tip = control.querySelector('.info-tooltip');
      expect(tip.textContent).toContain('?');
      expect(tip.querySelector('.info-tooltip-text').textContent).toBe(
        'Delay: lessons move to later dates (e.g. after a snow day). Skip: lessons move to earlier dates, jumping ahead.'
      );
    });

    it('Delay raises the offset by the amount and updates the current offset', async () => {
      const onShift = vi.fn().mockResolvedValue(undefined);
      const control = makeControl({ onShift });

      amount(control).value = '3';
      button(control, 'Delay').click();
      await flush();

      expect(onShift).toHaveBeenCalledWith(3);
      expect(control.querySelector('.current-offset-display').textContent).toBe('Current: 8');
    });

    it('Skip lowers the offset by the amount', async () => {
      const onShift = vi.fn().mockResolvedValue(undefined);
      const control = makeControl({ onShift });

      amount(control).value = '2';
      button(control, 'Skip').click();
      await flush();

      expect(onShift).toHaveBeenCalledWith(-2);
      expect(control.querySelector('.current-offset-display').textContent).toBe('Current: 3');
    });

    it('leaves the current offset unchanged if onShift rejects', async () => {
      const onShift = vi.fn().mockRejectedValue(new Error('write failed'));
      const control = makeControl({ onShift });

      button(control, 'Delay').click();
      await flush();

      expect(onShift).toHaveBeenCalledWith(1);
      expect(control.querySelector('.current-offset-display').textContent).toBe('Current: 5');
    });

    it('omits the current offset when none is given (the all-classes shift)', async () => {
      const onShift = vi.fn().mockResolvedValue(undefined);
      const control = makeControl({ currentOffset: undefined, onShift });

      expect(control.querySelector('.current-offset-display')).toBeNull();
      button(control, 'Delay').click();
      await flush();
      expect(onShift).toHaveBeenCalledWith(1);
    });

    describe("today's Day Index", () => {
      it('is shown on mount and refreshed after a shift when computeTodayDayIndex is given', async () => {
        const computeTodayDayIndex = vi.fn().mockResolvedValueOnce(3).mockResolvedValue(4);
        const control = makeControl({ computeTodayDayIndex });
        await flush();
        expect(control.querySelector('.today-dayindex-display').textContent).toBe('(Today is Day 3)');

        button(control, 'Skip').click();
        await flush();
        expect(control.querySelector('.today-dayindex-display').textContent).toBe('(Today is Day 4)');
      });

      it('is not shown when computeTodayDayIndex is omitted', () => {
        const control = makeControl();
        expect(control.querySelector('.today-dayindex-display')).toBeNull();
      });
    });

    it('updateOffset refreshes the current offset and the today display', async () => {
      const computeTodayDayIndex = vi.fn().mockResolvedValueOnce(1).mockResolvedValue(12);
      const control = makeControl({ computeTodayDayIndex });
      await flush();

      await control.updateOffset(15);

      expect(control.querySelector('.current-offset-display').textContent).toBe('Current: 15');
      expect(control.querySelector('.today-dayindex-display').textContent).toBe('(Today is Day 12)');
    });

    it('later shifts build on an updateOffset value', async () => {
      const control = makeControl();
      await control.updateOffset(15);

      button(control, 'Delay').click();
      await flush();

      expect(control.querySelector('.current-offset-display').textContent).toBe('Current: 16');
    });

    it('should not render a "Go to Today" button when onGoToToday is omitted', () => {
      expect(buttonTexts(makeControl())).not.toContain('Go to Today');
    });

    it('should render and wire a "Go to Today" button when onGoToToday is provided', () => {
      const onGoToToday = vi.fn();
      const control = makeControl({ onGoToToday });

      button(control, 'Go to Today').click();
      expect(onGoToToday).toHaveBeenCalled();
    });
  });

  describe('withWorkingIndicator', () => {
    let btn;

    beforeEach(() => {
      btn = document.createElement('button');
      btn.textContent = 'Do Thing';
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('does not touch the button for an operation that finishes before the delay', async () => {
      const onClick = vi.fn().mockResolvedValue('result');
      const wrapped = withWorkingIndicator(btn, onClick, { delayMs: 1000 });

      const promise = wrapped();
      await Promise.resolve(); // let the microtask queue drain without advancing timers
      await promise;

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(btn.textContent).toBe('Do Thing');
      expect(btn.disabled).toBe(false);
    });

    it('disables the button and shows the working label once the delay elapses', async () => {
      let resolveOnClick;
      const onClick = vi.fn(() => new Promise((resolve) => { resolveOnClick = resolve; }));
      const wrapped = withWorkingIndicator(btn, onClick, { delayMs: 1000, workingLabel: 'Working…' });

      const promise = wrapped();
      await vi.advanceTimersByTimeAsync(1000);

      expect(btn.disabled).toBe(true);
      expect(btn.textContent).toBe('Working…');

      resolveOnClick();
      await promise;

      expect(btn.disabled).toBe(false);
      expect(btn.textContent).toBe('Do Thing');
    });

    it('restores the original text and disabled state even when onClick throws', async () => {
      let rejectOnClick;
      const onClick = vi.fn(() => new Promise((_, reject) => { rejectOnClick = reject; }));
      btn.disabled = false;
      const wrapped = withWorkingIndicator(btn, onClick, { delayMs: 1000 });

      const promise = wrapped();
      await vi.advanceTimersByTimeAsync(1000);
      expect(btn.disabled).toBe(true);

      rejectOnClick(new Error('boom'));
      await expect(promise).rejects.toThrow('boom');

      expect(btn.disabled).toBe(false);
      expect(btn.textContent).toBe('Do Thing');
    });

    it('can show an element as the working label, then puts the original contents back', async () => {
      const icon = lineIcon('trash', 'line-icon');
      btn.replaceChildren(icon);
      let resolveOnClick;
      const onClick = vi.fn(() => new Promise((resolve) => { resolveOnClick = resolve; }));
      const wrapped = withWorkingIndicator(btn, onClick, { workingLabel: savingSpinner });

      const promise = wrapped();
      await vi.advanceTimersByTimeAsync(1000);
      expect(btn.querySelector('svg').getAttribute('class')).toBe('line-icon line-icon-spin');

      resolveOnClick();
      await promise;
      expect([...btn.childNodes]).toEqual([icon]);
    });

    it('passes through arguments and the resolved value', async () => {
      const onClick = vi.fn(async (a, b) => a + b);
      const wrapped = withWorkingIndicator(btn, onClick);

      const result = await wrapped(2, 3);

      expect(onClick).toHaveBeenCalledWith(2, 3);
      expect(result).toBe(5);
    });
  });
});

