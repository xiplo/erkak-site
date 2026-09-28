// ERKAK · каркас страниц и компоненты. Все функции принимают контекст языка C (см. build.mjs → makeContext).
import { esc, inline, roman, typo, clip } from './util.mjs';
import { use, icon, poster, artId, isFish, placeShort } from './art.mjs';

export const ld = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const ar = '<span class="ar" aria-hidden="true"></span>';

// ── Мелкие компоненты ─────────────────────────────────────────────────
export const btn = (label, href, cls = 'btn-gold', attrs = '') => `<a class="btn ${cls}" href="${href}"${attrs ? ' ' + attrs : ''}>${esc(label)}${ar}</a>`;
export const kicker = s => `<p class="kicker">${esc(s)}</p>`;
export const T = (C, s) => inline(typo(s, C.code)); // строка контента → HTML с разметкой

export function sh(C, no, kick, title, lede, cls = ''){
  return `<header class="sh ${cls} rv"><span class="sh-no" aria-hidden="true">${roman(no)}</span><div class="sh-body">${kicker(kick)}<h2 class="h2">${title}</h2>${lede ? `<p class="lede">${T(C, lede)}</p>` : ''}</div></header>`;
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

// ── Карточки ─────────────────────────────────────────────────────────
// Номер в углу постера: в каталоге — место в топ-100 (N° 07), у туров в разделе рыбалки — уровень (I–V).
export const posterNo = (p, level = false) => level && p.tier ? `<b>${roman(p.tier)}</b>` : `<b>N°&nbsp;${String(p.rank).padStart(2, '0')}</b>`;
// Место на постере: у программ — город («Пхукет»), у туров — точка ловли («Рача Ной»)
export const posterPlace = p => { const s = p.type === 't' ? (String(p.where || '').split('·')[1] || p.where || '').trim() : placeShort(p.where); return s.charAt(0).toUpperCase() + s.slice(1); };

export function card(C, p, { level = false } = {}){
  const d = C.dir[p.dir];
  const tags = { tl:posterNo(p, level), tr:p.hot ? esc(C.I.t('tag.hot')) : p.lux ? esc(C.I.t('tag.lux')) : '', bl:esc(p.durLabel), br:esc(p.live ? C.I.t('tag.live') : C.I.t('tag.soon')) };
  return `<article class="card rv" data-d="${p.dir}" data-cat="${p.cat || ''}" data-goals="${d.goals.join(' ')}" data-reg="${p.reg}" data-hot="${p.hot ? 1 : 0}" data-usd="${p.usdEq}" data-m="${(p.months || []).join(' ')}" data-q="${esc((p.title + ' ' + p.where + ' ' + d.name + ' ' + (p.dest ? C.dest[p.dest].name : '')).toLowerCase())}">
  <a class="card-a" href="${p.href}">${poster({ tone:p.tone, art:p.art, ...tags, mid:esc(posterPlace(p)), seed:p.id })}
  <div class="card-t"><p class="card-k">${esc(d.name)}</p><h3>${T(C, p.title)}</h3><p>${T(C, p.short)}</p></div></a>
  <div class="card-f">${price(C, p.price, p.cur, p.perLabel)}<button class="card-add" type="button" data-plan="${p.id}" aria-pressed="false">${icon('plus')}<span>${esc(C.I.t('plan.add'))}</span></button></div>
</article>`;
}

export function dirTile(C, d, i){
  const n = C.items.filter(p => p.dir === d.id).length;
  return `<a class="dir rv" style="--d:${i % 4}" href="${C.path('dir:' + d.id)}">${poster({ tone:d.tone, art:d.art, tl:`<b>${roman(i + 1)}</b>`, tr:d.status === 'live' ? esc(C.I.t('tag.live')) : '', br:esc(C.I.plural(n, C.L.nouns.program).replace(/^/, C.I.num(n) + '\u00A0')) })}
  <h3>${T(C, d.name)}</h3><p>${T(C, d.short)}</p><div class="dir-foot"><span class="${d.status === 'live' ? 'live' : ''}">${esc(d.status === 'live' ? C.I.t('tag.live') : C.I.t('tag.soon'))}</span><span>${esc(C.I.t('dir.open'))} →</span></div></a>`;
}

export function row(C, p){
  return `<a class="row" href="${p.href}">${use(artId(p.art), 'art')}<div><strong>${T(C, p.title)}</strong><span>${esc(p.where)} · ${esc(p.durLabel)}</span></div>${price(C, p.price, p.cur, p.perLabel)}</a>`;
}

export function gcard(C, g){
  const G = C.L.guides[g.id];
  return `<a class="gcard rv" href="${C.path('guide:' + g.id)}">${poster({ tone:g.tone, art:g.art, tl:`<b>${esc(C.I.t('guides.kicker'))}</b>`, br:esc(G.read) })}<p class="card-k">${esc(G.kicker || (g.dir ? C.dir[g.dir].name : C.I.t('guides.kicker')))}</p><h3>${T(C, G.title)}</h3><p>${T(C, G.desc)}</p></a>`;
}

// ── Формы ────────────────────────────────────────────────────────────
export function leadForm(C, { type, id = '', title = '', fields = ['date', 'guests', 'contact'], submit, light = false }){
  const F = {
    name:`<div class="field"><label for="f-name-${id}">${esc(C.I.t('form.name'))}</label><input id="f-name-${id}" name="name" autocomplete="given-name" placeholder="${esc(C.I.t('form.namePh'))}"></div>`,
    date:`<div class="field"><label for="f-date-${id}">${esc(C.I.t('form.date'))}</label><input id="f-date-${id}" name="date" placeholder="${esc(C.I.t('form.datePh'))}" autocomplete="off"></div>`,
    guests:`<div class="field"><label for="f-guests-${id}">${esc(C.I.t('form.guests'))}</label><input id="f-guests-${id}" name="guests" inputmode="numeric" placeholder="${esc(C.I.t('form.guestsPh'))}" autocomplete="off"></div>`,
    contact:`<div class="field"><label for="f-contact-${id}">${esc(C.I.t('form.contact'))}</label><input id="f-contact-${id}" name="contact" required placeholder="${esc(C.I.t('form.contactPh'))}" autocomplete="tel"></div>`
  };
  return `<form class="lead-form${light ? ' light-form' : ''}" data-type="${type}" data-id="${esc(id)}" data-title="${esc(title)}" novalidate>
    ${fields.map(f => F[f]).join('')}
    <input class="hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
    <button class="btn btn-gold btn-block" type="submit">${esc(submit || C.I.t('form.send'))}${ar}</button>
    <p class="small">${inline(C.I.t('form.consent', { privacy:C.path('privacy') }))}</p>
  </form>`;
}

// ── Каркас страницы ──────────────────────────────────────────────────
function head(C, { key, title, desc: rawDesc, og, ld: lds = [] }){
  const desc = clip(rawDesc, C.code === 'zh' ? 90 : 158);
  const url = C.SITE.origin + C.path(key);
  const alts = C.langs.map(l => `<link rel="alternate" hreflang="${l.hreflang}" href="${C.SITE.origin + C.pathIn(l.code, key)}">`).join('');
  const xdef = key === 'hub' ? C.SITE.origin + '/' : C.SITE.origin + C.pathIn(C.SITE.defaultLang, key);
  const V = C.SITE.verify, A = C.SITE.analytics;
  const ogImg = C.SITE.origin + (og || '/assets/og/erkak.jpg');
  return `<!doctype html>
<html lang="${C.L.meta.htmlLang || C.code}" dir="${C.I.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${alts}<link rel="alternate" hreflang="x-default" href="${xdef}">
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
<meta name="theme-color" content="#0B0B0A">
<meta name="format-detection" content="telephone=no">
${V.yandex ? `<meta name="yandex-verification" content="${esc(V.yandex)}">` : ''}${V.google ? `<meta name="google-site-verification" content="${esc(V.google)}">` : ''}${V.bing ? `<meta name="msvalidate.01" content="${esc(V.bing)}">` : ''}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
${C.fontPreload.map(f => `<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>`).join('')}
<link rel="stylesheet" href="${C.asset('css')}">
${lds.map(ld).join('\n')}
${A.metrika ? `<script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${+A.metrika},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});</script>` : ''}
${A.ga4 ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(A.ga4)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${esc(A.ga4)}');</script>` : ''}
</head>`;
}

function header(C, key, navSet){
  const I = C.I, items = navSet === 'fish' ? C.navFish : C.nav;
  const active = h => key && C.path(key) === h.split('#')[0] && !h.includes('#') ? ' aria-current="page"' : '';
  const langs = C.langs.map(l => `<a href="${C.pathIn(l.code, key)}" hreflang="${l.hreflang}" lang="${l.htmlLang}"${l.code === C.code ? ' aria-current="true"' : ''}>${esc(l.name)}<small>${esc(l.code)}</small></a>`).join('');
  const curs = C.SITE.currencies.map(c => `<button type="button" data-cur="${c}" aria-pressed="${c === C.cur}">${c}<small>${esc(I.money(0, c).replace(/[\d\s.,\u00A0\u202F\u200F]/g, '') || c)}</small></button>`).join('');
  const cta = navSet === 'fish' ? [I.t('cta.pickTour'), C.path('dir:fishing') + '#pick'] : [I.t('cta.pick'), C.path('hub') + '#pick'];
  return `<a class="skip" href="#main">${esc(I.t('a11y.skip'))}</a>
