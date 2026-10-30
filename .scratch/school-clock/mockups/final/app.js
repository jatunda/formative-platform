// School Clock design reference: one page, every state addressable by hash.
//
//   index.html#<state>&mode=light&theme=<id>&font=<id>&palette=<id>
//              &seconds=off&strip=off&clock=24&shot=1
//
// Static and non-functional: every value is fake (data.js). The markup and
// class names are a suggestion for 17-23, not a contract; the tokens
// (tokens.css, themes.css) and the rules in DESIGN.md are the contract.
(function () {
  const { STATES } = window.FinalData;
  const { SCHEDULES, LABELS, ALARMS, BELL_SCHEDULES } = window.MockData;
  const T = window.ClockThemes;

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // ---------- icons ----------
  const PATHS = {
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6M12 2v3"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    readouts: '<rect x="3" y="4" width="18" height="9" rx="2"/><rect x="3" y="16" width="8" height="4" rx="1"/><rect x="13" y="16" width="8" height="4" rx="1"/>',
    pip: '<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="6" rx="1"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    soundOff: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l4 6M21 9l-4 6"/>',
    sound: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    play: '<path d="M8 5l11 7-11 7z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  const icon = (name, cls = '') =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;

  const FLOWERS = `
    <g class="deco__leaf"><path d="M70 120c18-30 46-40 74-34-16 26-44 38-74 34z"/><path d="M118 40c26 6 40 26 40 52-24-8-38-28-40-52z"/></g>
    ${[[60, 60, 30], [128, 96, 22], [36, 140, 18]].map(([x, y, r]) => `<g class="deco__flower" transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="${r * 0.42}" ry="${r * 0.72}" transform="rotate(${a}) translate(0 ${-r * 0.62})"/>`).join('')}<circle class="deco__heart" r="${r * 0.3}"/></g>`).join('')}`;
  const deco = () =>
    `<svg class="deco deco--tr" viewBox="0 0 180 180" aria-hidden="true" focusable="false">${FLOWERS}</svg>
     <svg class="deco deco--bl" viewBox="0 0 180 180" aria-hidden="true" focusable="false">${FLOWERS}</svg>`;

  // ---------- routing ----------
  const parse = () => {
    const [id, ...rest] = location.hash.replace(/^#/, '').split('&');
    const p = Object.fromEntries(rest.map((kv) => kv.split('=')));
    return {
      id: id || 'period',
      mode: p.mode === 'light' ? 'light' : 'dark',
      theme: T.THEMES.some((t) => t.id === p.theme) ? p.theme : T.DEFAULT_THEME,
      font: p.font,
      palette: p.palette,
      seconds: p.seconds !== 'off',
      strip: p.strip !== 'off',
      clock24: p.clock === '24',
      shot: p.shot === '1',
    };
  };

  // ---------- time text (the shared formatter's rules, faked) ----------
  // Clock times: 12- or 24-hour; seconds, when on, are set small after the
  // minutes. Countdowns and count-ups: m:ss or h:mm:ss with seconds on;
  // whole minutes ("42 min", "1h 15m") with seconds off, except under a minute.
  // "4d 17h" is the same either way. The timer always shows seconds.
  const to24 = (h, m, ap) => {
    let hh = +h;
    if (ap === 'PM' && hh < 12) hh += 12;
    else if (ap === 'AM' && hh === 12) hh = 0;
    else if (!ap && hh >= 1 && hh <= 6) hh += 12;
    return `${String(hh).padStart(2, '0')}:${m}`;
  };
  const timeIn = (s, on) => (on ? String(s).replace(/\b(\d{1,2}):(\d{2})(?:\s?(AM|PM))?/g, (_, h, m, ap) => to24(h, m, ap)) : String(s));

  // Returns { html, width } where width is in big-glyph units (for sizing).
  function readoutText(r, scene, opt, always = false) {
    const unit = (u) => `<span class="unit">${esc(u)}</span>`;
    // A space before a unit ("42 min") is set at the unit's small size too.
    const units = (v) => esc(v).replace(/ ?[a-z]+/gi, '<span class="unit">$&</span>');
    if (r.mode === 'clock') {
      const main = opt.clock24 ? timeIn(`${r.value} ${r.suffix || ''}`.trim(), true) : r.value;
      const sec = opt.seconds ? `<span class="sec">:${String(scene.sec ?? 0).padStart(2, '0')}</span>` : '';
      const suffix = !opt.clock24 && r.suffix ? unit(r.suffix) : '';
      const small = (opt.seconds ? 3 : 0) + (suffix ? 2 : 0);
      return { html: esc(main) + sec + suffix, width: main.length + small * 0.42 };
    }
    let v = r.value;
    if (!opt.seconds && !always) {
      const m = v.match(/^(?:(\d+):)?(\d+):(\d\d)$/);
      if (m) {
        const total = (+(m[1] || 0)) * 3600 + +m[2] * 60 + +m[3];
        if (total >= 60) {
          const h = Math.floor(total / 3600);
          const mm = Math.floor((total % 3600) / 60);
          v = h ? `${h}h ${String(mm).padStart(2, '0')}m` : `${mm} min`;
        }
      }
    }
    const letters = (v.match(/[a-z]/gi) || []).length;
    return { html: units(v), width: v.replace(/[a-z ]/gi, '').length + letters * 0.42 };
  }

  const clockAt = (t, opt) => esc(timeIn(t, opt.clock24));
  const periodName = (p) => (LABELS[p] ? `${p} · ${LABELS[p]}` : p);

  // ---------- main screen pieces ----------
  const CONTROLS = (st) => [
    { id: 'timer', icon: 'timer', label: 'Timer' },
    { id: 'bells', icon: 'bell', label: 'Bells', pressed: true },
    { id: 'readouts', icon: 'readouts', label: st.edit ? 'Done' : 'Readouts', pressed: !!st.edit },
    { id: 'mini', icon: 'pip', label: 'Mini player' },
    { id: 'full', icon: 'expand', label: 'Fullscreen' },
    { id: 'settings', icon: 'gear', label: 'Settings' },
  ];

  const controls = (st) => `
    <nav class="controls" aria-label="Clock controls">
      ${CONTROLS(st)
        .map((c) => {
          const btn = `<button type="button" class="ctl" data-ctl="${c.id}"${c.pressed !== undefined ? ` aria-pressed="${c.pressed}"` : ''}>${icon(c.icon)}<span class="ctl__label">${esc(c.label)}</span></button>`;
          if (c.id === 'settings' && st.overlay === 'hint') {
            return `<span class="ctl-wrap">${btn}<span class="hint-pop" role="note"><span>Pick a theme</span><button type="button" class="hint-pop__close" aria-label="Dismiss the theme hint">${icon('close')}</button></span></span>`;
          }
          return btn;
        })
        .join('')}
    </nav>`;

  const removeBtn = (caption) =>
    `<button type="button" class="readout__remove">${icon('close')}<span>Remove</span><span class="visually-hidden"> Readout: ${esc(caption)}</span></button>`;

  function bigReadout(s, opt, st, removable) {
    const t = readoutText(s.big, s, opt);
    return `<div class="readout readout--big${st.edit ? ' is-editing' : ''}">
        <button type="button" class="readout__btn">
          <span class="readout__value num" style="--units:${t.width.toFixed(2)}" data-readout="big">${t.html}</span>
          <span class="readout__caption">${esc(s.big.caption)}</span>
        </button>
        ${st.edit && removable ? removeBtn(s.big.caption) : ''}
      </div>`;
  }

  const smallReadout = (r, s, opt, st, always = false) => {
    const t = readoutText(r, s, opt, always);
    return `<div class="readout readout--small${st.edit ? ' is-editing' : ''}">
        <button type="button" class="readout__btn">
          <span class="readout__value num">${t.html}</span>
          <span class="readout__caption">${esc(r.caption)}</span>
        </button>
        ${st.edit ? removeBtn(r.caption) : ''}
      </div>`;
  };

  const progress = (s, opt) =>
    s.progress == null
      ? ''
      : `<div class="progress">
          <span class="progress__time num">${clockAt(s.span.start, opt)}</span>
          <span class="progress__bar" role="progressbar" aria-label="${esc(s.headline)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(s.progress * 100)}"><span style="width:${(s.progress * 100).toFixed(1)}%"></span></span>
          <span class="progress__time num">${clockAt(s.span.end, opt)}</span>
        </div>`;

  const upNext = (s, opt) => {
    if (s.kind === 'passing' && s.upNext) {
      return `<p class="next"><span class="next__label">Up next</span> <span class="next__name">${esc(periodName(s.upNext.name))}</span> <span class="num next__at">${clockAt(s.upNext.at, opt)}</span></p>`;
    }
    if (s.line) return `<p class="line">${esc(timeIn(s.line, opt.clock24))}</p>`;
    return '';
  };

  // The Day Strip: today's Segments, or the Next School Day's during Off-Hours.
  function strip(s, opt, compact) {
    if (!opt.strip || !s.strip) return '';
    const segs = SCHEDULES[s.strip.schedule];
    const isToday = !s.strip.label || s.strip.today;
    const t0 = segs[0].startMin;
    const t1 = segs[segs.length - 1].endMin;
    const pct = (m) => (((m - t0) / (t1 - t0)) * 100).toFixed(2);
    const live = !s.strip.label && s.nowMin != null;
    const stateOf = (g) => (!live ? 'later' : s.nowMin >= g.endMin ? 'past' : s.nowMin >= g.startMin ? 'now' : 'later');
    const heading = s.strip.label ? (s.strip.today ? `Today · ${s.strip.label.split(' · ')[1]}` : `Next School Day · ${s.strip.label}`) : '';
    const name = s.strip.label && !s.strip.today ? `Segments on ${s.strip.label}` : "Today's Segments";
    const hidden = (g, state) => `${esc(g.name)}${g.label ? ' · ' + esc(g.label) : ''}, ${clockAt(g.start, opt)} to ${clockAt(g.end, opt)}${state === 'now' ? ', now' : ''}`;
    const items = segs
      .map((g) => {
        const state = stateOf(g);
        const done = state === 'now' ? `;--done:${(((s.nowMin - g.startMin) / (g.endMin - g.startMin)) * 100).toFixed(1)}%` : '';
        return `<li class="seg seg--${g.kind} is-${state}" style="left:${pct(g.startMin)}%;width:${(pct(g.endMin) - pct(g.startMin)).toFixed(2)}%${done}">
            <span class="seg__name" aria-hidden="true">${esc(g.short)}</span>
            ${!compact && g.label ? `<span class="seg__label" aria-hidden="true">${esc(g.label)}</span>` : ''}
            <span class="seg__time num" aria-hidden="true">${clockAt(g.start, opt)}</span>
            <span class="visually-hidden">${hidden(g, state)}</span>
          </li>`;
      })
      .join('');
    const now = live && s.nowMin >= t0 && s.nowMin <= t1
      ? `<span class="strip__now" style="left:${pct(s.nowMin)}%" aria-hidden="true"><span class="strip__now-label">Now</span></span>`
      : '';
    const agendaRows = segs
      .map((g) => {
        const state = stateOf(g);
        return `<li class="agenda__row agenda--${g.kind} is-${state}"><span class="num agenda__time">${clockAt(g.start, opt)}</span><span class="agenda__name">${esc(g.name)}${g.label ? ` · ${esc(g.label)}` : ''}</span>${state === 'now' ? '<span class="agenda__now">Now</span>' : ''}</li>`;
      })
      .join('');
    return `<section class="strip${compact ? ' strip--compact' : ''}${isToday ? '' : ' strip--next'}" aria-label="${esc(name)}">
        ${heading ? `<p class="strip__heading">${esc(heading)}</p>` : ''}
        <div class="strip__day">
          <ol class="strip__track">${items}</ol>
          ${now}
          <span class="strip__end num" aria-hidden="true">${clockAt(segs[segs.length - 1].end, opt)}</span>
        </div>
        <ol class="agenda" tabindex="0" aria-label="${esc(name)}">${agendaRows}</ol>
      </section>`;
  }

  function timerStage(s, opt, st) {
    const t = s.timer;
    const val = readoutText({ value: t.value, mode: 'left' }, s, opt, true);
    const smalls = [{ value: s.big.value, mode: 'left', caption: `left in ${s.headline}${s.tag ? ' · ' + s.tag : ''}` }, ...s.small];
    const pc = (t.left * 100).toFixed(2);
    return `<div class="timer${t.paused ? ' is-paused' : ''}">
        <div class="timer__ring">
          <svg class="timer__svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <circle class="timer__track" cx="50" cy="50" r="48" pathLength="100"/>
            <circle class="timer__arc" cx="50" cy="50" r="48" pathLength="100" stroke-dasharray="${pc} 100" transform="rotate(-90 50 50)"/>
          </svg>
          <div class="timer__inner">
            <p class="timer__title">${t.paused ? `${icon('pause')}<span>Paused</span>` : `<span>Timer</span>`} <span class="timer__of num">of ${esc(t.total)}</span></p>
            <p class="timer__value num" style="--units:${val.width.toFixed(2)}" role="timer" aria-label="Timer, ${esc(t.value)} left of ${esc(t.total)}" data-readout="big">${val.html}</p>
            <div class="timer__actions">
              ${t.paused ? `<button type="button" class="btn btn--accent">${icon('play')}Resume</button>` : `<button type="button" class="btn">${icon('pause')}Pause</button>`}
              <button type="button" class="btn">${icon('stop')}Cancel</button>
            </div>
          </div>
        </div>
        <div class="timer__side">${smalls.map((r) => smallReadout(r, s, opt, st)).join('')}</div>
      </div>`;
  }

  function renderMain(s, st, opt) {
    const isTimer = !!s.timer;
    const removable = 1 + s.small.length > 1;
    const dayText = s.headline.includes(s.dayLabel) || !s.dayLabel ? `<span>${esc(s.date)}</span>` : `<span>${esc(s.dayLabel)}</span><span class="dot" aria-hidden="true">·</span><span>${esc(s.date)}</span>`;
    const heading = s.kind === 'period'
      ? `<span class="title__name">${esc(s.headline)}</span>${s.tag ? `<span class="title__tag">${esc(s.tag)}</span>` : ''}`
      : `<span class="title__name">${esc(s.headline)}</span>`;
    const addSlot = st.edit && 1 + s.small.length < 3
      ? `<button type="button" class="readout-add">${icon('plus')}<span>Add Readout</span></button>`
      : '';
    const stage = isTimer
      ? `<h1 class="visually-hidden">Timer, ${esc(s.headline)}${s.tag ? ' · ' + esc(s.tag) : ''}</h1>${timerStage(s, opt, st)}`
      : `<h1 class="title">${heading}</h1>
         ${bigReadout(s, opt, st, removable)}
         ${progress(s, opt)}
         ${upNext(s, opt)}
         ${s.small.length || addSlot ? `<div class="smalls" data-count="${s.small.length}">${s.small.map((r) => smallReadout(r, s, opt, st)).join('')}${addSlot}</div>` : ''}
         ${st.edit ? '<p class="edit-note">Tap a Readout to change what it shows</p>' : ''}`;
    return `
      <main class="screen${st.edit ? ' is-editing' : ''}${isTimer ? ' has-timer' : ''}${opt.strip && s.strip && !isTimer ? ' has-strip' : ''}${s.simulated ? ' is-simulated' : ''}">
        ${deco()}
        ${s.simulated ? `<p class="sim-banner">${icon('clock')}<span>${esc(s.simulated)}</span></p>` : ''}
        <header class="top">
          <p class="day">${dayText}</p>
          ${s.division ? `<button type="button" class="chip"><span class="visually-hidden">Division: </span>${esc(s.division)}<span class="visually-hidden">, switch Division</span></button>` : ''}
        </header>
        <section class="stage" aria-label="Clock">${stage}</section>
        ${isTimer ? '' : strip(s, opt, false)}
        ${controls(st)}
      </main>`;
  }

  // ---------- mini player ----------
  function renderMini(s, st, opt) {
    const ringing = st.overlay === 'ringing';
    const t = s.timer;
    const big = t ? readoutText({ value: t.value, mode: 'left' }, s, opt, true) : readoutText(s.big, s, opt);
    let head = `<span>${esc(s.headline)}${s.tag ? ` · ${esc(s.tag)}` : ''}</span>`;
    if (t) head = `<span>Timer</span><span class="mini__of num">of ${esc(t.total)}</span>`;
    if (ringing) head = `${icon('bell')}<span>Ringing · ${esc(st.ring.title)}</span>`;
    let foot = '';
    if (ringing) foot = '<button type="button" class="btn btn--accent mini__dismiss">Dismiss</button>';
    else if (t) foot = `<span class="mini__bar" role="progressbar" aria-label="Timer time left" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(t.left * 100)}"><span style="width:${(t.left * 100).toFixed(1)}%"></span></span><span class="mini__sub num">${esc(readoutText(s.big, s, opt).html.replace(/<[^>]+>/g, ''))} left in ${esc(s.headline)}</span>`;
    else if (s.kind === 'passing' && s.upNext) foot = `<span class="mini__next"><span class="next__label">Up next</span> ${esc(periodName(s.upNext.name))}</span>`;
    else if (s.progress != null) foot = `<span class="mini__bar" role="progressbar" aria-label="${esc(s.headline)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(s.progress * 100)}"><span style="width:${(s.progress * 100).toFixed(1)}%"></span></span><span class="mini__sub num">ends ${clockAt(s.span.end, opt)}</span>`;
    return `
      <main class="mini${ringing ? ' is-ringing' : ''}${t ? ' has-timer' : ''}">
        ${ringing ? '<div class="ring-flash" aria-hidden="true"></div>' : ''}
        <h1 class="mini__seg">${head}</h1>
        <p class="mini__big num" style="--units:${big.width.toFixed(2)}" data-readout="big">${big.html}</p>
        <div class="mini__foot">${foot}</div>
      </main>`;
  }

  // ---------- overlays ----------
  const soundPrompt = () => `
    <div class="sound-prompt" role="status">
      ${icon('soundOff', 'sound-prompt__icon')}
      <span class="sound-prompt__text"><span class="sound-prompt__main">Sound is off</span><span class="sound-prompt__note">Keep this tab open for Bells and Alarms</span></span>
      <button type="button" class="btn btn--accent">${icon('sound')}Turn sound on</button>
    </div>`;

  const ringing = (st) => `
    <div class="ring-flash" aria-hidden="true"></div>
    <div class="ring-card" role="alertdialog" aria-labelledby="ring-title" aria-describedby="ring-detail">
      <p class="ring-card__kind">${icon('bell')}<span>Ringing · ${esc(st.ring.kind)}</span></p>
      <h2 class="ring-card__title" id="ring-title">${esc(st.ring.title)}</h2>
      <p class="ring-card__detail" id="ring-detail">${esc(st.ring.detail)}</p>
      <button type="button" class="btn btn--big ring-card__dismiss">Dismiss</button>
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
        ${['3:00', '7:30', '15:00'].map((t) => `<button type="button" class="chip-btn num">${t}</button>`).join('')}
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
  const select = (label, options, chosen) =>
    `<label class="field"><span class="field__label">${esc(label)}</span><span class="select"><select class="input">${options.map((o) => `<option${o === chosen ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></span></label>`;
  const SOUNDS = ['Chime', 'School bell', 'Beep', 'Buzzer'];

  const scheduleChecks = () => `
    <div class="fieldset__actions">
      <button type="button" class="btn btn--small" aria-pressed="true">Block Days</button>
      <button type="button" class="btn btn--small" aria-pressed="false">Every schedule</button>
    </div>
    <div class="checks">${BELL_SCHEDULES.map((b) => check(b.name, b.block, 'b')).join('')}</div>`;

  const periodAlarmForm = () => `
    <form class="alarm-form" id="alarm-form" onsubmit="return false" aria-labelledby="alarm-form-title">
      <h4 id="alarm-form-title">New Period Alarm</h4>
      <label class="field"><span class="field__label">Name</span><input class="input" type="text" value="Exit ticket"></label>
      <fieldset class="fieldset">
        <legend>When it rings</legend>
        <div class="segmented segmented--3">${radio('From the start', false, 'when')}${radio('Before the end', true, 'when')}${radio('Halfway', false, 'when')}</div>
        <label class="field field--inline"><input class="input input--num" type="text" inputmode="numeric" value="10" size="3"><span>minutes before the end</span></label>
      </fieldset>
      <fieldset class="fieldset">
        <legend>Periods</legend>
        <div class="checks">
          ${['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7'].map((p) => check(periodName(p), p !== 'Period 4', 'p')).join('')}
          ${check('Seminar', false, 'p')}${check('Super Seminar', false, 'p')}
        </div>
      </fieldset>
      <fieldset class="fieldset"><legend>Bell Schedules</legend>${scheduleChecks()}</fieldset>
      <div class="field field--row">${select('Sound', SOUNDS, 'School bell')}<button type="button" class="btn">${icon('play')}Preview</button></div>
      <div class="form-actions"><button type="button" class="btn">Cancel</button><button type="submit" class="btn btn--accent">Save Alarm</button></div>
    </form>`;

  const clockAlarmForm = (opt) => `
    <form class="alarm-form" id="alarm-form" onsubmit="return false" aria-labelledby="alarm-form-title">
      <h4 id="alarm-form-title">Edit Clock Alarm</h4>
      <label class="field"><span class="field__label">Name</span><input class="input" type="text" value="Morning duty"></label>
      <fieldset class="fieldset">
        <legend>Time</legend>
        <div class="time-row">
          <label class="field field--time"><span class="field__label">Hour</span><input class="input" type="text" inputmode="numeric" value="${opt.clock24 ? '07' : '7'}" size="2"></label>
          <span class="picker__colon" aria-hidden="true">:</span>
          <label class="field field--time"><span class="field__label">Minute</span><input class="input" type="text" inputmode="numeric" value="55" size="2"></label>
          ${opt.clock24 ? '' : `<div class="segmented segmented--ampm" role="radiogroup" aria-label="AM or PM">${radio('AM', true, 'ap')}${radio('PM', false, 'ap')}</div>`}
        </div>
      </fieldset>
      <fieldset class="fieldset">
        <legend>Repeats</legend>
        <div class="segmented">${radio('Once', false, 'rep')}${radio('Every School Day', true, 'rep')}</div>
      </fieldset>
      <fieldset class="fieldset">
        <legend>Bell Schedules</legend>
        ${toggle('Only on some Bell Schedules', true)}
        ${scheduleChecks()}
      </fieldset>
      <div class="field field--row">${select('Sound', SOUNDS, 'School bell')}<button type="button" class="btn">${icon('play')}Preview</button></div>
      <div class="form-actions form-actions--split">
        <button type="button" class="btn">${icon('trash')}Delete</button>
        <span class="form-actions"><button type="button" class="btn">Cancel</button><button type="submit" class="btn btn--accent">Save Alarm</button></span>
      </div>
    </form>`;

  // Theme picker: previews only. Each preview is drawn in its own theme by
  // putting the theme attributes on the tile; the accessible name is the look.
  function lookSection(opt) {
    const cur = T.THEMES.find((t) => t.id === opt.theme);
    const attrs = T.themeAttributes(opt);
    const tile = (t) => {
      const a = T.themeAttributes({ theme: t.id, mode: opt.mode });
      const on = t.id === opt.theme;
      return `<label class="theme-tile" data-palette="${a['data-palette']}" data-font="${a['data-font']}" data-mode="${a['data-mode']}"${a['data-deco'] ? ` data-deco="${a['data-deco']}"` : ''}>
          <input type="radio" name="theme"${on ? ' checked' : ''}>
          <span class="theme-tile__preview" aria-hidden="true">
            ${t.deco ? `<svg class="theme-tile__deco" viewBox="0 0 180 180">${FLOWERS}</svg>` : ''}
            <span class="tt__label">Period 3</span>
            <span class="tt__digits num">42:17</span>
            <span class="tt__bar"><span></span></span>
          </span>
          <span class="visually-hidden">${esc(T.themeLook(t))}</span>
          <span class="theme-tile__check" aria-hidden="true">${icon('check')}</span>
        </label>`;
    };
    const fontChip = (f) => `<label class="swatch swatch--font" data-font="${f.id}">
        <input type="radio" name="font"${attrs['data-font'] === f.id ? ' checked' : ''}>
        <span class="swatch__face" aria-hidden="true"><span class="swatch__aa">Aa</span><span class="num">42</span></span>
        <span class="visually-hidden">${esc(f.look[0].toUpperCase() + f.look.slice(1))}${f.id === cur.font ? ' (the theme’s own)' : ''}</span>
      </label>`;
    const palChip = (p) => `<label class="swatch swatch--palette" data-palette="${p.id}" data-mode="${opt.mode}">
        <input type="radio" name="palette"${attrs['data-palette'] === p.id ? ' checked' : ''}>
        <span class="swatch__dot" aria-hidden="true"><span></span></span>
        <span class="visually-hidden">${esc(p.look)}${p.id === cur.palette ? ' (the theme’s own)' : ''}</span>
      </label>`;
    const swapped = attrs['data-font'] !== cur.font || attrs['data-palette'] !== cur.palette;
    return `
      <section class="drawer__section" id="look" aria-labelledby="s-look">
        <h3 id="s-look">Look</h3>
        <fieldset class="fieldset">
          <legend>Theme</legend>
          <div class="theme-grid">${T.THEMES.map(tile).join('')}</div>
        </fieldset>
        <fieldset class="fieldset">
          <legend>Font</legend>
          <div class="swatches swatches--font">${T.FONTS.map(fontChip).join('')}</div>
        </fieldset>
        <fieldset class="fieldset">
          <legend>Colours</legend>
          <div class="swatches">${T.PALETTES.map(palChip).join('')}</div>
        </fieldset>
        ${swapped ? `<button type="button" class="btn btn--small btn--quiet">Use the theme’s own font and colours</button>` : ''}
        <fieldset class="fieldset">
          <legend>Light or dark</legend>
          <div class="segmented segmented--3">${radio('Dark', opt.mode === 'dark', 'mode')}${radio('Light', opt.mode === 'light', 'mode')}${radio('Auto', false, 'mode')}</div>
        </fieldset>
      </section>`;
  }

  const drawer = (form, opt) => `
    <div class="scrim" aria-hidden="true"></div>
    <div class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div class="drawer__head">
        <h2 id="drawer-title">Settings</h2>
        <button type="button" class="btn btn--icon" aria-label="Close settings">${icon('close')}</button>
      </div>
      <div class="drawer__body">
        <section class="drawer__section" id="division" aria-labelledby="s-div">
          <h3 id="s-div">Division</h3>
          <div class="segmented" role="radiogroup" aria-labelledby="s-div">${radio('Middle School', false, 'div')}${radio('High School', true, 'div')}</div>
        </section>
        ${lookSection(opt)}
        <section class="drawer__section" id="display" aria-labelledby="s-display">
          <h3 id="s-display">Display</h3>
          ${toggle('Show seconds', opt.seconds, 'The last minute of a countdown and the timer always show seconds.')}
          ${toggle('24-hour time', opt.clock24, opt.clock24 ? 'Clock times show as 13:05.' : 'Clock times show as 1:05.')}
          ${toggle('Day Strip', opt.strip, "Today's Segments along the bottom")}
        </section>
        <section class="drawer__section" id="sound" aria-labelledby="s-sound">
          <h3 id="s-sound">Sound</h3>
          ${toggle('Bells', true, 'Start and end of every Period and Break')}
          <label class="field"><span class="field__label">Volume <span class="field__value">70%</span></span>
            <input class="range" type="range" min="0" max="100" value="70" style="--val:70%">
          </label>
          <div class="field field--row">${select('Timer sound', SOUNDS, 'Chime')}<button type="button" class="btn">${icon('play')}Preview</button></div>
          <p class="note">Keep this tab open for Bells and Alarms to play. Minimised is fine. Browsers need one click after each load before sound can play.</p>
        </section>
        <section class="drawer__section" id="labels" aria-labelledby="s-labels">
          <h3 id="s-labels">Period Labels</h3>
          <div class="labels-grid">
            ${['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7', 'Seminar']
              .map((p) => `<label class="field"><span class="field__label">${p}</span><input class="input" type="text" value="${esc(LABELS[p] || '')}" placeholder="Add a label"></label>`)
              .join('')}
          </div>
        </section>
        <section class="drawer__section" id="alarms" aria-labelledby="s-alarms">
          <h3 id="s-alarms">Alarms</h3>
          <ul class="alarm-list">
            ${ALARMS.map((a) =>
              form === 'clock' && a.name === 'Morning duty'
                ? `<li class="alarm-item alarm-item--editing">${clockAlarmForm(opt)}</li>`
                : `<li class="alarm-item">
                <span class="alarm-item__text"><span class="alarm-item__name">${esc(a.name)}</span><span class="hint">${esc(timeIn(a.detail, opt.clock24))} · ${esc(a.sound)}</span></span>
                <button type="button" class="btn btn--small" aria-label="Edit ${esc(a.name)}">Edit</button>
                <label class="switch switch--bare"><span class="visually-hidden">${esc(a.name)} on</span><input type="checkbox" role="switch"${a.on ? ' checked' : ''}><span class="switch__track" aria-hidden="true"></span></label>
              </li>`
            ).join('')}
          </ul>
          ${form === 'period' ? periodAlarmForm() : ''}
          <div class="form-actions form-actions--start">
            <button type="button" class="btn">${icon('plus')}Clock Alarm</button>
            <button type="button" class="btn"${form === 'period' ? ' aria-expanded="true"' : ''}>${icon('plus')}Period Alarm</button>
          </div>
        </section>
        <section class="drawer__section drawer__section--quiet" id="about" aria-labelledby="s-about">
          <h3 id="s-about">About</h3>
          <p class="note">The mini player works in Chrome and Edge on a computer.</p>
          <a class="feedback" href="mailto:erich@villagechristian.org?subject=Clock%20feedback">Feedback? Email Eric</a>
        </section>
      </div>
    </div>`;

  const firstVisit = () => `
    <div class="scrim scrim--solid" aria-hidden="true"></div>
    <div class="dialog first" role="dialog" aria-modal="true" aria-labelledby="first-title" aria-describedby="first-desc">
      <h2 id="first-title">Which Division are you with?</h2>
      <p id="first-desc" class="first__desc">The clock follows your Division's bell times. You can switch any time.</p>
      <div class="first__choices">
        <button type="button" class="choice"><span class="choice__big" aria-hidden="true">MS</span><span>Middle School</span></button>
        <button type="button" class="choice"><span class="choice__big" aria-hidden="true">HS</span><span>High School</span></button>
      </div>
      <a class="feedback" href="mailto:erich@villagechristian.org?subject=Clock%20feedback">Feedback? Email Eric</a>
    </div>`;

  const toast = (error) =>
    error
      ? `<div class="toast toast--error" role="alert">${icon('warn')}<span>Couldn't save on this device. Changes last until this tab closes.</span><button type="button" class="btn btn--icon" aria-label="Dismiss">${icon('close')}</button></div>`
      : `<div class="toast" role="status">${icon('check')}<span>Alarm deleted</span><button type="button" class="btn btn--small">Undo</button></div>`;

  function overlays(st, opt) {
    switch (st.overlay) {
      case 'ringing': return ringing(st);
      case 'sound': return soundPrompt();
      case 'picker': return picker();
      case 'settings': return drawer('', opt);
      case 'alarm': return drawer('period', opt);
      case 'alarm-clock': return drawer('clock', opt);
      case 'first': return firstVisit();
      case 'toast': return toast(false);
      case 'toast-error': return toast(true);
      default: return '';
    }
  }

  // ---------- mockup-only switcher ----------
  function switcher(cur, opt) {
    const q = (o) => {
      const parts = [];
      if (o.mode === 'light') parts.push('mode=light');
      if (o.theme !== T.DEFAULT_THEME) parts.push(`theme=${o.theme}`);
      if (o.font) parts.push(`font=${o.font}`);
      if (o.palette) parts.push(`palette=${o.palette}`);
      if (!o.seconds) parts.push('seconds=off');
      if (!o.strip) parts.push('strip=off');
      if (o.clock24) parts.push('clock=24');
      return parts.length ? '&' + parts.join('&') : '';
    };
    const href = (id, o = opt) => `#${id}${q(o)}`;
    return `<details class="mock-switcher" data-mock>
      <summary>Mockup: ${esc(cur.title)}</summary>
      <nav aria-label="Mockup states"><ul>
        ${STATES.map((s) => `<li><a href="${href(s.id)}"${s.id === cur.id ? ' aria-current="true"' : ''}>${esc(s.title)}</a></li>`).join('')}
      </ul>
      <p><a href="${href(cur.id, { ...opt, mode: opt.mode === 'light' ? 'dark' : 'light' })}">${opt.mode === 'light' ? 'Dark' : 'Light'}</a> ·
        <a href="${href(cur.id, { ...opt, seconds: !opt.seconds })}">Seconds ${opt.seconds ? 'off' : 'on'}</a> ·
        <a href="${href(cur.id, { ...opt, strip: !opt.strip })}">Day Strip ${opt.strip ? 'off' : 'on'}</a> ·
        <a href="${href(cur.id, { ...opt, clock24: !opt.clock24 })}">${opt.clock24 ? '12' : '24'}-hour</a></p>
      <p>Theme: ${T.THEMES.map((t) => `<a href="${href(cur.id, { ...opt, theme: t.id, font: undefined, palette: undefined })}"${t.id === opt.theme ? ' aria-current="true"' : ''}>${t.id}</a>`).join(' ')}</p>
      <p><a href="../index.html">All mockups</a></p></nav>
    </details>`;
  }

  function render() {
    const opt = parse();
    const st = STATES.find((s) => s.id === opt.id) || STATES[0];
    const s = st.scene;
    const root = document.documentElement;
    const a = T.themeAttributes(opt);
    for (const [k, v] of Object.entries(a)) {
      if (v) root.setAttribute(k, v);
      else root.removeAttribute(k);
    }
    root.dataset.state = st.id;
    document.title = `School Clock design reference: ${st.title}`;
    const app = document.getElementById('app');
    const body = st.mini ? renderMini(s, st, opt) : renderMain(s, st, opt) + overlays(st, opt);
    app.innerHTML = body + (!opt.shot && window.self === window.top ? switcher(st, opt) : '');
    const drawerBody = app.querySelector('.drawer__body');
    const target = st.scrollTo ? app.querySelector('#' + st.scrollTo) : app.querySelector('#alarm-form');
    if (drawerBody && target) drawerBody.scrollTop = target.getBoundingClientRect().top - drawerBody.getBoundingClientRect().top - 16;
  }

  window.addEventListener('hashchange', render);
  document.addEventListener('DOMContentLoaded', render);
  window.Final = { render };
})();
