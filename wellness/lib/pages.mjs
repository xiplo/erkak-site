// ERKAK · страницы. Каждая функция возвращает готовый HTML для одного языка (контекст C).
import { esc, inline } from './util.mjs';
import { andamanMap, thaiMap, icon, placeShort } from './art.mjs';
import { page, btn, T, sh, price, crumbs, crumbsLd, faq, faqLd, monthsBar, ticks, card, dirTile, placeCard, row, gcard, leadForm, photo } from './site.mjs';
import { hasPhoto } from './photo.mjs';

const ORG = C => ({ '@type':'Organization', '@id':C.SITE.origin + '/#org', name:'ERKAK', url:C.SITE.origin + '/' });
const opt = (name, val, label, sub, n) => `<div class="opt"><input type="radio" name="${name}" id="q-${name}-${val}" value="${val}"><label for="q-${name}-${val}"><i>${n != null ? String(n).padStart(2, '0') : ''}</i><span><strong>${esc(label)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</span></label></div>`;
const stepsHtml = (C, arr, cls = '') => `<div class="steps ${cls}">${arr.map(([h, p], i) => `<div class="step rv" style="--d:${i}"><b>${i + 1}</b><h3>${T(C, h)}</h3><p>${T(C, p)}</p></div>`).join('')}</div>`;
const paysHtml = C => `<div class="pays">${C.L.site.pays.map(x => `<span>${esc(x)}</span>`).join('')}</div>`;
// Первое предложение (для карточек): «…» / «。» / «؟» — любой язык
// Прилёт: «HKT · ~40 мин до места» — аэропорт и ориентир трансфера (данные места в core.mjs)
const fly = (C, d) => d && d.air ? `<div><dt>${esc(C.I.t('prog.fly'))}</dt><dd>${esc(C.I.t('prog.flyVal', { a:d.air, t:d.tr < 90 ? C.I.t('time.min', { n:C.I.num(d.tr) }) : C.I.t('time.h', { n:C.I.num(Math.round(d.tr / 30) / 2) }) }))}</dd></div>` : '';
const firstSentence = s => { const m = /^[\s\S]*?[.!?。！？؟](?=\s|$)/.exec(String(s).trim()); return (m ? m[0] : String(s)).trim(); };
// «4 программы» / «12 programs» / «12 个项目»: число и существительное в нужной форме
// Перечисление по правилам языка: «Пхукет и Бангкок», «Phuket and Bangkok», «普吉岛和曼谷»
const listOf = (C, arr) => arr.length ? new Intl.ListFormat(C.I.locale, { style:'long', type:'conjunction' }).format(arr) : '';
const NP = (C, n) => C.I.count(n, C.L.nouns.program);
// Место для title: короткое («Пхукет»), и пустое, если оно уже есть в названии
const whereFor = p => { const w = p.type === 't' ? String(p.where || '').split('·')[0].trim() : placeShort(p.where); const stem = w.toLowerCase().slice(0, Math.max(3, w.length - 2)); return stem && p.title.replace(/\*/g, '').toLowerCase().includes(stem) ? '' : w; };
// Убрать «висящие» разделители, если подстановка оказалась пустой: «X — , от Y» → «X — от Y»
const tidy = s => s.replace(/([,，،、])(?:\s*[,，،、])+/g, '$1').replace(/\s*([—–:|｜·])\s*[,，،、]\s*/g, ' $1 ').replace(/\s*[,，،]\s*([—–|｜])/g, ' $1').replace(/([—–])\s*([—–])/g, '$1').replace(/\(\s*\)|（\s*）/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([,.，。])/g, '$1').trim();
const idOf = s => s.toLowerCase().replace(/<[^>]+>|\*/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 60);

function tripLd(C, p, items, availability){
  return { '@context':'https://schema.org', '@type':'TouristTrip', '@id':C.SITE.origin + p.href + '#trip', name:p.title.replace(/\*/g, ''), description:p.short.replace(/\*/g, ''), inLanguage:C.L.meta.htmlLang,
    touristType:C.dir[p.dir].name, provider:ORG(C),
    ...(items && items.length ? { itinerary:{ '@type':'ItemList', itemListElement:items.map((x, i) => ({ '@type':'ListItem', position:i + 1, name:String(x).replace(/\*/g, '') })) } } : {}),
    offers:{ '@type':'Offer', price:p.price, priceCurrency:p.cur, availability:'https://schema.org/' + availability, url:C.SITE.origin + p.href, seller:ORG(C) } };
}

