// What appears on top of the School Clock's main screen, built to the design
// reference (DESIGN.md, Overlays): the first-visit Division prompt, the
// "turn sound on" prompt, the ringing flash and ring card, and the error
// toast. Each owns its markup and its focus; the page controller decides
// when each shows.
import { DIVISIONS } from './clock-settings.js';
import { feedbackLink } from './controls.js';
import { el } from './dom.js';
import { icon } from './icons.js';
import { ringAnnouncement } from './ring-words.js';

/**
 * Remember where focus is, to hand it back later, unless it's already inside
 * `box` (the overlay showing again) or nowhere in particular.
 * @param {HTMLElement} box
 * @returns {HTMLElement | null}
 */
function focusToReturn(box) {
  const active = /** @type {HTMLElement | null} */ (document.activeElement);
  if (!active || active === document.body || box.contains(active)) return null;
  return active;
}

/**
 * Hand focus back when an overlay hides, if focus was still inside it (a
 * teacher who has moved on elsewhere keeps their place).
 * @param {HTMLElement} box @param {HTMLElement | null} returnTo
 */
function giveFocusBack(box, returnTo) {
  if (!box.contains(document.activeElement)) return;
  if (returnTo?.isConnected) returnTo.focus();
  else /** @type {HTMLElement} */ (document.activeElement).blur();
}

/**
 * The first-visit question: a dialog over a near-solid scrim with one large
 * choice per Division and the feedback link. It takes focus when shown.
 * @param {{ onChoose: (division: string) => void }} options
 */
export function createDivisionPrompt({ onChoose }) {
  // The big "MS" / "HS" is drawn by CSS (with empty alt text), so each
  // choice is named by its full name alone.
  const choices = DIVISIONS.map(([key, name]) => el('button', {
    type: 'button', className: 'clock-choice', 'data-short': key, onclick: () => onChoose(key),
  }, [name]));
  const dialog = el('div', {
    className: 'clock-dialog clock-first', role: 'dialog', 'aria-modal': 'true',
    'aria-labelledby': 'clock-first-title', 'aria-describedby': 'clock-first-desc',
  }, [
    el('h2', { id: 'clock-first-title', textContent: 'Which Division are you with?' }),
    el('p', {
      id: 'clock-first-desc', className: 'clock-first__desc',
      textContent: "The clock follows your Division's bell times. You can switch any time.",
    }),
    el('div', { className: 'clock-first__choices' }, choices),
    feedbackLink(),
  ]);
  const element = el('div', { className: 'clock-overlay', hidden: true }, [
    el('div', { className: 'clock-first-scrim', 'aria-hidden': 'true' }),
    dialog,
  ]);
  let returnTo = null;
  return {
    element,
    /** @param {boolean} shown */
    show(shown) {
      if (shown === !element.hidden) return;
      if (shown) {
        returnTo = focusToReturn(element);
        element.hidden = false;
        choices[0].focus();
      } else {
        giveFocusBack(element, returnTo);
        element.hidden = true;
      }
    },
  };
}

/**
 * The "turn sound on" pill (sound starts suspended after every load), or a
 * plain note where the browser has no sound at all.
 * @param {{ onTurnOn: () => void }} options
 */
export function createSoundPrompt({ onTurnOn }) {
  const main = el('span', { className: 'clock-sound-prompt__main' });
  const note = el('span', { className: 'clock-sound-prompt__note', textContent: 'Keep this tab open for Bells and Alarms' });
  const turnOn = el('button', { type: 'button', className: 'clock-overlay-btn clock-overlay-btn--accent', onclick: onTurnOn }, [
    icon('sound'), 'Turn sound on',
  ]);
  const element = el('section', { className: 'clock-sound-prompt', 'aria-label': 'Sound' }, [
    icon('soundOff'),
    el('span', { className: 'clock-sound-prompt__text' }, [main, note]),
    turnOn,
  ]);
  return {
    element,
    /** @param {'suspended' | 'running' | 'unavailable'} state @param {boolean} away something else has the spot */
    show(state, away) {
      element.hidden = away || state === 'running';
      main.textContent = state === 'unavailable' ? "Sound isn't available in this browser." : 'Sound is off';
      note.hidden = state === 'unavailable';
      turnOn.hidden = state !== 'suspended';
    },
  };
}

/**
 * The ringing flash (a frame and wash over the whole screen, aria-hidden),
 * the ring card (an alertdialog that takes focus; Dismiss, or Escape through
 * the page) and a live region that announces each ring once.
 * @param {{ onDismiss: () => void }} options
 */
export function createRingCard({ onDismiss }) {
  const flash = el('div', { className: 'clock-ring-flash', 'aria-hidden': 'true', hidden: true });
  const kind = el('span');
  const title = el('h2', { id: 'clock-ring-title', className: 'clock-ring-card__title' });
  const detail = el('p', { id: 'clock-ring-detail', className: 'clock-ring-card__detail' });
  const dismiss = el('button', {
    type: 'button', className: 'clock-overlay-btn clock-overlay-btn--big clock-ring-card__dismiss', textContent: 'Dismiss', onclick: onDismiss,
  });
  const card = el('div', {
    className: 'clock-ring-card', role: 'alertdialog', hidden: true,
    'aria-labelledby': title.id, 'aria-describedby': detail.id,
  }, [el('p', { className: 'clock-ring-card__kind' }, [icon('bell'), kind]), title, detail, dismiss]);
  const live = el('p', { className: 'visually-hidden', 'aria-live': 'assertive' });
  let returnTo = null;
  return {
    elements: [flash, card, live],
    /** Show a ring's words (a new ring replaces the one showing). @param {import('./ring-words.js').RingWords} words */
    show(words) {
      kind.textContent = `Ringing · ${words.kind}`;
      title.textContent = words.title;
      detail.textContent = words.detail;
      live.textContent = ringAnnouncement(words);
      if (card.hidden) returnTo = focusToReturn(card);
      flash.hidden = false;
      card.hidden = false;
      dismiss.focus();
    },
    hide() {
      giveFocusBack(card, returnTo);
      returnTo = null;
      flash.hidden = true;
      card.hidden = true;
      live.textContent = '';
    },
  };
}

/**
 * The error toast: bottom centre, `role=alert`, until dismissed.
 * @param {string} text
 */
export function createErrorToast(text) {
  const element = el('div', { className: 'clock-toast clock-toast--error', role: 'alert', hidden: true }, [
    icon('warn'),
    el('span', { textContent: text }),
    el('button', {
      type: 'button', className: 'clock-overlay-btn clock-overlay-btn--icon', 'aria-label': 'Dismiss',
      onclick: () => { element.hidden = true; },
    }, [icon('close')]),
  ]);
  return { element, show: () => { element.hidden = false; } };
}