<header class="hdr" id="hdr"><div class="wrap hdr-in">
  <a class="brand" href="${C.path('hub')}" aria-label="ERKAK — ${esc(I.t('nav.home'))}">${use('logo', 'mark')}<span><span class="word">ERKAK</span><small>${esc(I.t('brand.tag'))}</small></span></a>
  <nav class="nav" aria-label="${esc(I.t('a11y.nav'))}">${items.map(([n, h]) => `<a href="${h}"${active(h)}>${esc(n)}</a>`).join('')}</nav>
  <div class="hdr-tools">
    <div class="pop-wrap" style="position:relative"><button class="tool lang-tool" type="button" aria-expanded="false" aria-controls="pop-lang" aria-label="${esc(I.t('a11y.langCur'))}">${icon('globe')}<span class="lbl">${esc(C.code.toUpperCase())}&nbsp;·&nbsp;<span data-cur-label>${esc(C.cur)}</span></span></button>
      <div class="menu-pop" id="pop-lang"><p class="small" style="padding:8px 14px 4px">${esc(I.t('a11y.lang'))}</p>${langs}<p class="small" style="padding:14px 14px 4px">${esc(I.t('a11y.cur'))}</p>${curs}</div></div>
    <button class="tool plan-tool" type="button" data-plan-open aria-label="${esc(I.t('plan.title'))}">${icon('plan')}<span class="plan-n" hidden>0</span></button>
    <a class="btn btn-gold btn-sm" href="${cta[1]}">${esc(cta[0])}</a>
    <button class="tool burger" type="button" aria-expanded="false" aria-controls="menu" aria-label="${esc(I.t('a11y.menu'))}">${icon('menu')}</button>
  </div>
