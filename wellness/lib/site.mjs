// ERKAK · каркас страниц и компоненты. Все функции принимают контекст языка C (см. build.mjs → makeContext).
import { esc, inline, typo, clip } from './util.mjs';
import { use, icon, artId, isFish, placeShort } from './art.mjs';
import { photo, usesCdn } from './photo.mjs';

export const ld = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

// ── Мелкие компоненты ─────────────────────────────────────────────────
export const btn = (label, href, cls = 'btn-primary', attrs = '') => `<a class="btn ${cls}" href="${href}"${attrs ? ' ' + attrs : ''}>${esc(label)}</a>`;
export const T = (C, s) => inline(typo(s, C.code)); // строка контента → HTML с разметкой

// Заголовок секции: заголовок и подзаголовок. Надписи-«надзаголовки» не выводим — это шум.
export function sh(C, no, kick, title, lede, cls = ''){
  return `<header class="sh ${cls} rv"><h2 class="h2">${title}</h2>${lede ? `<p class="lede">${T(C, lede)}</p>` : ''}</header>`;
}

// Цена: основная в валюте продукта + «≈» во вторичной валюте (клиент пересчитывает при смене валюты)
export function price(C, amount, cur, perLabel, { from = true, cls = '' } = {}){
  const alt = C.cur !== cur ? C.I.approx(amount, cur, C.cur) : '';
  return `<div class="price ${cls}"><small>${from ? esc(C.I.t('from')) : ''}${from && perLabel ? ' · ' : ''}${esc(perLabel || '')}</small><span class="pr">${C.I.money(amount, cur)}</span><span class="pr-alt" data-v="${amount}" data-c="${cur}">${alt}</span></div>`;
}

