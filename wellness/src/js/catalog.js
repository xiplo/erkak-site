// ERKAK · каталог программ: поиск, цель, регион, месяц, бюджет, хиты, направления, «показать ещё».
(function(){
  'use strict';
  var U = (window.ERK || {}).ui || {};
  var $ = function(s, r){ return (r || document).querySelector(s); }, $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var grid = $('#catalog'); if (!grid) return;
  var cards = $$('.card', grid), tabs = $$('.tabs [data-d]'), full = !!$('#f-q');
  var st = { d:'', goal:'', reg:'', month:'', budget:'', hot:false, q:'', limit:full ? (innerWidth < 760 ? 6 : 9) : 999 };
  var p = new URLSearchParams(location.search);
  ['d', 'goal', 'reg', 'month'].forEach(function(k){ if (p.get(k)) st[k] = p.get(k); });
  var fill = function(s, v){ return String(s || '').replace(/\{(\w+)\}/g, function(m, k){ return v[k] != null ? v[k] : m; }); };
  function apply(){
    var lo = 0, hi = Infinity; if (st.budget) { var b = st.budget.split('-'); lo = +b[0]; hi = +b[1] || Infinity; }
    var words = st.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var match = cards.filter(function(c){
      var m = c.getAttribute('data-m');
      return (!st.d || c.getAttribute('data-d') === st.d) && (!st.goal || c.getAttribute('data-goals').split(' ').indexOf(st.goal) > -1) &&
        (!st.reg || c.getAttribute('data-reg') === st.reg) && (!st.month || !m || m.split(' ').indexOf(st.month) > -1) &&
        (+c.getAttribute('data-usd') >= lo && +c.getAttribute('data-usd') < hi) && (!st.hot || c.getAttribute('data-hot') === '1') &&
        words.every(function(w){ return c.getAttribute('data-q').indexOf(w) > -1; });
    });
    cards.forEach(function(c){ c.hidden = true; });
    match.slice(0, st.limit).forEach(function(c){ c.hidden = false; c.classList.add('in'); });
    var cnt = $('#count'); if (cnt) cnt.textContent = fill(U.count, { n:Math.min(st.limit, match.length), m:match.length });
    var more = $('#more'); if (more) more.parentNode.hidden = match.length <= st.limit;
    var empty = $('#empty'); if (empty) empty.hidden = match.length > 0;
    tabs.forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-d') === st.d); });
    var set = function(id, v){ var el = $(id); if (el) { if (el.type === 'checkbox') el.checked = v; else el.value = v; } };
    set('#f-goal', st.goal); set('#f-reg', st.reg); set('#f-month', st.month); set('#f-budget', st.budget); set('#f-hot', st.hot);
  }
  var set = function(k, v){ st[k] = v; st.limit = full ? (innerWidth < 760 ? 6 : 9) : 999; apply(); };
  tabs.forEach(function(b){ b.addEventListener('click', function(){ set('d', b.getAttribute('data-d')); }); });
  [['#f-goal', 'goal'], ['#f-reg', 'reg'], ['#f-month', 'month'], ['#f-budget', 'budget']].forEach(function(x){ var el = $(x[0]); el && el.addEventListener('change', function(){ set(x[1], el.value); window.ERK_track && window.ERK_track('filter', { k:x[1], v:el.value }); }); });
  var hot = $('#f-hot'); hot && hot.addEventListener('change', function(){ set('hot', hot.checked); });
  var q = $('#f-q'), t; q && q.addEventListener('input', function(){ clearTimeout(t); t = setTimeout(function(){ set('q', q.value); }, 140); });
  var more = $('#more'); more && more.addEventListener('click', function(){ st.limit += 9; apply(); });
  $$('[data-goal]').forEach(function(b){ b.addEventListener('click', function(){ st.d = ''; set('goal', b.getAttribute('data-goal')); var top = $('#top'); top && top.scrollIntoView({ behavior:'smooth' }); }); });
  apply();
})();
