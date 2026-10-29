// The classroom timer's controls on the School Clock page: time left, pause,
// resume and cancel, the presets, the quick picks and a custom duration. Built
// once (so typing a custom duration survives the ticks); each render rewrites
// its time left. The timer itself is plain data in the settings (timer.js).
import { el } from './dom.js';
import { formatDuration } from './format.js';
import {
  PRESET_MINUTES, cancelTimer, durationLabel, parseDuration, pauseTimer, rememberDuration, resumeTimer,
  startTimer, timerStatus,
} from './timer.js';

/**
 * @param {{ settings: () => import('./clock-settings.js').ClockSettings, now: () => number,
 *   update: (change: Partial<import('./clock-settings.js').ClockSettings>) => void }} options
 *   `settings` gives the current settings, `now` the clock's time (epoch ms),
 *   and `update` saves a change to them (and redraws the page).
 * @returns {{ section: HTMLElement, render: (now: Date) => void }}
 */
export function createTimerPanel({ settings, now, update }) {
  const timerLeft = el('p');
  const timerError = el('p', { 'aria-live': 'polite' });
  /** @param {Partial<import('./clock-settings.js').ClockSettings>} change */
  const changeTimer = (change) => {
    timerError.textContent = '';
    update(change);
  };
  const pauseButton = el('button', {
    type: 'button', textContent: 'Pause', onclick: () => changeTimer(pauseTimer(settings(), now())),
  });
  const resumeButton = el('button', {
    type: 'button', textContent: 'Resume', onclick: () => changeTimer(resumeTimer(settings(), now())),
  });
  const cancelButton = el('button', { type: 'button', textContent: 'Cancel', onclick: () => changeTimer(cancelTimer()) });
  /** A typed duration or a quick pick: it starts and becomes the first quick pick. @param {number} ms */
  function startCustom(ms) {
    changeTimer({ ...startTimer(ms, now()), recentDurations: rememberDuration(settings().recentDurations, ms) });
    buildQuickPicks();
  }
  const quickPicks = el('div', { role: 'group', 'aria-label': 'Quick picks' });
  function buildQuickPicks() {
    quickPicks.replaceChildren(...settings().recentDurations.map((ms) =>
      el('button', { type: 'button', textContent: durationLabel(ms), onclick: () => startCustom(ms) })));
  }
  buildQuickPicks();
  const customInput = el('input', { type: 'text', placeholder: '7:30', autocomplete: 'off' });
  const section = el('section', { 'aria-label': 'Timer' }, [
    el('h2', { textContent: 'Timer' }),
    timerLeft,
    pauseButton, resumeButton, cancelButton,
    el('div', { role: 'group', 'aria-label': 'Presets' }, PRESET_MINUTES.map((minutes) => el('button', {
      type: 'button', textContent: durationLabel(minutes * 60 * 1000),
      onclick: () => changeTimer(startTimer(minutes * 60 * 1000, now())),
    }))),
    quickPicks,
    el('form', {
      onsubmit: (event) => {
        event.preventDefault();
        const typed = parseDuration(customInput.value);
        if (typed.ok) startCustom(typed.ms);
        else timerError.textContent = typed.error;
      },
    }, [
      el('label', {}, ['Custom (minutes or m:ss) ', customInput]),
      el('button', { type: 'submit', textContent: 'Start' }),
    ]),
    timerError,
  ]);

  /** @param {Date} at */
  function render(at) {
    const { status, remainingMs } = timerStatus(settings(), at.getTime());
    // Rounded up, so a 5 min timer reads 5:00 when it starts and 0:00 as it rings.
    const left = status === 'idle' ? '' : `${formatDuration(Math.ceil(remainingMs / 1000) * 1000)} left`;
    timerLeft.textContent = status === 'paused' ? `Paused · ${left}` : left;
    pauseButton.hidden = status !== 'running';
    resumeButton.hidden = status !== 'paused';
    cancelButton.hidden = status === 'idle';
  }

  return { section, render };
}
