// The bar along the bottom of the School Clock, drawn from day-bar.js's
// description: the blocks in proportion (or the one current block), the
// fill and Now marker, the times under them, and the agenda list a phone
// shows instead. It rebuilds only when what's listed changes (a Segment
// starts or ends, the setting or time format changes), so focus and a screen
// reader's place survive the ticks; otherwise each tick just moves the fill
// and the marker. Nothing is a live region: nothing is re-announced.
import { el } from './dom.js';
import { formatShortDate } from './format.js';

/** @typedef {import('./day-bar.js').Bar} Bar */
/** @typedef {import('./day-bar.js').BarBlock} BarBlock */

const KIND_WORD = { break: 'Break', assembly: 'Assembly' };

/** "Period 3 · AP CSA". @param {BarBlock} block */
const fullName = (block) => (block.label ? `${block.name} · ${block.label}` : block.name);

/**
 * @returns {{ element: HTMLElement, show: (bar: Bar | null, time: (date: Date) => string) => void }}
 *   `time` writes a clock time (no seconds) under the current settings.
 */
export function createDayBarView() {
  const element = el('section', { className: 'clock-bar', hidden: true });
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
    const brief = (date) => time(date).replace(/ [AP]M$/, '');
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
        el('span', { className: 'clock-bar__text', 'aria-hidden': 'true' }, [
          el('span', { className: 'clock-bar__name' }, [
            el('span', { className: 'clock-bar__long', textContent: block.name }),
            el('span', { className: 'clock-bar__short', textContent: block.short }),
          ]),
          ...(block.label ? [el('span', { className: 'clock-bar__label', textContent: block.label })] : []),
        ]),
        el('span', { className: 'clock-bar__time', 'aria-hidden': 'true', textContent: brief(block.start) }),
        el('span', {
          className: 'visually-hidden',
          textContent: `${fullName(block)}, ${time(block.start)} to ${time(block.end)}${nowWord}`,
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
    element.replaceChildren(
      // Off-Hours say whose Segments these are; in school the stage already does.
      ...(bar.done === null ? [el('p', { className: 'clock-bar__heading', textContent: heading })] : []),
      el('div', { className: 'clock-bar__day' }, [
        el('ol', { className: 'clock-bar__track' }, items),
        ...(marker ? [marker] : []),
        el('span', { className: 'clock-bar__end', 'aria-hidden': 'true', textContent: brief(bar.end) }),
      ]),
      ...(single ? [] : [agenda(bar, name, time)]),
    );
  }

  /** The phone's agenda list. @param {Bar} bar @param {string} name @param {(date: Date) => string} time */
  function agenda(bar, name, time) {
    const rows = bar.blocks.filter((block) => block.kind !== 'passing').map((block) => {
      const pill = { now: 'Now', next: 'Up next' }[block.state];
      const row = el('li', { className: 'clock-agenda__row' }, [
        el('span', { className: 'clock-agenda__time', textContent: time(block.start) }), ' ',
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
    const list = el('ol', { className: 'clock-agenda', tabindex: '0', 'aria-label': name }, rows);
    // The page scrolls the current row into view (where the list shows).
    if (shown) queueMicrotask(() => shown.scrollIntoView?.({ block: 'nearest' }));
    return list;
  }

  /** @param {Bar | null} bar @param {(date: Date) => string} time */
  function show(bar, time) {
    element.hidden = bar === null;
    if (bar === null) {
      built = '';
      return;
    }
    const key = JSON.stringify([bar.setting, bar.day, bar.dayLabel, bar.date, time(bar.end),
      bar.blocks.map((b) => [b.name, b.label, b.state, time(b.start)])]);
    if (key !== built) {
      built = key;
      build(bar, time);
    }
    // A current block (and so a fill) exactly when something is current.
    if (current) {
      current.style.setProperty('--done', `${bar.done.toFixed(1)}%`);
      fill.setAttribute('aria-valuenow', String(Math.round(bar.done)));
    }
    if (marker) marker.style.left = `${bar.nowAt.toFixed(2)}%`;
  }

  return { element, show };
}
