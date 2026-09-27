// ERKAK · интерактив поверх статического HTML: меню, фильтры, сегменты, карта, валюта, квиз, заявки.
(function(){
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const D = window.DATA, ART = window.ART;
  const store = { get(k){ try { return localStorage.getItem(k); } catch { return null; } }, set(k, v){ try { localStorage.setItem(k, v); } catch {} } };
  const MONTHS = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
  const fmt = n => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c]);

  // ── UTM и источник: сохраняем на сессию, прикладываем к заявке ──
  const params = new URLSearchParams(location.search);
  const utm = {}; ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','ref'].forEach(k => { if (params.get(k)) utm[k] = params.get(k); });
  try { if (Object.keys(utm).length) sessionStorage.setItem('utm', JSON.stringify(utm)); } catch {}
  const getUtm = () => { try { return JSON.parse(sessionStorage.getItem('utm') || '{}'); } catch { return {}; } };

  // ── Шапка, меню, нижняя панель ──
  const top = $('#top'), burger = $('#burger'), nav = $('#nav');
  const onScroll = () => top.classList.toggle('solid', scrollY > 24 || !$('.hero'));
  onScroll(); addEventListener('scroll', onScroll, { passive:true });
  burger && burger.addEventListener('click', () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); });
  nav && nav.addEventListener('click', e => { if (e.target.tagName === 'A') { nav.classList.remove('open'); burger.setAttribute('aria-expanded', false); } });
  const pick = $('#pick'), mbar = $('#mbar'), dock = $('#dock');
  if (pick && 'IntersectionObserver' in window) new IntersectionObserver(([e]) => { mbar && mbar.classList.toggle('hide', e.isIntersecting); dock && dock.classList.toggle('hide', e.isIntersecting); }, { threshold:.15 }).observe(pick);
  if ($('#book') && mbar) { const a = $('a', mbar); a.textContent = 'Проверить дату'; a.href = '#book'; }

  // ── Появление блоков ──
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin:'0px 0px -8% 0px' });
    $$('.rv').forEach(el => io.observe(el));
  } else $$('.rv').forEach(el => el.classList.add('in'));

  // ── «Сейчас в сезоне» ──
  const live = $('#live span');
  if (live) {
    const m = new Date().getMonth();
    const sea = D.season.filter(r => r[0] !== 'Пресная вода');
    const top = lvl => sea.filter(r => r[2][m] >= lvl).map(r => r[0].split(' (')[0].split(',')[0].toLowerCase().replace('gt', 'GT'));
    const hot = top(3), good = top(2);
    const calm = D.seaState[m] >= 3;
    const what = hot.length ? 'пик — ' + hot.slice(0, 2).join(', ') : good.length ? 'клюют ' + good.slice(0, 2).join(', ') : 'сезон пресной воды';
    live.textContent = `${MONTHS[m][0].toUpperCase() + MONTHS[m].slice(1)}: ${what}${calm ? ' · море спокойное' : ' · муссон, ловим в окна'}`;
  }

  // ── Валюта ──
  const CUR = ['THB','USD','RUB'];
  let cur = CUR.includes(store.get('cur')) ? store.get('cur') : 'THB';
  const conv = (thb, c) => c === 'USD' ? '$' + fmt(Math.round(thb / D.rates.USD / 10) * 10) : c === 'RUB' ? '≈ ' + fmt(Math.round(thb / D.rates.RUB / 1000) * 1000) + ' ₽' : fmt(thb) + ' THB';
  function applyCur(){
    $$('[data-thb]').forEach(el => { if (el.dataset.pre == null) el.dataset.pre = /^от\s/.test(el.textContent) ? 'от ' : ''; el.textContent = el.dataset.pre + conv(+el.dataset.thb, cur); });
    $$('[data-usd]').forEach(el => { const v = +el.dataset.usd; el.textContent = cur === 'USD' ? fmt(v) + ' THB' : '≈ $' + fmt(Math.round(v / D.rates.USD / 10) * 10); });
    const b = $('#cur'); if (b) { b.textContent = cur + ' ↻'; b.title = 'Показать цены в другой валюте. Курс ориентировочный, итог — в THB в подтверждении.'; }
  }
  const curBtn = $('#cur');
  curBtn && curBtn.addEventListener('click', () => { cur = CUR[(CUR.indexOf(cur) + 1) % CUR.length]; store.set('cur', cur); applyCur(); });
  applyCur();

  // ── Фильтр туров ──
  $$('.filters [data-f]').forEach(b => b.addEventListener('click', () => {
    $$('.filters [data-f]').forEach(x => x.setAttribute('aria-pressed', x === b));
    const f = b.dataset.f;
    $$('#tours .tour').forEach(t => { t.hidden = f !== 'all' && t.dataset.cat !== f; if (!t.hidden) t.classList.add('in'); });
  }));

  // ── Сегменты (вкладки) ──
  const tabs = $$('[role=tab]');
  function selectTab(tab){
    tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; $('#' + t.getAttribute('aria-controls')).hidden = !on; });
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; e.preventDefault(); const n = tabs[(i + d + tabs.length) % tabs.length]; selectTab(n); n.focus(); });
  });

  // ── Карта ──
  const card = $('#spotCard');
  function showSpot(id){
    const s = D.spots.find(x => x.id === id); if (!s || !card) return;
    card.innerHTML = `<span class="status ${s.ok ? 'ok' : 'no'}">${s.ok ? '● Рыбалка разрешена' : '✕ Рыбалка запрещена'}</span><h3>${esc(s.name)}</h3>
      <dl class="kv"><dt>ПУТЬ</dt><dd>${esc(s.run)}</dd><dt>РЫБА</dt><dd>${esc(s.fish)}</dd><dt>МЕТОД</dt><dd>${esc(s.how)}</dd></dl><p style="color:var(--on-deep-muted);font-size:15px">${esc(s.note)}</p>
      ${s.ok ? `<a class="btn btn-cta" href="#pick" style="justify-self:start">Хочу сюда</a>` : ''}`;
    $$('.pin').forEach(p => p.classList.toggle('on', p.dataset.spot === id));
    $$('#spotList button').forEach(b => b.classList.toggle('on', b.dataset.spot === id));
  }
  $$('.pin, #spotList button').forEach(p => { p.addEventListener('click', () => showSpot(p.dataset.spot)); p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showSpot(p.dataset.spot); } }); });
  if (card) showSpot('racha-noi');

  // ── Отправка заявок ──
  function messengerText(lead){
    const lines = [`Здравствуйте! Заявка с сайта ${D.brand}.`];
    if (lead.tourTitle) lines.push(`Тур: ${lead.tourTitle}`);
    if (lead.summary) lines.push(lead.summary);
    if (lead.date) lines.push(`Даты: ${lead.date}`);
    if (lead.guests) lines.push(`Гостей: ${lead.guests}`);
    if (lead.guide) lines.push('Пришлите, пожалуйста, гайд по Андаману.');
    return lines.join('\n');
  }
  const links = lead => {
    const t = encodeURIComponent(messengerText(lead)), C = D.contacts;
    return (C.telegram ? `<a class="btn btn-cta" href="https://t.me/${C.telegram}?text=${t}" target="_blank" rel="noopener">${ART.icon('tg')} Написать в Telegram</a>` : '') +
           (C.whatsapp ? `<a class="btn btn-ghost" href="https://wa.me/${C.whatsapp}?text=${t}" target="_blank" rel="noopener">${ART.icon('wa')} WhatsApp</a>` : '');
  };
  async function send(lead){
    lead.page = location.pathname; lead.utm = getUtm(); lead.ref = document.referrer || '';
    if (!D.api) return false;
    try {
      const r = await fetch(D.api, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify(lead) });
      return r.ok;
    } catch { return false; }
  }
  function track(ev, data){ try { window.dataLayer && window.dataLayer.push({ event:ev, ...data }); window.ym && D.metrika && window.ym(D.metrika, 'reachGoal', ev); } catch {} }

  // ── Квиз ──
  const quiz = $('#quiz');
  if (quiz) {
    const steps = $$('.q-step', quiz), next = $('#qNext'), back = $('#qBack'), bar = $('#qBar'), num = $('#qNum');
    let i = 0, guide = false;
    const val = n => (quiz.querySelector(`input[name=${n}]:checked`) || {}).value;
    const LABEL = n => { const el = quiz.querySelector(`input[name=${n}]:checked`); return el ? $('label', el.parentNode).firstChild.firstChild.textContent : ''; };
    function choose(){
      const who = val('who'), exp = val('exp'), goal = val('goal'), where = val('where'), b = val('budget');
      if (goal === 'event' || who === 'corp') return 'tournament';
      if (goal === 'all' || who === 'vip' || (b === 'b4' && goal !== 'fresh')) return 'signature-week';
      if (goal === 'billfish') return (b === 'b3' && exp === 'trophy') ? 'overnight-shelf' : 'bigame-day';
      if (where === 'bkk' && (goal === 'fun' || goal === 'gt')) return 'gulf-private';
      if (goal === 'gt') return (where === 'khaolak' && b === 'b3') ? 'expedition-khaolak' : 'pro-gt';
      if (goal === 'fresh') return exp === 'trophy' ? 'stingray' : where === 'bkk' ? 'bangkok-monsters' : 'khaosok-jungle';
      if (b === 'b1' || who === 'solo') return 'first-strike';
      return 'family-half';
    }
    function ready(){
      const s = steps[i].dataset.step;
      if (s === '6') return $('#qName').value.trim() && $('#qContact').value.trim().length >= 4;
      if (s === '4') return !!val('where');
      const name = { 1:'who', 2:'exp', 3:'goal', 5:'budget' }[s];
      return !!val(name);
    }
    function render(){
      steps.forEach((s, k) => s.hidden = k !== i);
      num.textContent = `${i + 1} / ${steps.length}`; bar.style.width = ((i + 1) / steps.length * 100) + '%';
      back.disabled = i === 0;
      const last = i === steps.length - 1;
      next.innerHTML = last ? 'Получить план и цену' : `Дальше <span class="arrow">${ART.icon('arrow')}</span>`;
      next.disabled = !ready();
      if (last) {
        const t = D.tours.find(x => x.id === choose());
        $('#qPick').innerHTML = `${ART.fish(t.fish)}<div><span class="small">ВАМ ПОДОЙДЁТ</span><strong>${esc(t.title)}</strong><span>${esc(t.where)} · ${esc(t.dur)} · от <b data-thb="${t.price}">${fmt(t.price)} THB</b> ${t.per === 'boat' ? 'за лодку' : t.per === 'person' ? 'за рыболова' : 'за программу'}</span></div>`;
        applyCur();
        if (!val('channel')) { const c = $('#channel-telegram'); c && (c.checked = true); }
      }
    }
    quiz.addEventListener('change', e => {
      next.disabled = !ready();
      const auto = e.target.type === 'radio' && ['who','exp','goal','budget'].includes(e.target.name);
      if (auto && i < steps.length - 1) setTimeout(() => { i++; render(); track('quiz_step', { step:i }); }, 220);
    });
    quiz.addEventListener('input', () => next.disabled = !ready());
    back.addEventListener('click', () => { if (i > 0) { i--; render(); } });
    next.addEventListener('click', async () => {
      if (!ready()) return;
      if (i < steps.length - 1) { i++; render(); return; }
      if (quiz.company.value) return; // бот
      next.disabled = true; next.textContent = 'Отправляем…';
      const t = D.tours.find(x => x.id === choose());
      const lead = { type: guide ? 'guide' : 'quiz', tour:t.id, tourTitle:t.title, name:$('#qName').value.trim(), contact:$('#qContact').value.trim(), channel:val('channel'), date:$('#qDate').value.trim(), guide,
        answers:{ who:val('who'), exp:val('exp'), goal:val('goal'), where:val('where'), budget:val('budget') },
        summary:[LABEL('who'), LABEL('exp'), LABEL('goal'), LABEL('where'), LABEL('budget')].filter(Boolean).join(' · ') };
      const ok = await send(lead);
      track('lead', { type:lead.type, tour:t.id });
      steps.forEach(s => s.hidden = true); $('.q-nav', quiz).hidden = true; $('.q-prog', quiz).hidden = true;
      const done = $('#qDone'); done.hidden = false;
      done.innerHTML = `<div class="ok-msg"><h3>${ok ? 'Заявка у нас' : 'Остался один шаг'}</h3><p style="color:var(--on-deep-muted);max-width:520px">${ok ? `Консьерж пришлёт план «${esc(t.title)}» с ценой и прогнозом в ${lead.channel === 'whatsapp' ? 'WhatsApp' : lead.channel === 'call' ? 'звонке' : 'Telegram'}. В рабочие часы — за 15 минут. Хотите быстрее — напишите сами:` : 'Отправьте заявку в мессенджер — текст уже готов, останется нажать «Отправить».'}</p><div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">${links(lead)}</div></div>`;
    });
    // Предвыбор из сегментов и лид-магнита
    const SEG = { family:'family', angler:'solo', trophy:'solo', corp:'corp', vip:'vip' };
    $$('[data-seg],[data-guide]').forEach(a => a.addEventListener('click', () => {
      if (a.dataset.guide) guide = true;
      const w = SEG[a.dataset.seg]; if (w && i === 0) { const r = $('#who-' + w); if (r) { r.checked = true; i = 1; render(); } }
    }));
    render();
  }

  // ── Форма на странице тура ──
  $$('.book-form').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault();
    if (f.company.value) return;
    const contact = f.contact.value.trim();
    if (contact.length < 4) { f.contact.focus(); f.contact.setAttribute('aria-invalid', 'true'); return; }
    const t = D.tours.find(x => x.id === f.dataset.tour);
    const btn = $('button', f); btn.disabled = true; btn.textContent = 'Отправляем…';
    const lead = { type:'tour', tour:t.id, tourTitle:t.title, contact, date:f.date.value.trim(), guests:f.guests.value.trim() };
    const ok = await send(lead);
    track('lead', { type:'tour', tour:t.id });
    f.outerHTML = `<div class="ok-msg" style="background:var(--sea-tint)"><h3 style="color:var(--text);font-size:20px">${ok ? 'Проверяем дату' : 'Отправьте в мессенджер'}</h3><p style="color:var(--muted);font-size:15px">${ok ? 'Ответим с планом и прогнозом. Быстрее всего — в Telegram:' : 'Текст заявки уже готов:'}</p><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">${links(lead)}</div></div>`;
  }));
})();
