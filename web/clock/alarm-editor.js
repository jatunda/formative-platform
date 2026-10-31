// The Settings drawer's Alarms section: the teacher's Alarms as a list (name,
// a one-line summary, Edit and an on/off switch), "+ Clock Alarm" and
// "+ Period Alarm", and one editor form at a time (a new Alarm's under the
// list, an edited one in place of its item). On/off and Delete apply at once
// (Delete with an Undo toast); the form's changes apply on Save Alarm. When
// and how Alarms ring is the clock model's (`ringsInWindow`); this only edits
// the saved list.
import { BLOCK_DAYS, DEFAULT_ALARM_PERIODS, LABELLED_PERIODS } from './clock-settings.js';
import { el } from './dom.js';
import { formatSegmentName } from './format.js';
import { icon } from './icons.js';
import { drawerSection, soundChoice, switchControl } from './settings-drawer.js';
import {
  alarmHint, alarmName, isBlockDays, nextAlarmId, onceDate, parseMinutes, parseTime, scheduleChoices, timeFields,
} from './alarm-text.js';

/** @typedef {import('./clock-settings.js').Alarm} Alarm */
/** @typedef {import('./clock-settings.js').ClockAlarm} ClockAlarm */
/** @typedef {import('./clock-settings.js').PeriodAlarm} PeriodAlarm */

const ID = 'clock-alarm-form';
const TOAST_MS = 6000;
/** @type {[string, string][]} Where a Period Alarm rings: value and words. */
const ANCHORS = [['start', 'From the start'], ['end', 'Before the end'], ['halfway', 'Halfway']];
/** The words after the minutes field, by where it rings ('' has no minutes). @type {Record<string, string>} */
const MINUTES_WORDS = { start: 'minutes from the start', end: 'minutes before the end', halfway: '' };

/**
 * Radios shown as a segmented control. @param {string} name @param {string} groupLabel
 * @param {[string, string][]} options value and words @param {string} chosen @param {() => void} [onChange]
 */
function segmented(name, groupLabel, options, chosen, onChange) {
  const inputs = options.map(([value, words]) => {
    const input = el('input', { type: 'radio', name, value, checked: value === chosen, onchange: onChange });
    return { input, label: el('label', { className: 'clock-segment' }, [input, el('span', { textContent: words })]) };
  });
  const group = el('div', { className: 'clock-segmented', role: 'radiogroup', 'aria-label': groupLabel },
    inputs.map(({ label }) => label));
  return { group, value: () => inputs.find(({ input }) => input.checked)?.input.value };
}

/** A checkbox with its words beside it. @param {string} words @param {boolean} checked */
function check(words, checked) {
  const input = el('input', { type: 'checkbox', checked });
  const text = el('span', { textContent: words });
  return { input, text, label: el('label', { className: 'clock-check' }, [input, text]) };
}

/**
 * A titled group of controls. @param {string} legend @param {(Node | string)[]} children
 */
const fieldset = (legend, children) => el('fieldset', { className: 'clock-fieldset' }, [
  el('legend', { textContent: legend }), ...children,
]);

/**
 * The Bell Schedules checklist with its Block Days / Every schedule
 * shortcuts. `keys` null ticks every one.
 * @param {import('./alarm-text.js').ScheduleChoice[]} choices @param {string[] | null} keys
 */