export function crumbs(C, items){
  const all = [[C.I.t('nav.home'), C.path('hub')], ...items];
  return `<nav class="crumbs" aria-label="${esc(C.I.t('a11y.crumbs'))}">${all.map(([n, h], i) => i < all.length - 1 ? `<a href="${h}">${esc(n)}</a><i aria-hidden="true"></i>` : `<span aria-current="page">${esc(n)}</span>`).join('')}</nav>`;
}
export function crumbsLd(C, items){
  const all = [[C.I.t('nav.home'), C.path('hub')], ...items];
  return { '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement:all.map(([name, h], i) => ({ '@type':'ListItem', position:i + 1, name, item:C.SITE.origin + h })) };
}

export function faq(C, items){
  return `<div class="faq">${items.map(([q, a]) => `<details><summary>${T(C, q)}</summary><div><p>${T(C, a)}</p></div></details>`).join('')}</div>`;
}
export const faqLd = items => ({ '@context':'https://schema.org', '@type':'FAQPage', mainEntity:items.map(([q, a]) => ({ '@type':'Question', name:q.replace(/\*/g, ''), acceptedAnswer:{ '@type':'Answer', text:a.replace(/\*|\[|\]\(.*?\)/g, '') } })) });

export function monthsBar(C, months){
  const set = new Set(months && months.length ? months : [1,2,3,4,5,6,7,8,9,10,11,12]);
  return `<div class="months" role="list">${C.I.months.map((m, i) => `<span role="listitem" class="${set.has(i + 1) ? 'on' : ''}"${set.has(i + 1) ? '' : ' aria-hidden="true"'}>${esc(m)}</span>`).join('')}</div>`;
}

export const ticks = (C, arr, cls = '') => `<ul class="ticks ${cls}">${arr.map(x => `<li>${T(C, x)}</li>`).join('')}</ul>`;

// ── Карточки ───────────────────────────────────────────────
// Место в карточке: у программ — город («Пхукет»), у туров — точка ловли («Рача Ной»)
export const cardPlace = p => { const s = p.type === 't' ? (String(p.where || '').split('·')[1] || p.where || '').trim() : placeShort(p.where); return s.charAt(0).toUpperCase() + s.slice(1); };

// Бейдж: «Бронь открыта» у туров, «Хит спроса» у популярных программ
const badge = (C, p) => p.live ? `<span class="badge live">${esc(C.I.t('tag.live'))}</span>` : p.hot ? `<span class="badge">${esc(C.I.t('tag.hot'))}</span>` : '';
export const iconTile = (tone, art, cls = '') => `<span class="itile t-${tone} ${cls}">${use(artId(art), 'art')}</span>`;

export function card(C, p){
  const d = C.dir[p.dir];
  return `<article class="card rv" data-d="${p.dir}" data-cat="${p.cat || ''}" data-goals="${d.goals.join(' ')}" data-reg="${p.reg}" data-hot="${p.hot ? 1 : 0}" data-usd="${p.usdEq}" data-m="${(p.months || []).join(' ')}" data-q="${esc((p.title + ' ' + p.where + ' ' + d.name + ' ' + (p.dest ? C.dest[p.dest].name : '')).toLowerCase())}">
  <a class="card-a" href="${p.href}">
    <div class="card-top"><span class="card-k">${esc(d.name)}</span>${badge(C, p)}</div>
    <h3>${T(C, p.title)}</h3><p class="card-s">${T(C, p.short)}</p>
    <ul class="meta"><li>${icon('clock')}${esc(p.durLabel)}</li><li>${icon('pin')}${esc(cardPlace(p))}</li></ul></a>
  <div class="card-f">${price(C, p.price, p.cur, p.perLabel)}<button class="card-add" type="button" data-plan="${p.id}" aria-pressed="false" aria-label="${esc(C.I.t('plan.add'))}">${icon('plus')}<span>${esc(C.I.t('plan.add'))}</span></button></div>
</article>`;
}

// Направление: фото, поверх — название и число программ
export function dirTile(C, d, i){
  const n = C.items.filter(p => p.dir === d.id).length;
  return `<a class="dir rv" href="${C.path('dir:' + d.id)}">${photo('dir/' + d.id, { sizes:'(max-width:760px) 44vw, (max-width:1100px) 24vw, 170px', max:800 })}<span class="dir-t"><strong>${esc(d.name)}</strong><span>${esc(C.I.count(n, C.L.nouns.program))}</span></span></a>`;
}

// Место: фото и подпись под ним
export function placeCard(C, d, n = d.count){
  return `<a class="place rv" href="${C.path('dest:' + d.id)}"><span class="place-ph">${photo('dest/' + d.id, { sizes:'(max-width:760px) 70vw, 280px', max:800 })}</span><strong>${esc(d.name)}</strong><span>${esc(C.I.count(n, C.L.nouns.program))}</span></a>`;
}

export function row(C, p){
  return `<a class="row" href="${p.href}">${iconTile(p.tone, p.art, 'sm')}<div><strong>${T(C, p.title)}</strong><span>${esc(p.where)} · ${esc(p.durLabel)}</span></div>${price(C, p.price, p.cur, p.perLabel)}</a>`;
}

export function gcard(C, g, h = 'h3'){
  const G = C.L.guides[g.id];
  const k = g.dir ? 'dir/' + g.dir : '';
  return `<a class="gcard rv${k ? ' has-ph' : ''}" href="${C.path('guide:' + g.id)}">${k ? `<span class="gcard-ph">${photo(k, { sizes:'(max-width:640px) 100vw, (max-width:1000px) 50vw, 400px', max:1200 })}</span>` : ''}<div class="card-top"><span class="card-k">${esc(G.kicker || (g.dir ? C.dir[g.dir].name : C.I.t('guides.kicker')))}</span><span class="badge soft">${esc(G.read)}</span></div><${h} class="gcard-h">${T(C, G.title)}</${h}><p class="card-s">${T(C, G.desc)}</p></a>`;
}

// ── Формы ────────────────────────────────────────────────────────────
export function leadForm(C, { type, id = '', title = '', fields = ['date', 'guests', 'contact'], submit, light = false, pay = false }){
  const F = {
    name:`<div class="field"><label for="f-name-${id}">${esc(C.I.t('form.name'))}</label><input id="f-name-${id}" name="name" autocomplete="given-name" placeholder="${esc(C.I.t('form.namePh'))}"></div>`,
    date:`<div class="field"><label for="f-date-${id}">${esc(C.I.t('form.date'))}</label><input id="f-date-${id}" name="date" placeholder="${esc(C.I.t('form.datePh'))}" autocomplete="off"></div>`,
    guests:`<div class="field"><label for="f-guests-${id}">${esc(C.I.t('form.guests'))}</label><input id="f-guests-${id}" name="guests" inputmode="numeric" placeholder="${esc(C.I.t('form.guestsPh'))}" autocomplete="off"></div>`,
    contact:`<div class="field"><label for="f-contact-${id}">${esc(C.I.t('form.contact'))}</label><input id="f-contact-${id}" name="contact" required placeholder="${esc(C.I.t('form.contactPh'))}" autocomplete="tel"></div>`
  };
  return `<form class="lead-form${light ? ' light-form' : ''}" data-type="${type}" data-id="${esc(id)}" data-title="${esc(title)}" novalidate>
    ${fields.map(f => F[f]).join('')}
    <input class="hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
    <button class="btn btn-primary btn-block" type="submit">${esc(submit || C.I.t('form.send'))}</button>
    ${pay ? `<button class="btn btn-ghost btn-block" type="button" data-pay="${esc(id)}">${icon('card')}${esc(C.I.t('pay.cta', { p:Math.round(C.SITE.payments.deposit * 100) }))}</button><p class="small pay-note">${esc(C.I.t('pay.note'))}</p>` : ''}
    <p class="small">${inline(C.I.t('form.consent', { privacy:C.path('privacy') }))}</p>
  </form>`;
}

// ── Каркас страницы ──────────────────────────────────────────────────
function head(C, { key, title: rawTitle, desc: rawDesc, og, ld: lds = [], noindex = false }){
  const desc = clip(rawDesc, C.code === 'zh' ? 84 : 158);
  // Длинный title: бренд в конце не помещается в выдаче — убираем его, а не обрезаем смысл
  let title = rawTitle.length > (C.code === 'zh' ? 36 : 68) ? rawTitle.replace(/\s*[|｜]\s*ERKAK\s*$/, '') : rawTitle;
  // Всё ещё длинный — отбрасываем последний хвост после запятой или тире (обычно цену), а не режем слово
  const max = C.code === 'zh' ? 40 : 75;
  while (title.length > max) { const m = /^(.*\S)(?:[,،]\s|，|\s[—–·]\s)(?:(?![,،]\s|，|\s[—–·]\s).)+$/.exec(title); if (!m || m[1].length < 20) break; title = m[1]; }
  const url = C.SITE.origin + C.path(key);
  const alts = C.langs.map(l => `<link rel="alternate" hreflang="${l.hreflang}" href="${C.SITE.origin + C.pathIn(l.code, key)}">`).join('');
  const xdef = key === 'hub' ? C.SITE.origin + '/' : C.SITE.origin + C.pathIn(C.SITE.defaultLang, key);
  const V = C.SITE.verify;
  const ogImg = C.SITE.origin + (og || '/assets/og/erkak.jpg');
  return `<!doctype html>
<html lang="${C.L.meta.htmlLang || C.code}" dir="${C.I.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">
${alts}<link rel="alternate" hreflang="x-default" href="${xdef}">`}
<meta property="og:type" content="${key.startsWith('guide:') ? 'article' : 'website'}">
<meta property="og:site_name" content="ERKAK">
<meta property="og:locale" content="${C.L.meta.ogLocale}">
${C.langs.filter(l => l.code !== C.code).map(l => `<meta property="og:locale:alternate" content="${l.ogLocale}">`).join('')}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImg}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#FFFFFF">
<meta name="format-detection" content="telephone=no">
${V.yandex ? `<meta name="yandex-verification" content="${esc(V.yandex)}">` : ''}${V.google ? `<meta name="google-site-verification" content="${esc(V.google)}">` : ''}${V.bing ? `<meta name="msvalidate.01" content="${esc(V.bing)}">` : ''}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
${C.fontPreload.map(f => `<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>`).join('')}
${usesCdn() ? '<link rel="preconnect" href="https://images.unsplash.com">' : ''}
<link rel="stylesheet" href="${C.asset('css')}">
${lds.map(ld).join('\n')}
</head>`;
}

function header(C, key, navSet){
  const I = C.I, items = C.nav.slice(1, 5);
  const active = h => key && C.path(key) === h.split('#')[0] && !h.includes('#') ? ' aria-current="page"' : '';
  const langs = C.langs.map(l => `<a href="${C.pathIn(l.code, key)}" hreflang="${l.hreflang}" lang="${l.htmlLang}"${l.code === C.code ? ' aria-current="true"' : ''}>${esc(l.name)}<small>${esc(l.code)}</small></a>`).join('');
  const curs = C.SITE.currencies.map(c => `<button type="button" data-cur="${c}" aria-pressed="${c === C.cur}">${c}<small>${esc(I.money(0, c).replace(/[\d\s.,\u00A0\u202F\u200F]/g, '') || c)}</small></button>`).join('');
  const cta = navSet === 'fish' ? [I.t('cta.pickTour'), C.path('dir:fishing') + '#pick'] : [I.t('cta.pick'), C.path('hub') + '#pick'];
  return `<a class="skip" href="#main">${esc(I.t('a11y.skip'))}</a>
