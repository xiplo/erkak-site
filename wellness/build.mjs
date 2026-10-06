// ERKAK · сборка сайта erkak.com: все языки, все страницы, ассеты, карты сайта. Результат — в public/.
// Запуск: node build.mjs            → public/ (выкладывается целиком: ./deploy.sh wellness)
//         node build.mjs --lang=ru  → только один язык (быстрая проверка)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, GOALS, DIRECTIONS, DESTINATIONS, PROGRAMS, TOURS, SPOTS, FISH_REGIONS, SEASON, SEA_STATE, GUIDES, COMBOS } from './content/core.mjs';
import { makeI18n } from './lib/i18n.mjs';
import { sprite, setSprite } from './lib/art.mjs';
import { esc, hash } from './lib/util.mjs';
import * as Pages from './lib/pages.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, 'public');
const onlyLang = (process.argv.find(a => a.startsWith('--lang=')) || '').split('=')[1];

// ── Языки ───────────────────────────────────────────────────────────
// Язык без папки content/<код>/ пропускается с предупреждением: hreflang и переключатель
// строятся только по готовым языкам, поэтому недописанный перевод не создаёт битых ссылок.
const CONTENT = {};
for (const code of [...SITE.langs]) {
  const skip = why => { console.warn(`! ${code}: ${why} — язык пропущен`); SITE.langs.splice(SITE.langs.indexOf(code), 1); };
  if (!fs.existsSync(path.join(DIR, 'content', code, 'index.mjs'))) { skip('нет content/' + code + '/'); continue; }
  try { CONTENT[code] = (await import(`./content/${code}/index.mjs`)).default; }
  catch (e) { if (code === onlyLang || process.env.STRICT) throw e; skip('перевод не собирается (' + e.message.split('\n')[0] + ')'); }
}
if (!SITE.langs.includes(SITE.defaultLang)) SITE.defaultLang = SITE.langs[0];
if (onlyLang && !SITE.langs.includes(onlyLang)) throw new Error(`Нет языка ${onlyLang}`);
const LANGS = onlyLang ? [onlyLang] : SITE.langs;
const LANGMETA = SITE.langs.map(code => { const m = CONTENT[code].meta; return { code, name:m.name, hreflang:m.hreflang || code, htmlLang:m.htmlLang || code, ogLocale:m.ogLocale, dir:m.dir || 'ltr' }; });

// ── Маршруты ────────────────────────────────────────────────────────
const byId = arr => Object.fromEntries(arr.map(x => [x.id, x]));
const DIRS = byId(DIRECTIONS), PROGS = byId(PROGRAMS), DESTS = byId(DESTINATIONS), GUIDE = byId(GUIDES);
const RESERVED = new Set(['destinations', 'guides', 'about', 'terms', 'privacy', 'assets', 'pay', 'ring']);
for (const d of DIRECTIONS) if (RESERVED.has(d.slug)) throw new Error(`Слаг направления занят: ${d.slug}`);
export function route(code, key){
  const b = `/${code}/`;
  if (key === 'hub') return b;
  const [k, id] = key.split(':');
  switch (k) {
    case 'dir': return b + DIRS[id].slug + '/';
    case 'prog': { const p = PROGS[id]; return b + DIRS[p.dir].slug + '/' + p.slug + '/'; }
    case 'tour': return b + 'fishing/' + id + '/';
    case 'fishmap': return b + 'fishing/map/';
    case 'dests': return b + 'destinations/';
    case 'dest': return b + 'destinations/' + DESTS[id].slug + '/';
    case 'guides': return b + 'guides/';
    case 'guide': return b + 'guides/' + GUIDE[id].slug + '/';
    case 'about': case 'terms': case 'privacy': return b + k + '/';
    case 'paydone': return b + 'pay/done/';
    case 'ring': return b + 'ring/';
  }
  throw new Error('Неизвестный маршрут ' + key);
}

