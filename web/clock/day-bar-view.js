// The bar along the bottom of the School Clock, drawn from day-bar.js's
// description: the blocks in proportion (or the one current block, or the
// Off-Hours countdown), the fill and Now marker, the times under them, and the agenda list a phone
// shows instead. It rebuilds only when what's listed changes (a Segment
// starts or ends, the setting or time format changes), so focus and a screen
// reader's place survive the ticks; otherwise each tick just moves the fill
// and the marker. Nothing is a live region: nothing is re-announced. In the
// Readouts' edit mode a tap anywhere on the bar switches it between whole day
// and just this Segment; a button laid over it (letting taps and scrolls
// through to the bar) does the same for the keyboard and screen readers.
import { BAR_SETTING_NAMES } from './day-bar.js';
import { el } from './dom.js';
import { formatShortDate } from './format.js';

/** @typedef {import('./day-bar.js').Bar} Bar */
/** @typedef {import('./day-bar.js').BarBlock} BarBlock */

const KIND_WORD = { break: 'Break', assembly: 'Assembly' };

/** A 12-hour time's " AM" / " PM". */
const MERIDIEM = / [AP]M$/;

/** "Period 3 · AP CSA". @param {BarBlock} block */
const fullName = (block) => (block.label ? `${block.name} · ${block.label}` : block.name);

/**
 * "10:25–11:15 AM": a block's start and end, saying AM or PM once when both
 * share it ("11:20 AM–12:05 PM" when not).
 * @param {BarBlock} block @param {(date: Date) => string} time
 */
function timeRange(block, time) {
  const start = time(block.start);
  const end = time(block.end);
  const meridiem = MERIDIEM.exec(start)?.[0];
  return `${meridiem && end.endsWith(meridiem) ? start.slice(0, -meridiem.length) : start}–${end}`;
}

/**
 * @param {{ onSwitch: () => void }} actions `onSwitch`: the bar was tapped (or its button pressed) in edit mode
 * @returns {{ element: HTMLElement,
 *   show: (bar: Bar | null, time: (date: Date) => string, options?: { editing?: boolean }) => void }}
 *   `time` writes a clock time (no seconds) under the current settings; `editing`: the Readouts' edit mode.
 */