function scheduleChecks(choices, keys) {
  const checks = choices.map((choice) => ({
    choice, ...check(choice.name, keys === null || choice.keys.some((k) => keys.includes(k))),
  }));
  const ticked = () => checks.filter(({ input }) => input.checked).flatMap(({ choice }) => choice.keys);
  /** @param {(choice: import('./alarm-text.js').ScheduleChoice) => boolean} pick */
  const tick = (pick) => {
    for (const { choice, input } of checks) input.checked = pick(choice);
    pressed();
  };
  const blockDays = el('button', {
    type: 'button', className: 'clock-btn clock-btn--small', textContent: 'Block Days',
    onclick: () => tick((choice) => choice.keys.some((k) => BLOCK_DAYS.includes(k))),
  });
  const every = el('button', {
    type: 'button', className: 'clock-btn clock-btn--small', textContent: 'Every schedule', onclick: () => tick(() => true),
  });
  function pressed() {
    blockDays.setAttribute('aria-pressed', String(isBlockDays(ticked())));
    every.setAttribute('aria-pressed', String(checks.every(({ input }) => input.checked)));
  }
  for (const { input } of checks) input.addEventListener('change', pressed);
  pressed();
  const element = el('div', { className: 'clock-schedule-checks' }, [
    el('div', { className: 'clock-fieldset__actions' }, [blockDays, every]),
    el('div', { className: 'clock-checks' }, checks.map(({ label }) => label)),
  ]);
  /** The ticked Bell Schedule keys; null when every one is ticked. */
  const value = () => (checks.every(({ input }) => input.checked) ? null : ticked());
  return { element, value };
}

/**
 * @param {{ settings: () => import('./clock-settings.js').ClockSettings,
 *   update: (change: Partial<import('./clock-settings.js').ClockSettings>) => void,
 *   play: (sound: import('./clock-settings.js').SoundName) => void,
 *   now: () => Date, schoolYears: import('./school-years.js').SchoolYear[] }} options
 *   `update` saves a change and redraws the page; `play` previews a voice; `now` is the clock's time.
 */