// ── Ассеты с хешем в имени ──────────────────────────────────────────
fs.rmSync(OUT, { recursive:true, force:true });
fs.mkdirSync(path.join(OUT, 'assets', 'data'), { recursive:true });
const ASSETS = {};
function emit(name, ext, content, dir = 'assets'){
  const file = `${name}.${hash(content)}.${ext}`;
  fs.writeFileSync(path.join(OUT, dir, file), content);
  return `/${dir}/${file}`;
}
const spriteUrl = emit('sprite', 'svg', sprite());
setSprite(spriteUrl);
// Шрифты свои (tools/fonts.mjs): @font-face — в начало общего CSS, файлы — в /assets/fonts/
const FONTS = path.join(DIR, 'src/fonts');
fs.mkdirSync(path.join(OUT, 'assets', 'fonts'), { recursive:true });
const fontFiles = fs.readdirSync(FONTS).filter(f => f.endsWith('.woff2'));
for (const f of fontFiles) fs.copyFileSync(path.join(FONTS, f), path.join(OUT, 'assets', 'fonts', f));
const fontFile = prefix => { const f = fontFiles.find(x => x.startsWith(prefix + '.')); if (!f) throw new Error('Нет шрифта ' + prefix); return '/assets/fonts/' + f; };
ASSETS.css = emit('erkak', 'css', minCss(fs.readFileSync(path.join(FONTS, 'fonts.css'), 'utf8') + fs.readFileSync(path.join(DIR, 'src/css/erkak.css'), 'utf8')));
for (const js of ['core', 'catalog', 'quiz', 'fishing']) ASSETS[js] = emit(js, 'js', fs.readFileSync(path.join(DIR, `src/js/${js}.js`), 'utf8'));
function minCss(s){ return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*/g, '').replace(/\s*([{};,>])\s*/g, '$1').replace(/;}/g, '}'); }
// Статика (иконки, OG, favicon) — как есть
const IMG = path.join(DIR, 'src/img');
if (fs.existsSync(IMG)) for (const f of fs.readdirSync(IMG, { recursive:true })) {
  const src = path.join(IMG, f); if (fs.statSync(src).isDirectory()) continue;
  const dst = f.startsWith('og/') ? path.join(OUT, 'assets', f) : path.join(OUT, f);
  fs.mkdirSync(path.dirname(dst), { recursive:true }); fs.copyFileSync(src, dst);
}

// ── Контекст языка ──────────────────────────────────────────────────
function messengers(L){
  const c = SITE.contacts, M = {
    telegram: c.telegram && { icon:'tg', label:'Telegram', sub:'@' + c.telegram, href:`https://t.me/${c.telegram}` },
    whatsapp: c.whatsapp && { icon:'wa', label:'WhatsApp', sub:'+' + c.whatsapp, href:`https://wa.me/${c.whatsapp}` },
    wechat: c.wechat && { icon:'wechat', label:'WeChat', sub:c.wechat, href:`weixin://dl/chat?${c.wechat}` }
  };
  const order = [...(L.meta.messengers || []), 'telegram', 'whatsapp', 'wechat'];
  return [...new Set(order)].map(k => M[k]).filter(Boolean);
}

