// ERKAK · общее ядро страницы: шапка, меню, язык и валюта, анимации, «Мой маршрут», формы заявок.
(function(){
  'use strict';
  var E = window.ERK || {}, U = E.ui || {};
  var $ = function(s, r){ return (r || document).querySelector(s); }, $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = { get:function(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }, set:function(k, v){ try { localStorage.setItem(k, v); } catch (e) {} } };
  var esc = function(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); };
  var fill = function(s, v){ return String(s || '').replace(/\{(\w+)\}/g, function(m, k){ return v[k] != null ? v[k] : m; }); };
  document.body.classList.remove('no-js'); document.body.classList.add('js');

  // ── Фото: если кадр не загрузился (CDN недоступен), оставляем размытую подложку без значка «битой» картинки ──
  var broken = function(img){ img.classList.add('ph-x'); };
  document.addEventListener('error', function(e){ var t = e.target; if (t && t.classList && t.classList.contains('ph')) broken(t); }, true);
  $$('img.ph').forEach(function(img){ if (img.complete && !img.naturalWidth) broken(img); });

  // ── Деньги ──
  var NICE = function(v){ var a = Math.abs(v), st = a < 100 ? 1 : a < 1000 ? 10 : a < 10000 ? 100 : a < 100000 ? 1000 : a < 1000000 ? 5000 : 10000; return Math.round(v / st) * st; };
  var money = function(n, c){ try { return new Intl.NumberFormat(E.locale, { style:'currency', currency:c, currencyDisplay:'narrowSymbol', maximumFractionDigits:0 }).format(n); } catch (e) { return n + ' ' + c; } };
  var conv = function(n, from, to){ var r = E.rates || {}; return NICE(n / (r[from] || 1) * (r[to] || 1)); };
  var cur = (E.curs || []).indexOf(store.get('erk_cur')) > -1 ? store.get('erk_cur') : E.cur;
  function applyCur(){
    $$('.pr-alt[data-v]').forEach(function(el){ var c = el.getAttribute('data-c'); el.textContent = c === cur ? '' : '≈ ' + money(conv(+el.getAttribute('data-v'), c, cur), cur); });
    $$('[data-cur-label]').forEach(function(el){ el.textContent = cur; });
    $$('[data-cur]').forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-cur') === cur); });
    renderPlan();
  }
  window.ERK_money = function(n, c){ return money(n, c); };
  window.ERK_cur = function(){ return cur; };
  window.ERK_conv = conv;

  // ── Шапка, всплывающие меню, мобильное меню ──
  var hdr = $('#hdr');
  var onScroll = function(){ hdr && hdr.classList.toggle('solid', window.scrollY > 24); };
  onScroll(); window.addEventListener('scroll', onScroll, { passive:true });
  function closePops(except){ $$('.menu-pop.open').forEach(function(p){ if (p !== except) { p.classList.remove('open'); var b = $('[aria-controls="' + p.id + '"]'); b && b.setAttribute('aria-expanded', 'false'); } }); }
  $$('[aria-controls^="pop-"]').forEach(function(b){
    var pop = document.getElementById(b.getAttribute('aria-controls'));
    b.addEventListener('click', function(e){ e.stopPropagation(); var o = !pop.classList.contains('open'); closePops(pop); pop.classList.toggle('open', o); b.setAttribute('aria-expanded', o); });
  });
  document.addEventListener('click', function(e){ if (!e.target.closest('.menu-pop')) closePops(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') { closePops(); closeMenu(); closePlan(); } });
  $$('[data-cur]').forEach(function(b){ b.addEventListener('click', function(){ cur = b.getAttribute('data-cur'); store.set('erk_cur', cur); applyCur(); closePops(); }); });
  $$('a[hreflang]').forEach(function(a){ a.addEventListener('click', function(){ store.set('erk_lang', (a.getAttribute('href') || '').split('/')[1]); }); });
  var menu = $('#menu'), burger = $('.burger');
  function closeMenu(){ if (!menu) return; menu.classList.remove('open'); burger && burger.setAttribute('aria-expanded', 'false'); document.documentElement.style.overflow = ''; }
  burger && burger.addEventListener('click', function(){ menu.classList.add('open'); burger.setAttribute('aria-expanded', 'true'); document.documentElement.style.overflow = 'hidden'; var f = $('a', menu); f && f.focus(); });
  $$('[data-menu-close], #menu nav a').forEach(function(x){ x.addEventListener('click', closeMenu); });

  // ── Подсказка языка (без автопереадресации) ──
  (function(){
    if (store.get('erk_lang') || store.get('erk_lang_hint')) return;
    var S = E.suggest || {}, langs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < langs.length; i++) {
      var c = String(langs[i]).toLowerCase().split('-')[0];
      if (c === E.lang) return;
      var link = $$('link[rel="alternate"][hreflang]').filter(function(l){ return l.getAttribute('hreflang').toLowerCase().split('-')[0] === c; })[0];
      if (S[c] && link) {
        var bar = document.createElement('div');
        bar.className = 'lang-hint'; bar.setAttribute('role', 'status'); bar.setAttribute('lang', c);
        bar.innerHTML = '<span>' + esc(S[c][0]) + '</span><a href="' + link.href + '">' + esc(S[c][1]) + '</a><button type="button" aria-label="' + esc(($('[data-menu-close]') || { getAttribute:function(){ return '×'; } }).getAttribute('aria-label') || '×') + '">×</button>';
        document.body.appendChild(bar);
        $('a', bar).addEventListener('click', function(){ store.set('erk_lang', c); });
        $('button', bar).addEventListener('click', function(){ store.set('erk_lang_hint', '1'); bar.remove(); });
        return;
      }
    }
  })();

  // ── Появление блоков ──
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin:'0px 0px -6% 0px' });
    $$('.rv').forEach(function(el){ io.observe(el); });
    window.ERK_reveal = function(el){ io.observe(el); };
  } else { $$('.rv').forEach(function(el){ el.classList.add('in'); }); window.ERK_reveal = function(el){ el.classList.add('in'); }; }

  // ── Нижняя панель и мессенджеры прячутся у форм ──
  var mbar = $('#mbar'), dock = $('#dock'), zones = $$('#pick, #book, .foot');
  if ('IntersectionObserver' in window && zones.length) {
    var vis = new Set();
    var zo = new IntersectionObserver(function(es){ es.forEach(function(e){ e.isIntersecting ? vis.add(e.target) : vis.delete(e.target); }); var h = vis.size > 0; mbar && mbar.classList.toggle('hide', h); dock && dock.classList.toggle('hide', h); }, { threshold:.08 });
    zones.forEach(function(z){ zo.observe(z); });
  }

  // ── Аналитика (если подключена) ──
  window.ERK_track = function(ev, data){ try { window.dataLayer && window.dataLayer.push(Object.assign({ event:ev }, data || {})); if (window.ym && E.metrika) window.ym(E.metrika, 'reachGoal', ev); if (window.gtag) window.gtag('event', ev, data || {}); } catch (e) {} };

  // ── UTM и источник ──
  var qs = new URLSearchParams(location.search), utm = {};
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','ref'].forEach(function(k){ if (qs.get(k)) utm[k] = qs.get(k); });
  try { if (Object.keys(utm).length) sessionStorage.setItem('erk_utm', JSON.stringify(utm)); } catch (e) {}
  var getUtm = function(){ try { return JSON.parse(sessionStorage.getItem('erk_utm') || '{}'); } catch (e) { return {}; } };

  // ── Отправка заявок ──
  var ITEMS = {}; (E.items || []).forEach(function(r){ ITEMS[r[0]] = r; });
  window.ERK_items = ITEMS;
  window.ERK_send = function(lead){
    lead.lang = E.lang; lead.page = location.pathname; lead.utm = getUtm(); lead.ref = document.referrer || ''; lead.currency = cur;
    if (!E.api) return Promise.resolve(false);
    return fetch(E.api, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify(lead) }).then(function(r){ return r.ok; }).catch(function(){ return false; });
  };
  window.ERK_links = function(lead){
    var text = [U.msgHello, lead.tourTitle && (U.msgProgram + ': ' + lead.tourTitle), lead.summary, lead.date && (U.msgDates + ': ' + lead.date), lead.guests && (U.msgGuests + ': ' + lead.guests)].filter(Boolean).join('\n');
    var t = encodeURIComponent(text);
    return (E.msg || []).slice(0, 2).map(function(m, i){ var href = m.icon === 'tg' ? m.href + '?text=' + t : m.icon === 'wa' ? m.href + '?text=' + t : m.href;
      return '<a class="btn ' + (i ? 'btn-ghost' : 'btn-gold') + '" href="' + href + '" target="_blank" rel="noopener">' + esc(m.label) + '<span class="ar" aria-hidden="true"></span></a>'; }).join('');
  };
  window.ERK_done = function(ok, lead, light){
    return '<div class="ok-msg"><h3>' + esc(ok ? U.okTitle : U.failTitle) + '</h3><p>' + esc(ok ? U.okText : U.failText) + '</p><div class="btns" style="justify-content:center">' + window.ERK_links(lead) + '</div></div>';
  };
  $$('.lead-form').forEach(function(f){
    f.addEventListener('submit', function(e){
      e.preventDefault();
      if (f.company && f.company.value) return;
      var c = f.contact; if (!c || c.value.trim().length < 4) { c && c.setAttribute('aria-invalid', 'true'); c && c.focus(); return; }
      c.removeAttribute('aria-invalid');
      var type = f.getAttribute('data-type'), btn = $('button[type=submit]', f); btn.disabled = true; btn.firstChild.textContent = U.sending;
      var lead = { type:type, tour:f.getAttribute('data-id'), tourTitle:f.getAttribute('data-title'), contact:c.value.trim(), name:f.name ? f.name.value.trim() : '', date:f.date ? f.date.value.trim() : '', guests:f.guests ? f.guests.value.trim() : '' };
      if (type === 'plan') { var ids = plan(); lead.tour = ids.join(','); lead.tourTitle = ids.map(function(id){ return ITEMS[id] ? ITEMS[id][4] : id; }).join(' / '); lead.summary = U.planSummary; }
      window.ERK_send(lead).then(function(ok){
        window.ERK_track('lead', { type:type, id:lead.tour });
        var box = document.createElement('div'); box.innerHTML = window.ERK_done(ok, lead); f.replaceWith(box.firstChild);
        if (ok && type === 'plan') { savePlan([]); }
      });
    });
  });

  // ── Мой маршрут ──
  function plan(){ try { return (JSON.parse(store.get('erk_plan') || '[]') || []).filter(function(id){ return ITEMS[id]; }); } catch (e) { return []; } }
  function savePlan(ids){ store.set('erk_plan', JSON.stringify(ids)); renderPlan(); }
  function renderPlan(){
    var ids = plan();
    $$('.plan-n').forEach(function(n){ n.textContent = ids.length; n.hidden = !ids.length; });
    $$('.plan-tool').forEach(function(b){ b.hidden = !ids.length; });
    $$('[data-plan]').forEach(function(b){ var on = ids.indexOf(b.getAttribute('data-plan')) > -1; b.setAttribute('aria-pressed', on); var s = $('span', b); if (s) s.textContent = on ? U.planAdded : U.planAdd; });
    var list = $('#plan-list'); if (!list) return;
    $('#plan-empty').hidden = ids.length > 0; $('#plan-sum').hidden = !ids.length;
    list.innerHTML = ids.map(function(id){ var r = ITEMS[id]; return '<li><a href="' + r[5] + '">' + esc(r[4]) + '</a><span>' + esc(r[7]) + ' · ' + esc(U.from) + ' ' + money(r[8], r[9]) + '</span><button type="button" data-plan-rm="' + id + '" aria-label="' + esc(U.planRemove) + '">×</button></li>'; }).join('');
    var sum = ids.reduce(function(a, id){ return a + ITEMS[id][15]; }, 0);
    var s = $('#plan-sum span'); if (s) s.textContent = '≈ ' + money(conv(sum, 'USD', cur), cur);
    $$('[data-plan-rm]', list).forEach(function(b){ b.addEventListener('click', function(){ savePlan(plan().filter(function(x){ return x !== b.getAttribute('data-plan-rm'); })); }); });
  }
  var planEl = $('#plan'), lastFocus = null;
  function openPlan(){ if (!planEl) return; lastFocus = document.activeElement; planEl.classList.add('open'); planEl.setAttribute('aria-hidden', 'false'); document.documentElement.style.overflow = 'hidden'; var x = $('[data-plan-close]', planEl); x && x.focus(); window.ERK_track('plan_open'); }
  function closePlan(){ if (!planEl || !planEl.classList.contains('open')) return; planEl.classList.remove('open'); planEl.setAttribute('aria-hidden', 'true'); document.documentElement.style.overflow = ''; lastFocus && lastFocus.focus(); }
  $$('[data-plan-open]').forEach(function(b){ b.addEventListener('click', openPlan); });
  $$('[data-plan-close]').forEach(function(b){ b.addEventListener('click', closePlan); });
  planEl && planEl.addEventListener('click', function(e){ if (e.target === planEl) closePlan(); });
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-plan]'); if (b) { e.preventDefault(); var id = b.getAttribute('data-plan'), ids = plan(), i = ids.indexOf(id); i > -1 ? ids.splice(i, 1) : ids.push(id); savePlan(ids); if (i < 0) window.ERK_track('plan_add', { id:id }); return; }
    var m = e.target.closest('[data-plan-many]'); if (m) { var add = m.getAttribute('data-plan-many').split(','), cur2 = plan(); add.forEach(function(x){ if (cur2.indexOf(x) < 0) cur2.push(x); }); savePlan(cur2); openPlan(); }
  });
  applyCur();
})();
