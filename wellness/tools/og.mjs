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
import { roman } from '../lib/util.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG = path.join(ROOT, 'src/img');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const TONES = { navy:['#0E141C', 'rgba(120,150,190,.18)'], oxblood:['#1A0F0E', 'rgba(190,110,90,.2)'], slate:['#131517', 'rgba(160,170,180,.15)'], plum:['#16111A', 'rgba(160,120,190,.17)'],
  forest:['#0E1512', 'rgba(120,170,140,.16)'], espresso:['#18130F', 'rgba(197,164,109,.2)'], noir:['#101010', 'rgba(236,229,216,.1)'], bronze:['#19140C', 'rgba(220,180,110,.26)'], sand:['#1B1814', 'rgba(236,210,170,.18)'] };
const font = prefix => {
  const f = fs.readdirSync(path.join(ROOT, 'src/fonts')).find(x => x.startsWith(prefix + '.'));
  return `data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'src/fonts', f)).toString('base64')}`;
};
const FONTS = `@font-face{font-family:C;font-weight:400 600;src:url(${font('cormorant-garamond-latin-normal-400')})}
@font-face{font-family:C;font-style:italic;font-weight:400 600;src:url(${font('cormorant-garamond-latin-italic-400')})}
@font-face{font-family:M;font-weight:400 700;src:url(${font('manrope-latin-normal-400')})}`;
const SPRITE = sprite().replace('<svg ', '<svg style="display:none" ');

function og({ tone, art, no, label }){
  const [bg, glow] = TONES[tone] || TONES.noir, fish = isFish(art);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;background:${bg};font-family:M,sans-serif;color:#ECE5D8;position:relative}
.bg{position:absolute;inset:0;background:radial-gradient(900px 520px at 78% 30%,${glow},transparent 62%),repeating-radial-gradient(circle at 72% 118%,transparent 0 30px,rgba(236,229,216,.045) 30px 31px)}
.frame{position:absolute;inset:26px;border:1px solid rgba(197,164,109,.3)}
.frame::after{content:"";position:absolute;inset:8px;border:1px solid rgba(197,164,109,.12)}
.word{position:absolute;left:76px;top:78px;font:600 44px/1 C,serif;letter-spacing:.42em;color:#ECE5D8}
.mark{position:absolute;left:76px;top:150px;width:64px;height:1px;background:#C5A46D}
.tag{position:absolute;left:76px;bottom:78px;font:600 14px/1 M,sans-serif;letter-spacing:.34em;text-transform:uppercase;color:#A89F90}
.lab{position:absolute;left:76px;top:190px;max-width:440px;font:italic 400 64px/1.02 C,serif;color:#DCC08E}
.no{position:absolute;right:76px;top:74px;font:italic 400 30px/1 C,serif;color:#C5A46D}
.art{position:absolute;color:#C5A46D;${fish ? 'right:70px;top:170px;width:620px;height:258px' : 'right:150px;top:150px;width:330px;height:330px'}}
.art use{stroke-width:1}
.url{position:absolute;right:76px;bottom:78px;font:600 14px/1 M,sans-serif;letter-spacing:.3em;color:#C5A46D}
</style></head><body>${SPRITE}<div class="bg"></div><div class="frame"></div>
<div class="word">ERKAK</div><div class="mark"></div>${label ? `<div class="lab">${label}</div>` : ''}${no ? `<div class="no">${no}</div>` : ''}
<svg class="art" viewBox="${fish ? '0 0 240 100' : '0 0 64 64'}"><use href="#${artId(art)}"/></svg>
<div class="tag">Men’s wellness · Worldwide</div><div class="url">ERKAK.COM</div></body></html>`;
}

const ICON = (size, pad) => `<!doctype html><html><head><style>*{margin:0}body{width:${size}px;height:${size}px;background:#0B0B0A;display:grid;place-items:center}svg{width:${size - pad * 2}px;height:${size - pad * 2}px}</style></head><body>
<svg viewBox="0 0 40 40"><g fill="none" stroke="#C5A46D" stroke-width="${size < 64 ? 2.4 : 1.4}"><circle cx="20" cy="20" r="${size < 64 ? 17.8 : 18.3}"/><path d="M11 14.5h18M11 20h18M11 25.5h18"/></g><circle cx="24.5" cy="20" r="3.3" fill="#C5A46D"/></svg></body></html>`;

fs.mkdirSync(path.join(IMG, 'og'), { recursive:true });
fs.writeFileSync(path.join(IMG, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#0B0B0A"/><g fill="none" stroke="#C5A46D" stroke-width="2.2"><circle cx="24" cy="24" r="16.5"/><path d="M15 18.5h18M15 24h18M15 29.5h18"/></g><circle cx="28.8" cy="24" r="3.2" fill="#C5A46D"/></svg>\n`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport:{ width:1200, height:630 } });
const shot = async (html, file, w, h, type = 'jpeg') => {
  await page.setViewportSize({ width:w, height:h });
  await page.setContent(html, { waitUntil:'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path:file, type, ...(type === 'jpeg' ? { quality:84 } : {}), clip:{ x:0, y:0, width:w, height:h } });
};
const EN = { fishing:'Sport fishing · Thailand', muaythai:'Muay Thai & combat', camps:'Sport camps', longevity:'Check-ups & longevity', detox:'Detox & reset', recovery:'Recovery', mind:'Mind & calm',
  adventure:'Adventure', ocean:'Ocean', golf:'Golf & padel', aesthetics:'Men’s aesthetics', nutrition:'Nutrition', family:'Father & son', business:'Teams & friends' };
for (const [i, d] of DIRECTIONS.entries()) await shot(og({ tone:d.tone, art:d.art, no:roman(i + 1), label:EN[d.id] }), path.join(IMG, 'og', d.id + '.jpg'), 1200, 630);
await shot(og({ tone:'espresso', art:'compass', no:'', label:'Stronger. Healthier. Further.' }), path.join(IMG, 'og', 'erkak.jpg'), 1200, 630);
for (const [name, size, pad] of [['favicon-32.png', 32, 1], ['apple-touch-icon.png', 180, 30], ['icon-192.png', 192, 36], ['icon-512.png', 512, 96]]) await shot(ICON(size, pad), path.join(IMG, name), size, size, 'png');
await browser.close();
console.log(`OG: ${DIRECTIONS.length + 1} картинок, иконки: 4 → src/img/`);
