// The form controls the School Clock's panels share (the Settings drawer, its
// Alarms section, the Look sheet and the timer picker): a drawer section, an
// on/off switch, a voice choice with Preview, a titled fieldset, an icon-only
// Close button and the feedback link.
import { el } from './dom.js';
import { icon } from './icons.js';
import { SOUNDS, SOUND_NAMES } from './sound.js';

export const FEEDBACK_HREF = `mailto:erich@villagechristian.org?subject=${encodeURIComponent('Clock feedback')}`;

/** The "Feedback? Email Eric" link, a new email with the subject filled in. */
export const feedbackLink = () => el('a', { className: 'clock-feedback', href: FEEDBACK_HREF, textContent: 'Feedback? Email Eric' });

/**
 * One section of the Settings drawer: an uppercase heading that names it,
 * then its controls. Its id is `clock-settings-<key>`.
 * @param {string} key @param {string} title @param {(Node | string)[]} children
 */
export function drawerSection(key, title, children) {
  const id = `clock-settings-${key}`;
  return el('section', { className: 'clock-drawer__section', id, 'aria-labelledby': `${id}-title` }, [
    el('h3', { id: `${id}-title`, textContent: title }),
    ...children,
  ]);
}

/**
 * An on/off switch named `name`, with an optional hint under the name.
 * @param {string} id @param {string} name @param {string} hint @param {(on: boolean) => void} onChange
 */
export function switchControl(id, name, hint, onChange) {
  const hintText = el('span', { className: 'clock-hint', id: `${id}-hint`, textContent: hint });
  const input = el('input', {
    type: 'checkbox', role: 'switch', id, 'aria-labelledby': `${id}-name`, 'aria-describedby': hintText.id,
    onchange: () => onChange(input.checked),
  });
  const label = el('label', { className: 'clock-switch' }, [
    el('span', { className: 'clock-switch__text' }, [el('span', { id: `${id}-name`, textContent: name }), hintText]),
    input,
    el('span', { className: 'clock-switch__track', 'aria-hidden': 'true' }),
  ]);
  return { label, input, hint: hintText };
}

/**
 * A voice choice ("Bell sound") with a Preview that plays the voice chosen.
 * @param {string} name @param {(sound: string) => void} onChange @param {(sound: string) => void} preview
 */
export function soundChoice(name, onChange, preview) {
  const select = el('select', { className: 'clock-input', onchange: () => onChange(select.value) },
    SOUNDS.map((sound) => el('option', { value: sound, textContent: SOUND_NAMES[sound] })));
  const row = el('div', { className: 'clock-field-row' }, [
    el('label', { className: 'clock-field' }, [
      el('span', { className: 'clock-field__label', textContent: name }),
      el('span', { className: 'clock-select' }, [select]),
    ]),
    el('button', {
      type: 'button', className: 'clock-btn', 'aria-label': `Preview ${name}`, onclick: () => preview(select.value),
    }, [icon('play'), 'Preview']),
  ]);
  return { row, select };
}

/**
 * A titled group of controls.
 * @param {string} legend @param {(Node | string)[]} children
 * @param {{ className?: string, legendClass?: string }} [classes] the fieldset's and the legend's classes
 */
export function fieldset(legend, children, { className = 'clock-fieldset', legendClass } = {}) {
  return el('fieldset', { className }, [
    el('legend', { textContent: legend, ...(legendClass ? { className: legendClass } : {}) }),
    ...children,
  ]);
}

/**
 * An icon-only Close button named `name`.
 * @param {string} name @param {() => void} onClose
 */
export const closeButton = (name, onClose) => el('button', {
  type: 'button', className: 'clock-btn clock-btn--icon', 'aria-label': name, title: name, onclick: onClose,
}, [icon('close')]);
