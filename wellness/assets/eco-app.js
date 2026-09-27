// ERKAK · интерактив хаба: каталог топ-100 (поиск, фильтры, «ещё»), цели, квиз подбора, предзапись.
(function(){
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const D = window.DATA, E = window.ECO, ART = window.ART;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c]);
  const getUtm = () => { try { return JSON.parse(sessionStorage.getItem('utm') || '{}'); } catch { return {}; } };
  const extra = {}; // клуб или маршрут, выбранные перед квизом

  // ── Отправка и запасной путь через мессенджер ──
  async function send(lead){
    lead.page = location.pathname; lead.utm = getUtm(); lead.ref = document.referrer || '';
    if (!D.api) return false;
    try { const r = await fetch(D.api, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify(lead) }); return r.ok; } catch { return false; }
  }
  function links(lead){
    const text = [`Здравствуйте! Заявка с сайта ERKAK.`, lead.tourTitle && `Программа: ${lead.tourTitle}`, lead.summary, lead.date && `Даты: ${lead.date}`, lead.guests && `Участников: ${lead.guests}`].filter(Boolean).join('\n');
    const t = encodeURIComponent(text), C = D.contacts;
    return (C.telegram ? `<a class="btn btn-cta" href="https://t.me/${C.telegram}?text=${t}" target="_blank" rel="noopener">${ART.icon('tg')} Telegram</a>` : '') +
           (C.whatsapp ? `<a class="btn btn-ghost" href="https://wa.me/${C.whatsapp}?text=${t}" target="_blank" rel="noopener">${ART.icon('wa')} WhatsApp</a>` : '');
  }
  const track = (ev, data) => { try { window.dataLayer && window.dataLayer.push({ event:ev, ...data }); } catch {} };

  // ── Каталог ──
  const cat = $('#catalog');
  if (cat) {
    const cards = $$('.prod', cat), more = $('#more'), count = $('#catCount'), empty = $('#catEmpty');
    const st = { d:'', goal:'', reg:'', budget:'', hot:false, q:'', limit:24 };
    const p = new URLSearchParams(location.search);
    if (p.get('d')) st.d = p.get('d'); if (p.get('goal')) st.goal = p.get('goal');
    function apply(){
      const [lo, hi] = st.budget ? st.budget.split('-').map(Number) : [0, Infinity];
      const q = st.q.trim().toLowerCase();
      const match = cards.filter(c => (!st.d || c.dataset.d === st.d) && (!st.goal || c.dataset.goals.split(' ').includes(st.goal)) && (!st.reg || c.dataset.reg === st.reg)
        && (+c.dataset.usdV >= lo && +c.dataset.usdV < hi) && (!st.hot || c.dataset.hot === '1') && (!q || q.split(/\s+/).every(w => c.dataset.q.includes(w))));
      cards.forEach(c => c.hidden = true);
      match.slice(0, st.limit).forEach(c => { c.hidden = false; c.classList.add('in'); });
      count.textContent = `Показано: ${Math.min(st.limit, match.length)} из ${match.length}`;
      more.hidden = match.length <= st.limit; empty.hidden = match.length > 0;
      $$('#top .filters [data-d]').forEach(b => b.setAttribute('aria-pressed', b.dataset.d === st.d));
      $('#fGoal').value = st.goal; $('#fReg').value = st.reg; $('#fBudget').value = st.budget; $('#fHot').checked = st.hot;
    }
    const set = (k, v) => { st[k] = v; st.limit = 24; apply(); };
    $$('#top .filters [data-d]').forEach(b => b.addEventListener('click', () => set('d', b.dataset.d)));
    $('#fGoal').addEventListener('change', e => set('goal', e.target.value));
    $('#fReg').addEventListener('change', e => set('reg', e.target.value));
    $('#fBudget').addEventListener('change', e => set('budget', e.target.value));
    $('#fHot').addEventListener('change', e => set('hot', e.target.checked));
    let tq; $('#q').addEventListener('input', e => { clearTimeout(tq); tq = setTimeout(() => set('q', e.target.value), 150); });
    more.addEventListener('click', () => { st.limit += 24; apply(); });
    $$('[data-goal]').forEach(b => b.addEventListener('click', () => { st.d = ''; set('goal', b.dataset.goal); $('#top').scrollIntoView({ behavior:'smooth' }); }));
    apply();
  }

  // ── Клуб и маршруты: запоминаем выбор для заявки ──
  $$('[data-club]').forEach(a => a.addEventListener('click', () => { extra.club = a.dataset.club; }));
  $$('[data-combo]').forEach(a => a.addEventListener('click', () => { extra.combo = a.dataset.combo; }));

  // ── Квиз ──
  const quiz = $('#ecoQuiz');
  if (quiz) {
    const DIR = Object.fromEntries(E.directions.map(d => [d.id, d]));
    const items = [
      ...D.tours.map(t => ({ id:t.id, d:'fishing', reg:'th', title:'Рыбалка: ' + t.title, dur:t.dur, usd:Math.round(t.price / D.rates.USD), price:t.price.toLocaleString('ru-RU') + ' THB', hot:!!t.hot, href:`/fishing/tours/${t.id}.html`, fish:t.fish })),
      ...E.products.map(([id, d, reg, title, where, dur, usd, , hot]) => ({ id, d, reg, title, dur, usd, price:'$' + usd.toLocaleString('ru-RU'), hot:!!hot, href:`/p/${id}.html` }))
    ];
    const days = s => { const n = (s.match(/\d+/g) || ['7']).map(Number); const v = Math.max(...n); if (/нед/.test(s)) return v * 7; if (/сесс|занят|визит/.test(s)) return 0; return v; };
    const TARGET = { d1:2, d5:7, d14:14, d30:30 }, BUD = { b1:[0,1000], b2:[1000,3000], b3:[3000,6000], b4:[6000,1e9] };
    const steps = $$('.q-step', quiz), next = $('#qNext'), back = $('#qBack');
    let i = 0;
    const val = n => (quiz.querySelector(`input[name=${n}]:checked`) || {}).value;
    const label = n => { const el = quiz.querySelector(`input[name=${n}]:checked`); return el ? $('label span', el.parentNode).firstChild.textContent : ''; };
    function pick(){
      const g = val('goal'), r = val('reg'), du = TARGET[val('dur')], [lo, hi] = BUD[val('budget')] || [0, 1e9];
      const scored = items.filter(p => DIR[p.d].goals.includes(g)).map(p => {
        let s = p.hot ? 1.5 : 0;
        if (r === 'any' || p.reg === r) s += 4; else if (p.reg === 'online') s += 1;
        const dd = days(p.dur); s += dd === 0 ? 1.5 : Math.max(0, 3 - Math.abs(Math.log(dd / du)) * 2);
        s += p.usd >= lo && p.usd < hi ? 3 : (p.usd < lo ? 0.5 : -2);
        return { p, s };
      }).sort((a, b) => b.s - a.s);
      const out = [], used = new Set();
      for (const x of scored) { if (out.length === 3) break; if (!used.has(x.p.d) || scored.length < 6) { out.push(x.p); used.add(x.p.d); } }
      for (const x of scored) { if (out.length === 3) break; if (!out.includes(x.p)) out.push(x.p); }
      return out;
    }
    const ready = () => { const s = steps[i].dataset.step; return s === 'contact' ? $('#eContact').value.trim().length >= 4 : !!val(s); };
    function render(){
      steps.forEach((s, k) => s.hidden = k !== i);
      $('#qNum').textContent = `${i + 1} / ${steps.length}`; $('#qBar').style.width = ((i + 1) / steps.length * 100) + '%';
      back.disabled = i === 0;
      const last = i === steps.length - 1;
      next.innerHTML = last ? 'Получить план и цену' : `Дальше <span class="arrow">${ART.icon('arrow')}</span>`;
      next.disabled = !ready();
      if (last) $('#qPicks').innerHTML = pick().map(p => `<a href="${p.href}" target="_blank" rel="noopener">${p.fish ? ART.fish(p.fish) : ART.glyph(DIR[p.d].glyph)}<div><strong>${esc(p.title)}</strong><span>${esc(DIR[p.d].name)} · ${esc(p.dur)}</span></div><span class="p">от ${esc(p.price)}</span></a>`).join('');
    }
    quiz.addEventListener('change', e => {
      next.disabled = !ready();
      if (e.target.type === 'radio' && i < steps.length - 1) setTimeout(() => { i++; render(); track('eco_quiz_step', { step:i }); }, 220);
    });
    quiz.addEventListener('input', () => next.disabled = !ready());
    back.addEventListener('click', () => { if (i > 0) { i--; render(); } });
    next.addEventListener('click', async () => {
      if (!ready()) return;
      if (i < steps.length - 1) { i++; render(); return; }
      if (quiz.company.value) return;
      next.disabled = true; next.textContent = 'Отправляем…';
      const ps = pick();
      const lead = { type:'eco', tour:ps.map(p => p.id).join(','), tourTitle:ps.map(p => p.title).join(' / '), name:$('#eName').value.trim(), contact:$('#eContact').value.trim(), date:$('#eDate').value.trim(),
        answers:{ goal:val('goal'), reg:val('reg'), dur:val('dur'), budget:val('budget'), ...extra },
        summary:[label('goal'), label('reg'), label('dur'), label('budget'), extra.club && 'Клуб: ' + extra.club, extra.combo && 'Маршрут: ' + extra.combo].filter(Boolean).join(' · ') };
      const ok = await send(lead); track('lead', { type:'eco' });
      steps.forEach(s => s.hidden = true); $('.q-nav', quiz).hidden = true; $('.q-prog', quiz).hidden = true;
      const done = $('#qDone'); done.hidden = false;
      done.innerHTML = `<div class="ok-msg"><h3>${ok ? 'Заявка у нас' : 'Остался один шаг'}</h3><p style="color:var(--on-deep-muted);max-width:520px">${ok ? 'Консьерж пришлёт три варианта с датами и ценой. В рабочие часы — за 15 минут. Быстрее всего — написать самим:' : 'Отправьте заявку в мессенджер — текст уже готов.'}</p><div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">${links(lead)}</div></div>`;
    });
    render();
  }

  // ── Предзапись на странице программы ──
  $$('.wait-form').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault();
    if (f.company.value) return;
    const contact = f.contact.value.trim();
    if (contact.length < 4) { f.contact.focus(); f.contact.setAttribute('aria-invalid', 'true'); return; }
    const btn = $('button', f); btn.disabled = true; btn.textContent = 'Отправляем…';
    const lead = { type:'waitlist', tour:f.dataset.product, tourTitle:f.dataset.title, contact, date:f.date.value.trim(), guests:f.guests.value.trim() };
    const ok = await send(lead); track('lead', { type:'waitlist', product:f.dataset.product });
    f.outerHTML = `<div class="ok-msg" style="background:var(--sea-tint)"><h3 style="color:var(--text);font-size:20px">${ok ? 'Вы в списке первых' : 'Отправьте в мессенджер'}</h3><p style="color:var(--muted);font-size:15px">${ok ? 'Напишем, как только соберём даты и цену. Вопросы — в мессенджер:' : 'Текст заявки уже готов:'}</p><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">${links(lead)}</div></div>`;
  }));
})();
