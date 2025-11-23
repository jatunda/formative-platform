import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setupDragHandlers,
  setupDropHandlers,
  parseDragData,
} from '../../drag-drop-utils.js';

// Polyfill DragEvent for jsdom
if (typeof DragEvent === 'undefined') {
  global.DragEvent = class DragEvent extends Event {
    constructor(type, eventInitDict = {}) {
      super(type, eventInitDict);
      this.dataTransfer = eventInitDict.dataTransfer || {
        setData: vi.fn(),
        getData: vi.fn(),
        dropEffect: '',
      };
    }
  };
}

describe('drag-drop-utils', () => {
  let element;

  beforeEach(() => {
    element = document.createElement('div');
    element.draggable = true;
    document.body.appendChild(element);
  });

  describe('setupDragHandlers', () => {
    it('should set up dragstart handler', () => {
      const dragData = {
        lessonHash: 'hash1',
        fromDayIndex: 0,
        fromLessonIndex: 1,
      };
      
      setupDragHandlers(element, dragData);
      
      const event = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'dataTransfer', {
        value: {
          setData: vi.fn(),
        },
        writable: true,
      });
      
      element.dispatchEvent(event);
      
      expect(event.dataTransfer.setData).toHaveBeenCalledWith(
        'text/plain',
        JSON.stringify(dragData)
      );
    });

    it('should apply opacity on dragstart', () => {
      const dragData = { lessonHash: 'hash1', fromDayIndex: 0, fromLessonIndex: 0 };
      setupDragHandlers(element, dragData);
      
      const event = new DragEvent('dragstart', { bubbles: true });
      Object.defineProperty(event, 'dataTransfer', {
        value: { setData: vi.fn() },
      });
      
      element.dispatchEvent(event);
      
      expect(element.style.opacity).toBe('0.5');
    });

    it('should use custom opacity if provided', () => {
      const dragData = { lessonHash: 'hash1', fromDayIndex: 0, fromLessonIndex: 0 };
      setupDragHandlers(element, dragData, { dragOpacity: 0.3 });
      
      const event = new DragEvent('dragstart', { bubbles: true });
      Object.defineProperty(event, 'dataTransfer', {
        value: { setData: vi.fn() },
      });
      
      element.dispatchEvent(event);
      
      expect(element.style.opacity).toBe('0.3');
    });

    it('should restore opacity on dragend', () => {
      const dragData = { lessonHash: 'hash1', fromDayIndex: 0, fromLessonIndex: 0 };
      setupDragHandlers(element, dragData);
      
      const startEvent = new DragEvent('dragstart', { bubbles: true });
      Object.defineProperty(startEvent, 'dataTransfer', {
        value: { setData: vi.fn() },
      });
      element.dispatchEvent(startEvent);
      
      const endEvent = new DragEvent('dragend', { bubbles: true });
      element.dispatchEvent(endEvent);
      
      expect(element.style.opacity).toBe('1');
    });
  });

  describe('setupDropHandlers', () => {
    it('should prevent default on dragover', () => {
      const onDrop = vi.fn();
      setupDropHandlers(element, onDrop);
      
      const event = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'dataTransfer', {
        value: { dropEffect: '' },
      });
      
      const prevented = element.dispatchEvent(event);
      
      expect(event.defaultPrevented).toBe(true);
      expect(event.dataTransfer.dropEffect).toBe('move');
    });

    it('should add hover class on dragover', () => {
      const onDrop = vi.fn();
      setupDropHandlers(element, onDrop);
      
      const event = new DragEvent('dragover', { bubbles: true });
      Object.defineProperty(event, 'dataTransfer', {
        value: { dropEffect: '' },
      });
      
      element.dispatchEvent(event);
      
      expect(element.classList.contains('td-drop-hover')).toBe(true);
    });

    it('should use custom hover class if provided', () => {
      const onDrop = vi.fn();
      setupDropHandlers(element, onDrop, { hoverClass: 'custom-hover' });
      
      const event = new DragEvent('dragover', { bubbles: true });
      Object.defineProperty(event, 'dataTransfer', {
        value: { dropEffect: '' },
      });
      
      element.dispatchEvent(event);
      
      expect(element.classList.contains('custom-hover')).toBe(true);
    });

    it('should remove hover class on dragleave', () => {
      const onDrop = vi.fn();
      setupDropHandlers(element, onDrop);
      
      // First add hover class
      const overEvent = new DragEvent('dragover', { bubbles: true });
      Object.defineProperty(overEvent, 'dataTransfer', {
        value: { dropEffect: '' },
      });
      element.dispatchEvent(overEvent);
      
      // Then remove it
      const leaveEvent = new DragEvent('dragleave', { bubbles: true });
      element.dispatchEvent(leaveEvent);
      
      expect(element.classList.contains('td-drop-hover')).toBe(false);
    });

    it('should call onDrop callback with parsed data', async () => {
      const onDrop = vi.fn().mockResolvedValue(undefined);
      const dragData = {
        lessonHash: 'hash1',
        fromDayIndex: 0,
        fromLessonIndex: 1,
      };
      
      setupDropHandlers(element, onDrop);
      
      const event = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'dataTransfer', {
        value: {
          getData: vi.fn(() => JSON.stringify(dragData)),
        },
      });
      
      element.dispatchEvent(event);
      
      // Wait for async callback
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(onDrop).toHaveBeenCalledWith(dragData, expect.any(DragEvent));
    });

    it('should handle invalid JSON in drop event', async () => {
      const onDrop = vi.fn();
      setupDropHandlers(element, onDrop);
      
      const event = new DragEvent('drop', { bubbles: true });
      Object.defineProperty(event, 'dataTransfer', {
        value: {
          getData: vi.fn(() => 'invalid json'),
        },
      });
      
      element.dispatchEvent(event);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(onDrop).not.toHaveBeenCalled();
    });

    it('should remove hover class on drop', () => {
      const onDrop = vi.fn().mockResolvedValue(undefined);
      setupDropHandlers(element, onDrop);
      
      // Add hover class
      const overEvent = new DragEvent('dragover', { bubbles: true });
      Object.defineProperty(overEvent, 'dataTransfer', {
        value: { dropEffect: '' },
      });
      element.dispatchEvent(overEvent);
      
      // Drop should remove it
      const dropEvent = new DragEvent('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { getData: vi.fn(() => '{}') },
      });
      element.dispatchEvent(dropEvent);
      
      expect(element.classList.contains('td-drop-hover')).toBe(false);
    });
  });

  describe('parseDragData', () => {
    it('should parse valid JSON drag data', () => {
      const dragData = {
        lessonHash: 'hash1',
        fromDayIndex: 0,
        fromLessonIndex: 1,
      };
      
      const event = new DragEvent('drop');
      Object.defineProperty(event, 'dataTransfer', {
        value: {
          getData: vi.fn(() => JSON.stringify(dragData)),
        },
      });
      
      const result = parseDragData(event);
      expect(result).toEqual(dragData);
    });

    it('should return null for invalid JSON', () => {
      const event = new DragEvent('drop');
      Object.defineProperty(event, 'dataTransfer', {
        value: {
          getData: vi.fn(() => 'invalid json'),
        },
      });
      
      const result = parseDragData(event);
      expect(result).toBeNull();
    });

    it('should return null if getData throws', () => {
      const event = new DragEvent('drop');
      Object.defineProperty(event, 'dataTransfer', {
        value: {
          getData: vi.fn(() => {
            throw new Error('Failed to get data');
          }),
        },
      });
      
      const result = parseDragData(event);
      expect(result).toBeNull();
    });
  });
});