<header class="hdr" id="hdr"><div class="wrap hdr-in">
  <a class="brand" href="${C.path('hub')}" aria-label="ERKAK — ${esc(I.t('nav.home'))}">${use('logo', 'mark')}<span class="word">ERKAK</span></a>
  <nav class="nav" aria-label="${esc(I.t('a11y.nav'))}">${items.map(([n, h]) => `<a href="${h}"${active(h)}>${esc(n)}</a>`).join('')}</nav>
  <div class="hdr-tools">
    <div class="pop-wrap" style="position:relative"><button class="tool lang-tool" type="button" aria-expanded="false" aria-controls="pop-lang" aria-label="${esc(I.t('a11y.langCur'))}">${icon('globe')}<span class="lbl">${esc(C.code.toUpperCase())}</span><span class="cur-lbl" hidden>&nbsp;<span data-cur-label>${esc(C.cur)}</span></span></button>
      <div class="menu-pop" id="pop-lang"><p class="small" style="padding:8px 14px 4px">${esc(I.t('a11y.lang'))}</p>${langs}<p class="small" style="padding:14px 14px 4px">${esc(I.t('a11y.cur'))}</p>${curs}</div></div>
    <button class="tool plan-tool" type="button" hidden data-plan-open aria-label="${esc(I.t('plan.title'))}">${icon('plan')}<span class="plan-n" hidden>0</span></button>
    <a class="btn btn-primary btn-sm" href="${cta[1]}">${esc(cta[0])}</a>
    <button class="tool burger" type="button" aria-expanded="false" aria-controls="menu" aria-label="${esc(I.t('a11y.menu'))}">${icon('menu')}</button>
  </div>