export function createAlarmEditor({ settings, update, play, now, schoolYears }) {
  const choices = scheduleChoices(schoolYears);
  const list = el('ul', { className: 'clock-alarm-list' });
  const newSlot = el('div');
  const addClock = el('button', {
    type: 'button', className: 'clock-btn', 'aria-expanded': 'false', onclick: () => openForm('clock', null),
  }, [icon('plus'), 'Clock Alarm']);
  const addPeriod = el('button', {
    type: 'button', className: 'clock-btn', 'aria-expanded': 'false', onclick: () => openForm('period', null),
  }, [icon('plus'), 'Period Alarm']);
  const toastText = el('span', { textContent: 'Alarm deleted' });
  const undo = el('button', { type: 'button', className: 'clock-btn clock-btn--small', textContent: 'Undo' });
  const toast = el('div', { className: 'clock-alarm-toast', role: 'status', hidden: true }, [icon('check'), toastText, undo]);
  const section = drawerSection('alarms', 'Alarms', [
    list, newSlot, el('div', { className: 'clock-form-actions clock-form-actions--start' }, [addClock, addPeriod]), toast,
  ]);

  /**
   * The open form: which Alarm it edits (null for a new one), its element, and
   * how to bring its Period checklist's labels up to date.
   * @type {{ id: string | null, kind: 'clock' | 'period', form: HTMLFormElement, relabel: () => void } | null}
   */
  let editing = null;
  let shown = '';
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let toastTimer;

  /** @param {Alarm[]} alarms */
  const saveAlarms = (alarms) => update({ alarms });

  /** Close the form, if one is open, then focus what `to` gives. @param {() => HTMLElement} [to] */
  function closeForm(to) {
    editing?.form.remove();
    editing = null;
    render();
    to?.().focus();
  }

  /** The Edit button of the listed Alarm `id`. @param {string} id */
  const editButton = (id) => /** @type {HTMLElement} */ (list.querySelector(`[data-alarm="${id}"] .clock-alarm-item__edit`));

  /**
   * Open the form for a new Alarm of `kind`, or for editing `alarm`.
   * @param {'clock' | 'period'} kind @param {Alarm | null} alarm
   */
  function openForm(kind, alarm) {
    editing?.form.remove();
    const built = kind === 'clock'
      ? clockForm(/** @type {ClockAlarm | null} */ (alarm))
      : periodForm(/** @type {PeriodAlarm | null} */ (alarm));
    editing = { id: alarm?.id ?? null, kind, ...built };
    if (!alarm) newSlot.replaceChildren(built.form);
    render();
    /** @type {HTMLElement} */ (built.form.querySelector('input')).focus();
  }

  /**
   * The shared frame of the form: title, the kind's own fields, the sound,
   * the error line and the buttons. `read` gives the Alarm the form describes,
   * or an error message.
   * @param {Alarm | null} alarm @param {'clock' | 'period'} kind @param {(Node | string)[]} fields
   * @param {(base: import('./clock-settings.js').AlarmBase) => Alarm | string} read
   */
  function formFrame(alarm, kind, fields, read) {
    const kindName = kind === 'clock' ? 'Clock Alarm' : 'Period Alarm';
    const name = el('input', { type: 'text', className: 'clock-input', autocomplete: 'off', placeholder: kindName });
    name.value = alarm?.label ?? '';
    const sound = soundChoice('Sound', () => {}, play);
    sound.select.value = alarm?.sound ?? 'chime';
    const error = el('p', { className: 'clock-form-error', id: `${ID}-error`, role: 'alert', hidden: true });
    const cancel = el('button', {
      type: 'button', className: 'clock-btn', textContent: 'Cancel',
      onclick: () => closeForm(() => (alarm ? editButton(alarm.id) : (kind === 'clock' ? addClock : addPeriod))),
    });
    const save = el('button', { type: 'submit', className: 'clock-btn clock-btn--accent', textContent: 'Save Alarm' });
    const buttons = alarm
      ? el('div', { className: 'clock-form-actions clock-form-actions--split' }, [
        el('button', { type: 'button', className: 'clock-btn', onclick: () => remove(alarm) }, [icon('trash'), 'Delete']),
        el('span', { className: 'clock-form-actions' }, [cancel, save]),
      ])
      : el('div', { className: 'clock-form-actions' }, [cancel, save]);
    const form = /** @type {HTMLFormElement} */ (el('form', {
      className: 'clock-alarm-form', 'aria-labelledby': `${ID}-title`, novalidate: true,
      onsubmit: (/** @type {Event} */ event) => {
        event.preventDefault();
        const label = name.value.trim();
        const result = read({
          id: alarm?.id ?? nextAlarmId(settings().alarms),
          ...(label ? { label } : {}),
          enabled: alarm?.enabled ?? true,
          sound: /** @type {import('./clock-settings.js').SoundName} */ (sound.select.value),
          bellSchedules: null,
        });
        if (typeof result === 'string') {
          error.textContent = result;
          error.hidden = false;
          return;
        }
        const alarms = settings().alarms;
        saveAlarms(alarm ? alarms.map((a) => (a.id === alarm.id ? result : a)) : [...alarms, result]);
        closeForm(() => editButton(result.id));
      },
    }, [
      el('h4', { id: `${ID}-title`, textContent: `${alarm ? 'Edit' : 'New'} ${kindName}` }),
      el('label', { className: 'clock-field' }, [el('span', { className: 'clock-field__label', textContent: 'Name' }), name]),
      ...fields,
      sound.row,
      error,
      buttons,
    ]));
    return form;
  }

  /** @param {ClockAlarm | null} alarm */
  function clockForm(alarm) {
    const use24Hour = settings().use24Hour;
    const parts = alarm ? timeFields(alarm.time, use24Hour) : { hour: '', minute: '', pm: false };
    /** @param {string} words @param {string} value */
    const timeField = (words, value) => {
      const input = el('input', { type: 'text', className: 'clock-input clock-input--num', inputMode: 'numeric', size: 2, autocomplete: 'off' });
      input.value = value;
      return { input, label: el('label', { className: 'clock-field' }, [el('span', { className: 'clock-field__label', textContent: words }), input]) };
    };
    const hour = timeField('Hour', parts.hour);
    const minute = timeField('Minute', parts.minute);
    const ampm = segmented(`${ID}-ampm`, 'AM or PM', [['am', 'AM'], ['pm', 'PM']], parts.pm ? 'pm' : 'am');
    ampm.group.classList.add('clock-segmented--ampm');
    const repeat = segmented(`${ID}-repeat`, 'Repeats', [['once', 'Once'], ['everySchoolDay', 'Every School Day']],
      alarm?.repeat ?? 'everySchoolDay');
    const schedules = scheduleChecks(choices, alarm?.bellSchedules ?? null);
    const some = switchControl(`${ID}-some`, 'Only on some Bell Schedules', 'Otherwise it rings on any day.',
      (on) => { schedules.element.hidden = !on; });
    some.input.checked = (alarm?.bellSchedules ?? null) !== null;
    schedules.element.hidden = !some.input.checked;

    const form = formFrame(alarm, 'clock', [
      fieldset('Time', [el('div', { className: 'clock-time-row' }, [
        hour.label, el('span', { className: 'clock-time-row__colon', 'aria-hidden': 'true', textContent: ':' }), minute.label,
        ...(use24Hour ? [] : [ampm.group]),
      ])]),
      fieldset('Repeats', [repeat.group]),
      fieldset('Bell Schedules', [some.label, schedules.element]),
    ], (base) => {
      const time = parseTime(hour.input.value, minute.input.value, use24Hour ? null : ampm.value() === 'pm');
      if (time === null) return use24Hour ? 'Enter a time from 00:00 to 23:59.' : 'Enter a time from 1:00 to 12:59.';
      const bellSchedules = some.input.checked ? schedules.value() : null;
      if (bellSchedules?.length === 0) return 'Tick at least one Bell Schedule.';
      const kind = /** @type {const} */ ('clock');
      return repeat.value() === 'once'
        ? { ...base, kind, bellSchedules, time, repeat: 'once', date: onceDate(time, now()) }
        : { ...base, kind, bellSchedules, time, repeat: 'everySchoolDay' };
    });
    return { form, relabel: () => {} };
  }

  /** @param {PeriodAlarm | null} alarm */
  function periodForm(alarm) {
    const anchor = alarm?.anchor ?? { from: 'end', minutes: 5 };
    const minutesText = el('span', { id: `${ID}-minutes-name` });
    const minutes = el('input', {
      type: 'text', className: 'clock-input clock-input--num', inputMode: 'numeric', size: 3, autocomplete: 'off',
      'aria-labelledby': minutesText.id,
    });
    minutes.value = 'minutes' in anchor ? String(anchor.minutes) : '5';
    const minutesRow = el('label', { className: 'clock-field clock-field--inline' }, [minutes, minutesText]);
    const when = segmented(`${ID}-when`, 'When it rings', ANCHORS, anchor.from, () => showMinutes());
    when.group.classList.add('clock-segmented--3');
    function showMinutes() {
      const words = MINUTES_WORDS[/** @type {string} */ (when.value())];
      minutesRow.hidden = words === '';
      minutesText.textContent = words;
    }
    showMinutes();
    const periods = alarm?.periods ?? DEFAULT_ALARM_PERIODS;
    const periodChecks = LABELLED_PERIODS.map((period) => ({ period, ...check(period, periods.includes(period)) }));
    const relabel = () => {
      for (const { period, text } of periodChecks) {
        text.textContent = formatSegmentName({ name: period, kind: 'period' }, settings().periodLabels);
      }
    };
    relabel();
    const schedules = scheduleChecks(choices, alarm?.bellSchedules ?? null);

    const form = formFrame(alarm, 'period', [
      fieldset('When it rings', [when.group, minutesRow]),
      fieldset('Periods', [el('div', { className: 'clock-checks' }, periodChecks.map(({ label }) => label))]),
      fieldset('Bell Schedules', [schedules.element]),
    ], (base) => {
      const from = /** @type {'start' | 'end' | 'halfway'} */ (when.value());
      const count = parseMinutes(minutes.value);
      if (from !== 'halfway' && count === null) return 'Enter a number of minutes from 1 to 240.';
      const chosen = periodChecks.filter(({ input }) => input.checked).map(({ period }) => period);
      if (chosen.length === 0) return 'Tick at least one Period.';
      const bellSchedules = schedules.value();
      if (bellSchedules?.length === 0) return 'Tick at least one Bell Schedule.';
      return {
        ...base, kind: 'period', bellSchedules, periods: chosen,
        anchor: from === 'halfway' ? { from } : { from, minutes: /** @type {number} */ (count) },
      };
    });
    return { form, relabel };
  }

  /** Delete `alarm` at once, with an Undo toast. @param {Alarm} alarm */
  function remove(alarm) {
    const before = settings().alarms;
    saveAlarms(before.filter((a) => a.id !== alarm.id));
    closeForm();
    clearTimeout(toastTimer);
    toastText.textContent = `${alarmName(alarm)} deleted`;
    toast.hidden = false;
    undo.onclick = () => {
      hideToast();
      saveAlarms(before);
      editButton(alarm.id).focus();
    };
    undo.focus();
    toastTimer = setTimeout(() => {
      const hadFocus = toast.contains(document.activeElement);
      hideToast();
      if (hadFocus) addClock.focus();
    }, TOAST_MS);
  }

  function hideToast() {
    clearTimeout(toastTimer);
    toast.hidden = true;
  }

  /** Turn `alarm` on or off; a "once" Clock Alarm turned on rings at its next chance. @param {Alarm} alarm @param {boolean} on */
  function setEnabled(alarm, on) {
    const next = alarm.kind === 'clock' && alarm.repeat === 'once' && on
      ? { ...alarm, enabled: on, date: onceDate(alarm.time, now()) }
      : { ...alarm, enabled: on };
    saveAlarms(settings().alarms.map((a) => (a.id === alarm.id ? next : a)));
  }

  /** One Alarm in the list (or the form, when it's being edited). @param {Alarm} alarm */
  function item(alarm) {
    if (editing?.id === alarm.id) {
      const li = el('li', { className: 'clock-alarm-item clock-alarm-item--editing' }, [editing.form]);
      li.dataset.alarm = alarm.id;
      return li;
    }
    const name = alarmName(alarm);
    const s = settings();
    const toggle = el('input', {
      type: 'checkbox', role: 'switch', checked: alarm.enabled, 'aria-label': `${name} on`,
      onchange: () => setEnabled(alarm, toggle.checked),
    });
    const li = el('li', { className: 'clock-alarm-item' }, [
      el('span', { className: 'clock-alarm-item__text' }, [
        el('span', { className: 'clock-alarm-item__name', textContent: name }),
        el('span', { className: 'clock-hint', textContent: alarmHint(alarm, { use24Hour: s.use24Hour, choices }) }),
      ]),
      el('button', {
        type: 'button', className: 'clock-btn clock-btn--small clock-alarm-item__edit', textContent: 'Edit',
        'aria-label': `Edit ${name}`, onclick: () => openForm(alarm.kind, alarm),
      }),
      el('label', { className: 'clock-switch clock-switch--bare' }, [
        toggle, el('span', { className: 'clock-switch__track', 'aria-hidden': 'true' }),
      ]),
    ]);
    li.dataset.alarm = alarm.id;
    return li;
  }

  /**
   * Bring the list in step with the settings. It's only redrawn when what it
   * shows changes, so an open form (and the focus in it) survives the ticks.
   */
  function render() {
    const s = settings();
    const next = JSON.stringify([s.alarms, s.use24Hour, editing?.id]);
    editing?.relabel();
    addClock.setAttribute('aria-expanded', String(editing?.id === null && editing.kind === 'clock'));
    addPeriod.setAttribute('aria-expanded', String(editing?.id === null && editing.kind === 'period'));
    if (next === shown) return;
    shown = next;
    list.replaceChildren(...s.alarms.map(item));
    list.hidden = s.alarms.length === 0;
  }
  render();

  return { section, render };
}
