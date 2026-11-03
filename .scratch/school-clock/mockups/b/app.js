// Direction B, "Timeline": schedule-aware. A condensed signage face, the
// number set left like a departure board, an Up next card beside it, and a
// strip of today's Segments along the bottom showing exactly where we are.
(function () {
  const { esc, icon, CONTROLS, controlButton, periodName } = window.Mock;
  const { SCHEDULES } = window.MockData;

  const digits = (v) => esc(v).replace(/([a-z]+)/gi, '<span class="unit">$1</span>');

  const KIND_TEXT = { period: 'Period', break: 'Break', assembly: 'Assembly' };

  const divisionChip = (s) =>
    s.division
      ? `<button type="button" class="b-chip" title="Switch Division"><span class="visually-hidden">Division: </span>${esc(s.division)}${icon('swap')}<span class="visually-hidden">, tap to switch</span></button>`
      : '';

  // Today's Segments laid out proportionally, Passing Periods as gaps.
  const strip = (s, compact = false) => {
    const segs = s.schedule && SCHEDULES[s.schedule];
    if (!segs) {
      return `<div class="b-strip b-strip--empty"><p>${icon('arrow')}<span>${esc(s.upNext ? `Next School Day: ${s.upNext.name} · ${s.upNext.label}` : 'No Bell Schedule today. Enjoy the day.')}</span></p></div>`;
    }
    const t0 = segs[0].startMin;
    const t1 = segs[segs.length - 1].endMin;
    const pct = (m) => (((m - t0) / (t1 - t0)) * 100).toFixed(2);
    const now = Math.min(Math.max(s.nowMin, t0), t1);
    const items = segs
      .map((g) => {
        const state = s.nowMin >= g.endMin ? 'past' : s.nowMin >= g.startMin ? 'now' : 'later';
        const done = state === 'now' ? `;--done:${(((s.nowMin - g.startMin) / (g.endMin - g.startMin)) * 100).toFixed(1)}%` : '';
        return `<li class="b-seg b-seg--${g.kind} is-${state}" style="left:${pct(g.startMin)}%;width:${(pct(g.endMin) - pct(g.startMin)).toFixed(2)}%${done}">
          <span class="b-seg__name" aria-hidden="true">${esc(g.short)}</span>
          ${!compact && g.label ? `<span class="b-seg__label" aria-hidden="true">${esc(g.label)}</span>` : ''}
          <span class="b-seg__time num" aria-hidden="true">${esc(g.start)}</span>
          <span class="visually-hidden">${esc(g.name)}${g.label ? ' · ' + esc(g.label) : ''}, ${esc(g.start)} to ${esc(g.end)}${state === 'now' ? ', now' : ''}</span>
        </li>`;
      })
      .join('');
    return `<div class="b-strip" role="region" aria-label="Today's Segments">
        <ol class="b-strip__track">${items}</ol>
        <span class="b-now" style="left:${pct(now)}%" aria-hidden="true"><span class="b-now__label">Now</span></span>
        <span class="b-strip__end num" aria-hidden="true">${esc(segs[segs.length - 1].end)}</span>
      </div>`;
  };

  // Phone: the same day as a vertical agenda.
  const agenda = (s) => {
    const segs = s.schedule && SCHEDULES[s.schedule];
    if (!segs) return '';
    return `<ol class="b-agenda" aria-label="Today's Segments" tabindex="0">
      ${segs
        .map((g) => {
          const state = s.nowMin >= g.endMin ? 'past' : s.nowMin >= g.startMin ? 'now' : 'later';
          return `<li class="b-agenda__item kind-${g.kind} is-${state}"><span class="num b-agenda__time">${esc(g.start)}</span><span class="b-agenda__name">${esc(g.name)}${g.label ? ` · ${esc(g.label)}` : ''}</span>${state === 'now' ? '<span class="b-agenda__now">Now</span>' : ''}</li>`;
        })
        .join('')}
    </ol>`;
  };

  const nextCard = (s) => {
    if (!s.upNext) return '';
    const isDay = ['offhours', 'dayoff', 'experience'].includes(s.kind) && !s.upNext.name.startsWith('Period');
    const title = isDay ? 'Next School Day' : 'Up next';
    const name = isDay ? `${s.upNext.name} · ${s.upNext.label}` : periodName(s.upNext.name);
    return `<div class="b-card b-card--next${s.kind === 'passing' ? ' is-hot' : ''}">
        <p class="b-card__title">${title}</p>
        <p class="b-card__main">${esc(name)}</p>
        <p class="b-card__sub num">${esc(s.upNext.at)} · ${esc(s.upNext.in)}</p>
      </div>`;
  };

  const readoutCard = (r) => `
    <button type="button" class="b-card b-card--readout">
      <span class="b-card__title">${esc(r.caption)}</span>
      <span class="b-card__value num">${digits(r.value)}${r.suffix ? `<span class="unit">${esc(r.suffix)}</span>` : ''}</span>
    </button>`;

  function renderMain(s) {
    const t = s.timer;
    const kindText = KIND_TEXT[s.kind] ? `${KIND_TEXT[s.kind]} · ${s.span.start}–${s.span.end}` : s.kind === 'passing' ? `${s.span.start}–${s.span.end}` : s.kindLabel === s.headline ? '' : s.kindLabel;
    const big = t ? { value: t.value, caption: `timer · of ${t.total}` } : s.big;
    const title = t
      ? `<h1 class="b-title">Timer</h1>`
      : `<h1 class="b-title">${esc(s.headline)}${s.tag ? ` <span class="b-title__tag">${esc(s.tag)}</span>` : ''}</h1>`;
    const side = t
      ? `${readoutCard({ value: s.big.value, caption: `left in ${s.headline} · ${s.tag}` })}${nextCard(s)}`
      : `${nextCard(s)}${s.small.map(readoutCard).join('')}`;
    return `
      <main class="b-screen${t ? ' has-timer' : ''}">
        <header class="b-top">
          <p class="b-day"><span class="b-day__label">${esc(s.dayLabel)}</span><span class="b-day__date">${esc(s.date)}</span>${divisionChip(s)}</p>
          <nav class="b-controls" aria-label="Clock controls">${CONTROLS.map((c) => controlButton(c, 'ctl b-ctl')).join('')}</nav>
        </header>
        <section class="b-main" aria-label="Clock">
          <div class="b-now-block">
            <p class="b-kind">${t ? 'Classroom timer' : esc(kindText)}</p>
            ${title}
            <button type="button" class="b-big${t ? ' b-big--timer' : ''}">
              <span class="b-big__value num${big.value.length > 5 ? ' is-long' : ''}" data-readout="big">${digits(big.value)}${big.suffix ? `<span class="unit">${esc(big.suffix)}</span>` : ''}</span>
              <span class="b-big__caption">${esc(big.caption)}</span>
            </button>
            ${t ? `<div class="b-timer-actions"><button type="button" class="btn">${icon('pause')}Pause</button><button type="button" class="btn">${icon('stop')}Cancel</button></div>` : ''}
            ${s.line ? `<p class="b-line">${esc(s.line)}</p>` : ''}
          </div>
          <div class="b-side">${side}</div>
        </section>
        ${strip(s)}
        ${agenda(s)}
      </main>`;
  }

  function renderMini(s, st) {
    const ringing = st.overlay === 'ringing';
    return `
      <main class="b-mini${ringing ? ' is-ringing' : ''}">
        ${ringing ? '<div class="ring-flash" aria-hidden="true"></div>' : ''}
        <h1 class="bm-title">${ringing ? `${icon('bell')}Ringing · ${esc(st.ring.title)}` : `${esc(s.headline)}${s.tag ? ` <span class="b-title__tag">${esc(s.tag)}</span>` : ''}`}</h1>
        <p class="bm-big num">${digits(s.big.value)}</p>
        ${ringing ? '<button type="button" class="btn btn--accent bm-dismiss">Dismiss</button>' : `<p class="bm-next">${s.upNext ? `<span class="bm-next__k">Up next</span> ${esc(periodName(s.upNext.name))} <span class="num">${esc(s.upNext.at)}</span>` : ''}</p>${strip(s, true)}`}
      </main>`;
  }

  window.Direction = { name: 'B · Timeline', renderMain, renderMini };
})();
