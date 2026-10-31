// The Settings drawer: what the clock does (Division, time text, sound,
// Period Labels, the day's coming rings, About). How it looks is the Look
// sheet's (ticket 21); until then a last Bottom bar section holds the bar's
// setting. It's a modal dialog from the right over a scrim, built once (so
// typing a Period Label survives the ticks); each render brings its controls
// in step with the settings, which the top bar can change too.
//
// The drawer is one scrolling column of sections, each made by
// `drawerSection()`. A new feature adds a section to `sections` below; it
// never restructures the drawer. The Alarms section (ticket 15) goes between
// Period Labels and Next rings today.
import { LABELLED_PERIODS } from './clock-settings.js';
import { el } from './dom.js';
import { icon } from './icons.js';
import { createModal } from './modal.js';
import { SOUNDS, SOUND_NAMES } from './sound.js';

const ID = 'clock-settings';
export const DIVISIONS = [['MS', 'Middle School'], ['HS', 'High School']];
export const FEEDBACK_HREF = `mailto:erich@villagechristian.org?subject=${encodeURIComponent('Clock feedback')}`;

/**
 * One section of the drawer: an uppercase heading that names it, then its
 * controls. Its id is `clock-settings-<key>`.
 * @param {string} key @param {string} title @param {(Node | string)[]} children
 */
export function drawerSection(key, title, children) {
  const id = `${ID}-${key}`;
  return el('section', { className: 'clock-drawer__section', id, 'aria-labelledby': `${id}-title` }, [
    el('h3', { id: `${id}-title`, textContent: title }),
    ...children,
  ]);
}

/**
 * An on/off switch named `name`, with an optional hint under the name.
 * @param {string} id @param {string} name @param {string} hint @param {(on: boolean) => void} onChange
 */
