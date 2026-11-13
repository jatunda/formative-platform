// The School Clock's line icons: the shared set (../line-icons.js) in the
// clock's own .clock-icon style.

import { lineIcon } from '../line-icons.js';

/**
 * An icon, hidden from assistive technology.
 * @param {Parameters<typeof lineIcon>[0]} name
 * @returns {SVGSVGElement}
 */
export function icon(name) {
  return lineIcon(name, 'clock-icon');
}
