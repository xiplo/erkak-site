// ERKAK · проверка собранного сайта (public/): ссылки, hreflang, заголовки, JSON-LD, карты сайта, мусор шаблонов.
// Запуск: node build.mjs && node tools/check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE } from '../content/core.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const ORIGIN = SITE.origin;
if (!fs.existsSync(ROOT)) { console.error('Нет public/ — сначала node build.mjs'); process.exit(1); }

const files = fs.readdirSync(ROOT, { recursive:true }).filter(f => f.endsWith('.html')).map(f => f.split(path.sep).join('/'));
const urlOf = f => '/' + f.replace(/index\.html$/, '');
const fileOf = u => { const p = decodeURIComponent(u.split('#')[0].split('?')[0]); const f = path.join(ROOT, p.endsWith('/') ? p + 'index.html' : p); return fs.existsSync(f) && fs.statSync(f).isFile() ? f : null; };
const pages = new Map(); // url → { html, ids:Set }
for (const f of files) {
  const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
  pages.set(urlOf(f), { html, ids:new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1])) });
}

const E = [], W = [];
const err = (u, m) => E.push(`✗ ${u}: ${m}`), warn = (u, m) => W.push(`! ${u}: ${m}`);
const titles = new Map(), descs = new Map();
const attr = (tag, name) => { const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag); return m ? m[1].replace(/&amp;/g, '&') : null; };

for (const [u, { html, ids }] of pages) {
  if (u === '/404.html') continue;
  const noindex = /<meta name="robots" content="noindex/.test(html);
  // Мусор шаблонов в видимом тексте
  const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
  for (const bad of ['undefined', 'NaN', '[object Object]', '{n}', '{name}', '{price}', '{m}', '@@CONTINUE']) if (text.includes(bad)) err(u, `в тексте «${bad}»`);
  if (/\s\*[^\s*][^*]*\*\s/.test(text)) warn(u, 'похоже на неразобранную *разметку*');
  // title / description / canonical
  const title = (/<title>([^<]*)<\/title>/.exec(html) || [])[1];
  const desc = (/<meta name="description" content="([^"]*)"/.exec(html) || [])[1];
  if (!title) err(u, 'нет <title>'); else {
    if (!noindex) { if (titles.has(title)) err(u, `title повторяет ${titles.get(title)}`); else titles.set(title, u); }
    if (title.length > (/^\/(zh|ja|ko)\//.test(u) ? 40 : 75)) warn(u, `title ${title.length} зн.`);
  }
  if (!desc) { if (!noindex && u !== '/') err(u, 'нет description'); }
  else { const k = /^\/(zh|ja|ko)\//.test(u) ? .5 : 1; if (!noindex && descs.has(desc)) warn(u, `description повторяет ${descs.get(desc)}`); descs.set(desc, u); if (desc.length > 170 * k) warn(u, `description ${desc.length} зн.`); if (desc.length < 50 * k) warn(u, `description ${desc.length} зн. — коротко`); }
  const canon = (/<link rel="canonical" href="([^"]+)"/.exec(html) || [])[1];
  if (!noindex && canon !== ORIGIN + u) err(u, `canonical ${canon || '—'} ≠ ${ORIGIN + u}`);
  // hreflang: каждая альтернатива существует и ссылается обратно
  const alts = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(m => [m[1], m[2]]);
  if (!noindex && u !== '/' && alts.length) {
    if (!alts.some(([, h]) => h === ORIGIN + u)) err(u, 'hreflang не ссылается на саму страницу');
    if (!alts.some(([l]) => l === 'x-default')) err(u, 'нет hreflang x-default');
    for (const [l, h] of alts) {
      const tu = h.replace(ORIGIN, ''), t = pages.get(tu);
      if (!t) { err(u, `hreflang ${l} → нет страницы ${tu}`); continue; }
      if (l !== 'x-default' && !t.html.includes(`href="${ORIGIN + u}"`)) err(u, `hreflang ${l}: ${tu} не ссылается обратно`);
    }
  }
  // JSON-LD
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch (e) { err(u, 'JSON-LD не парсится: ' + e.message); } }
  // h1 ровно один
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (!noindex && u !== '/' && h1 !== 1) err(u, `h1: ${h1}`);
  // Ссылки и ресурсы
  for (const m of html.matchAll(/<(a|link|script|img|use|source)\s[^>]*>/g)) {
    const tag = m[0], h = attr(tag, 'href') ?? attr(tag, 'src');
    if (!h || /^(https?:|mailto:|tel:|weixin:|data:|javascript:)/.test(h) || /rel="(preconnect|alternate|canonical)"/.test(tag)) continue;
    if (h.startsWith('#')) { if (h.length > 1 && !ids.has(h.slice(1))) err(u, `якорь ${h} не найден`); continue; }
    const abs = new URL(h, ORIGIN + u).pathname + (h.includes('#') ? '#' + h.split('#')[1] : '');
    const target = fileOf(abs);
    if (!target) { err(u, `битая ссылка ${h}`); continue; }
    const hash = abs.split('#')[1];
    if (hash && target.endsWith('.html')) { const t = pages.get(urlOf(path.relative(ROOT, target).split(path.sep).join('/'))); if (t && !t.ids.has(hash)) err(u, `якорь #${hash} не найден в ${abs.split('#')[0]}`); }
  }
  // Изображения без alt, кнопки без имени
  for (const m of html.matchAll(/<img\s[^>]*>/g)) if (!/\salt="/.test(m[0])) err(u, 'img без alt');
  for (const m of html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)) if (!/aria-label="/.test(m[1]) && !m[2].replace(/<[^>]+>/g, '').trim()) err(u, 'кнопка без подписи');
}

// Карты сайта
const index = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
let inMaps = 0;
for (const m of index.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const f = path.join(ROOT, m[1].replace(ORIGIN, ''));
  if (!fs.existsSync(f)) { err('sitemap.xml', `нет ${m[1]}`); continue; }
  for (const x of fs.readFileSync(f, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) { inMaps++; if (!pages.has(x[1].replace(ORIGIN, ''))) err(path.basename(f), `в карте нет страницы ${x[1]}`); }
}
const indexable = [...pages.entries()].filter(([u, p]) => u !== '/' && u !== '/404.html' && !/noindex/.test(p.html)).length;
if (inMaps !== indexable) warn('sitemap', `в картах ${inMaps} адресов, индексируемых страниц ${indexable}`);

console.log(`Страниц: ${pages.size}, в картах сайта: ${inMaps}, ошибок: ${E.length}, предупреждений: ${W.length}`);
const group = list => { const by = new Map(); for (const m of list) { const k = m.replace(/^[✗!] [^:]+: /, '').replace(/\d+/g, '#').slice(0, 70); by.set(k, [...(by.get(k) || []), m]); } return by; };
for (const [k, ms] of group(E)) console.log(ms.length > 3 ? `${ms[0]}  (+${ms.length - 1} похожих)` : ms.join('\n'));
for (const [k, ms] of group(W)) console.log(ms.length > 3 ? `${ms[0]}  (+${ms.length - 1} похожих)` : ms.join('\n'));
process.exit(E.length ? 1 : 0);
