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
    it('should create control with label, input, and button', () => {
      const onOffsetChange = vi.fn();
      const control = createDateOffsetControl(5, onOffsetChange);
      
      expect(control.className).toBe('date-offset-control');
      expect(control.querySelector('label')).toBeTruthy();
      expect(control.querySelector('input[type="number"]')).toBeTruthy();
      expect(control.querySelector('button')).toBeTruthy();
    });

    it('should set initial value in input', () => {
      const onOffsetChange = vi.fn();
      const control = createDateOffsetControl(10, onOffsetChange);
      
      const input = control.querySelector('input');
      expect(input.value).toBe('10');
    });

    it('should call onOffsetChange when Apply is clicked', () => {
      const onOffsetChange = vi.fn();
      const control = createDateOffsetControl(5, onOffsetChange);
      
      const input = control.querySelector('input');
      input.value = '7';
      
      const button = control.querySelector('button');
      button.click();
      
      expect(onOffsetChange).toHaveBeenCalledWith(7);
    });

    it('should have updateOffset method', () => {
      const onOffsetChange = vi.fn();
      const control = createDateOffsetControl(5, onOffsetChange);
      
      expect(typeof control.updateOffset).toBe('function');
      
      control.updateOffset(15);
      const input = control.querySelector('input');
      expect(input.value).toBe('15');
    });

    it('should handle invalid input by defaulting to 0', () => {
      const onOffsetChange = vi.fn();
      const control = createDateOffsetControl(5, onOffsetChange);
      
      const input = control.querySelector('input');
      input.value = 'invalid';
      
      const button = control.querySelector('button');
      button.click();
      
      expect(onOffsetChange).toHaveBeenCalledWith(0);
    });
  });
});