</div></header>
<div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="${esc(I.t('a11y.menu'))}">
  <div class="menu-top"><a class="brand" href="${C.path('hub')}">${use('logo', 'mark')}<span class="word">ERKAK</span></a><button class="tool" type="button" data-menu-close aria-label="${esc(I.t('a11y.close'))}">${icon('close')}</button></div>
  <nav>${items.map(([n, h], i) => `<a href="${h}"><span>${roman(i + 1)}</span>${esc(n)}</a>`).join('')}</nav>
  <div class="menu-foot">${btn(cta[0], cta[1], 'btn-gold btn-block')}<div class="menu-langs">${C.langs.map(l => `<a href="${C.pathIn(l.code, key)}" hreflang="${l.hreflang}"${l.code === C.code ? ' aria-current="true"' : ''}>${esc(l.name)}</a>`).join('')}</div></div>
</div>`;
}

function footer(C, key){
  const I = C.I, S = C.SITE, L = S.legal;
  const legal = [L.operator, L.tat && I.t('foot.tat', { n:L.tat }), L.insurance].filter(Boolean).map(esc).join(' · ');
  const m = C.messengers;
  return `<footer class="foot">
  <div class="wrap">
    <div class="foot-cta rv"><div>${kicker(I.t('foot.kicker'))}<h2 class="h2" style="margin-block-start:22px">${T(C, I.t('foot.title'))}</h2></div><div class="btns">${btn(I.t('cta.pick'), C.path('hub') + '#pick', 'btn-gold')}${m[0] ? btn(m[0].label, m[0].href, 'btn-ghost', 'target="_blank" rel="noopener"') : ''}</div></div>
    <div class="foot-cols">
      <div class="foot-brand"><a class="brand" href="${C.path('hub')}">${use('logo', 'mark')}<span><span class="word">ERKAK</span><small>${esc(I.t('brand.tag'))}</small></span></a><p>${T(C, I.t('foot.about'))}</p>
        <div class="foot-langs">${C.langs.map(l => `<a href="${C.pathIn(l.code, key)}" hreflang="${l.hreflang}" lang="${l.htmlLang}"${l.code === C.code ? ' aria-current="true"' : ''}>${esc(l.name)}</a>`).join('')}</div></div>
      <div><h4>${esc(I.t('foot.dirs'))}</h4>${C.dirs.map(d => `<a href="${C.path('dir:' + d.id)}">${esc(d.name)}</a>`).join('')}</div>
      <div><h4>${esc(I.t('foot.places'))}</h4>${C.dests.filter(d => d.page).map(d => `<a href="${C.path('dest:' + d.id)}">${esc(d.name)}</a>`).join('')}<a href="${C.path('dests')}">${esc(I.t('foot.allPlaces'))} →</a></div>
      <div><h4>ERKAK</h4><a href="${C.path('about')}">${esc(I.t('nav.about'))}</a><a href="${C.path('guides')}">${esc(I.t('nav.guides'))}</a><a href="${C.path('hub')}#club">${esc(I.t('nav.club'))}</a><a href="${C.path('about')}#visa">${esc(I.t('nav.visa'))}</a><a href="${C.path('terms')}">${esc(I.t('nav.terms'))}</a><a href="${C.path('privacy')}">${esc(I.t('nav.privacy'))}</a>
        <h4 style="margin-block-start:34px">${esc(I.t('foot.contact'))}</h4>${m.map(x => `<a href="${x.href}" target="_blank" rel="noopener">${esc(x.label)}</a>`).join('')}${S.contacts.email ? `<a href="mailto:${S.contacts.email}">${esc(S.contacts.email)}</a>` : ''}${S.contacts.phone ? `<a href="tel:${S.contacts.phone.replace(/\s/g, '')}">${esc(S.contacts.phone)}</a>` : ''}</div>
    </div>
    <div class="foot-legal"><span>© ${new Date().getFullYear()} ERKAK${legal ? ' · ' + legal : ''}</span><span>${esc(I.t('foot.note'))}</span></div>
  </div>
  <div class="foot-word" aria-hidden="true">ERKAK</div>
