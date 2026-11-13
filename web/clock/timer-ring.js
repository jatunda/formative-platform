// The running timer in the big spot: C's progress ring around its digits,
// with the title ("5:00 timer", or "5:00 timer · paused"; with the teacher's
// name for it, "Quiz · 5:00") and Pause / Resume / Cancel inside. Clicking
// the title turns it into a field to name the timer: Enter or leaving it
// saves, Escape keeps the old name. The arc's length is the share of time left (timerRingView), so it
// drains back toward 12 o'clock; CSS eases it between ticks, except under
// reduced motion, where it steps. The digits are a timer (never live) whose
// accessible name says the time left and the length. Built once, so focus
// on its buttons survives the ticks.
import { SVG_NS, el } from './dom.js';
import { icon } from './icons.js';
import { MAX_NAME_LENGTH } from './timer.js';
import { glyphCounts } from './readouts.js';
import { RING_BOX, RING_R, RING_STROKE } from './ring-geometry.js';

/** The middle of the ring's box, where its circle is centred. */
const MID = String(RING_BOX / 2);

/** An SVG circle on the ring's box (ring-geometry.js). @param {string} className */
function circle(className) {
  const node = document.createElementNS(SVG_NS, 'circle');
  const attributes = { class: className, cx: MID, cy: MID, r: String(RING_R), 'stroke-width': String(RING_STROKE), pathLength: '100' };
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

/** A title this long or longer is set smaller (and may wrap). */
const LONG_TITLE = 16;

/**
 * @param {{ onPause: () => void, onResume: () => void, onCancel: () => void,
 *   onRename: (text: string) => void }} actions `onRename` gets the typed name (maybe empty)
 * @returns {{ element: HTMLElement, show: (view: import('./timer.js').TimerView) => void,
 *   focus: (name: 'pause' | 'resume') => void }}
 */
export function createTimerRing({ onPause, onResume, onCancel, onRename }) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'clock-ring__svg');
  svg.setAttribute('viewBox', `0 0 ${RING_BOX} ${RING_BOX}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const arc = circle('clock-ring__arc');
  arc.setAttribute('transform', `rotate(-90 ${MID} ${MID})`);
  svg.append(circle('clock-ring__track'), arc);

  const pausedIcon = icon('pause');
  /** The teacher's name for the timer as last shown ('' for none), for the field. */
  let shownName = '';
  // The name wraps where it must; its length (" · 20:00 · paused") stays whole.
  const titleName = el('span');
  const titleTail = el('span', { className: 'clock-ring__name-tail' });
  const titleText = el('button', {
    type: 'button', className: 'clock-ring__name', title: 'Name this timer', onclick: () => startEditing(),
  }, [titleName, titleTail]);
  const nameField = el('input', {
    className: 'clock-input clock-ring__name-field', type: 'text', maxLength: MAX_NAME_LENGTH, autocomplete: 'off',
    'aria-label': 'Timer name', hidden: true,
    onkeydown: (event) => {
      if (event.key === 'Enter') {
        // Focus is back on the title before the key's default action, which would click it open again.
        event.preventDefault();
        stopEditing(true);
      } else if (event.key === 'Escape') {
        // Escape here only cancels the name, never what's behind the ring.
        event.stopPropagation();
        stopEditing(false);
      }
    },
    onblur: () => stopEditing(true),
  });
  function startEditing() {
    nameField.value = shownName;
    titleText.hidden = true;
    nameField.hidden = false;
    nameField.focus();
    nameField.select();
  }
  /** @param {boolean} save */
  function stopEditing(save) {
    if (nameField.hidden) return;
    nameField.hidden = true;
    titleText.hidden = false;
    titleText.focus();
    if (save) onRename(nameField.value);
  }
  const digits = el('p', { className: 'clock-ring__digits', role: 'timer', 'aria-live': 'off' });
  const button = (label, iconName, onclick, extra = '') =>
    el('button', { type: 'button', className: `clock-btn${extra}`, onclick }, [icon(iconName), label]);
  const pause = button('Pause', 'pause', () => onPause());
  const resume = button('Resume', 'play', () => onResume(), ' clock-btn--accent');
  const cancel = button('Cancel', 'stop', () => onCancel());
  const actions = el('div', { className: 'clock-ring__actions' }, [pause, resume, cancel]);

  const element = el('div', { className: 'clock-ring', role: 'group', 'aria-label': 'Timer' }, [
    svg,
    el('div', { className: 'clock-ring__inner' }, [
      el('p', { className: 'clock-ring__title' }, [pausedIcon, titleText, nameField]),
      digits,
      actions,
    ]),
  ]);

  return {
    element,
    show(view) {
      const { status, left, title, progress } = view;
      shownName = view.name ?? '';
      element.classList.toggle('is-paused', status === 'paused');
      pausedIcon.style.display = status === 'paused' ? '' : 'none';
      titleName.textContent = title.lead;
      titleTail.textContent = title.tail;
      titleText.disabled = status === 'done';
      titleText.classList.toggle('is-long', title.lead.length + title.tail.length >= LONG_TITLE);
      digits.textContent = left;
      digits.setAttribute('aria-label', view.label);
      // The size rule's glyph counts, as for a Readout's value.
      const glyphs = glyphCounts(left);
      digits.style.setProperty('--d', String(glyphs.digits));
      digits.style.setProperty('--c', String(glyphs.colons));
      arc.setAttribute('stroke-dasharray', `${(progress * 100).toFixed(2)} 100`);
      // A zero-length arc with round caps would still draw a dot at 12.
      arc.classList.toggle('is-empty', progress <= 0);
      pause.hidden = status !== 'running';
      resume.hidden = status !== 'paused';
      actions.hidden = status === 'done';
    },
    focus(name) {
      (name === 'pause' ? pause : resume).focus();
    },
  };
}