function switchControl(id, name, hint, onChange) {
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
function soundChoice(name, onChange, preview) {
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
 * @param {{ settings: () => import('./clock-settings.js').ClockSettings,
 *   update: (change: Partial<import('./clock-settings.js').ClockSettings>) => void,
 *   play: (sound: import('./clock-settings.js').SoundName) => void,
 *   testRing: () => void, behind: () => Element[], onChange: (open: boolean) => void }} options
 *   `settings` gives the current settings and `update` saves a change (and redraws the page);
 *   `play` previews a voice and `testRing` rings the Bells' sound now; `behind` gives the page
 *   parts made inert while the drawer is open, and `onChange` hears it open and close.
 */
export function createSettingsDrawer({ settings, update, play, testRing, behind, onChange }) {
  const divisionInputs = DIVISIONS.map(([key, name]) => {
    const input = el('input', {
      type: 'radio', name: `${ID}-division`, value: key, onchange: () => update({ division: key }),
    });
    return { key, input, label: el('label', { className: 'clock-segment' }, [input, el('span', { textContent: name })]) };
  });
  const division = drawerSection('division', 'Division', [
    el('div', { className: 'clock-segmented', role: 'radiogroup', 'aria-labelledby': `${ID}-division-title` },
      divisionInputs.map(({ label }) => label)),
  ]);

  const seconds = switchControl(`${ID}-seconds`, 'Show seconds',
    'The last minute of a countdown and the timer always show seconds.',
    (on) => update({ showSeconds: on }));
  const use24Hour = switchControl(`${ID}-24-hour`, '24-hour time', '', (on) => update({ use24Hour: on }));
  const time = drawerSection('time', 'Time', [seconds.label, use24Hour.label]);

  const bells = switchControl(`${ID}-bells`, 'Bells', 'Start and end of every Period and Break',
    (on) => update({ bells: { ...settings().bells, on } }));
  const volumeValue = el('span', { className: 'clock-field__value' });
  const volume = el('input', {
    type: 'range', className: 'clock-range', min: '0', max: '100', step: '5', 'aria-labelledby': `${ID}-volume-name`,
    oninput: () => update({ volume: Number(volume.value) / 100 }),
  });
  const bellSound = soundChoice('Bell sound', (sound) => update({ bells: { ...settings().bells, sound } }), play);
  const timerSound = soundChoice('Timer sound', (sound) => update({ timerSound: sound }), play);
  const sound = drawerSection('sound', 'Sound', [
    bells.label,
    el('label', { className: 'clock-field' }, [
      el('span', { className: 'clock-field__label' }, [el('span', { id: `${ID}-volume-name`, textContent: 'Volume' }), ' ', volumeValue]),
      volume,
    ]),
    bellSound.row,
    timerSound.row,
    el('button', { type: 'button', className: 'clock-btn clock-btn--small', textContent: 'Test ring', onclick: testRing }),
    el('p', {
      className: 'clock-note',
      textContent: 'Keep this tab open for Bells and Alarms to play. Minimised is fine. '
        + 'Browsers need one click after each load before sound can play.',
    }),
  ]);

  const labelInputs = LABELLED_PERIODS.map((period) => {
    const input = el('input', {
      type: 'text', className: 'clock-input', placeholder: 'Add a label', autocomplete: 'off',
      oninput: () => update({ periodLabels: { ...settings().periodLabels, [period]: input.value } }),
    });
    input.value = settings().periodLabels[period] ?? '';
    return el('label', { className: 'clock-field' }, [el('span', { className: 'clock-field__label', textContent: period }), input]);
  });
  const labels = drawerSection('labels', 'Period Labels', [el('div', { className: 'clock-labels-grid' }, labelInputs)]);

  const ringList = el('ul', { className: 'clock-rings' });
  const today = drawerSection('today', 'Next rings today', [ringList]);

  const about = drawerSection('about', 'About', [
    el('p', { className: 'clock-note', textContent: 'The mini player works in Chrome and Edge on a computer.' }),
    el('a', { className: 'clock-feedback', href: FEEDBACK_HREF, textContent: 'Feedback? Email Eric' }),
  ]);
  about.classList.add('clock-drawer__section--quiet');

  // For now only: the bar's setting moves to the Look sheet (ticket 21),
  // which takes this section out. Whole day is the saved dayStrip on, just
  // this Segment off.
  const barChoices = /** @type {[string, boolean][]} */ ([['Whole day', true], ['Just this Segment', false]]).map(([name, on]) => {
    const input = el('input', { type: 'radio', name: `${ID}-bar`, onchange: () => update({ dayStrip: on }) });
    return { on, input, label: el('label', {}, [input, ` ${name}`]) };
  });
  const bar = drawerSection('bar', 'Bottom bar', [
    el('div', { className: 'clock-bar-setting', role: 'radiogroup', 'aria-labelledby': `${ID}-bar-title` },
      barChoices.map(({ label }) => label)),
  ]);

  // In order. Alarms (ticket 15) goes after `labels`.
  const sections = [division, time, sound, labels, today, about, bar];

  const closeButton = el('button', {
    type: 'button', className: 'clock-btn clock-btn--icon', 'aria-label': 'Close settings', title: 'Close settings',
    onclick: () => modal.close(),
  }, [icon('close')]);
  const dialog = el('div', {
    className: 'clock-drawer', id: ID, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': `${ID}-title`,
  }, [
    el('div', { className: 'clock-drawer__head' }, [el('h2', { id: `${ID}-title`, textContent: 'Settings' }), closeButton]),
    el('div', { className: 'clock-drawer__body' }, sections),
  ]);
  const scrim = el('div', { className: 'clock-scrim', 'aria-hidden': 'true' });
  const modal = createModal({ dialog, scrim, behind, onChange });

  /** Bring every control in step with the settings. */
  function render() {
    const s = settings();
    for (const { key, input } of divisionInputs) input.checked = s.division === key;
    seconds.input.checked = s.showSeconds;
    use24Hour.input.checked = s.use24Hour;
    use24Hour.hint.textContent = s.use24Hour ? 'Clock times show as 13:05.' : 'Clock times show as 1:05.';
    bells.input.checked = s.bells.on;
    const percent = Math.round(s.volume * 100);
    volume.value = String(percent);
    volume.style.setProperty('--val', `${percent}%`);
    volumeValue.textContent = `${percent}%`;
    bellSound.select.value = s.bells.sound;
    timerSound.select.value = s.timerSound;
    for (const { on, input } of barChoices) input.checked = s.dayStrip === on;
  }
  render();

  return {
    /** The scrim and the drawer, in that order, for the page to mount. */
    elements: [scrim, dialog],
    dialog,
    render,
    /**
     * Open it from `from` (focus returns there on closing), at the Division
     * when `atDivision`. @param {HTMLElement} from @param {{ atDivision?: boolean }} [options]
     */
    open(from, { atDivision = false } = {}) {
      // The chip that opens it at the Division only shows once one is chosen.
      modal.open(from, atDivision ? divisionInputs.find(({ input }) => input.checked).input : undefined);
    },
    isOpen: modal.isOpen,
    /** The day's coming rings as lines of text; with none, the section hides. @param {string[]} lines */
    showRings(lines) {
      today.hidden = lines.length === 0;
      ringList.replaceChildren(...lines.map((line) => el('li', { textContent: line })));
    },
    destroy: modal.destroy,
  };
}