function makeContext(code){
  const L = CONTENT[code], I = makeI18n(L, SITE);
  const C = { code, L, I, SITE, langs:LANGMETA, cur:L.meta.currency, goals:GOALS, combos:COMBOS, SEASON, SEA_STATE, SPOTS, FISH_REGIONS };
  C.path = key => route(code, key);
  C.pathIn = (c, key) => route(c, key);
  C.asset = name => name === 'data' ? ASSETS['data:' + code] : ASSETS[name];
  C.messengers = messengers(L);
  C.fontPreload = (L.meta.preload || []).map(fontFile);
  const need = (obj, id, what) => { if (!obj || !obj[id]) throw new Error(`[${code}] нет текста ${what}: ${id}`); return obj[id]; };

  C.dirs = DIRECTIONS.map(d => ({ ...d, ...need(L.catalog.directions, d.id, 'направления') }));
  C.dir = byId(C.dirs);

  const tours = TOURS.map(t => { const x = need(L.fishing.tours, t.id, 'тура');
    return { ...t, ...x, type:'t', dir:'fishing', reg:'th', art:'fish-' + t.fish, cur:'THB', usdEq:Math.round(t.price / SITE.rates.THB), perLabel:I.t('per.' + t.per), durLabel:I.dur(t.dur), days:I.days(t.dur), groupLabel:I.group(t.group), live:true, href:C.path('tour:' + t.id) }; });
  const progs = PROGRAMS.map(p => { const x = need(L.catalog.programs, p.id, 'программы'), dir = C.dir[p.dir];
    return { ...p, ...x, type:'p', reg:DESTS[p.dest].reg, art:dir.art, tone:dir.tone, price:p.usd, cur:'USD', usdEq:p.usd, perLabel:I.t('per.' + p.per), durLabel:I.dur(p.dur), days:I.days(p.dur), live:false, href:C.path('prog:' + p.id) }; });
  const order = Object.fromEntries(DIRECTIONS.map((d, i) => [d.id, i]));
  const all = [...tours, ...progs];
  C.items = [...all.filter(p => p.hot), ...all.filter(p => !p.hot)].map((p, i) => ({ ...p, rank:i + 1 }));
  C.items.sort((a, b) => a.rank - b.rank);
  C.item = byId(C.items);
  C.tours = TOURS.map(t => C.item[t.id]);

  C.dests = DESTINATIONS.map(d => ({ ...d, ...(d.page ? need(L.catalog.destinations, d.id, 'места') : { name:(L.catalog.destinations[d.id] || {}).name || d.id }), count:C.items.filter(p => p.dest === d.id).length }));
  C.dest = byId(C.dests);
  C.guides = GUIDES.map(g => ({ ...g, ...need(L.guides, g.id, 'гайда') }));

  const F = L.fishing;
  C.nav = [[I.t('nav.dirs'), C.path('hub') + '#dirs'], [I.t('nav.top'), C.path('hub') + '#top'], [I.t('nav.fishing'), C.path('dir:fishing')], [I.t('nav.places'), C.path('dests')], [I.t('nav.guides'), C.path('guides')], [I.t('nav.club'), C.path('hub') + '#club']];
  C.navFish = [[I.t('nav.all'), C.path('hub')], ...F.subnav.slice(0, 5).map(([n, h]) => [n, C.path('dir:fishing') + '#' + h])];
  return C;
}

// ── Данные для браузера (по языку) ──────────────────────────────────
function clientData(C){
  const plain = s => String(s).replace(/\*/g, '');
  const data = {
    lang:C.code, locale:C.L.meta.locale, dir:C.I.dir, api:SITE.api, cur:C.cur, curs:SITE.currencies, rates:SITE.rates,
    msg:C.messengers.map(m => ({ icon:m.icon, label:m.label, href:m.href })), sprite:spriteUrl, ui:C.L.client, metrika:SITE.analytics.metrika || '', ga4:SITE.analytics.ga4 || '',
    suggest:Object.fromEntries(SITE.langs.filter(c => c !== C.code).map(c => [c, CONTENT[c].ui.suggest])),
    items:C.items.map(p => [p.id, p.type, p.dir, p.reg, plain(p.title), p.href, p.days, p.durLabel, p.price, p.cur, p.months || [], p.hot ? 1 : 0, p.live ? 1 : 0, p.art, p.perLabel, p.usdEq, p.dest]),
    dirs:Object.fromEntries(C.dirs.map(d => [d.id, [d.name, d.goals]])),
    spots:Object.fromEntries(SPOTS.map(s => [s.id, { ...C.L.fishing.spots[s.id], ok:s.ok }])),
    season:SEASON.filter(([k]) => k !== 'fresh').map(([k, v]) => [C.L.fishing.season[k][0], v]), sea:SEA_STATE
  };
  return `window.ERK=${JSON.stringify(data)};`;
}

// Неполный перевод (например, ещё пишется) — пропускаем язык в обычной сборке, в STRICT падаем
for (const code of [...SITE.langs]) {
  try { makeContext(code); }
  catch (e) {
    if (process.env.STRICT || code === onlyLang) throw e;
    console.warn(`! ${code}: ${e.message} — язык пропущен`);
    SITE.langs.splice(SITE.langs.indexOf(code), 1); LANGMETA.splice(LANGMETA.findIndex(l => l.code === code), 1); delete CONTENT[code];
  }
}
if (!onlyLang) LANGS.splice(0, LANGS.length, ...SITE.langs);

