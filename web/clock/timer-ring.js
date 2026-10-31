// The running timer in the big spot: C's progress ring around its digits,
// with the title ("Timer of 5:00", or "Paused") and Pause / Resume / Cancel
// inside. The arc's length is the share of time left (timerRingView), so it
// drains back toward 12 o'clock; CSS eases it between ticks, except under
// reduced motion, where it steps. The digits are a timer (never live) whose
// accessible name says the time left and the length. Built once, so focus
// on its buttons survives the ticks.
import { SVG_NS, el } from './dom.js';
import { icon } from './icons.js';

/** An SVG circle on the ring's 100-unit box. @param {string} className */
function circle(className) {
  const node = document.createElementNS(SVG_NS, 'circle');
  for (const [name, value] of Object.entries({ class: className, cx: '50', cy: '50', r: '48', pathLength: '100' })) {
    node.setAttribute(name, value);
  }
  return node;
}

/**
 * @param {{ onPause: () => void, onResume: () => void, onCancel: () => void }} actions
 * @returns {{ element: HTMLElement, show: (view: ReturnType<typeof import('./timer.js').timerRingView>) => void,
 *   focus: (name: 'pause' | 'resume') => void }}
 */
export function createTimerRing({ onPause, onResume, onCancel }) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'clock-ring__svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const arc = circle('clock-ring__arc');
  arc.setAttribute('transform', 'rotate(-90 50 50)');
  svg.append(circle('clock-ring__track'), arc);

  const pausedIcon = icon('pause');
  const titleText = el('span');
  const of = el('span', { className: 'clock-ring__of' });
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
      el('p', { className: 'clock-ring__title' }, [pausedIcon, titleText, ' ', of]),
      digits,
      actions,
    ]),
  ]);

  return {
    element,
    show({ status, left, total, progress, label }) {
      element.classList.toggle('is-paused', status === 'paused');
      pausedIcon.style.display = status === 'paused' ? '' : 'none';
      titleText.textContent = status === 'paused' ? 'Paused' : 'Timer';
      of.textContent = total ? `of ${total}` : '';
      digits.textContent = left;
      digits.setAttribute('aria-label', label);
      // The size rule's glyph counts (as for a Readout's value).
      digits.style.setProperty('--d', String(left.replace(/\D/g, '').length));
      digits.style.setProperty('--c', String(left.replace(/[^:]/g, '').length));
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
