// The words around the Readouts, drawn: the Day Label at the top left, the
// heading, and the line under the Readouts (Up next, or the Off-Hours line).
// display-text.js decides what they say; this only puts it on the page.
import { displayText } from './display-text.js';
import { el } from './dom.js';
import { formatShortDate } from './format.js';

/** A dot spaced apart from the words around it, hidden from screen readers. @param {string} className */
const dot = (className) => el('span', { className, 'aria-hidden': 'true', textContent: '·' });

export function createStageTextView() {
  const day = el('p', { className: 'clock-day' });
  const heading = el('h1', { className: 'clock-title' });
  const underLine = el('p');

  /** "All Day · Tue, Oct 27", with the dot spaced apart. @param {string} words */
  function showDay(words) {
    const [label, date] = words.split(' · ');
    day.replaceChildren(...(date ? [label, ' ', dot('clock-day__dot'), ' ', date] : [label]));
  }

  /**
   * Show the words for `moment` (null before a Division is chosen: just the date).
   * @param {Date} now @param {import('./clock-model.js').Moment | null} moment
   * @param {{ use24Hour: boolean, periodLabels: Record<string, string> }} settings
   */
  function show(now, moment, settings) {
    if (!moment) {
      showDay(formatShortDate(now));
      heading.replaceChildren(el('span', { className: 'visually-hidden', textContent: 'School Clock' }));
      underLine.replaceChildren();
      return;
    }
    const words = displayText(now, moment, settings);
    showDay(words.day);
    heading.replaceChildren(words.title, ...(words.tag ? [
      ' ', dot('clock-title__dot'), ' ', el('span', { className: 'clock-title__tag', textContent: words.tag }),
    ] : []));
    if (words.upNext) {
      underLine.className = 'clock-next';
      underLine.replaceChildren(
        el('span', { className: 'clock-next__label', textContent: 'Up next' }), ' ',
        el('span', { textContent: words.upNext.name }), ' ',
        el('span', { className: 'clock-next__at', textContent: words.upNext.at }),
      );
    } else {
      underLine.className = 'clock-line';
      underLine.textContent = words.line ?? '';
    }
  }

  return { day, heading, underLine, show };
}