</div></header>
<div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="${esc(I.t('a11y.menu'))}">
  <div class="menu-top"><a class="brand" href="${C.path('hub')}">${use('logo', 'mark')}<span class="word">ERKAK</span></a><button class="tool" type="button" data-menu-close aria-label="${esc(I.t('a11y.close'))}">${icon('close')}</button></div>
  <nav>${C.nav.map(([n, h]) => `<a href="${h}">${esc(n)}</a>`).join('')}</nav>
  <div class="menu-foot">${btn(cta[0], cta[1], 'btn-primary btn-block')}<div class="menu-langs">${C.langs.map(l => `<a href="${C.pathIn(l.code, key)}" hreflang="${l.hreflang}"${l.code === C.code ? ' aria-current="true"' : ''}>${esc(l.name)}</a>`).join('')}</div></div>
</div>`;
}

function footer(C, key){
  const I = C.I, S = C.SITE, L = S.legal;
  const legal = [L.operator, L.tat && I.t('foot.tat', { n:L.tat }), L.insurance].filter(Boolean).map(esc).join(' · ');
  const m = C.messengers;
  return `<footer class="foot">
  <div class="wrap">
    <div class="foot-cta rv">${photo('club', { sizes:'(max-width:1240px) 100vw, 1200px', cls:'foot-ph' })}<div><h2 class="h2">${T(C, I.t('foot.title'))}</h2></div><div class="btns">${btn(I.t('cta.pick'), C.path('hub') + '#pick', 'btn-light')}${m[0] ? btn(m[0].label, m[0].href, 'btn-glass', 'target="_blank" rel="noopener"') : ''}</div></div>
    <div class="foot-cols">
      <div class="foot-brand"><a class="brand" href="${C.path('hub')}">${use('logo', 'mark')}<span class="word">ERKAK</span></a><p>${T(C, I.t('foot.about'))}</p>
        <div class="foot-langs">${C.langs.map(l => `<a href="${C.pathIn(l.code, key)}" hreflang="${l.hreflang}" lang="${l.htmlLang}"${l.code === C.code ? ' aria-current="true"' : ''}>${esc(l.name)}</a>`).join('')}</div></div>
      <div><h3>${esc(I.t('foot.dirs'))}</h3>${C.dirs.map(d => `<a href="${C.path('dir:' + d.id)}">${esc(d.name)}</a>`).join('')}</div>
      <div><h3>${esc(I.t('foot.places'))}</h3>${C.dests.filter(d => d.page).map(d => `<a href="${C.path('dest:' + d.id)}">${esc(d.name)}</a>`).join('')}<a href="${C.path('dests')}">${esc(I.t('foot.allPlaces'))} →</a></div>
      <div><h3>ERKAK</h3><a href="${C.path('about')}">${esc(I.t('nav.about'))}</a><a href="${C.path('guides')}">${esc(I.t('nav.guides'))}</a><a href="${C.path('hub')}#club">${esc(I.t('nav.club'))}</a><a href="${C.path('ring')}">ERKAK Ring</a><a href="${C.path('about')}#visa">${esc(I.t('nav.visa'))}</a><a href="${C.path('terms')}">${esc(I.t('nav.terms'))}</a><a href="${C.path('privacy')}">${esc(I.t('nav.privacy'))}</a>
        <h3 style="margin-block-start:34px">${esc(I.t('foot.contact'))}</h3>${m.map(x => `<a href="${x.href}" target="_blank" rel="noopener">${esc(x.label)}</a>`).join('')}${S.contacts.email ? `<a href="mailto:${S.contacts.email}">${esc(S.contacts.email)}</a>` : ''}${S.contacts.phone ? `<a href="tel:${S.contacts.phone.replace(/\s/g, '')}">${esc(S.contacts.phone)}</a>` : ''}</div>
    </div>
    <div class="foot-legal"><span>© ${new Date().getFullYear()} ERKAK${legal ? ' · ' + legal : ''}${S.analytics.ga4 || S.analytics.metrika ? ` · <button type="button" class="foot-btn" data-consent-reset>${esc(C.L.client.consentLink)}</button>` : ''}</span><span>${esc(I.t('foot.note'))}</span></div>
  </div>