// ════ Главная ═════════════════════════════════════════════════════════
export function hub(C){
  const I = C.I, H = C.L.hub;
  const goals = C.L.goals;
  const byId = C.item;
  const regionOpts = Object.entries(C.L.regions).map(([id, n]) => `<option value="${id}">${esc(n)}</option>`).join('');
  const monthOpts = I.monthsLong.map((m, i) => `<option value="${i + 1}">${esc(m)}</option>`).join('');
  const budgetOpts = H.budgets.map(([v, n]) => `<option value="${v}">${esc(n)}</option>`).join('');
  const places = C.dests.filter(d => d.page);
  const body = `
<section class="hero">
  <div class="wrap">
    <div class="hero-media">
    ${photo('hero', { sizes:'(max-width:1240px) 100vw, 1200px', eager:true })}
    <div class="hero-copy">
      <h1 class="display">${C.code === 'zh' ? T(C, H.title).replace(/。(?!<\/em>)/g, '。<br>') : T(C, H.title)}</h1>
      <p class="lede">${T(C, I.t('hub.lede', { n:C.items.length, d:C.dirs.length }))}</p>
      <div class="btns">${btn(I.t('cta.pick'), '#pick', 'btn-light btn-lg')}${btn(H.ctaAll, '#top', 'btn-glass btn-lg')}</div>
    </div>
    <dl class="hero-stats">
      <div><dd>${C.items.length}</dd><dt>${esc(H.stat.programs)}</dt></div>
      <div><dd>${C.dirs.length}</dd><dt>${esc(H.stat.dirs)}</dt></div>
      <div><dd>${C.SITE.countries}</dd><dt>${esc(H.stat.countries)}</dt></div>
    </dl>
    </div>
    <div class="goal-chips" role="group" aria-label="${esc(H.goals.kicker)}">${C.goals.map(g => `<button class="gchip" type="button" data-goal="${g}">${esc(goals[g][0])}</button>`).join('')}</div>
  </div>
</section>

<section class="sec cv" id="dirs" aria-labelledby="h-dirs">
  <div class="wrap">
    ${sh(C, 3, H.dirs.kicker, T(C, I.t('hub.dirsTitle', { n:C.dirs.length })), H.dirs.lede)}
    <div class="dirs">${C.dirs.map((d, i) => dirTile(C, d, i)).join('')}</div>
  </div>
</section>

<section class="sec cv" id="top" aria-labelledby="h-top">
  <div class="wrap">
    ${sh(C, 4, H.top.kicker, T(C, H.top.title), I.t('hub.topLede', { date:C.L.site.pricesAsOf }))}
    <div class="tools rv" role="search">
      <div class="fld search"><label for="f-q">${esc(H.top.search)}</label><input id="f-q" type="search" placeholder="${esc(H.top.searchPh)}" autocomplete="off">${icon('search')}</div>
      <div class="fld"><label for="f-goal">${esc(H.top.goal)}</label><select id="f-goal"><option value="">${esc(H.top.any)}</option>${C.goals.map(g => `<option value="${g}">${esc(goals[g][0])}</option>`).join('')}</select>${icon('chevron')}</div>
      <div class="fld"><label for="f-reg">${esc(H.top.region)}</label><select id="f-reg"><option value="">${esc(H.top.world)}</option>${regionOpts}</select>${icon('chevron')}</div>
      <div class="fld"><label for="f-month">${esc(H.top.month)}</label><select id="f-month"><option value="">${esc(H.top.anyMonth)}</option>${monthOpts}</select>${icon('chevron')}</div>
      <div class="fld"><label for="f-budget">${esc(H.top.budget)}</label><select id="f-budget"><option value="">${esc(H.top.anyBudget)}</option>${budgetOpts}</select>${icon('chevron')}</div>
      <label class="hot-t"><input type="checkbox" id="f-hot">${esc(H.top.hot)}</label>
    </div>
    <p class="count" id="count" aria-live="polite">${esc(I.t('hub.count', { n:C.items.length, m:C.items.length }))}</p>
    <div class="grid" id="catalog">${C.items.map(p => card(C, p)).join('')}</div>
    <div class="more"><button class="btn btn-ghost" type="button" id="more">${esc(H.top.more)}</button></div>
    <div class="empty" id="empty" hidden><p class="h3">${esc(H.top.empty)}</p>${btn(I.t('cta.pick'), '#pick', 'btn-primary')}</div>
  </div>
</section>

<section class="sec" aria-labelledby="h-fish">
  <div class="wrap">
    <div class="feature rv">
      <div class="feature-ph">${photo('fishing-hero', { sizes:'(max-width:900px) 100vw, 600px' })}</div>
      <div class="feature-copy">
        <h2 class="h2" id="h-fish">${T(C, H.fish.title)}</h2>
        <p class="lede">${T(C, H.fish.lede)}</p>
        <div class="btns">${btn(H.fish.cta, C.path('dir:fishing'), 'btn-primary')}${btn(I.t('cta.pickTour'), C.path('dir:fishing') + '#pick', 'btn-ghost')}</div>
        <div class="rows">${['pro-gt', 'bigame-day', 'family-half'].map(id => row(C, byId[id])).join('')}</div>
      </div>
    </div>
  </div>
</section>

<section class="sec stone" aria-labelledby="h-routes">
  <div class="wrap">
    ${sh(C, 5, H.routes.kicker, T(C, H.routes.title), H.routes.lede)}
    <div class="routes">${C.combos.map((r, i) => { const ps = r.items.map(id => byId[id]); const sum = ps.reduce((a, p) => a + p.usdEq, 0);
      return `<article class="route rv" style="--d:${i}"><p class="card-k">${esc(H.routes.kickerOne)} ${i + 1}</p><h3>${T(C, H.routes.items[r.id][0])}</h3><p>${T(C, H.routes.items[r.id][1])}</p><ol>${ps.map(p => `<li><a href="${p.href}">${T(C, p.title)}</a><span>${esc(p.durLabel)}</span></li>`).join('')}</ol><div class="route-f">${price(C, Math.round(sum / 100) * 100, 'USD', H.routes.approx, { from:false })}<button class="btn btn-primary btn-sm" type="button" data-plan-many="${r.items.join(',')}">${esc(H.routes.add)}</button></div></article>`; }).join('')}</div>
  </div>
</section>

<section class="sec soft" id="club" aria-labelledby="h-club">
  <div class="wrap">
    ${sh(C, 6, H.club.kicker, T(C, H.club.title), H.club.lede)}
    <div class="club">${H.club.tiers.map((t, i) => `<article class="tier rv${i === 1 ? ' feat' : ''}${i === 2 ? ' black' : ''}" style="--d:${i}"><p class="tier-name">${esc(t.name)}</p><div class="tier-p num">${esc(t.price)}<small>${esc(t.per)}</small></div><ul>${t.points.map(x => `<li>${T(C, x)}</li>`).join('')}</ul>${btn(t.cta, '#pick', i === 1 ? 'btn-primary btn-block' : 'btn-ghost btn-block', `data-club="${['free', 'club', 'black'][i]}"`)}</article>`).join('')}</div>
    <p class="small" style="margin-block-start:26px">${T(C, H.club.note)}</p>
  </div>
</section>

<section class="sec" aria-labelledby="h-how">
  <div class="wrap">
    ${sh(C, 7, H.how.kicker, T(C, H.how.title), H.how.lede)}
    ${stepsHtml(C, H.how.steps)}
    ${paysHtml(C)}
  </div>
</section>

<section class="sec stone" aria-labelledby="h-places">
  <div class="wrap">
    ${sh(C, 8, H.places.kicker, T(C, H.places.title), H.places.lede)}
    <div class="places">${places.slice(0, 8).map(d => placeCard(C, d)).join('')}</div>
    <div style="margin-block-start:36px">${btn(H.places.all, C.path('dests'), 'btn-ghost')}</div>
    <div style="margin-block-start:clamp(80px,9vw,140px)">
      ${sh(C, 9, H.guides.kicker, T(C, H.guides.title), '')}
      <div class="gcards strip">${C.guides.slice(0, 3).map(g => gcard(C, g)).join('')}</div>
      <div style="margin-block-start:36px">${btn(H.guides.all, C.path('guides'), 'btn-ghost')}</div>
    </div>
  </div>
</section>

<section class="sec soft" id="pick" aria-labelledby="h-pick">
  <div class="wrap">
    ${sh(C, 10, H.quiz.kicker, T(C, H.quiz.title), H.quiz.lede, 'center')}
    <form class="quiz" id="quiz" data-type="eco" novalidate>
      <div class="q-top"><span id="q-num">1 / 5</span><div class="q-track"><i id="q-bar"></i></div></div>
      <div class="q-step" data-step="goal"><h3>${esc(H.quiz.q1)}</h3><p class="hint">${esc(H.quiz.h1)}</p><div class="opts">${C.goals.map((g, i) => opt('goal', g, goals[g][0], goals[g][1], i + 1)).join('')}</div></div>
      <div class="q-step" data-step="reg" hidden><h3>${esc(H.quiz.q2)}</h3><p class="hint">${esc(H.quiz.h2)}</p><div class="opts">${Object.entries(C.L.regions).map(([id, n], i) => opt('reg', id, n, '', i + 1)).join('')}${opt('reg', 'any', H.quiz.anyWhere, H.quiz.anyWhereSub, Object.keys(C.L.regions).length + 1)}</div></div>
      <div class="q-step" data-step="dur" hidden><h3>${esc(H.quiz.q3)}</h3><p class="hint">${esc(H.quiz.h3)}</p><div class="opts">${H.quiz.durs.map(([v, n, s], i) => opt('dur', v, n, s, i + 1)).join('')}</div></div>
      <div class="q-step" data-step="budget" hidden><h3>${esc(H.quiz.q4)}</h3><p class="hint">${esc(H.quiz.h4)}</p><div class="opts">${H.budgets.map(([v, n], i) => opt('budget', v, n, '', i + 1)).join('')}</div></div>
      <div class="q-step" data-step="contact" hidden>
        <p class="kicker">${esc(H.quiz.result)}</p><div class="picks" id="q-picks"></div>
        <h3 style="margin-block:40px 26px">${esc(H.quiz.q5)}</h3>
        <div class="fields">
          <div class="field"><label for="q-name">${esc(I.t('form.name'))}</label><input id="q-name" name="name" autocomplete="given-name" placeholder="${esc(I.t('form.namePh'))}"></div>
          <div class="field"><label for="q-contact">${esc(I.t('form.contact'))}</label><input id="q-contact" name="contact" autocomplete="tel" placeholder="${esc(I.t('form.contactPh'))}"></div>
          <div class="field" style="grid-column:1/-1"><label for="q-date">${esc(I.t('form.date'))}</label><input id="q-date" name="date" autocomplete="off" placeholder="${esc(I.t('form.datePh'))}"></div>
        </div>
        <input class="hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="small" style="margin-block-start:22px">${inline(I.t('form.consent', { privacy:C.path('privacy') }))}</p>
      </div>
      <div class="q-done" id="q-done" hidden></div>
      <div class="q-nav"><button class="btn btn-ghost" type="button" id="q-back" disabled>${esc(I.t('quiz.back'))}</button><button class="btn btn-primary" type="button" id="q-next" disabled>${esc(I.t('quiz.next'))}</button></div>
    </form>
  </div>
</section>

<section class="sec" id="faq" aria-labelledby="h-faq">
  <div class="wrap">
    ${sh(C, 11, H.faqKicker, T(C, H.faqTitle), '')}
    ${faq(C, H.faq)}
  </div>
</section>`;
  const lds = [
    { '@context':'https://schema.org', '@type':'Organization', '@id':C.SITE.origin + '/#org', name:'ERKAK', url:C.SITE.origin + '/', logo:C.SITE.origin + '/apple-touch-icon.png', description:H.orgDesc,
      ...(C.SITE.contacts.email ? { email:C.SITE.contacts.email } : {}), contactPoint:[{ '@type':'ContactPoint', contactType:'customer service', availableLanguage:C.langs.map(l => l.hreflang), ...(C.SITE.contacts.email ? { email:C.SITE.contacts.email } : {}) }] },
    { '@context':'https://schema.org', '@type':'WebSite', '@id':C.SITE.origin + '/#site', name:'ERKAK', url:C.SITE.origin + C.path('hub'), inLanguage:C.L.meta.htmlLang, publisher:ORG(C) },
    { '@context':'https://schema.org', '@type':'ItemList', name:H.top.title.replace(/\*/g, ''), itemListElement:C.items.map(p => ({ '@type':'ListItem', position:p.rank, url:C.SITE.origin + p.href, name:p.title.replace(/\*/g, '') })) },
    faqLd(H.faq)
  ];
  return page(C, { key:'hub', title:H.metaTitle, desc:H.metaDesc, body, lds, scripts:['catalog', 'quiz'] });
}

