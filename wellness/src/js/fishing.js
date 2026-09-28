// ERKAK · раздел рыбалки: «сейчас в сезоне», вкладки аудиторий, фильтр туров, карта спотов.
(function(){
  'use strict';
  var E = window.ERK || {}, U = E.ui || {};
  var $ = function(s, r){ return (r || document).querySelector(s); }, $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); };
  var fill = function(s, v){ return String(s || '').replace(/\{(\w+)\}/g, function(m, k){ return v[k] != null ? v[k] : m; }); };

  // Сейчас в сезоне
  var live = $('#live span');
  if (live && E.season) {
    var m = new Date().getMonth();
    var top = function(l){ return E.season.filter(function(r){ return r[1][m] >= l; }).map(function(r){ return r[0].toLocaleLowerCase(E.locale); }); };
    var hot = top(3), good = top(2);
    var mon = new Intl.DateTimeFormat(E.locale, { month:'long' }).format(new Date(2026, m, 15));
    mon = mon.charAt(0).toLocaleUpperCase(E.locale) + mon.slice(1);
    var what = hot.length ? fill(U.livePeak, { list:hot.slice(0, 2).join(', ') }) : good.length ? fill(U.liveGood, { list:good.slice(0, 2).join(', ') }) : U.liveFresh;
    live.textContent = mon + ': ' + what + ' · ' + (E.sea[m] >= 3 ? U.liveCalm : U.liveMonsoon);
  }

  // Вкладки аудиторий
  var tabs = $$('[role=tab]');
  function sel(t){ tabs.forEach(function(x){ var on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute('aria-controls')).hidden = !on; }); }
  tabs.forEach(function(t, i){
    t.addEventListener('click', function(){ sel(t); });
    t.addEventListener('keydown', function(e){ var rtl = document.dir === 'rtl', d = e.key === 'ArrowRight' ? (rtl ? -1 : 1) : e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0; if (!d) return; e.preventDefault(); var n = tabs[(i + d + tabs.length) % tabs.length]; sel(n); n.focus(); });
  });

  // Фильтр туров
  var grid = $('#tours-grid');
  $$('[data-f]').forEach(function(b){ b.addEventListener('click', function(){
    $$('[data-f]').forEach(function(x){ x.setAttribute('aria-pressed', x === b); });
    var f = b.getAttribute('data-f');
    $$('.card', grid).forEach(function(c){ c.hidden = f !== 'all' && c.getAttribute('data-cat') !== f; if (!c.hidden) c.classList.add('in'); });
  }); });

  // Карта спотов
  var card = $('#spot');
  function show(id){
    var s = (E.spots || {})[id]; if (!s || !card) return;
    card.innerHTML = '<span class="status ' + (s.ok ? 'ok' : 'no') + '">' + esc(s.ok ? U.allowed : U.banned) + '</span><h3>' + esc(s.name) + '</h3>' +
      '<dl><dt>' + esc(U.spotRun) + '</dt><dd>' + esc(s.run) + '</dd><dt>' + esc(U.spotFish) + '</dt><dd>' + esc(s.fish) + '</dd><dt>' + esc(U.spotHow) + '</dt><dd>' + esc(s.how) + '</dd></dl><p>' + esc(s.note) + '</p>' +
      (s.ok ? '<a class="btn btn-gold" href="#pick">' + esc(U.spotCta) + '<span class="ar" aria-hidden="true"></span></a>' : '');
    $$('.pin').forEach(function(p){ p.classList.toggle('on', p.getAttribute('data-spot') === id); });
    $$('.spot-list button').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-spot') === id); });
  }
  $$('.pin, .spot-list button').forEach(function(p){
    p.addEventListener('click', function(){ show(p.getAttribute('data-spot')); });
    p.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(p.getAttribute('data-spot')); } });
  });
  show('racha-noi');
})();
