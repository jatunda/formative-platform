// The timer picker: "Start a timer", a modal dialog the top bar's Timer
// control opens. Four presets start at once; "Recent" holds the last three
// custom times (most recent first); the custom row takes minutes and seconds.
// Built once (so typing survives the ticks). Pause, resume and cancel are on
// the ring (timer-ring.js), not here. The timer itself is plain data in the
// settings (timer.js).
import { closeButton } from './controls.js';
import { el } from './dom.js';
import { formatDuration } from './format.js';
import { icon } from './icons.js';
import { createModal } from './modal.js';
import { PRESET_MINUTES, parseMinutesSeconds, rememberDuration, startTimer } from './timer.js';

const ID = 'clock-picker';
const MINUTE = 60 * 1000;

/**
 * @param {{ settings: () => import('./clock-settings.js').ClockSettings, now: () => number,
 *   update: (change: Partial<import('./clock-settings.js').ClockSettings>) => void,
 *   behind: () => Element[], onChange: (open: boolean) => void, onStarted: () => void }} options
 *   `settings` gives the current settings, `now` the clock's time (epoch ms), and `update`
 *   saves a change (and redraws the page); `behind` gives the page parts made inert while it's
 *   open, `onChange` hears it open and close, and `onStarted` hears a timer start (after it closes).
 */
export function createTimerPicker({ settings, now, update, behind, onChange, onStarted }) {
  /** Start a timer of `ms`, remembering it as a quick pick when `custom`. @param {number} ms @param {boolean} custom */
  function start(ms, custom) {
    const recent = custom ? { recentDurations: rememberDuration(settings().recentDurations, ms) } : {};
    update({ ...startTimer(ms, now()), ...recent });
    modal.close();
    onStarted();
  }

  const presets = el('div', { className: 'clock-picker__grid', role: 'group', 'aria-label': 'Presets' },
    PRESET_MINUTES.map((minutes) => el('button', {
      type: 'button', className: 'clock-preset', onclick: () => start(minutes * MINUTE, false),
    }, [
      el('span', { className: 'clock-preset__num', textContent: String(minutes) }), ' ',
      el('span', { className: 'clock-preset__unit', textContent: 'min' }),
    ])));

  const recentLabel = el('p', { className: 'clock-picker__sub', id: `${ID}-recent`, textContent: 'Recent' });
  const recent = el('div', { className: 'clock-picker__recent', role: 'group', 'aria-labelledby': recentLabel.id });
  function buildRecent() {
    const durations = settings().recentDurations;
    recentLabel.hidden = durations.length === 0;
    recent.hidden = durations.length === 0;
    recent.replaceChildren(...durations.map((ms) => el('button', {
      type: 'button', className: 'clock-pill', textContent: formatDuration(ms), onclick: () => start(ms, true),
    })));
  }

  const error = el('p', { className: 'clock-picker__error', id: `${ID}-error`, 'aria-live': 'polite' });
  /** @param {string} label @param {string} id */
  const timeField = (label, id) => {
    const input = el('input', {
      className: 'clock-input clock-picker__time', id, type: 'text', inputMode: 'decimal', autocomplete: 'off',
      size: 3, 'aria-describedby': error.id,
    });
    return { input, label: el('label', { className: 'clock-field' }, [
      el('span', { className: 'clock-field__label', textContent: label }), input,
    ]) };
  };
  const minutes = timeField('Minutes', `${ID}-minutes`);
  const seconds = timeField('Seconds', `${ID}-seconds`);
  seconds.input.inputMode = 'numeric';
  /** Clear the error, or show one and mark the field it's about. @param {string} message @param {HTMLInputElement | null} wrong */
  function showError(message, wrong) {
    error.textContent = message;
    for (const { input } of [minutes, seconds]) {
      if (input === wrong) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }
  const form = el('form', {
    className: 'clock-picker__custom',
    onsubmit: (event) => {
      event.preventDefault();
      const typed = parseMinutesSeconds(minutes.input.value, seconds.input.value);
      if (!typed.ok) {
        showError(typed.error, typed.error.startsWith('Seconds') ? seconds.input : minutes.input);
        return;
      }
      showError('', null);
      minutes.input.value = '';
      seconds.input.value = '';
      start(typed.ms, true);
    },
  }, [
    minutes.label,
    el('span', { className: 'clock-picker__colon', 'aria-hidden': 'true', textContent: ':' }),
    seconds.label,
    el('button', { type: 'submit', className: 'clock-btn clock-btn--accent' }, [icon('play'), 'Start']),
  ]);

  const dialog = el('div', {
    className: 'clock-dialog clock-picker', id: ID, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': `${ID}-title`,
  }, [
    el('div', { className: 'clock-picker__head' }, [
      el('h2', { id: `${ID}-title`, textContent: 'Start a timer' }),
      closeButton('Close', () => modal.close()),
    ]),
    presets, recentLabel, recent, form, error,
  ]);
  const scrim = el('div', { className: 'clock-scrim', 'aria-hidden': 'true' });
  const modal = createModal({
    dialog, scrim, behind,
    onChange: (open) => {
      if (open) {
        buildRecent();
        showError('', null);
      }
      onChange(open);
    },
  });

  return {
    /** The scrim and the dialog, in that order, for the page to mount. */
    elements: [scrim, dialog],
    dialog,
    /** Open it from `from` (focus returns there on closing), on the first preset. @param {HTMLElement} from */
    open: (from) => modal.open(from, /** @type {HTMLElement} */ (presets.firstElementChild)),
    destroy: modal.destroy,
  };
}