// ════ Направление ═════════════════════════════════════════════════════
export function direction(C, d){
  const I = C.I, list = C.items.filter(p => p.dir === d.id);
  const minP = Math.min(...list.map(p => p.usdEq));
  const dests = [...new Set(list.map(p => p.dest))].map(id => C.dest[id]).filter(x => x && x.page);
  const guides = C.guides.filter(g => g.dir === d.id);
  const others = C.dirs.filter(x => x.id !== d.id);
  const body = `
<section class="phero">
  <div class="wrap${hasPhoto('dir/' + d.id) ? ' has-ph' : ''}">${hasPhoto('dir/' + d.id) ? `<figure class="phero-ph">${photo('dir/' + d.id, { sizes:'(max-width:900px) 100vw, 560px', eager:true, max:1200 })}</figure>` : ''}
    <div class="phero-copy">
      ${crumbs(C, [[I.t('nav.dirs'), C.path('hub') + '#dirs'], [d.name, C.path('dir:' + d.id)]])}
      <h1 class="h1">${T(C, d.name)}</h1>
      <p class="lede">${T(C, d.intro)}</p>
      <dl class="facts"><div><dt>${esc(I.t('dir.programs'))}</dt><dd>${I.num(list.length)}</dd></div><div><dt>${esc(I.t('dir.from'))}</dt><dd>${I.money(minP, 'USD')}</dd></div><div><dt>${esc(I.t('dir.where'))}</dt><dd>${esc(listOf(C, dests.slice(0, 2).map(x => x.name)) || C.L.regions[list[0].reg])}</dd></div><div><dt>${esc(I.t('dir.status'))}</dt><dd>${esc(I.t(d.status === 'live' ? 'tag.live' : 'tag.soon'))}</dd></div></dl>
      <div class="btns">${btn(I.t('dir.see', { n:list.length, np:NP(C, list.length) }), '#list', 'btn-primary')}${btn(I.t('cta.pick'), C.path('hub') + '#pick', 'btn-ghost')}</div>
    </div>
  </div>
</section>
<section class="sec" id="list">
  <div class="wrap">
    ${sh(C, 1, I.t('dir.listKicker'), T(C, I.t('dir.listTitle')), d.who)}
    <div class="grid">${list.map(p => card(C, p)).join('')}</div>
  </div>
</section>
<section class="sec stone">
  <div class="wrap split" style="align-items:start">
    <div class="rv"><h2 class="h2" style="margin-block:22px 30px">${T(C, I.t('dir.inclTitle'))}</h2><p class="lede">${T(C, I.t('dir.inclLede'))}</p></div>
    <div class="rv" style="--d:2">${ticks(C, d.incl)}${d.note ? `<p class="note" style="margin-block-start:30px">${T(C, d.note)}</p>` : ''}</div>
  </div>
</section>
${dests.length ? `<section class="sec"><div class="wrap">${sh(C, 2, I.t('dir.placesKicker'), T(C, I.t('dir.placesTitle')), '')}<div class="places">${dests.map(x => placeCard(C, x, list.filter(p => p.dest === x.id).length)).join('')}</div></div></section>` : ''}
${guides.length ? `<section class="sec stone"><div class="wrap">${sh(C, 3, I.t('guides.kicker'), T(C, I.t('dir.guidesTitle')), '')}<div class="gcards">${guides.map(g => gcard(C, g)).join('')}</div></div></section>` : ''}
<section class="sec soft"><div class="wrap">${sh(C, 4, I.t('dir.othersKicker'), T(C, I.t('dir.othersTitle')), '')}<div class="dirs">${others.slice(0, 7).map((x, i) => dirTile(C, x, C.dirs.indexOf(x))).join('')}</div></div></section>`;
  const lds = [crumbsLd(C, [[I.t('nav.dirs'), C.path('hub') + '#dirs'], [d.name, C.path('dir:' + d.id)]]),
    { '@context':'https://schema.org', '@type':'ItemList', name:d.name, itemListElement:list.map((p, i) => ({ '@type':'ListItem', position:i + 1, url:C.SITE.origin + p.href, name:p.title.replace(/\*/g, '') })) }];
  return page(C, { key:'dir:' + d.id, title:I.t('meta.dirTitle', { name:d.name, n:list.length, np:NP(C, list.length) }), desc:I.t('meta.dirDesc', { short:d.short, n:list.length, np:NP(C, list.length) }), body, lds, og:`/assets/og/${d.id}.jpg` });
}

