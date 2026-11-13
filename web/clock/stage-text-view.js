// The words around the Readouts, drawn: the Day Label at the top left, the
// heading, and the line under the Readouts (Up next, when this Segment ends,
// or the Off-Hours line).
// screen-words.js decides what they say; this only puts it on the page.
import { el } from './dom.js';

/** A dot spaced apart from the words around it, hidden from screen readers. @param {string} className */
const dot = (className) => el('span', { className, 'aria-hidden': 'true', textContent: '·' });

export function createStageTextView() {
  const day = el('p', { className: 'clock-day' });
  const heading = el('h1', { className: 'clock-title' });
  const underLine = el('p');

  /**
   * Show the stage's words.
   * @param {import('./screen-words.js').StageWords} words
   * @param {boolean} [barNamesNextDay] the Day Bar's heading names the Next School Day. Then a
   *   line that only names it too is marked to step aside; the stylesheet keeps it in the
   *   short layout, which hides the bar.
   */
  function show({ day: { dayLabel, date }, heading: { title, tag, hidden }, under }, barNamesNextDay = false) {
    // "All Day · Tue, Oct 27", with the dot spaced apart.
    day.replaceChildren(...(dayLabel ? [dayLabel, ' ', dot('clock-day__dot'), ' ', date] : [date]));
    if (hidden) {
      heading.replaceChildren(el('span', { className: 'visually-hidden', textContent: title }));
    } else {
      heading.replaceChildren(title, ...(tag ? [
        ' ', dot('clock-title__dot'), ' ', el('span', { className: 'clock-title__tag', textContent: tag }),
      ] : []));
    }
    if (under.kind === 'none') {
      underLine.replaceChildren();
    } else if (under.kind === 'next') {
      // "Up next Period 3 10:30 AM", "Ends 11:15 AM".
      underLine.className = 'clock-next';
      underLine.replaceChildren(
        el('span', { className: 'clock-next__label', textContent: under.label }), ' ',
        ...(under.name ? [el('span', { textContent: under.name }), ' '] : []),
        el('span', { className: 'clock-next__at', textContent: under.at }),
      );
    } else {
      underLine.className = under.namesNextDay && barNamesNextDay ? 'clock-line clock-line--in-bar' : 'clock-line';
      underLine.textContent = under.text;
    }
  }

  return { day, heading, underLine, show };
}
