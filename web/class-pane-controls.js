/**
 * Class Pane Controls
 *
 * The Lesson Planning page's per-Class pane controls: the collapse chevron
 * and the open-in-new Full Schedule link in the pane header, and the Planning Window
 * resize buttons under the table. lesson-planning.js's renderClassPane wires
 * them to the pane's state; each factory here only builds its DOM.
 */

import { createIconButton, createStyledButton } from './ui-components.js';
import { fullScheduleTodayHref } from './teacher-nav.js';
import { lineIcon } from './line-icons.js';

// Number of upcoming Day Indices shown per Class in each pane's Planning
// Window (today, +1, +2, ...) when the pane is first rendered. Each pane's
// resize buttons change it by PLANNING_WINDOW_STEP, never below
// PLANNING_WINDOW_SIZE. The size is not remembered: a page reload puts every
// Class back to this.
export const PLANNING_WINDOW_SIZE = 3;
export const PLANNING_WINDOW_STEP = 3;

/**
 * The "−3 days" / "+3 days" buttons under a pane's table.
 * @param {number} windowSize - The pane's current Planning Window size
 * @param {(size: number) => void} onResize - Re-render the pane at a new size
 * @returns {HTMLDivElement}
 */
export function createWindowResizeControls(windowSize, onResize) {
  const controls = document.createElement('div');
  controls.className = 'planning-window-resize';
  const shrinkBtn = createStyledButton(`−${PLANNING_WINDOW_STEP} days`, () => onResize(windowSize - PLANNING_WINDOW_STEP));
  shrinkBtn.disabled = windowSize <= PLANNING_WINDOW_SIZE;
  controls.appendChild(shrinkBtn);
  controls.appendChild(createStyledButton(`+${PLANNING_WINDOW_STEP} days`, () => onResize(windowSize + PLANNING_WINDOW_STEP)));
  return controls;
}

/**
 * The chevron that shows or hides a Class's pane body.
 * @param {string} className
 * @param {() => void} onToggle
 * @returns {{ element: HTMLButtonElement, show: (collapsed: boolean) => void }}
 *   `show` sets the glyph and aria-expanded to match a collapse state.
 */
export function createCollapseChevron(className, onToggle) {
  const element = createIconButton('', `Show or hide ${className}`, onToggle);
  return {
    element,
    show(collapsed) {
      element.textContent = collapsed ? '▸' : '▾';
      element.setAttribute('aria-expanded', String(!collapsed));
    }
  };
}

/**
 * The open-in-new link from a pane header to that Class's Full Schedule at
 * today, in a new tab so the Lesson Planning page stays put.
 * @param {string} classId
 * @param {string} className
 * @returns {HTMLAnchorElement}
 */
export function createFullScheduleLink(classId, className) {
  const link = document.createElement('a');
  link.className = 'full-schedule-link';
  link.href = fullScheduleTodayHref(classId);
  link.target = '_blank';
  link.rel = 'noopener';
  link.appendChild(lineIcon('openInNew', 'line-icon'));
  link.title = 'Full schedule';
  link.setAttribute('aria-label', `Full schedule for ${className}`);
  return link;
}