// ════ Программа (предзапись) ══════════════════════════════════════════
export function program(C, p){
  const I = C.I, d = C.dir[p.dir], dest = C.dest[p.dest];
  const also = C.items.filter(x => x.dir !== p.dir && (x.dest === p.dest || x.reg === p.reg) && x.id !== p.id).sort((a, b) => (b.dest === p.dest) - (a.dest === p.dest) || b.hot - a.hot).slice(0, 3);
  const same = C.items.filter(x => x.dir === p.dir && x.id !== p.id).slice(0, 3);
  const cr = [[d.name, C.path('dir:' + d.id)], [p.title.replace(/\*/g, ''), p.href]];
  const body = `
<section class="phero">
  <div class="wrap${hasPhoto('dir/' + p.dir) ? ' has-ph' : ''}">${hasPhoto('dir/' + p.dir) ? `<figure class="phero-ph">${photo('dir/' + p.dir, { sizes:'(max-width:900px) 100vw, 560px', eager:true, max:1200 })}</figure>` : ''}
    <div class="phero-copy">
      ${crumbs(C, cr)}
      <h1 class="h1">${T(C, p.title)}</h1>
      <p class="lede">${T(C, p.short)}</p>
      <dl class="facts"><div><dt>${esc(I.t('prog.where'))}</dt><dd>${esc(p.where)}</dd></div><div><dt>${esc(I.t('prog.dur'))}</dt><dd>${esc(p.durLabel)}</dd></div><div><dt>${esc(I.t('prog.when'))}</dt><dd>${esc(I.monthsRange(p.months))}</dd></div><div><dt>${esc(I.t('prog.price'))}</dt><dd>${I.t('from')} ${I.money(p.price, p.cur)}</dd></div></dl>
    </div>
  </div>
</section>
<section class="sec sec-t">
  <div class="wrap detail">
    <div class="detail-main">
      <div class="block rv"><h2>${esc(I.t('prog.about'))}</h2><p>${T(C, p.about)}</p></div>
      ${p.plan && p.plan.length ? `<div class="block rv"><h2>${esc(I.t('prog.plan'))}</h2><ol class="timeline">${p.plan.map((x, i) => `<li><b>${esc(I.t('prog.stage', { n:i + 1 }))}</b><span>${T(C, x)}</span></li>`).join('')}</ol></div>` : ''}
      <div class="block rv"><h2>${esc(I.t('prog.incl'))}</h2>${ticks(C, d.incl)}<p class="small" style="margin-block-start:16px">${T(C, I.t('prog.inclNote'))}</p></div>
      <div class="block rv"><h2>${esc(I.t('prog.best'))}</h2>${monthsBar(C, p.months)}<p class="months-note">${T(C, p.tip || I.t('prog.bestNote'))}</p></div>
      <div class="block rv"><h2>${esc(I.t('prog.who'))}</h2><p>${T(C, d.who)}</p></div>
      <div class="block rv"><h2>${esc(I.t('prog.how'))}</h2>${stepsHtml(C, C.L.site.howShort)}</div>
      ${also.length ? `<div class="block rv"><h2>${esc(I.t('prog.combine'))}</h2><div class="rows light">${also.map(x => row(C, x)).join('')}</div></div>` : ''}
      <div class="block rv"><h2>${esc(I.t('prog.faq'))}</h2>${faq(C, C.L.hub.faq.slice(1, 5))}</div>
    </div>
    <aside class="book" id="book">
      <span class="stat">${esc(I.t('tag.soon'))}</span>
      ${price(C, p.price, p.cur, p.perLabel)}
      <dl><div><dt>${esc(I.t('prog.dur'))}</dt><dd>${esc(p.durLabel)}</dd></div><div><dt>${esc(I.t('prog.where'))}</dt><dd>${esc(p.where)}</dd></div><div><dt>${esc(I.t('prog.when'))}</dt><dd>${esc(I.monthsRange(p.months))}</dd></div>${fly(C, dest)}</dl>
      <p class="small">${T(C, I.t('prog.waitNote'))}</p>
      ${leadForm(C, { type:'waitlist', id:p.id, title:p.title.replace(/\*/g, ''), submit:I.t('prog.waitCta') })}
      <button class="btn btn-ghost btn-block" type="button" data-plan="${p.id}" aria-pressed="false">${icon('plus')}<span>${esc(I.t('plan.add'))}</span></button>
    </aside>
  </div>
</section>
${same.length ? `<section class="sec stone"><div class="wrap">${sh(C, 1, d.name, T(C, I.t('prog.more')), '')}<div class="grid">${same.map(x => card(C, x)).join('')}</div></div></section>` : ''}`;
  const lds = [crumbsLd(C, cr), tripLd(C, p, p.plan, 'PreOrder')];
  return page(C, { key:'prog:' + p.id, title:tidy(I.t('meta.progTitle', { title:p.title.replace(/\*/g, ''), where:whereFor(p), price:I.money(p.price, p.cur) })), desc:I.t('meta.progDesc', { short:p.short.replace(/\*/g, ''), dur:p.durLabel, price:I.money(p.price, p.cur) }), body, lds, og:`/assets/og/${p.dir}.jpg`, mbar:[I.t('prog.waitCta'), '#book'] });
}