</footer>`;
}

function chrome(C){
  const I = C.I, m = C.messengers;
  return `<div class="dock" id="dock">${m.slice(0, 2).map(x => `<a href="${x.href}" target="_blank" rel="noopener" aria-label="${esc(x.label)}">${icon(x.icon)}</a>`).join('')}</div>
<aside class="plan" id="plan" aria-hidden="true">
  <div class="plan-panel" role="dialog" aria-modal="true" aria-labelledby="plan-title">
    <div class="plan-head"><h2 id="plan-title">${esc(I.t('plan.title'))}</h2><button class="tool" type="button" data-plan-close aria-label="${esc(I.t('a11y.close'))}">${icon('close')}</button></div>
    <p class="plan-empty" id="plan-empty">${T(C, I.t('plan.empty'))}</p>
    <ol class="plan-list" id="plan-list"></ol>
    <div class="plan-sum" id="plan-sum" hidden><small>${esc(I.t('plan.total'))}</small><span></span></div>
    ${leadForm(C, { type:'plan', id:'plan', fields:['name', 'date', 'contact'], submit:I.t('plan.send') })}
  </div>
</aside>`;
}

// Секция с aria-labelledby="h-…": id получает её первый заголовок h2 (sh() id не знает)
const labelSections = html => html.replace(/(<section\b[^>]*aria-labelledby="(h-[\w-]+)"[^>]*>)((?:(?!<section\b)[\s\S])*?)<h2\b(?![^>]*\sid=)/g, (m, open, id, mid) => mid.includes(`id="${id}"`) ? m : `${open}${mid}<h2 id="${id}"`);

export function page(C, { key, title, desc, body, lds = [], og, nav = 'eco', scripts = [], mbar, noindex = false }){
  const I = C.I;
  body = labelSections(body);
  const mb = mbar || (nav === 'fish' ? [I.t('cta.pickTour'), C.path('dir:fishing') + '#pick'] : [I.t('cta.pick'), C.path('hub') + '#pick']);
  return `${head(C, { key, title, desc, og, ld:lds, noindex })}
<body class="no-js">
${header(C, key, nav)}
<main id="main">
${body}
</main>
${footer(C, key)}
${chrome(C)}
<div class="mbar" id="mbar">${btn(mb[0], mb[1], 'btn-primary')}${C.messengers[0] ? `<a class="btn btn-ghost mb-ico" href="${C.messengers[0].href}" target="_blank" rel="noopener" aria-label="${esc(C.messengers[0].label)}">${icon(C.messengers[0].icon)}</a>` : ''}<button class="btn btn-ghost mb-ico plan-tool" type="button" hidden data-plan-open aria-label="${esc(I.t('plan.title'))}">${icon('plan')}<span class="plan-n" hidden>0</span></button></div>
<script src="${C.asset('data')}" defer></script>
<script src="${C.asset('core')}" defer></script>
${scripts.map(s => `<script src="${C.asset(s)}" defer></script>`).join('\n')}
</body>
</html>
`;
}

export { use, icon, artId, isFish, photo };