// ── Страницы ────────────────────────────────────────────────────────
const urls = [];
function write(rel, html){
  const file = path.join(OUT, rel.replace(/^\//, ''), rel.endsWith('/') ? 'index.html' : '');
  fs.mkdirSync(path.dirname(file), { recursive:true });
  fs.writeFileSync(file, html);
}
let pages = 0;
for (const code of LANGS) {
  const C = makeContext(code);
  ASSETS['data:' + code] = emit(code, 'js', clientData(C), 'assets/data');
  const add = (key, html) => { write(C.path(key), html); if (code === LANGS[0]) urls.push(key); pages++; };
  add('hub', Pages.hub(C));
  add('dir:fishing', Pages.fishing(C));
  add('fishmap', Pages.fishMap(C));
  for (const t of C.tours) add('tour:' + t.id, Pages.tour(C, t));
  for (const d of C.dirs) if (d.id !== 'fishing') add('dir:' + d.id, Pages.direction(C, d));
  for (const p of C.items) if (p.type === 'p') add('prog:' + p.id, Pages.program(C, p));
  add('dests', Pages.dests(C));
  for (const d of C.dests) if (d.page) add('dest:' + d.id, Pages.dest(C, d));
  add('guides', Pages.guides(C));
  for (const g of C.guides) add('guide:' + g.id, Pages.guide(C, g));
  add('ring', Pages.ring(C));
  add('about', Pages.about(C));
  add('terms', Pages.legal(C, 'terms'));
  add('privacy', Pages.legal(C, 'privacy'));
  write(C.path('paydone'), Pages.payDone(C)); pages++; // служебная: без карты сайта
}

// ── Цены для сервера оплаты (server/prices.json): сумму считает сервер, а не браузер ──
// online: предоплата картой через Stripe; туры «за группу» (турнир, Signature Week) — только по счёту.
{
  const maxOf = g => Math.max(...String(g).match(/\d+/g).map(Number));
  const tours = Object.fromEntries(TOURS.map(t => [t.id, { price:t.price, cur:'THB', per:t.per, max:maxOf(t.group), online:t.per !== 'group',
    title:Object.fromEntries(SITE.langs.map(c => [c, String(CONTENT[c].fishing.tours[t.id].title).replace(/\*/g, '')])) }]));
  fs.writeFileSync(path.join(DIR, 'server', 'prices.json'), JSON.stringify({ deposit:SITE.payments.deposit, tours }, null, 1) + '\n');
}

// ── Корень: выбор языка (x-default) и 404 ───────────────────────────
const rootLinks = LANGMETA.map(l => `<a href="/${l.code}/" hreflang="${l.hreflang}" lang="${l.htmlLang}" dir="${l.dir}"><strong>${esc(l.name)}</strong><span>${esc(CONTENT[l.code].ui.brand.tag)}</span></a>`).join('');
const rootHead = (title, extra = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<meta name="description" content="ERKAK — men's wellness worldwide: Muay Thai, check-ups, retreats, adventure and trophy fishing, in ${LANGMETA.length} languages.">
${extra}<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><meta name="theme-color" content="#FFFFFF">
<link rel="preload" href="${fontFile('golos-text-latin-normal-400')}" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="${ASSETS.css}"></head>`;
const rootBody = inner => `<body><main class="root"><div class="root-in"><svg class="mark" aria-hidden="true"><use href="${spriteUrl}#logo"/></svg><div class="root-word">ERKAK</div>${inner}<nav class="root-langs" aria-label="Language">${rootLinks}</nav></div></main>`;
fs.writeFileSync(path.join(OUT, 'index.html'), rootHead('ERKAK — Men’s wellness worldwide',
  `<link rel="canonical" href="${SITE.origin}/">${LANGMETA.map(l => `<link rel="alternate" hreflang="${l.hreflang}" href="${SITE.origin}/${l.code}/">`).join('')}<link rel="alternate" hreflang="x-default" href="${SITE.origin}/">
<script>(function(){var L=${JSON.stringify(SITE.langs)},s;try{s=localStorage.getItem('erk_lang')}catch(e){}if(!s){var n=(navigator.languages||[navigator.language||'']);for(var i=0;i<n.length&&!s;i++){var c=String(n[i]).toLowerCase().split('-')[0];if(L.indexOf(c)>-1)s=c}}if(s&&L.indexOf(s)>-1)location.replace('/'+s+'/'+location.hash)})()</script>`) +
  rootBody(`<p class="mono-cap" style="color:var(--gold)">Men’s wellness · Worldwide</p>`) + `</body></html>`);
fs.writeFileSync(path.join(OUT, '404.html'), rootHead('404 · ERKAK', '<meta name="robots" content="noindex">') +
  rootBody(`<p class="h3" style="color:var(--bone)">404</p><p class="mono-cap" style="color:var(--bone-3)">${LANGMETA.map(l => esc(CONTENT[l.code].ui.notFound)).join(' · ')}</p>`) + `</body></html>`);

// ── Карты сайта, robots, llms.txt, manifest, IndexNow ──────────────
const alt = key => SITE.langs.map(c => `<xhtml:link rel="alternate" hreflang="${LANGMETA.find(l => l.code === c).hreflang}" href="${SITE.origin}${route(c, key)}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE.origin}${key === 'hub' ? '/' : route(SITE.defaultLang, key)}"/>`;
const today = new Date().toISOString().slice(0, 10);
for (const code of LANGS) {
  fs.writeFileSync(path.join(OUT, `sitemap-${code}.xml`), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.map(k => `<url><loc>${SITE.origin}${route(code, k)}</loc><lastmod>${today}</lastmod>${onlyLang ? '' : alt(k)}</url>`).join('\n')}\n</urlset>\n`);
}
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${LANGS.map(c => `<sitemap><loc>${SITE.origin}/sitemap-${c}.xml</loc><lastmod>${today}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\n# Поисковые и AI-роботы допускаются явно\nUser-agent: OAI-SearchBot\nUser-agent: PerplexityBot\nUser-agent: YandexBot\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE.origin}/sitemap.xml\n`);
if (SITE.indexnow) fs.writeFileSync(path.join(OUT, `${SITE.indexnow}.txt`), SITE.indexnow);
fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({ name:'ERKAK — Men’s wellness worldwide', short_name:'ERKAK', start_url:'/', display:'standalone', background_color:'#FFFFFF', theme_color:'#1D2025', icons:[{ src:'/icon-192.png', sizes:'192x192', type:'image/png' }, { src:'/icon-512.png', sizes:'512x512', type:'image/png' }, { src:'/favicon.svg', sizes:'any', type:'image/svg+xml' }] }, null, 2));
{
  let C; try { C = makeContext(SITE.langs.includes('en') ? 'en' : LANGS[0]); } catch (e) { console.warn('! llms.txt по-английски не собран: ' + e.message); C = makeContext(LANGS[0]); }
  const lines = [`# ERKAK`, ``, `> ${C.L.hub.orgDesc}`, ``, `ERKAK is a concierge for men's wellness travel: ${C.items.length} programs in ${C.dirs.length} disciplines. Programs are run by vetted partners (camps, accredited clinics, licensed guides and captains); ERKAK plans, books and accompanies. Sport fishing in Thailand is bookable now; other programs accept pre-registration. Languages: ${LANGMETA.map(l => `${l.name} (/${l.code}/)`).join(', ')}.`, ``, `## Key pages`,
    `- [Home](${SITE.origin}${C.path('hub')}): all disciplines, top-100 catalog, club, concierge quiz`,
    `- [Sport fishing in Thailand](${SITE.origin}${C.path('dir:fishing')}): legal spots map, season calendar, ${C.tours.length} tours with THB prices`,
    ...C.dirs.filter(d => d.id !== 'fishing').map(d => `- [${d.name}](${SITE.origin}${C.path('dir:' + d.id)}): ${String(d.short).replace(/\*/g, '')}`),
    `- [ERKAK Ring](${SITE.origin}${C.path('ring')}): smart ring for sleep, recovery and readiness, linked to ERKAK programs; pre-registration, not a medical device`,
    ``, `## Guides`, ...C.guides.map(g => `- [${g.title.replace(/\*/g, '')}](${SITE.origin}${C.path('guide:' + g.id)}): ${g.desc.replace(/\*/g, '')}`),
    ``, `## Destinations`, ...C.dests.filter(d => d.page).map(d => `- [${d.name}](${SITE.origin}${C.path('dest:' + d.id)})`),
    ``, `## Company`, `- [About ERKAK and Thailand visa help](${SITE.origin}${C.path('about')})`, `- [Terms](${SITE.origin}${C.path('terms')})`, `- [Privacy](${SITE.origin}${C.path('privacy')})`, ``];
  fs.writeFileSync(path.join(OUT, 'llms.txt'), lines.join('\n'));
}
console.log(`Собрано: ${LANGS.length} ${LANGS.length === 1 ? 'язык' : 'языков'}, ${pages} страниц, ${urls.length} адресов на язык → public/`);