export function createDayBarView({ onSwitch }) {
  const element = el('section', { className: 'clock-bar', hidden: true });
  const switchName = el('span', { className: 'visually-hidden' });
  // A click is a tap, never a scroll, so the phone's agenda still scrolls.
  // The button's own clicks (Enter, Space) arrive here too.
  const switchButton = el('button', { type: 'button', className: 'clock-bar__switch', hidden: true }, [switchName]);
  let editing = false;
  element.addEventListener('click', () => {
    if (editing) onSwitch();
  });
  let built = '';
  /** @type {HTMLElement | null} */
  let current = null;
  /** @type {HTMLElement | null} */
  let fill = null;
  /** @type {HTMLElement | null} */
  let marker = null;

  /** @param {Bar} bar @param {(date: Date) => string} time */
  function build(bar, time) {
    // Under the track there's only room for "10:10", not "10:10 AM" (as the
    // design reference shows); the hidden text keeps the full time.
    const brief = (date) => time(date).replace(MERIDIEM, '');
    const single = bar.setting === 'segment';
    const next = bar.day === 'next';
    const date = formatShortDate(bar.date);
    let name = "Today's Segments";
    if (single) name = fullName(bar.blocks[0]);
    else if (next) name = `Segments on ${date}`;
    element.className = `clock-bar clock-bar--${bar.setting}${next ? ' clock-bar--next' : ''}`;
    element.setAttribute('aria-label', name);
    current = null;
    fill = null;

    const items = bar.blocks.map((block) => {
      const nowWord = { now: ', now', next: ', up next' }[block.state] ?? '';
      const item = el('li', { className: 'clock-bar__seg' }, [
        // Just this Segment is a thin bar with no name: the stage names it.
        ...(single ? [] : [el('span', { className: 'clock-bar__text', 'aria-hidden': 'true' }, [
          el('span', { className: 'clock-bar__name' }, [
            el('span', { className: 'clock-bar__long', textContent: block.name }),
            el('span', { className: 'clock-bar__short', textContent: block.short }),
          ]),
          ...(block.label ? [el('span', { className: 'clock-bar__label', textContent: block.label })] : []),
        ])]),
        el('span', { className: 'clock-bar__time', 'aria-hidden': 'true' }, [
          brief(block.start),
          // Its own part, so a block too narrow for both drops it (clock.css).
          ...(block.showEnd ? [el('span', { className: 'clock-bar__until', textContent: `–${brief(block.end)}` })] : []),
        ]),
        el('span', {
          className: 'visually-hidden',
          // The Off-Hours countdown says what it counts down to: "Until Period 1, Mon, Nov 16 at 8:30 AM".
          textContent: block.kind === 'countdown'
            ? `${fullName(block)}, ${bar.day === 'today' ? 'today' : date} at ${time(block.end)}`
            : `${fullName(block)}, ${time(block.start)} to ${time(block.end)}${nowWord}`,
        }),
      ]);
      item.dataset.kind = block.kind;
      item.dataset.state = block.state;
      item.style.left = `${block.left.toFixed(2)}%`;
      item.style.width = `${block.width.toFixed(2)}%`;
      if (block.state === 'now') {
        fill = el('span', {
          className: 'clock-bar__fill', role: 'progressbar', 'aria-label': `${block.name} progress`,
          'aria-valuemin': '0', 'aria-valuemax': '100',
        });
        item.prepend(fill);
        current = item;
      }
      return item;
    });
    marker = bar.nowAt === null ? null : el('span', { className: 'clock-bar__now', 'aria-hidden': 'true' });

    const heading = bar.day === 'today' ? `Today · ${bar.dayLabel}` : `Next School Day · ${date} · ${bar.dayLabel}`;
    // A switch rebuilds the bar, so its button keeps focus through it.
    const refocus = document.activeElement === switchButton;
    element.replaceChildren(
      // Off-Hours say which day the bar is of; in school the stage already does.
      ...(bar.offHours ? [el('p', { className: 'clock-bar__heading', textContent: heading })] : []),
      el('div', { className: 'clock-bar__day' }, [
        el('ol', { className: 'clock-bar__track' }, items),
        ...(marker ? [marker] : []),
        el('span', { className: 'clock-bar__end', 'aria-hidden': 'true', textContent: brief(bar.end) }),
      ]),
      ...(single ? [] : [agenda(bar, name, time)]),
      switchButton,
    );
    if (refocus) switchButton.focus();
  }

  /** The phone's agenda list. @param {Bar} bar @param {string} name @param {(date: Date) => string} time */
  function agenda(bar, name, time) {
    const rows = bar.blocks.filter((block) => block.kind !== 'passing').map((block) => {
      const pill = { now: 'Now', next: 'Up next' }[block.state];
      const row = el('li', { className: 'clock-agenda__row' }, [
        el('span', { className: 'clock-agenda__time', textContent: block.showEnd ? timeRange(block, time) : time(block.start) }), ' ',
        el('span', { className: 'clock-agenda__name' }, [
          fullName(block),
          // Breaks and Assemblies say so in words, not just by colour.
          ...(KIND_WORD[block.kind] ? [el('span', { className: 'clock-agenda__kind', textContent: ` · ${KIND_WORD[block.kind]}` })] : []),
        ]),
        ...(pill ? [' ', el('span', { className: 'clock-agenda__pill', textContent: pill })] : []),
      ]);
      row.dataset.kind = block.kind;
      row.dataset.state = block.state;
      return row;
    });
    const shown = rows.find((row) => row.dataset.state === 'now' || row.dataset.state === 'next');
    const list = el('ol', { className: 'clock-agenda', tabIndex: 0, 'aria-label': name }, rows);
    // The page scrolls the current row into view (where the list shows).
    if (shown) queueMicrotask(() => shown.scrollIntoView?.({ block: 'nearest' }));
    return list;
  }

  /** @param {Bar | null} bar @param {(date: Date) => string} time @param {{ editing?: boolean }} [options] */
  function show(bar, time, { editing: inEditMode = false } = {}) {
    element.hidden = bar === null;
    editing = bar !== null && inEditMode;
    element.classList.toggle('is-editing', editing);
    switchButton.hidden = !editing;
    if (bar === null) {
      built = '';
      return;
    }
    const key = JSON.stringify([bar.setting, bar.offHours, bar.day, bar.dayLabel, bar.date, time(bar.end),
      bar.blocks.map((b) => [b.name, b.label, b.state, time(b.start), b.showEnd && time(b.end)])]);
    if (key !== built) {
      built = key;
      build(bar, time);
    }
    const other = bar.setting === 'day' ? 'segment' : 'day';
    switchName.textContent = `Bottom bar: ${BAR_SETTING_NAMES[bar.setting]}. Switch to ${BAR_SETTING_NAMES[other]}`;
    // A current block (and so a fill) exactly when something is current.
    if (current) {
      current.style.setProperty('--done', `${bar.done.toFixed(1)}%`);
      fill.setAttribute('aria-valuenow', String(Math.round(bar.done)));
    }
    if (marker) marker.style.left = `${bar.nowAt.toFixed(2)}%`;
  }

  return { element, show };
}
