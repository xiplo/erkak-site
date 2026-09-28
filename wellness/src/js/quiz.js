// ERKAK · квиз подбора (хаб: data-type="eco"; рыбалка: data-type="quiz"). Шаги из разметки, автопереход, подбор трёх вариантов.
(function(){
  'use strict';
  var E = window.ERK || {}, U = E.ui || {}, ITEMS = window.ERK_items || {};
  var $ = function(s, r){ return (r || document).querySelector(s); }, $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); };
  var quiz = $('#quiz'); if (!quiz) return;
  var type = quiz.getAttribute('data-type'), steps = $$('.q-step', quiz), next = $('#q-next'), back = $('#q-back'), i = 0, extra = {};
  var val = function(n){ var el = quiz.querySelector('input[name="' + n + '"]:checked'); return el ? el.value : ''; };
  var label = function(n){ var el = quiz.querySelector('input[name="' + n + '"]:checked'); return el ? $('strong', el.parentNode).textContent : ''; };
  var rows = Object.keys(ITEMS).map(function(k){ return ITEMS[k]; });
  // row: [id, type, dir, reg, title, href, days, durLabel, price, cur, months, hot, live, art, perLabel, usdEq, dest]

  function pickEco(){
    var g = val('goal'), r = val('reg'), du = { d1:2, d5:7, d14:14, d30:30 }[val('dur')] || 7;
    var bs = (val('budget') || '0-').split('-'), bud = [+bs[0] || 0, +bs[1] || 1e9];
    var scored = rows.filter(function(p){ var d = (E.dirs || {})[p[2]]; return d && d[1].indexOf(g) > -1; }).map(function(p){
      var s = (p[11] ? 1.5 : 0) + (p[12] ? 1 : 0);
      if (r === 'any' || p[3] === r) s += 4; else if (p[3] === 'online') s += 1;
      s += p[6] === 0 ? 1.5 : Math.max(0, 3 - Math.abs(Math.log(p[6] / du)) * 2);
      s += p[15] >= bud[0] && p[15] < bud[1] ? 3 : (p[15] < bud[0] ? .5 : -2);
      return { p:p, s:s };
    }).sort(function(a, b){ return b.s - a.s; });
    var out = [], used = {};
    scored.forEach(function(x){ if (out.length < 3 && !used[x.p[2]]) { out.push(x.p); used[x.p[2]] = 1; } });
    scored.forEach(function(x){ if (out.length < 3 && out.indexOf(x.p) < 0) out.push(x.p); });
    return out;
  }
  function pickFish(){
    var who = val('who'), exp = val('exp'), goal = val('goal'), where = val('where'), b = val('budget');
    var main = goal === 'event' || who === 'corp' ? 'tournament'
      : goal === 'all' || who === 'vip' || (b === 'b4' && goal !== 'fresh') ? 'signature-week'
      : goal === 'billfish' ? ((b === 'b3' && exp === 'trophy') ? 'overnight-shelf' : 'bigame-day')
      : where === 'bkk' && (goal === 'fun' || goal === 'gt') ? 'gulf-private'
      : goal === 'gt' ? ((where === 'khaolak' && b === 'b3') ? 'expedition-khaolak' : 'pro-gt')
      : goal === 'fresh' ? (exp === 'trophy' ? 'stingray' : where === 'bkk' ? 'bangkok-monsters' : 'khaosok-jungle')
      : (b === 'b1' || who === 'solo') ? 'first-strike' : 'family-half';
    var m = ITEMS[main], tours = rows.filter(function(p){ return p[1] === 't' && p[0] !== main; });
    tours.sort(function(a, c){ return Math.abs(a[15] - m[15]) - Math.abs(c[15] - m[15]); });
    return [m].concat(tours.slice(0, 2));
  }
  var picked = [];
  function renderPicks(){
    picked = type === 'eco' ? pickEco() : pickFish();
    $('#q-picks').innerHTML = picked.map(function(p){ return '<a href="' + p[5] + '" target="_blank" rel="noopener"><svg class="art" aria-hidden="true"><use href="' + E.sprite + '#' + (p[13].indexOf('fish-') === 0 ? p[13] : 'g-' + p[13]) + '"/></svg><div><strong>' + esc(p[4]) + '</strong><span>' + esc(((E.dirs || {})[p[2]] || [''])[0]) + ' · ' + esc(p[7]) + '</span></div><span class="pr">' + esc(U.from) + ' ' + window.ERK_money(p[8], p[9]) + '</span></a>'; }).join('');
  }
  function ready(){ var s = steps[i].getAttribute('data-step'); return s === 'contact' ? ($('#q-contact').value.trim().length >= 4) : !!val(s); }
  function render(){
    steps.forEach(function(s, k){ s.hidden = k !== i; });
    $('#q-num').textContent = (i + 1) + ' / ' + steps.length; $('#q-bar').style.inlineSize = ((i + 1) / steps.length * 100) + '%';
    back.disabled = i === 0;
    var last = i === steps.length - 1;
    next.firstChild.textContent = last ? U.quizSend : U.quizNext;
    next.disabled = !ready();
    if (last) renderPicks();
  }
  quiz.addEventListener('change', function(e){
    next.disabled = !ready();
    // Автопереход, только если человек остался на том же шаге (не нажал «Дальше» сам)
    var at = i;
    if (e.target.type === 'radio' && i < steps.length - 1) setTimeout(function(){ if (i !== at || !ready()) return; i++; render(); window.ERK_track && window.ERK_track('quiz_step', { type:type, step:i }); }, 260);
  });
  quiz.addEventListener('input', function(){ next.disabled = !ready(); });
  back.addEventListener('click', function(){ if (i > 0) { i--; render(); } });
  next.addEventListener('click', function(){
    if (!ready()) return;
    if (i < steps.length - 1) { i++; render(); return; }
    if (quiz.company && quiz.company.value) return;
    next.disabled = true; next.firstChild.textContent = U.sending;
    var names = steps.map(function(s){ return s.getAttribute('data-step'); }).filter(function(n){ return n !== 'contact'; });
    var answers = {}; names.forEach(function(n){ answers[n] = val(n); }); Object.keys(extra).forEach(function(k){ answers[k] = extra[k]; });
    var lead = { type:type, tour:picked.map(function(p){ return p[0]; }).join(','), tourTitle:picked.map(function(p){ return p[4]; }).join(' / '),
      name:$('#q-name').value.trim(), contact:$('#q-contact').value.trim(), date:$('#q-date').value.trim(), answers:answers, guide:!!extra.guide,
      summary:names.map(label).filter(Boolean).concat(extra.club ? [U.club + ': ' + extra.club] : []).join(' · ') };
    window.ERK_send(lead).then(function(ok){
      window.ERK_track('lead', { type:type });
      steps.forEach(function(s){ s.hidden = true; }); $('.q-nav', quiz).hidden = true; $('.q-top', quiz).hidden = true;
      var done = $('#q-done'); done.hidden = false; done.innerHTML = window.ERK_done(ok, lead);
    });
  });
  // Предвыбор: сегменты рыбалки, клуб, гайд
  var SEG = { family:'family', angler:'solo', trophy:'solo', corp:'corp', vip:'vip' };
  $$('[data-seg],[data-guide],[data-club]').forEach(function(a){ a.addEventListener('click', function(){
    if (a.getAttribute('data-guide')) extra.guide = true;
    if (a.getAttribute('data-club')) extra.club = a.getAttribute('data-club');
    var w = SEG[a.getAttribute('data-seg')];
    if (w && i === 0) { var r = document.getElementById('q-who-' + w); if (r) { r.checked = true; i = 1; render(); } }
  }); });
  render();
})();