</footer>`;
}

function chrome(C){
  const I = C.I, m = C.messengers;
  return `<div class="dock" id="dock">${m.slice(0, 2).map(x => `<a href="${x.href}" target="_blank" rel="noopener" aria-label="${esc(x.label)}">${icon(x.icon)}</a>`).join('')}</div>
<aside class="plan" id="plan" aria-hidden="true">
  <div class="plan-panel" role="dialog" aria-modal="true" aria-labelledby="plan-title">
    <div class="plan-head"><div>${kicker(I.t('plan.kicker'))}<h2 id="plan-title" style="margin-block-start:16px">${esc(I.t('plan.title'))}</h2></div><button class="tool" type="button" data-plan-close aria-label="${esc(I.t('a11y.close'))}">${icon('close')}</button></div>
    <p class="plan-empty" id="plan-empty">${T(C, I.t('plan.empty'))}</p>
    <ol class="plan-list" id="plan-list"></ol>
    <div class="plan-sum" id="plan-sum" hidden><small>${esc(I.t('plan.total'))}</small><span></span></div>
    ${leadForm(C, { type:'plan', id:'plan', fields:['name', 'date', 'contact'], submit:I.t('plan.send') })}
  </div>
</aside>`;
}

export function page(C, { key, title, desc, body, lds = [], og, nav = 'eco', scripts = [], mbar }){
  const I = C.I;
  const mb = mbar || (nav === 'fish' ? [I.t('cta.pickTour'), C.path('dir:fishing') + '#pick'] : [I.t('cta.pick'), C.path('hub') + '#pick']);
  return `${head(C, { key, title, desc, og, ld:lds })}
<body class="no-js">
${header(C, key, nav)}
<main id="main">
${body}
</main>
${footer(C, key)}
${chrome(C)}
<div class="mbar" id="mbar">${btn(mb[0], mb[1], 'btn-gold')}${C.messengers[0] ? `<a class="btn btn-ghost mb-ico" href="${C.messengers[0].href}" target="_blank" rel="noopener" aria-label="${esc(C.messengers[0].label)}">${icon(C.messengers[0].icon)}</a>` : ''}<button class="btn btn-ghost mb-ico" type="button" data-plan-open aria-label="${esc(I.t('plan.title'))}">${icon('plan')}<span class="plan-n" hidden>0</span></button></div>
<script src="${C.asset('data')}" defer></script>
<script src="${C.asset('core')}" defer></script>
${scripts.map(s => `<script src="${C.asset(s)}" defer></script>`).join('\n')}
</body>
</html>
`;
}

export { use, icon, poster, artId, isFish };