// ════ Раздел рыбалки ══════════════════════════════════════════════════
export function fishing(C){
  const I = C.I, F = C.L.fishing, d = C.dir.fishing, tours = C.tours;
  const nowM = new Date().getMonth();
  const segTabs = F.segments.map((s, i) => `<button type="button" role="tab" id="tab-${s.id}" aria-controls="seg-${s.id}" aria-selected="${i === 0}" tabindex="${i ? -1 : 0}">${esc(s.label)}</button>`).join('');
  const segPanels = F.segments.map((s, i) => `<div class="seg" role="tabpanel" id="seg-${s.id}" aria-labelledby="tab-${s.id}"${i ? ' hidden' : ''}>
    <div><h3>${T(C, s.title)}</h3><blockquote>${T(C, s.quote)}</blockquote><ul>${s.points.map(x => `<li>${T(C, x)}</li>`).join('')}</ul></div>
    <div><div class="rows">${s.picks.map(id => row(C, C.item[id])).join('')}</div><div class="btns" style="margin-block-start:30px">${btn(I.t('fishing.segCta'), '#pick', 'btn-primary', `data-seg="${s.id}"`)}</div></div></div>`).join('');
  const cal = `<table><thead><tr><th></th>${I.months.map((m, i) => `<th scope="col" class="${i === nowM ? 'now' : ''}" title="${esc(I.monthsLong[i])}"><span class="ml">${esc(m)}</span><span class="ms" aria-hidden="true">${i + 1}</span></th>`).join('')}</tr></thead><tbody>
    ${C.SEASON.map(([k, v]) => `<tr><th scope="row">${esc(F.season[k][0])}<small>${esc(F.season[k][1])}</small></th>${v.map((x, i) => `<td class="l${x}${i === nowM ? ' now' : ''}" title="${esc(F.season[k][0])} · ${esc(I.monthsLong[i])}: ${esc(F.levels[x])}"><i></i></td>`).join('')}</tr>`).join('')}
    <tr><th scope="row">${esc(F.sea[0])}<small>${esc(F.sea[1])}</small></th>${C.SEA_STATE.map((x, i) => `<td class="l${x}${i === nowM ? ' now' : ''}" title="${esc(I.monthsLong[i])}: ${esc(F.levels[x])}"><i></i></td>`).join('')}</tr></tbody></table>`;
  const q = F.quiz;
  const optsOf = (name, arr) => arr.map(([v, n, s], i) => opt(name, v, n, s, i + 1)).join('');
  const body = `
<section class="hero hero-fish">
  <div class="wrap">
    ${crumbs(C, [[d.name, C.path('dir:fishing')]])}
    <div class="hero-media">
    ${photo('fishing-hero', { sizes:'(max-width:1240px) 100vw, 1200px', eager:true })}
    <div class="hero-copy">
      <h1 class="display">${T(C, F.title)}</h1>
      <p class="lede">${T(C, F.lede)}</p>
      <div class="btns">${btn(I.t('cta.pickTour'), '#pick', 'btn-light btn-lg')}${C.messengers[0] ? btn(C.messengers[0].label, C.messengers[0].href, 'btn-glass btn-lg', 'target="_blank" rel="noopener"') : ''}</div>
      <p class="hero-note" id="live"><span>${esc(F.chip)}</span></p>
    </div>
    <dl class="hero-stats">${F.proof.map(([b, x]) => `<div><dd>${esc(b)}</dd><dt>${esc(x)}</dt></div>`).join('')}</dl>
    </div>
  </div>
</section>
<nav class="subnav" aria-label="${esc(d.name)}"><div class="wrap">${F.subnav.map(([n, h]) => `<a href="#${h}">${esc(n)}</a>`).join('')}</div></nav>

<section class="sec" aria-labelledby="h-pain"><div class="wrap">
  ${sh(C, 1, F.pains.kicker, T(C, F.pains.title), '')}
  <div class="pains">${F.pains.items.slice(0, 4).map(([h, p, f], i) => `<article class="pain rv" style="--d:${i % 3}"><h3>${T(C, h)}</h3><p>${T(C, p)}</p><p class="fix">${T(C, f)}</p></article>`).join('')}</div>
</div></section>

<section class="sec soft" id="who" aria-labelledby="h-who"><div class="wrap">
  ${sh(C, 2, F.who.kicker, T(C, F.who.title), '')}
  <div class="seg-tabs" role="tablist" aria-label="${esc(F.who.kicker)}">${segTabs}</div>
  ${segPanels}
</div></section>

<section class="sec" id="tours" aria-labelledby="h-tours"><div class="wrap">
  ${sh(C, 3, F.toursBlock.kicker, T(C, F.toursBlock.title), F.toursBlock.lede)}
  <div class="tabs" role="group" aria-label="${esc(F.toursBlock.kicker)}">${F.toursBlock.filters.map(([v, n], i) => `<button type="button" aria-pressed="${i === 0}" data-f="${v}">${esc(n)}</button>`).join('')}</div>
  <div class="grid" id="tours-grid">${tours.map(t => card(C, t, { level:true })).join('')}</div>
</div></section>

<section class="sec" id="concierge" aria-labelledby="h-cg"><div class="wrap">
  ${sh(C, 5, F.concierge.kicker, T(C, F.concierge.title), F.concierge.lede)}
  <div class="cgrid">${F.concierge.items.slice(0, 4).map(([ic, h, p], i) => `<div class="citem rv" style="--d:${i % 4}">${icon(ic)}<strong>${T(C, h)}</strong><span>${T(C, p)}</span></div>`).join('')}</div>
  <div class="split sigweek" style="margin-block-start:clamp(40px,5vw,72px)">
    <div class="rv"><h3 class="h3" style="margin-block:10px 16px">${T(C, F.concierge.sigTitle)}</h3>${ticks(C, F.concierge.sigPoints)}</div>
    <div class="rv" style="--d:2;display:grid;gap:22px;align-content:start">${price(C, C.item['signature-week'].price, 'THB', C.item['signature-week'].perLabel)}<p class="small">${T(C, F.concierge.fee)}</p><div class="btns">${btn(F.concierge.sigCta, C.item['signature-week'].href, 'btn-primary')}${btn(I.t('cta.ask'), '#pick', 'btn-ghost', 'data-seg="vip"')}</div></div>
  </div>
</div></section>

<section class="sec soft" id="map" aria-labelledby="h-map"><div class="wrap">
  ${sh(C, 6, F.map.kicker, T(C, F.map.title), F.map.lede)}
  <div class="map-wrap">
    <div class="chart rv">${andamanMap(C.SPOTS, F.spots, I)}</div>
    <div><div class="spot" id="spot" aria-live="polite"></div>
      <div class="legend"><span class="status ok">${esc(I.t('fishing.map.allowed'))}</span><span class="status no">${esc(I.t('fishing.map.banned'))}</span></div>
      <div class="spot-list">${C.SPOTS.filter(s => s.reg === 'andaman' || s.reg === 'khaosok').map(s => `<button type="button" data-spot="${s.id}">${esc(F.spots[s.id].name)}</button>`).join('')}</div>
      <p style="margin-block-start:18px"><a class="link" href="${C.path('fishmap')}">${esc(C.L.fishing.mapPage.link)}</a></p></div>
  </div>
</div></section>

<section class="sec" id="season" aria-labelledby="h-season"><div class="wrap">
  ${sh(C, 7, F.cal.kicker, T(C, F.cal.title), F.cal.lede)}
  <div class="cal rv">${cal}</div>
  <div class="cal-key">${F.levels.map((n, i) => `<span><i style="background:${['var(--l0)', 'var(--l1)', 'var(--l2)', 'var(--l3)'][i]}"></i>${esc(n)}</span>`).join('')}</div>
  <div class="grid two" style="margin-block-start:56px">${F.cal.notes.map(([h, p]) => `<div class="rv"><h3 class="h3" style="margin-block-end:14px">${T(C, h)}</h3><p style="color:var(--ink-2)">${T(C, p)}</p></div>`).join('')}</div>
</div></section>

<section class="sec soft"><div class="wrap">
  <div>${sh(C, 9, F.guar.kicker, T(C, F.guar.title), '')}
  <div class="steps">${F.guar.items.map(([b, h, p], i) => `<div class="step rv" style="--d:${i}"><b class="big">${esc(b)}</b><h3>${T(C, h)}</h3><p>${T(C, p)}</p></div>`).join('')}</div>
  ${paysHtml(C)}</div>
</div></section>

<section class="sec" id="pick" aria-labelledby="h-pick"><div class="wrap">
  ${sh(C, 10, q.kicker, T(C, q.title), q.lede, 'center')}
  <form class="quiz" id="quiz" data-type="quiz" novalidate>
    <div class="q-top"><span id="q-num">1 / 6</span><div class="q-track"><i id="q-bar"></i></div></div>
    <div class="q-step" data-step="who"><h3>${esc(q.q1)}</h3><p class="hint">${esc(q.h1)}</p><div class="opts">${optsOf('who', q.who)}</div></div>
    <div class="q-step" data-step="exp" hidden><h3>${esc(q.q2)}</h3><p class="hint">${esc(q.h2)}</p><div class="opts">${optsOf('exp', q.exp)}</div></div>
    <div class="q-step" data-step="goal" hidden><h3>${esc(q.q3)}</h3><p class="hint">${esc(q.h3)}</p><div class="opts">${optsOf('goal', q.goal)}</div></div>
    <div class="q-step" data-step="where" hidden><h3>${esc(q.q4)}</h3><p class="hint">${esc(q.h4)}</p><div class="opts">${optsOf('where', q.where)}</div></div>
    <div class="q-step" data-step="budget" hidden><h3>${esc(q.q5)}</h3><p class="hint">${esc(q.h5)}</p><div class="opts">${optsOf('budget', q.budget)}</div></div>
    <div class="q-step" data-step="contact" hidden>
      <p class="kicker">${esc(q.result)}</p><div class="picks" id="q-picks"></div>
      <h3 style="margin-block:40px 26px">${esc(q.q6)}</h3>
      <div class="fields">
        <div class="field"><label for="q-name">${esc(I.t('form.name'))}</label><input id="q-name" name="name" autocomplete="given-name" placeholder="${esc(I.t('form.namePh'))}"></div>
        <div class="field"><label for="q-contact">${esc(I.t('form.contact'))}</label><input id="q-contact" name="contact" autocomplete="tel" placeholder="${esc(I.t('form.contactPh'))}"></div>
        <div class="field" style="grid-column:1/-1"><label for="q-date">${esc(I.t('form.date'))}</label><input id="q-date" name="date" autocomplete="off" placeholder="${esc(I.t('form.datePh'))}"></div>
      </div>
      <input class="hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="small" style="margin-block-start:22px">${inline(I.t('form.consent', { privacy:C.path('privacy') }))}</p>
    </div>
    <div class="q-done" id="q-done" hidden></div>
    <div class="q-nav"><button class="btn btn-ghost" type="button" id="q-back" disabled>${esc(I.t('quiz.back'))}</button><button class="btn btn-primary" type="button" id="q-next" disabled>${esc(I.t('quiz.next'))}</button></div>
  </form>
</div></section>

<section class="sec" id="faq" aria-labelledby="h-faq"><div class="wrap">
  ${sh(C, 11, I.t('faq.kicker'), T(C, F.faqTitle), '')}
  ${faq(C, F.faq)}
</div></section>`;
  const lds = [crumbsLd(C, [[d.name, C.path('dir:fishing')]]),
    { '@context':'https://schema.org', '@type':'ItemList', name:d.name, itemListElement:tours.map((t, i) => ({ '@type':'ListItem', position:i + 1, url:C.SITE.origin + t.href, name:t.title })) }, faqLd(F.faq)];
  return page(C, { key:'dir:fishing', title:F.metaTitle, desc:F.metaDesc, body, lds, og:'/assets/og/fishing.jpg', nav:'fish', scripts:['fishing', 'quiz'] });
}

