// Direction C, "Dial": a progress ring around the number, friendly rounded
// type, and everything secondary as tiles beside it. Long countdowns read in
// whole minutes ("42 minutes left"); the ring carries the seconds' motion.
(function () {
  const { esc, icon, CONTROLS, periodName } = window.Mock;

  const digits = (v) => esc(v).replace(/([a-z]+)/gi, '<span class="unit">$1</span>');

  // The dial shows whole minutes when there are 10 or more left, m:ss below
  // that, and hours+minutes past an hour, so the number stays 2–4 glyphs.
  function dialValue(big) {
    const m2 = big.value.match(/^(\d+):(\d\d)$/);
    const m3 = big.value.match(/^(\d+):(\d\d):(\d\d)$/);
    if (big.mode !== 'clock' && m2 && +m2[1] >= 10) {
      return { value: m2[1], caption: `minutes ${big.caption}` };
    }
    if (m3) return { value: `${+m3[1]}:${m3[2]}`, caption: `hours ${big.caption}` };
    const dh = big.value.match(/^(\d+)d (\d+)h$/);
    if (dh) return { value: dh[1], caption: `days, ${dh[2]} hours ${big.caption}` };
    if (big.suffix) return { value: big.value, caption: big.suffix };
    return { value: big.value, caption: big.caption };
  }

  const sizeClass = (v) => {
    const glyphs = v.replace(/[^0-9]/g, '').length;
    return glyphs <= 2 ? 'len-2' : glyphs <= 3 && !/[a-z]/i.test(v) ? 'len-3' : glyphs <= 4 && !/[a-z]/i.test(v) ? 'len-4' : 'len-long';
  };

  const divisionChip = (s) =>
    s.division
      ? `<button type="button" class="c-chip" title="Switch Division"><span class="visually-hidden">Division: </span>${esc(s.division)}<span class="visually-hidden">, tap to switch</span></button>`
      : '';

  const dial = (s, big, title, progress, extraCls = '') => {
    const dv = dialValue(big);
    const p = progress == null ? null : Math.max(0, Math.min(1, progress));
    return `
      <div class="c-dial ${extraCls}${s.kind === 'passing' ? ' is-passing' : ''}">
        <svg class="c-dial__svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <circle class="c-dial__track" cx="50" cy="50" r="47" pathLength="100"/>
          ${p == null ? '' : `<circle class="c-dial__arc" cx="50" cy="50" r="47" pathLength="100" stroke-dasharray="${(p * 100).toFixed(2)} 100" transform="rotate(-90 50 50)"/>`}
        </svg>
        <div class="c-dial__inner">
          ${title}
          <button type="button" class="c-big">
            <span class="c-big__value num ${sizeClass(dv.value)}" data-readout="big">${digits(dv.value)}${dv.suffix ? `<span class="unit">${esc(dv.suffix)}</span>` : ''}</span>
            <span class="c-big__caption">${esc(dv.caption)}</span>
          </button>
          ${s.span && !extraCls.includes('is-timer') ? `<p class="c-dial__span num">${esc(s.span.start)} – ${esc(s.span.end)}</p>` : ''}
        </div>
      </div>`;
  };

  const tile = (label, main, sub = '', cls = '') =>
    `<div class="c-tile ${cls}"><p class="c-tile__label">${esc(label)}</p><p class="c-tile__main">${main}</p>${sub ? `<p class="c-tile__sub num">${esc(sub)}</p>` : ''}</div>`;

  const readoutTile = (r) =>
    `<button type="button" class="c-tile c-tile--readout"><span class="c-tile__label">${esc(r.caption)}</span><span class="c-tile__main c-tile__num num">${digits(r.value)}${r.suffix ? `<span class="unit">${esc(r.suffix)}</span>` : ''}</span></button>`;

  const nextTile = (s) => {
    if (!s.upNext) return tile('Today', esc(s.line || ''), '', 'c-tile--wide');
    const isDay = !s.upNext.name.startsWith('Period') && !['period', 'passing', 'break', 'assembly'].includes(s.kind);
    const name = isDay ? `${s.upNext.name} · ${s.upNext.label}` : periodName(s.upNext.name);
    return tile(isDay ? 'Next School Day' : 'Up next', esc(name), `${s.upNext.at} · ${s.upNext.in}`, `c-tile--wide c-tile--next${s.kind === 'passing' ? ' is-hot' : ''}`);
  };

  const dock = () => `
    <nav class="c-dock" aria-label="Clock controls">
      ${CONTROLS.map((c) => `<button type="button" class="c-ctl" data-ctl="${c.id}"${c.pressed !== undefined ? ` aria-pressed="${c.pressed}"` : ''}><span class="c-ctl__icon">${icon(c.icon)}</span><span class="c-ctl__label">${esc(c.label)}</span></button>`).join('')}
    </nav>`;

  function renderMain(s) {
    const t = s.timer;
    const title = t
      ? `<h1 class="c-dial__seg">Timer <span class="c-dial__tag num">of ${esc(t.total)}</span></h1>`
      : `<h1 class="c-dial__seg">${esc(s.headline)}${s.tag ? ` <span class="c-dial__tag">${esc(s.tag)}</span>` : ''}</h1>`;
    const theDial = t
      ? dial(s, { value: t.value, mode: 'left', caption: 'on the timer' }, title, 1 - t.progress, 'is-timer')
      : dial(s, s.big, title, s.progress);
    const tiles = t
      ? `${readoutTile({ value: s.big.value, caption: `left in ${s.headline}` })}
         <div class="c-tile c-tile--actions"><button type="button" class="btn">${icon('pause')}Pause</button><button type="button" class="btn">${icon('stop')}Cancel</button></div>
         ${nextTile(s)}`
      : `${nextTile(s)}
         ${s.small.map(readoutTile).join('')}
         ${s.line && s.upNext ? tile('Note', esc(s.line), '', 'c-tile--wide c-tile--quiet') : ''}
         <button type="button" class="c-tile c-tile--add">${icon('plus')}<span>Add Readout</span></button>`;
    return `
      <main class="c-screen${t ? ' has-timer' : ''}">
        ${theDial}
        <div class="c-side">
          <header class="c-day">
            <p><span class="c-day__label">${esc(s.dayLabel)}</span> <span class="c-day__date">${esc(s.date)}</span></p>
            ${divisionChip(s)}
          </header>
          <section class="c-tiles" aria-label="More about now">${tiles}</section>
          ${dock()}
        </div>
      </main>`;
  }

  function renderMini(s, st) {
    const ringing = st.overlay === 'ringing';
    const dv = dialValue(s.big);
    const p = s.progress == null ? null : s.progress;
    return `
      <main class="c-mini${ringing ? ' is-ringing' : ''}">
        ${ringing ? '<div class="ring-flash" aria-hidden="true"></div>' : ''}
        <div class="c-dial c-dial--mini${s.kind === 'passing' ? ' is-passing' : ''}">
          <svg class="c-dial__svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <circle class="c-dial__track" cx="50" cy="50" r="46" pathLength="100"/>
            ${p == null ? '' : `<circle class="c-dial__arc" cx="50" cy="50" r="46" pathLength="100" stroke-dasharray="${(p * 100).toFixed(2)} 100" transform="rotate(-90 50 50)"/>`}
          </svg>
          <div class="c-dial__inner"><p class="c-big__value num ${sizeClass(dv.value)}">${digits(dv.value)}</p><p class="c-big__caption">${esc(dv.caption)}</p></div>
        </div>
        <div class="cm-side">
          <h1 class="cm-seg">${ringing ? `${icon('bell')}<span>Ringing</span>` : esc(s.headline)}</h1>
          <p class="cm-sub">${ringing ? esc(st.ring.title) : s.tag ? esc(s.tag) : ''}</p>
          ${ringing ? '<button type="button" class="btn btn--accent cm-dismiss">Dismiss</button>' : s.upNext ? `<p class="cm-next"><span class="cm-next__k">Up next</span>${esc(periodName(s.upNext.name))}</p>` : ''}
        </div>
      </main>`;
  }

  window.Direction = { name: 'C · Dial', renderMain, renderMini };
})();
