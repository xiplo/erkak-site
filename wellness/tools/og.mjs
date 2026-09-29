// ERKAK · картинки для соцсетей (OG 1200×630) и иконки сайта. Рисуются в Chromium через Playwright.
// Запуск: node tools/og.mjs   (нужен Playwright; в облачной среде он в /opt/node22/lib/node_modules/playwright)
// Результат: src/img/og/<направление>.jpg, src/img/og/erkak.jpg, src/img/favicon.svg, favicon-32.png,
//            apple-touch-icon.png, icon-192.png, icon-512.png. Сборка копирует их в public/.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { DIRECTIONS } from '../content/core.mjs';
import { sprite, artId, isFish } from '../lib/art.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG = path.join(ROOT, 'src/img');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

// Те же пастельные тона, что у иконок направлений в erkak.css (.t-*): [фон плашки, цвет рисунка]
const TONES = { navy:['#E8F0FB', '#2B5CAB'], oxblood:['#FCECE8', '#B0402E'], slate:['#EDF0F4', '#475569'], plum:['#F1ECFA', '#6D4AA8'],
  forest:['#E6F4EC', '#1F7A4D'], espresso:['#F6EEE5', '#8A5A2B'], noir:['#EEEFF1', '#344054'], bronze:['#FBF1DE', '#9A6206'], sand:['#F7F1E6', '#8F6438'], brand:['#E7F4F1', '#0E7C6B'] };
const BRAND = '#0E7C6B';
const font = prefix => {
  const f = fs.readdirSync(path.join(ROOT, 'src/fonts')).find(x => x.startsWith(prefix + '.'));
  return `data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'src/fonts', f)).toString('base64')}`;
};
const FONTS = `@font-face{font-family:G;font-weight:400 700;src:url(${font('golos-text-latin-normal-400')})}`;
const SPRITE = sprite().replace('<svg ', '<svg style="display:none" ');
const LOGO = (stroke, w) => `<svg viewBox="0 0 40 40"><g fill="none" stroke="${stroke}" stroke-width="${w}"><circle cx="20" cy="20" r="18"/><path d="M11 14.5h18M11 20h18M11 25.5h18"/></g><circle cx="24.5" cy="20" r="3.3" fill="${stroke}"/></svg>`;

// Светлая карточка: логотип, крупный заголовок, плашка с рисунком направления справа
function og({ tone, art, label, sub }){
  const [bg, fg] = TONES[tone] || TONES.brand, fish = isFish(art);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;background:#F5F7F8;font-family:G,sans-serif;color:#101828;display:grid;grid-template-columns:1fr 470px;gap:40px;padding:64px}
.l{display:flex;flex-direction:column;justify-content:space-between}
.brand{display:flex;align-items:center;gap:14px;font-weight:700;font-size:30px;letter-spacing:.08em}
.brand svg{width:48px;height:48px}
h1{font-weight:600;font-size:66px;line-height:1.08;letter-spacing:-.02em}
.sub{margin-top:18px;font-size:26px;color:#475467}
.url{font-weight:600;font-size:22px;color:${BRAND}}
.tile{border-radius:44px;background:${bg};display:grid;place-items:center;color:${fg}}
.tile svg{${fish ? 'width:400px;height:167px' : 'width:260px;height:260px'}}
.tile use{stroke-width:1.2}
</style></head><body>${SPRITE}
<div class="l"><div class="brand">${LOGO(BRAND, 2.4)}ERKAK</div><div><h1>${label}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div><div class="url">erkak.com</div></div>
<div class="tile"><svg viewBox="${fish ? '0 0 240 100' : '0 0 64 64'}"><use href="#${artId(art)}"/></svg></div></body></html>`;
}

const ICON = (size, pad) => `<!doctype html><html><head><style>*{margin:0}body{width:${size}px;height:${size}px;background:${BRAND};display:grid;place-items:center}svg{width:${size - pad * 2}px;height:${size - pad * 2}px}</style></head><body>
${LOGO('#FFFFFF', size < 64 ? 3 : 2)}</body></html>`;

fs.mkdirSync(path.join(IMG, 'og'), { recursive:true });
fs.writeFileSync(path.join(IMG, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="${BRAND}"/><g fill="none" stroke="#fff" stroke-width="2.6"><circle cx="24" cy="24" r="15.5"/><path d="M15.5 18.8h17M15.5 24h17M15.5 29.2h17"/></g><circle cx="28.4" cy="24" r="3.2" fill="#fff"/></svg>\n`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{ width:1200, height:630 } });
const shot = async (html, file, w, h, type = 'jpeg') => {
  await page.setViewportSize({ width:w, height:h });
  await page.setContent(html, { waitUntil:'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path:file, type, ...(type === 'jpeg' ? { quality:84 } : {}), clip:{ x:0, y:0, width:w, height:h } });
};
const EN = { fishing:'Sport fishing in Thailand', muaythai:'Muay Thai & combat', camps:'Sport camps', longevity:'Check-ups & longevity', detox:'Detox & reset', recovery:'Recovery', mind:'Mind & calm',
  adventure:'Adventure', ocean:'Ocean', golf:'Golf & padel', aesthetics:'Men’s aesthetics', nutrition:'Nutrition', family:'Father & son', business:'Teams & friends' };
for (const d of DIRECTIONS) await shot(og({ tone:d.tone, art:d.art, label:EN[d.id], sub:'Men’s wellness worldwide' }), path.join(IMG, 'og', d.id + '.jpg'), 1200, 630);
await shot(og({ tone:'brand', art:'compass', label:'Stronger. Healthier. Further.', sub:'100 programs · 14 directions · one concierge' }), path.join(IMG, 'og', 'erkak.jpg'), 1200, 630);
for (const [name, size, pad] of [['favicon-32.png', 32, 1], ['apple-touch-icon.png', 180, 30], ['icon-192.png', 192, 36], ['icon-512.png', 512, 96]]) await shot(ICON(size, pad), path.join(IMG, name), size, size, 'png');
await browser.close();
console.log(`OG: ${DIRECTIONS.length + 1} картинок, иконки: 4 → src/img/`);