// ════ Тур рыбалки ═════════════════════════════════════════════════════
export function tour(C, t){
  const I = C.I, F = C.L.fishing, d = C.dir.fishing, spot = t.spot ? F.spots[t.spot] : null;
  const related = C.tours.filter(x => x.id !== t.id && (x.cat === t.cat || Math.abs(x.tier - t.tier) <= 1)).slice(0, 3);
  const cr = [[d.name, C.path('dir:fishing')], [t.title, t.href]];
  const body = `
<section class="phero">
  <div class="wrap${hasPhoto('fishing-hero') ? ' has-ph' : ''}">${hasPhoto('fishing-hero') ? `<figure class="phero-ph">${photo('fishing-hero', { sizes:'(max-width:900px) 100vw, 560px', eager:true, max:1200 })}</figure>` : ''}
    <div class="phero-copy">
      ${crumbs(C, cr)}
      <h1 class="h1">${T(C, t.title)}</h1>
      <p class="lede">${T(C, t.short)}</p>
      <dl class="facts"><div><dt>${esc(I.t('prog.where'))}</dt><dd>${esc(t.where)}</dd></div><div><dt>${esc(I.t('prog.dur'))}</dt><dd>${esc(t.durLabel)}</dd></div><div><dt>${esc(I.t('tour.group'))}</dt><dd>${esc(t.groupLabel)}</dd></div><div><dt>${esc(I.t('tour.format'))}</dt><dd>${esc(t.kind)}</dd></div><div><dt>${esc(I.t('prog.price'))}</dt><dd>${I.t('from')} ${I.money(t.price, 'THB')}</dd></div></dl>
    </div>
  </div>
</section>
<section class="sec sec-t">
  <div class="wrap detail">
    <div class="detail-main">
      <div class="block rv"><h2>${esc(I.t('tour.why'))}</h2><p>${T(C, t.pitch)}</p></div>
      <div class="block rv"><h2>${esc(I.t('tour.species'))}</h2>${ticks(C, t.species)}<h3 class="h3" style="margin-block:40px 18px;font-size:24px">${esc(I.t('prog.best'))}</h3>${monthsBar(C, t.months)}</div>
      <div class="block rv"><h2>${esc(I.t('tour.day'))}</h2><ol class="timeline">${t.day.map(([h, x]) => `<li><b>${esc(h)}</b><span>${T(C, x)}</span></li>`).join('')}</ol></div>
      <div class="block rv"><h2>${esc(I.t('tour.incl'))}</h2>${ticks(C, t.incl)}<h3 class="h3" style="margin-block:40px 18px;font-size:24px">${esc(I.t('tour.excl'))}</h3>${ticks(C, t.excl, 'muted')}</div>
      ${spot ? `<div class="block rv"><h2>${esc(I.t('tour.where'))}</h2><p><strong>${esc(spot.name)}</strong> · ${esc(spot.run)}</p><p style="margin-block-start:8px">${T(C, spot.note)}</p><p class="note" style="margin-block-start:22px">${T(C, F.legalNote)}</p></div>` : ''}
      <div class="block rv"><h2>${esc(I.t('tour.upsell'))}</h2><div class="upsell">${t.upsell.map(([a, b]) => `<div><strong>${T(C, a)}</strong><span>${T(C, b)}</span></div>`).join('')}</div></div>
      <div class="block rv"><h2>${esc(I.t('prog.faq'))}</h2>${faq(C, F.faq.slice(0, 4))}</div>
    </div>
    <aside class="book" id="book">
      <span class="stat">${esc(I.t('tag.live'))}</span>
      ${price(C, t.price, 'THB', t.perLabel)}
      <dl><div><dt>${esc(I.t('prog.dur'))}</dt><dd>${esc(t.durLabel)}</dd></div><div><dt>${esc(I.t('tour.group'))}</dt><dd>${esc(t.groupLabel)}</dd></div><div><dt>${esc(I.t('tour.deposit'))}</dt><dd>30%</dd></div><div><dt>${esc(I.t('tour.cancel'))}</dt><dd>${esc(I.t('tour.cancelVal'))}</dd></div></dl>
      ${leadForm(C, { type:'tour', id:t.id, title:t.title, submit:I.t('tour.cta'), pay:C.SITE.payments.stripe && t.per !== 'group' })}
      <button class="btn btn-ghost btn-block" type="button" data-plan="${t.id}" aria-pressed="false">${icon('plus')}<span>${esc(I.t('plan.add'))}</span></button>
    </aside>
  </div>
</section>
<section class="sec stone"><div class="wrap">${sh(C, 1, I.t('tour.relKicker'), T(C, I.t('tour.relTitle')), '')}<div class="grid">${related.map(x => card(C, x, { level:true })).join('')}</div></div></section>`;
  const lds = [crumbsLd(C, cr), tripLd(C, t, t.day.map(x => x[1]), 'InStock')];
  return page(C, { key:'tour:' + t.id, title:tidy(I.t('meta.tourTitle', { title:t.title, where:whereFor(t), price:I.money(t.price, 'THB') })), desc:I.t('meta.tourDesc', { short:t.short, dur:t.durLabel, group:t.groupLabel, price:I.money(t.price, 'THB') }), body, lds, og:'/assets/og/fishing.jpg', nav:'fish', mbar:[I.t('tour.cta'), '#book'] });
}

// ════ Места ═══════════════════════════════════════════════════════════
export function dests(C){
  const I = C.I, P = C.L.places;
  const list = C.dests.filter(d => d.page);
  const body = `
<section class="phero"><div class="wrap single"><div class="phero-copy">
  ${crumbs(C, [[I.t('nav.places'), C.path('dests')]])}<h1 class="h1">${T(C, P.title)}</h1><p class="lede">${T(C, P.lede)}</p>
</div></div></section>
<section class="sec"><div class="wrap">
  <div class="gcards">${list.map((d, i) => `<a class="gcard rv${hasPhoto('dest/' + d.id) ? ' has-ph' : ''}" href="${C.path('dest:' + d.id)}">${hasPhoto('dest/' + d.id) ? `<span class="gcard-ph">${photo('dest/' + d.id, { sizes:'(max-width:640px) 100vw, (max-width:1000px) 50vw, 380px', max:1200 })}</span>` : ''}<div class="card-top"><span class="card-k">${esc(C.L.regions[d.reg])}</span><span class="badge soft">${esc(I.count(d.count, C.L.nouns.program))}</span></div><h2 class="gcard-h">${T(C, d.title)}</h2><p class="card-s">${T(C, firstSentence(d.intro))}</p></a>`).join('')}</div>
</div></section>`;
  return page(C, { key:'dests', title:P.metaTitle, desc:P.metaDesc, body, lds:[crumbsLd(C, [[I.t('nav.places'), C.path('dests')]])] });
}

