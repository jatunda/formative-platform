// Direction A, "Monument": one giant centred number, quiet labels around it,
// a hairline progress bar of the Segment. Everything else recedes.
(function () {
  const { esc, icon, CONTROLS, controlButton } = window.Mock;

  // Letters in "4d 17h" are units, set smaller than the digits.
  const digits = (v) => esc(v).replace(/([a-z]+)/g, '<span class="unit">$1</span>');

  const segLine = (s) => {
    if (s.kind === 'period') {
      return `<span class="a-seg__name">${esc(s.headline)}</span>${s.tag ? `<span class="a-seg__tag">${esc(s.tag)}</span>` : ''}`;
    }
    return `<span class="a-seg__name">${esc(s.headline)}</span>`;
  };

  const divisionChip = (s) =>
    s.division
      ? `<button type="button" class="a-chip" title="Switch Division"><span class="visually-hidden">Division: </span>${esc(s.division)}<span class="visually-hidden">, tap to switch</span></button>`
      : '';

  const bigReadout = (r, extraCls = '') => `
    <button type="button" class="a-big ${extraCls}">
      <span class="a-big__value num" data-readout="big">${digits(r.value)}${r.suffix ? `<span class="unit">${esc(r.suffix)}</span>` : ''}</span>
      <span class="a-big__caption">${esc(r.caption)}</span>
    </button>`;

  const smallReadout = (r) => `
    <button type="button" class="a-small">
      <span class="a-small__value num">${digits(r.value)}${r.suffix ? `<span class="unit">${esc(r.suffix)}</span>` : ''}</span>
      <span class="a-small__caption">${esc(r.caption)}</span>
    </button>`;

  const progress = (s) =>
    s.progress == null
      ? ''
      : `<div class="a-progress">
          <span class="a-progress__time num">${esc(s.span.start)}</span>
          <span class="a-progress__bar" role="progressbar" aria-label="${esc(s.headline)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(s.progress * 100)}"><span style="width:${(s.progress * 100).toFixed(1)}%"></span></span>
          <span class="a-progress__time num">${esc(s.span.end)}</span>
        </div>`;

  const upNext = (s) => {
    if (s.kind === 'passing' && s.upNext) {
      return `<p class="a-next"><span class="a-next__label">Up next</span> ${esc(Mock.periodName(s.upNext.name))} <span class="num a-next__at">${esc(s.upNext.at)}</span></p>`;
    }
    if (s.line) return `<p class="a-line">${esc(s.line)}</p>`;
    return '';
  };

  const controls = () => `
    <nav class="a-controls" aria-label="Clock controls">
      ${CONTROLS.map((c) => controlButton(c, 'ctl a-ctl')).join('')}
    </nav>`;

  function renderMain(s) {
    const timer = s.timer;
    const main = timer
      ? `<h1 class="a-seg a-seg--timer"><span class="a-seg__name">Timer</span><span class="a-seg__tag num">of ${esc(timer.total)}</span></h1>
         ${bigReadout({ value: timer.value, caption: 'on the timer' }, 'a-big--timer')}
         <div class="a-timer-actions">
           <button type="button" class="btn">${icon('pause')}Pause</button>
           <button type="button" class="btn">${icon('stop')}Cancel</button>
         </div>
         <div class="a-smalls">${smallReadout({ value: s.big.value, caption: `left in ${s.headline}` })}</div>`
      : `<h1 class="a-seg">${segLine(s)}${divisionChip(s)}</h1>
         ${bigReadout(s.big)}
         ${progress(s)}
         ${upNext(s)}
         ${s.small.length ? `<div class="a-smalls">${s.small.map(smallReadout).join('')}</div>` : ''}`;

    return `
      <main class="a-screen">
        <header class="a-top">
          <p class="a-day">${s.headline.includes(s.dayLabel) ? '' : `<span>${esc(s.dayLabel)}</span><span class="a-dot" aria-hidden="true">·</span>`}<span>${esc(s.date)}</span></p>
          ${timer ? `<p class="a-day a-day--right">${esc(s.headline)} · ${esc(s.tag)} ${divisionChip(s)}</p>` : ''}
        </header>
        <section class="a-center" aria-label="Clock">${main}</section>
        ${controls()}
      </main>`;
  }

  function renderMini(s, st) {
    const ringing = st.overlay === 'ringing';
    const next = s.upNext && s.kind !== 'offhours' ? `<span class="m-next">Up next:${esc(Mock.periodName(s.upNext.name))}</span>` : '';
    return `
      <main class="a-mini${ringing ? ' is-ringing' : ''}">
        ${ringing ? '<div class="ring-flash" aria-hidden="true"></div>' : ''}
        <h1 class="m-seg">${ringing ? `${icon('bell')}<span>Ringing · ${esc(st.ring.title)}</span>` : `<span>${esc(s.headline)}${s.tag ? ` · ${esc(s.tag)}` : ''}</span>`}</h1>
        <p class="m-big num">${digits(s.big.value)}</p>
        <div class="m-foot">
          ${ringing ? '<button type="button" class="btn btn--accent m-dismiss">Dismiss</button>' : next}
        </div>
      </main>`;
  }

  window.Direction = { name: 'A · Monument', renderMain, renderMini };
})();
