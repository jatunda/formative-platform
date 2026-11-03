// Mockup shell shared by all three directions: reads the URL hash
// (`#passing&theme=light`), renders the direction's main screen plus the shared
// overlay markup, and adds a small state switcher for browsing by hand.
// The switcher is hidden inside iframes and with `&shot=1` (screenshots).
(function () {
  const { STATES, LABELS, ALARMS, BELL_SCHEDULES } = window.MockData;

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const PATHS = {
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6M12 2v3"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    bellOff: '<path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2H8"/><path d="M10 20.5a2 2 0 0 0 4 0M3 3l18 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pip: '<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="6" rx="1"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    gear:
      '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    soundOff: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l4 6M21 9l-4 6"/>',
    sound: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    play: '<path d="M8 5l11 7-11 7z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  };
  const icon = (name, cls = '') =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;

  // The main-screen controls every direction offers. Directions choose layout.
  const CONTROLS = [
    { id: 'timer', icon: 'timer', label: 'Timer' },
    { id: 'bells', icon: 'bell', label: 'Bells on', pressed: true },
    { id: 'add', icon: 'plus', label: 'Add Readout' },
    { id: 'mini', icon: 'pip', label: 'Mini player' },
    { id: 'full', icon: 'expand', label: 'Fullscreen' },
    { id: 'settings', icon: 'gear', label: 'Settings' },
  ];
  const controlButton = (c, cls = 'ctl') =>
    `<button type="button" class="${cls}" data-ctl="${c.id}"${c.pressed !== undefined ? ` aria-pressed="${c.pressed}"` : ''}>${icon(c.icon)}<span class="ctl__label">${esc(c.label)}</span></button>`;

  const FEEDBACK = 'mailto:erich@villagechristian.org?subject=Clock%20feedback';
  const feedbackLink = (cls = 'feedback') =>
    `<a class="${cls}" href="${FEEDBACK}">Feedback? Email Eric</a>`;

  // ---------- shared overlays ----------

  const soundPrompt = () => `
    <div class="sound-prompt" role="status">
      ${icon('soundOff', 'sound-prompt__icon')}
      <span class="sound-prompt__text">Sound is off</span>
      <button type="button" class="btn btn--accent">${icon('sound')}Turn sound on</button>
    </div>`;

  const ringing = (st) => `
    <div class="ring-flash" aria-hidden="true"></div>
    <div class="ring-card" role="alertdialog" aria-labelledby="ring-title" aria-describedby="ring-detail">
      <p class="ring-card__kind">${icon('bell')}<span>Ringing · ${esc(st.ring.kind)}</span></p>
      <h2 class="ring-card__title" id="ring-title">${esc(st.ring.title)}</h2>
      <p class="ring-card__detail" id="ring-detail">${esc(st.ring.detail)}</p>
      <button type="button" class="btn btn--accent btn--big ring-card__dismiss">Dismiss</button>
    </div>`;

  const picker = () => `
    <div class="scrim" aria-hidden="true"></div>
    <div class="dialog picker" role="dialog" aria-modal="true" aria-labelledby="picker-title">
      <div class="dialog__head">
        <h2 id="picker-title">Start a timer</h2>
        <button type="button" class="btn btn--icon" aria-label="Close">${icon('close')}</button>
      </div>
      <div class="picker__grid" role="group" aria-label="Presets">
        ${[1, 2, 5, 10].map((m) => `<button type="button" class="preset"><span class="preset__num">${m}</span><span class="preset__unit">min</span></button>`).join('')}
      </div>
      <p class="picker__sub" id="recent-label">Recent</p>
      <div class="picker__recent" role="group" aria-labelledby="recent-label">
        ${['3:00', '7:30', '15:00'].map((t) => `<button type="button" class="chip">${t}</button>`).join('')}
      </div>
      <form class="picker__custom" onsubmit="return false">
        <label class="field field--time"><span class="field__label">Minutes</span><input class="input" type="text" inputmode="numeric" value="12" size="3"></label>
        <span class="picker__colon" aria-hidden="true">:</span>
        <label class="field field--time"><span class="field__label">Seconds</span><input class="input" type="text" inputmode="numeric" value="00" size="3"></label>
        <button type="submit" class="btn btn--accent">${icon('play')}Start</button>
      </form>
    </div>`;

  const check = (label, checked, name = 'x') =>
    `<label class="check"><input type="checkbox" name="${name}"${checked ? ' checked' : ''}><span>${esc(label)}</span></label>`;
  const radio = (label, checked, name) =>
    `<label class="check check--radio"><input type="radio" name="${name}"${checked ? ' checked' : ''}><span>${esc(label)}</span></label>`;
  const toggle = (label, on, hint = '') =>
    `<label class="switch"><span class="switch__text"><span>${esc(label)}</span>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</span><input type="checkbox" role="switch"${on ? ' checked' : ''}><span class="switch__track" aria-hidden="true"></span></label>`;

  const periodName = (p) => (LABELS[p] ? `${p} · ${LABELS[p]}` : p);

  const alarmForm = () => `
    <form class="alarm-form" id="alarm-form" onsubmit="return false" aria-labelledby="alarm-form-title">
      <h4 id="alarm-form-title">New Period Alarm</h4>
      <label class="field"><span class="field__label">Name</span><input class="input" type="text" value="Exit ticket"></label>
      <fieldset class="fieldset">
        <legend>When it rings</legend>
        <div class="segmented segmented--3">
          ${radio('From the start', false, 'when')}${radio('Before the end', true, 'when')}${radio('Halfway', false, 'when')}
        </div>
        <label class="field field--inline"><input class="input input--num" type="text" inputmode="numeric" value="10" size="3"><span>minutes before the end</span></label>
      </fieldset>
      <fieldset class="fieldset">
        <legend>Periods</legend>
        <div class="checks">
          ${['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7'].map((p) => check(periodName(p), p !== 'Period 4', 'p')).join('')}
          ${check('Seminar', false, 'p')}${check('Super Seminar', false, 'p')}
        </div>
      </fieldset>
      <fieldset class="fieldset">
        <legend>Bell Schedules</legend>
        <div class="fieldset__actions">
          <button type="button" class="btn btn--small" aria-pressed="true">Block Days</button>
          <button type="button" class="btn btn--small" aria-pressed="false">Every schedule</button>
        </div>
        <div class="checks">
          ${BELL_SCHEDULES.map((b) => check(b.name, b.block, 'b')).join('')}
        </div>
      </fieldset>
      <div class="field field--row">
        <label class="field"><span class="field__label">Sound</span>
          <span class="select"><select class="input"><option>Chime</option><option selected>School bell</option><option>Beep</option><option>Buzzer</option></select></span>
        </label>
        <button type="button" class="btn">${icon('play')}Preview</button>
      </div>
      <div class="form-actions">
        <button type="button" class="btn">Cancel</button>
        <button type="submit" class="btn btn--accent">Save Alarm</button>
      </div>
    </form>`;

  const drawer = (withForm, clock24) => `
    <div class="scrim" aria-hidden="true"></div>
    <div class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div class="drawer__head">
        <h2 id="drawer-title">Settings</h2>
        <button type="button" class="btn btn--icon" aria-label="Close settings">${icon('close')}</button>
      </div>
      <div class="drawer__body">
        <section class="drawer__section" aria-labelledby="s-div">
          <h3 id="s-div">Division</h3>
          <div class="segmented" role="radiogroup" aria-labelledby="s-div">
            ${radio('Middle School', false, 'div')}${radio('High School', true, 'div')}
          </div>
        </section>
        <section class="drawer__section" aria-labelledby="s-display">
          <h3 id="s-display">Display</h3>
          ${toggle('24-hour time', clock24, clock24 ? 'Clock times show as 13:05. Countdowns stay the same.' : 'Clock times show as 1:05. Countdowns stay the same.')}
        </section>
        <section class="drawer__section" aria-labelledby="s-sound">
          <h3 id="s-sound">Sound</h3>
          ${toggle('Bells', true, 'Start and end of every Period and Break')}
          <label class="field"><span class="field__label">Volume <span class="field__value">70%</span></span>
            <input class="range" type="range" min="0" max="100" value="70" style="--val:70%">
          </label>
          <p class="note">Keep this tab open for Bells and Alarms to play. Minimised is fine. Browsers need one click after each load before sound can play.</p>
        </section>
        <section class="drawer__section" aria-labelledby="s-labels">
          <h3 id="s-labels">Period Labels</h3>
          <div class="labels-grid">
            ${['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7', 'Seminar']
              .map((p) => `<label class="field field--label"><span class="field__label">${p}</span><input class="input" type="text" value="${esc(LABELS[p] || '')}" placeholder="Add a label"></label>`)
              .join('')}
          </div>
        </section>
        <section class="drawer__section" aria-labelledby="s-alarms">
          <h3 id="s-alarms">Alarms</h3>
          <ul class="alarm-list">
            ${ALARMS.map(
              (a) => `<li class="alarm-item">
                <span class="alarm-item__text"><span class="alarm-item__name">${esc(a.name)}</span><span class="hint">${esc(clock24 ? timeIn(a.detail) : a.detail)} · ${esc(a.sound)}</span></span>
                <button type="button" class="btn btn--small">Edit</button>
                <label class="switch switch--bare"><span class="visually-hidden">${esc(a.name)} on</span><input type="checkbox" role="switch"${a.on ? ' checked' : ''}><span class="switch__track" aria-hidden="true"></span></label>
              </li>`
            ).join('')}
          </ul>
          ${withForm ? alarmForm() : ''}
          <div class="form-actions form-actions--start">
            <button type="button" class="btn">${icon('plus')}Clock Alarm</button>
            <button type="button" class="btn"${withForm ? ' aria-expanded="true"' : ''}>${icon('plus')}Period Alarm</button>
          </div>
        </section>
        <section class="drawer__section drawer__section--quiet" aria-labelledby="s-about">
          <h3 id="s-about">About</h3>
          <p class="note">The mini player works in Chrome and Edge on a computer.</p>
          ${feedbackLink('feedback feedback--drawer')}
        </section>
      </div>
    </div>`;

  const firstVisit = () => `
    <div class="scrim scrim--solid" aria-hidden="true"></div>
    <div class="dialog first" role="dialog" aria-modal="true" aria-labelledby="first-title" aria-describedby="first-desc">
      <h2 id="first-title">Which Division are you with?</h2>
      <p id="first-desc" class="first__desc">The clock follows your Division's bell times. You can switch any time.</p>
      <div class="first__choices">
        <button type="button" class="choice"><span class="choice__big">MS</span><span>Middle School</span></button>
        <button type="button" class="choice"><span class="choice__big">HS</span><span>High School</span></button>
      </div>
      ${feedbackLink('feedback feedback--first')}
    </div>`;

  const overlays = (st, clock24) => {
    switch (st.overlay) {
      case 'ringing':
        return ringing(st);
      case 'sound':
        return soundPrompt();
      case 'picker':
        return picker();
      case 'settings':
        return drawer(false, clock24);
      case 'alarm':
        return drawer(true, clock24);
      case 'first':
        return firstVisit();
      default:
        return '';
    }
  };

  // ---------- 24-hour time (device setting, `&clock=24`) ----------
  // Only clock times change (current time, Segment start/end, "starts at",
  // Clock Alarm times); countdowns and durations never do. The fake data is
  // written in 12-hour form without AM/PM, so a bare 1:00–6:59 is afternoon
  // (school-day times) unless it says AM.
  const to24 = (h, m, ap) => {
    let hh = +h;
    if (ap === 'PM' && hh < 12) hh += 12;
    else if (ap === 'AM' && hh === 12) hh = 0;
    else if (!ap && hh >= 1 && hh <= 6) hh += 12;
    return `${String(hh).padStart(2, '0')}:${m}`;
  };
  const timeIn = (s) => String(s).replace(/\b(\d{1,2}):(\d{2})(?::\d\d)?(?:\s?(AM|PM))?/g, (all, h, m, ap) => (all.split(':').length > 2 ? all : to24(h, m, ap)));

  const ORIGINAL_SCHEDULES = JSON.parse(JSON.stringify(window.MockData.SCHEDULES));
  const applyClock = (scene, clock24) => {
    for (const [k, segs] of Object.entries(ORIGINAL_SCHEDULES)) {
      window.MockData.SCHEDULES[k] = segs.map((g) => (clock24 ? { ...g, start: timeIn(g.start), end: timeIn(g.end) } : g));
    }
    if (!clock24) return scene;
    const r = (x) => (x && x.mode === 'clock' ? { ...x, value: timeIn(x.value + (x.suffix ? ' ' + x.suffix : '')), suffix: undefined } : x);
    return {
      ...scene,
      span: scene.span && { start: timeIn(scene.span.start), end: timeIn(scene.span.end) },
      facts: scene.facts && { ...scene.facts, clock: timeIn(scene.facts.clock), ends: timeIn(scene.facts.ends) },
      upNext: scene.upNext && { ...scene.upNext, at: timeIn(scene.upNext.at) },
      line: scene.line && timeIn(scene.line),
      big: r(scene.big),
      small: (scene.small || []).map(r),
    };
  };

  // ---------- routing ----------

  const parse = () => {
    const [id, ...rest] = location.hash.replace(/^#/, '').split('&');
    const params = Object.fromEntries(rest.map((kv) => kv.split('=')));
    return { id: id || 'period', theme: params.theme === 'light' ? 'light' : 'dark', shot: params.shot === '1', clock24: params.clock === '24' };
  };

  const switcher = (cur, theme, clock24) => {
    const href = (id, t, c = clock24) => `#${id}${t === 'light' ? '&theme=light' : ''}${c ? '&clock=24' : ''}`;
    return `<details class="mock-switcher" data-mock>
      <summary>Mockup: ${esc(cur.title)}</summary>
      <nav aria-label="Mockup states"><ul>
        ${STATES.map((s) => `<li><a href="${href(s.id, theme)}"${s.id === cur.id ? ' aria-current="true"' : ''}>${esc(s.title)}</a></li>`).join('')}
      </ul>
      <p><a href="${href(cur.id, theme === 'light' ? 'dark' : 'light')}">Switch to ${theme === 'light' ? 'dark' : 'light'} theme</a> · <a href="${href(cur.id, theme, !clock24)}">${clock24 ? '12-hour' : '24-hour'} time</a> · <a href="../index.html">All directions</a></p></nav>
    </details>`;
  };

  const render = () => {
    const D = window.Direction;
    const { id, theme, shot, clock24 } = parse();
    const found = STATES.find((s) => s.id === id) || STATES[0];
    const st = { ...found, scene: applyClock(found.scene, clock24) };
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.state = st.id;
    root.dataset.kind = st.scene.kind;
    root.dataset.overlay = st.overlay || '';
    root.dataset.mini = st.mini ? 'true' : 'false';
    document.title = `${D.name}: ${st.title}`;
    const app = document.getElementById('app');
    const body = st.mini ? D.renderMini(st.scene, st) : D.renderMain(st.scene, st) + overlays(st, clock24);
    const showSwitcher = !shot && window.self === window.top;
    app.innerHTML = body + (showSwitcher ? switcher(st, theme, clock24) : '');
    if (st.overlay === 'alarm') {
      const body2 = app.querySelector('.drawer__body');
      const form = app.querySelector('#alarm-form');
      if (body2 && form) body2.scrollTop = form.getBoundingClientRect().top - body2.getBoundingClientRect().top - 24;
    }
  };

  window.Mock = { esc, icon, CONTROLS, controlButton, feedbackLink, periodName, render };
  window.addEventListener('hashchange', render);
  document.addEventListener('DOMContentLoaded', render);
})();