export function dest(C, d){
  const I = C.I, list = C.items.filter(p => p.dest === d.id);
  const dirs = [...new Set(list.map(p => p.dir))].map(id => C.dir[id]);
  const guides = C.guides.filter(g => g.related.some(id => list.find(p => p.id === id)));
  const cr = [[I.t('nav.places'), C.path('dests')], [d.name, C.path('dest:' + d.id)]];
  const body = `
<section class="phero"><div class="wrap${hasPhoto('dest/' + d.id) ? ' has-ph' : ''}">${hasPhoto('dest/' + d.id) ? `<figure class="phero-ph">${photo('dest/' + d.id, { sizes:'(max-width:900px) 100vw, 560px', eager:true, max:1200 })}</figure>` : ''}
  <div class="phero-copy">${crumbs(C, cr)}<h1 class="h1">${T(C, d.title)}</h1><p class="lede">${T(C, d.intro)}</p>
    <dl class="facts"><div><dt>${esc(I.t('dest.programs'))}</dt><dd>${I.num(list.length)}</dd></div><div><dt>${esc(I.t('dest.dirs'))}</dt><dd>${I.num(dirs.length)}</dd></div><div><dt>${esc(I.t('dest.from'))}</dt><dd>${I.money(Math.min(...list.map(p => p.usdEq)), 'USD')}</dd></div><div><dt>${esc(I.t('dest.live'))}</dt><dd>${I.num(list.filter(p => p.live).length)}</dd></div></dl></div>
</div></section>
<section class="sec stone"><div class="wrap split" style="align-items:start">
  <div class="rv"><h2 class="h3" style="margin-block:20px 18px">${esc(I.t('dest.season'))}</h2><p style="color:var(--ink-2)">${T(C, d.season)}</p></div>
  <div class="rv" style="--d:2"><h2 class="h3" style="margin-block:20px 18px">${esc(I.t('dest.access'))}</h2><p style="color:var(--ink-2)">${T(C, d.access)}</p></div>
</div></section>
<section class="sec"><div class="wrap">
  ${sh(C, 1, I.t('dest.listKicker'), T(C, I.t('dest.listTitle', { name:d.name })), '')}
  <div class="tabs" role="group" aria-label="${esc(I.t('nav.dirs'))}"><button type="button" aria-pressed="true" data-d="">${esc(C.L.hub.top.all)}</button>${dirs.map(x => `<button type="button" aria-pressed="false" data-d="${x.id}">${esc(x.name)}</button>`).join('')}</div>
  <div class="grid" id="catalog">${list.map(p => card(C, p)).join('')}</div>
</div></section>
${guides.length ? `<section class="sec stone"><div class="wrap">${sh(C, 2, I.t('guides.kicker'), T(C, I.t('dir.guidesTitle')), '')}<div class="gcards">${guides.slice(0, 3).map(g => gcard(C, g)).join('')}</div></div></section>` : ''}`;
  const lds = [crumbsLd(C, cr), { '@context':'https://schema.org', '@type':'TouristDestination', name:d.name, description:d.intro.replace(/\*/g, ''), url:C.SITE.origin + C.path('dest:' + d.id), includesAttraction:list.slice(0, 20).map(p => ({ '@type':'TouristTrip', name:p.title.replace(/\*/g, ''), url:C.SITE.origin + p.href })) }];
  return page(C, { key:'dest:' + d.id, title:I.t('meta.destTitle', { title:d.title.replace(/\*/g, ''), n:list.length, np:NP(C, list.length) }), desc:d.metaDesc || I.t('meta.destDesc', { name:d.name, n:list.length, np:NP(C, list.length) }), body, lds, scripts:['catalog'] });
}

// ════ Гайды ═══════════════════════════════════════════════════════════
export function guides(C){
  const I = C.I, G = C.L.guidesPage;
  const body = `
<section class="phero"><div class="wrap single"><div class="phero-copy">
  ${crumbs(C, [[I.t('nav.guides'), C.path('guides')]])}<h1 class="h1">${T(C, G.title)}</h1><p class="lede">${T(C, G.lede)}</p>
</div></div></section>
<section class="sec"><div class="wrap"><div class="gcards">${C.guides.map(g => gcard(C, g, 'h2')).join('')}</div></div></section>`;
  return page(C, { key:'guides', title:G.metaTitle, desc:G.metaDesc, body, lds:[crumbsLd(C, [[I.t('nav.guides'), C.path('guides')]])] });
}

