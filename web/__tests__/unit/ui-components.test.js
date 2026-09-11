import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createStyledButton,
  createNewLessonButton,
  createCloseButton,
  createArrowButton,
  createDeleteButton,
  createInsertDayButton,
  createElement,
  createUpArrowButton,
  createDownArrowButton,
  createLeftArrowButton,
  createRightArrowButton,
  createDateOffsetControl,
} from '../../ui-components.js';

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

  describe('createNewLessonButton', () => {
    it('should create button with correct text and class', () => {
      const callback = vi.fn();
      const button = createNewLessonButton(5, callback);
      
      expect(button.textContent).toBe('New Lesson');
      expect(button.className).toBe('schedule-action-btn new-lesson-btn');
    });

    it('should call callback with dayIndex when clicked', () => {
      const callback = vi.fn();
      const button = createNewLessonButton(3, callback);
      
      button.click();
      expect(callback).toHaveBeenCalledWith(3);
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

  describe('createDeleteButton', () => {
    it('should create button with trash icon', () => {
      const onClick = vi.fn();
      const button = createDeleteButton(onClick);
      
      expect(button.textContent).toBe('🗑️');
      expect(button.className).toBe('schedule-action-btn delete-btn');
    });

    it('should call onClick when clicked', () => {
      const onClick = vi.fn();
      const button = createDeleteButton(onClick);
      
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

  describe('createLeftArrowButton', () => {
    it('should create button with left arrow and respect disabled state', () => {
      const onClick = vi.fn();
      const button = createLeftArrowButton(true, onClick);
      
      expect(button.textContent).toBe('←');
      expect(button.disabled).toBe(true);
      expect(button.style.width).toBe('auto');
    });
  });

  describe('createRightArrowButton', () => {
    it('should create button with right arrow and respect disabled state', () => {
      const onClick = vi.fn();
      const button = createRightArrowButton(false, onClick);
      
      expect(button.textContent).toBe('→');
      expect(button.disabled).toBe(false);
      expect(button.style.width).toBe('auto');
    });
  });

  describe('createDateOffsetControl', () => {
    function makeControl(overrides = {}) {
      return createDateOffsetControl({
        currentOffset: 5,
        onApply: vi.fn().mockResolvedValue(undefined),
        computeTodayDayIndex: vi.fn().mockResolvedValue(12),
        ...overrides,
      });
    }

    // Let any pending refreshTodayDisplay() microtasks settle
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    it('should create control with label, current-offset badge, input, and Apply button', () => {
      const control = makeControl();

      expect(control.querySelector('label')).toBeTruthy();
      expect(control.querySelector('.current-offset-display').textContent).toBe('Current: 5');
      expect(control.querySelector('input[type="number"]')).toBeTruthy();
      expect(control.querySelector('button').textContent).toBe('Apply');
    });

    it('should set initial value in input', () => {
      const control = makeControl({ currentOffset: 10 });
      const input = control.querySelector('input');
      expect(input.value).toBe('10');
    });

    it("should show today's Day Index from computeTodayDayIndex on mount", async () => {
      const control = makeControl({ computeTodayDayIndex: vi.fn().mockResolvedValue(3) });
      await flush();
      expect(control.querySelector('.today-dayindex-display').textContent).toBe('(Today is Day 3)');
    });

    it('should call onApply with the parsed input value when Apply is clicked, and update the display on success', async () => {
      const onApply = vi.fn().mockResolvedValue(undefined);
      const control = makeControl({ onApply, computeTodayDayIndex: vi.fn().mockResolvedValue(9) });
      await flush();

      control.querySelector('input').value = '7';
      control.querySelector('button').click();
      await flush();

      expect(onApply).toHaveBeenCalledWith(7);
      expect(control.querySelector('.current-offset-display').textContent).toBe('Current: 7');
      expect(control.querySelector('.today-dayindex-display').textContent).toBe('(Today is Day 9)');
    });

    it('should leave the display unchanged if onApply rejects', async () => {
      const onApply = vi.fn().mockRejectedValue(new Error('write failed'));
      const control = makeControl({ onApply, currentOffset: 5 });
      await flush();

      control.querySelector('input').value = '7';
      control.querySelector('button').click();
      await flush();

      expect(control.querySelector('.current-offset-display').textContent).toBe('Current: 5');
    });

    it('should default to 0 for invalid input', async () => {
      const onApply = vi.fn().mockResolvedValue(undefined);
      const control = makeControl({ onApply });
      await flush();

      control.querySelector('input').value = 'invalid';
      control.querySelector('button').click();
      await flush();

      expect(onApply).toHaveBeenCalledWith(0);
    });

    it('should have an updateOffset method that refreshes both displays', async () => {
      const computeTodayDayIndex = vi.fn().mockResolvedValue(12).mockResolvedValueOnce(1);
      const control = makeControl({ computeTodayDayIndex });
      await flush();

      await control.updateOffset(15);

      expect(control.querySelector('input').value).toBe('15');
      expect(control.querySelector('.current-offset-display').textContent).toBe('Current: 15');
      expect(control.querySelector('.today-dayindex-display').textContent).toBe('(Today is Day 12)');
    });

    it('should not render a "Go to Today" button when onGoToToday is omitted', () => {
      const control = makeControl();
      const buttons = [...control.querySelectorAll('button')].map((b) => b.textContent);
      expect(buttons).not.toContain('Go to Today');
    });

    it('should render and wire a "Go to Today" button when onGoToToday is provided', () => {
      const onGoToToday = vi.fn();
      const control = makeControl({ onGoToToday });

      const buttons = [...control.querySelectorAll('button')];
      const goToTodayBtn = buttons.find((b) => b.textContent === 'Go to Today');
      expect(goToTodayBtn).toBeTruthy();

      goToTodayBtn.click();
      expect(onGoToToday).toHaveBeenCalled();
    });

    describe('compact mode', () => {
      it('shortens the label and omits the "(Today is Day N)" indicator', () => {
        const control = makeControl({ compact: true });

        expect(control.querySelector('label').textContent).toBe('Offset:');
        expect(control.querySelector('.today-dayindex-display')).toBeNull();
      });

      it('never calls computeTodayDayIndex, on mount or after apply', async () => {
        const computeTodayDayIndex = vi.fn().mockResolvedValue(12);
        const onApply = vi.fn().mockResolvedValue(undefined);
        const control = makeControl({ compact: true, computeTodayDayIndex, onApply });
        await flush();

        control.querySelector('input').value = '7';
        control.querySelector('button').click();
        await flush();

        expect(computeTodayDayIndex).not.toHaveBeenCalled();
      });

      it('still updates the current-offset badge on a successful apply', async () => {
        const onApply = vi.fn().mockResolvedValue(undefined);
        const control = makeControl({ compact: true, onApply });
        await flush();

        control.querySelector('input').value = '9';
        control.querySelector('button').click();
        await flush();

        expect(onApply).toHaveBeenCalledWith(9);
        expect(control.querySelector('.current-offset-display').textContent).toBe('Current: 9');
      });

      it('updateOffset also skips the today-index computation in compact mode', async () => {
        const computeTodayDayIndex = vi.fn().mockResolvedValue(12);
        const control = makeControl({ compact: true, computeTodayDayIndex });
        await flush();
        computeTodayDayIndex.mockClear();

        await control.updateOffset(15);

        expect(control.querySelector('.current-offset-display').textContent).toBe('Current: 15');
        expect(computeTodayDayIndex).not.toHaveBeenCalled();
      });

      it('defaults to non-compact when the option is omitted', () => {
        const control = makeControl();
        expect(control.querySelector('label').textContent).toBe('Date Offset (days): ');
        expect(control.querySelector('.today-dayindex-display')).toBeTruthy();
      });
    });
  });
});

