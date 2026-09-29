// ERKAK · картинки для соцсетей (OG 1200×630) и иконки сайта. Рисуются в Chromium через Playwright.
// Запуск: node tools/og.mjs   (нужен Playwright; в облачной среде он в /opt/node22/lib/node_modules/playwright)
// Результат: src/img/og/<направление>.jpg, src/img/og/erkak.jpg, src/img/favicon.svg, favicon-32.png,
//            apple-touch-icon.png, icon-192.png, icon-512.png. Сборка копирует их в public/.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { DIRECTIONS } from '../content/core.mjs';
import { LOGO_D } from '../lib/art.mjs';
import { PHOTOS } from '../content/photos.mjs';
import { blurUri } from '../lib/blurhash.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG = path.join(ROOT, 'src/img');
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const INK = '#1D2025';
const font = prefix => {
  const f = fs.readdirSync(path.join(ROOT, 'src/fonts')).find(x => x.startsWith(prefix + '.'));
  return `data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, 'src/fonts', f)).toString('base64')}`;
};
const FONTS = `@font-face{font-family:G;font-weight:400 700;src:url(${font('golos-text-latin-normal-400')})}`;
const LOGO = fill => `<svg viewBox="0 0 32 32"><path fill="${fill}" fill-rule="evenodd" d="${LOGO_D}"/></svg>`;

// Фото направления на весь кадр, затемнение, белый заголовок. Картинку берём из сети,
// а если CDN недоступен — рисуем размытую подложку из BlurHash того же кадра.
async function bg(key){
  const p = PHOTOS[key], local = path.join(IMG, 'photos', key.replace(/\//g, '-') + '-1200.webp');
  if (fs.existsSync(local)) return `data:image/webp;base64,${fs.readFileSync(local).toString('base64')}`;
  try {
    const res = await fetch(`${p.src}?fm=jpg&fit=crop&w=1200&h=630&q=80`);
    if (res.ok) return `data:image/jpeg;base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
  } catch {}
  return blurUri(p.hash, 48, 26);
}
const og = (img, label, sub) => `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;font-family:G,sans-serif;color:#fff;position:relative;background:${INK}}
.bg{position:absolute;inset:0;background:url(${img}) center/cover}
.sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,11,13,.25),rgba(10,11,13,.1) 35%,rgba(10,11,13,.75)),linear-gradient(90deg,rgba(10,11,13,.4),transparent 70%)}
.in{position:absolute;inset:64px;display:flex;flex-direction:column;justify-content:space-between}
.brand{display:flex;align-items:center;gap:14px;font-weight:700;font-size:28px;letter-spacing:.06em}
.brand svg{width:44px;height:44px}
h1{font-weight:600;font-size:76px;line-height:1.02;letter-spacing:-.03em;max-width:900px}
.sub{margin-top:18px;font-size:26px;color:rgba(255,255,255,.82)}
</style></head><body><div class="bg"></div><div class="sh"></div>
<div class="in"><div class="brand">${LOGO('#fff')}ERKAK</div><div><h1>${label}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div></div></body></html>`;

const ICON = (size, pad) => `<!doctype html><html><head><style>*{margin:0}body{width:${size}px;height:${size}px;background:${INK};display:grid;place-items:center}svg{width:${size - pad * 2}px;height:${size - pad * 2}px}</style></head><body>
<svg viewBox="7 6.8 18 16.7"><path fill="#fff" d="M7 23.5h4.3L16 14.6l4.7 8.9H25L16 6.8Z"/></svg></body></html>`;

fs.mkdirSync(path.join(IMG, 'og'), { recursive:true });
fs.writeFileSync(path.join(IMG, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="${INK}" fill-rule="evenodd" d="${LOGO_D}"/></svg>\n`);

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
for (const d of DIRECTIONS) await shot(og(await bg('dir/' + d.id), EN[d.id], 'Men’s wellness worldwide'), path.join(IMG, 'og', d.id + '.jpg'), 1200, 630);
await shot(og(await bg('hero'), 'Stronger. Healthier. Further.', '100 programs · 14 directions · one concierge'), path.join(IMG, 'og', 'erkak.jpg'), 1200, 630);
for (const [name, size, pad] of [['favicon-32.png', 32, 1], ['apple-touch-icon.png', 180, 30], ['icon-192.png', 192, 36], ['icon-512.png', 512, 96]]) await shot(ICON(size, pad), path.join(IMG, name), size, size, 'png');
await browser.close();
console.log(`OG: ${DIRECTIONS.length + 1} картинок, иконки: 4 → src/img/`);