function block(C, b){
  const [type, v] = b;
  if (type === 'h2') return `<h2 id="${idOf(v)}">${T(C, v)}</h2>`;
  if (type === 'h3') return `<h3>${T(C, v)}</h3>`;
  if (type === 'p') return `<p>${T(C, v)}</p>`;
  if (type === 'ul') return `<ul>${v.map(x => `<li><span>${T(C, x)}</span></li>`).join('')}</ul>`;
  if (type === 'quote') return `<blockquote>${T(C, v)}</blockquote>`;
  if (type === 'callout') return `<div class="callout">${T(C, v)}</div>`;
  if (type === 'table') return `<div class="tbl"><table><thead><tr>${v.head.map(h => `<th scope="col">${T(C, h)}</th>`).join('')}</tr></thead><tbody>${v.rows.map(r => `<tr>${r.map(c => `<td>${T(C, c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  return '';
}

export function guide(C, g){
  const I = C.I, G = C.L.guides[g.id];
  const cr = [[I.t('nav.guides'), C.path('guides')], [G.title.replace(/\*/g, ''), C.path('guide:' + g.id)]];
  const h2s = G.blocks.filter(b => b[0] === 'h2').map(b => b[1]);
  const rel = g.related.map(id => C.item[id]).filter(Boolean);
  const upd = new Intl.DateTimeFormat(C.I.locale, { day:'numeric', month:'long', year:'numeric' }).format(new Date(g.updated));
  const body = `
<section class="phero"><div class="wrap${hasPhoto(g.dir ? 'dir/' + g.dir : '') ? ' has-ph' : ''}">${hasPhoto(g.dir ? 'dir/' + g.dir : '') ? `<figure class="phero-ph">${photo(g.dir ? 'dir/' + g.dir : '', { sizes:'(max-width:900px) 100vw, 560px', eager:true, max:1200 })}</figure>` : ''}
  <div class="phero-copy">${crumbs(C, cr)}<h1 class="h1">${T(C, G.title)}</h1><p class="lede">${T(C, G.desc)}</p>
    <p class="byline"><span>${esc(I.t('guides.by'))}</span><span>${esc(I.t('guides.updated'))} ${esc(upd)}</span><span>${esc(G.read)}</span></p></div>
</div></section>
<section class="sec sec-t"><div class="wrap article">
  <nav class="toc" aria-label="${esc(I.t('guides.toc'))}"><p>${esc(I.t('guides.toc'))}</p>${h2s.map(h => `<a href="#${idOf(h)}">${T(C, h)}</a>`).join('')}</nav>
  <article class="prose">${G.blocks.map(b => block(C, b)).join('')}
    ${G.faq && G.faq.length ? `<h2 id="faq">${esc(I.t('prog.faq'))}</h2>${faq(C, G.faq)}` : ''}
    <p class="small" style="margin-block-start:40px">${T(C, I.t('guides.disclaimer'))}</p>
  </article>
</div></section>
${rel.length ? `<section class="sec stone"><div class="wrap">${sh(C, 1, I.t('guides.relKicker'), T(C, I.t('guides.relTitle')), '')}<div class="grid">${rel.map(p => card(C, p)).join('')}</div></div></section>` : ''}`;
  const lds = [crumbsLd(C, cr), { '@context':'https://schema.org', '@type':'Article', headline:G.title.replace(/\*/g, ''), description:G.desc.replace(/\*/g, ''), inLanguage:C.L.meta.htmlLang, datePublished:g.updated, dateModified:g.updated, author:{ '@type':'Organization', name:'ERKAK', url:C.SITE.origin + '/' }, publisher:ORG(C), mainEntityOfPage:C.SITE.origin + C.path('guide:' + g.id), image:C.SITE.origin + `/assets/og/${g.dir || 'erkak'}.jpg` }];
  if (G.faq && G.faq.length) lds.push(faqLd(G.faq));
  return page(C, { key:'guide:' + g.id, title:G.metaTitle || `${G.title.replace(/\*/g, '')} | ERKAK`, desc:G.desc.replace(/\*/g, ''), body, lds, og:`/assets/og/${g.dir || 'erkak'}.jpg` });
}

// ════ О нас (и визы) ══════════════════════════════════════════════════
export function about(C){
  const I = C.I, A = C.L.about;
  const cr = [[I.t('nav.about'), C.path('about')]];
  const body = `
<section class="phero"><div class="wrap has-ph"><figure class="phero-ph">${photo('dir/adventure', { sizes:'(max-width:900px) 100vw, 560px', eager:true, max:1200 })}</figure><div class="phero-copy">
  ${crumbs(C, cr)}<h1 class="h1">${T(C, A.title)}</h1><p class="lede">${T(C, A.lede)}</p>
</div></div></section>
<section class="sec"><div class="wrap manifest"><div class="rv"><blockquote style="margin-block-start:26px">${T(C, A.story.quote)}</blockquote></div><aside class="rv" style="--d:2">${A.story.text.map(p => `<p>${T(C, p)}</p>`).join('')}</aside></div></section>
<section class="sec stone"><div class="wrap">${sh(C, 2, A.principles.kicker, T(C, A.principles.title), '')}${stepsHtml(C, A.principles.items)}</div></section>
<section class="sec soft" id="visa"><div class="wrap split" style="align-items:start">
  <div class="rv"><h2 class="h2" style="margin-block:22px 26px">${T(C, A.visa.title)}</h2><p class="lede">${T(C, A.visa.lede)}</p><div class="btns" style="margin-block-start:30px">${btn(A.visa.cta, C.path('guide:thailand-visa'), 'btn-primary')}</div></div>
  <div class="rv" style="--d:2"><div class="rows">${A.visa.points.map(([h, p]) => `<div class="row" style="grid-template-columns:1fr"><div><strong>${T(C, h)}</strong><span>${T(C, p)}</span></div></div>`).join('')}</div><p class="small" style="margin-block-start:18px">${T(C, A.visa.note)}</p></div>
</div></section>
<section class="sec"><div class="wrap">${sh(C, 3, A.contact.kicker, T(C, A.contact.title), A.contact.lede)}
  <div class="rows light">${C.messengers.map(m => `<a class="row" href="${m.href}" target="_blank" rel="noopener"><span></span><div><strong>${esc(m.label)}</strong><span>${esc(m.sub)}</span></div><span>${icon('arrow-up')}</span></a>`).join('')}${C.SITE.contacts.email ? `<a class="row" href="mailto:${C.SITE.contacts.email}"><span></span><div><strong>${esc(C.SITE.contacts.email)}</strong><span>${esc(A.contact.emailSub)}</span></div><span>${icon('arrow-up')}</span></a>` : ''}</div>
</div></section>`;
  return page(C, { key:'about', title:A.metaTitle, desc:A.metaDesc, body, lds:[crumbsLd(C, cr), { '@context':'https://schema.org', '@type':'AboutPage', name:A.metaTitle, about:ORG(C), inLanguage:C.L.meta.htmlLang }] });
}

export function legal(C, which){
  const I = C.I, X = C.L.legal[which];
  const cr = [[X.title, C.path(which)]];
  const body = `
<section class="phero"><div class="wrap single"><div class="phero-copy">${crumbs(C, cr)}<h1 class="h1">${T(C, X.title)}</h1><p class="lede">${T(C, X.lede)}</p></div></div></section>
<section class="sec sec-t"><div class="legal-t wrap">${X.draft ? `<p class="note">${T(C, X.draft)}</p>` : ''}${X.sections.map(([h, ...ps]) => `<h2>${T(C, h)}</h2>${ps.map(p => `<p>${T(C, p)}</p>`).join('')}`).join('')}<p class="small">${esc(I.t('legal.updated'))} ${esc(new Intl.DateTimeFormat(I.locale, { day:'numeric', month:'long', year:'numeric' }).format(new Date('2026-09-28')))}</p></div></section>`;
  return page(C, { key:which, title:`${X.title} | ERKAK`, desc:X.lede, body, lds:[crumbsLd(C, cr)] });
}

// ════ Оплата прошла (из Stripe Checkout) — служебная, не индексируется ══
export function payDone(C){
  const I = C.I, m = C.messengers[0];
  const body = `
<section class="phero"><div class="wrap single"><div class="phero-copy">
  <h1 class="h1">${esc(I.t('pay.doneTitle'))}</h1><p class="lede">${esc(I.t('pay.doneText'))}</p>
  <div class="btns">${m ? btn(m.label, m.href, 'btn-primary', 'target="_blank" rel="noopener"') : ''}${btn(I.t('pay.doneBack'), C.path('dir:fishing'), 'btn-ghost')}</div>
</div></div></section>`;
  return page(C, { key:'paydone', title:I.t('pay.doneTitle') + ' | ERKAK', desc:I.t('pay.doneText'), body, noindex:true, nav:'fish' });
}

// ════ Где можно рыбачить в Таиланде: карта районов и точек ═══════════
export function fishMap(C){
  const I = C.I, F = C.L.fishing, M = F.mapPage;
  const cr = [[C.dir.fishing.name, C.path('dir:fishing')], [M.crumb, C.path('fishmap')]];
  const spotsOf = r => C.SPOTS.filter(s => s.reg === r);
  const row = s => { const x = F.spots[s.id];
    return `<article class="spot-row rv"><span class="status ${s.ok ? 'ok' : 'no'}">${esc(I.t(s.ok ? 'fishing.map.allowed' : 'fishing.map.banned'))}</span><h3>${esc(x.name)}</h3>
      ${s.ok ? `<dl><div><dt>${esc(C.L.client.spotRun)}</dt><dd>${esc(x.run)}</dd></div><div><dt>${esc(C.L.client.spotFish)}</dt><dd>${esc(x.fish)}</dd></div><div><dt>${esc(C.L.client.spotHow)}</dt><dd>${esc(x.how)}</dd></div></dl>` : ''}<p>${T(C, x.note)}</p></article>`; };
  const regions = C.FISH_REGIONS.map(r => { const [name, sub] = M.regions[r.id], t = C.item[r.tour], sp = spotsOf(r.id);
    return `<section class="sec${r.id === 'gulf' || r.id === 'khaosok' ? ' soft' : ''}" id="reg-${r.id}"><div class="wrap">
  <header class="sh rv"><h2 class="h2">${esc(name)}</h2><p class="lede">${T(C, sub)}</p></header>
  ${r.id === 'andaman' ? `<div class="map-wrap"><div class="chart rv">${andamanMap(C.SPOTS, F.spots, I)}</div><div><div class="spot" id="spot" data-cta="${t.href}" aria-live="polite"></div>
    <div class="legend"><span class="status ok">${esc(I.t('fishing.map.allowed'))}</span><span class="status no">${esc(I.t('fishing.map.banned'))}</span></div>
    <div class="spot-list">${sp.map(s => `<button type="button" data-spot="${s.id}">${esc(F.spots[s.id].name)}</button>`).join('')}</div></div></div>`
    : `<div class="spot-rows">${sp.map(row).join('')}</div>`}
  <p style="margin-block-start:24px">${btn(M.tourCta.replace('{tour}', t.title.replace(/\*/g, '')), t.href, 'btn-ghost')}</p>
</div></section>`; }).join('\n');
  const body = `
<section class="phero"><div class="wrap has-ph"><figure class="phero-ph phero-map">${thaiMap(C.FISH_REGIONS, M.regions, C.SPOTS, I)}</figure><div class="phero-copy">
  ${crumbs(C, cr)}<h1 class="h1">${T(C, M.title)}</h1><p class="lede">${T(C, M.lede)}</p>
  <div class="reg-links">${C.FISH_REGIONS.map(r => `<a href="#reg-${r.id}"><strong>${esc(M.regions[r.id][0])}</strong><span>${esc(I.count(spotsOf(r.id).filter(s => s.ok).length, C.L.nouns.spot))}</span></a>`).join('')}</div>
</div></div></section>
${regions}
<section class="sec" id="rules"><div class="wrap split">
  <div class="rv"><h2 class="h2">${T(C, M.rulesTitle)}</h2></div>
  <div class="rv">${ticks(C, M.rules)}<div class="btns" style="margin-block-start:24px">${btn(I.t('cta.pickTour'), C.path('dir:fishing') + '#pick', 'btn-primary')}${btn(M.allTours, C.path('dir:fishing') + '#tours', 'btn-ghost')}</div></div>
</div></section>`;
  const lds = [crumbsLd(C, cr), { '@context':'https://schema.org', '@type':'ItemList', name:M.title.replace(/\*/g, ''),
    itemListElement:C.SPOTS.filter(s => s.ok).map((s, i) => ({ '@type':'ListItem', position:i + 1, item:{ '@type':'Place', name:F.spots[s.id].name, geo:{ '@type':'GeoCoordinates', latitude:s.lat, longitude:s.lon } } })) }];
  return page(C, { key:'fishmap', title:M.metaTitle, desc:M.metaDesc, body, lds, nav:'fish', scripts:['fishing'], og:'/assets/og/fishing.jpg' });
}

