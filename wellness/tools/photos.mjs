// ERKAK · фото для сайта → src/img/photos/<ключ>-<ширина>.webp (480, 800, 1200, 1800).
//
// Свои или сгенерированные кадры: положите файл в wellness/photos-src/ с именем ключа,
// где «/» заменён на «-»: hero.jpg, dir-fishing.png, dest-phuket.webp… (список — content/PHOTO-PROMPTS.md).
// Скрипт нарежет размеры, пересчитает BlurHash-подложку и запишет её в content/photos-local.json.
// Для ключей без своего файла скачает текущий кадр из content/photos.mjs (нужен интернет).
//
// Запуск: node tools/photos.mjs          — только новое
//         node tools/photos.mjs --force  — пересобрать всё
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { PHOTOS } from '../content/photos.mjs';
import { WIDTHS, fileName } from '../lib/photo.mjs';
import { encode } from '../lib/blurhash.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/img/photos'), SRC = path.join(ROOT, 'photos-src'), META = path.join(ROOT, 'content/photos-local.json');
const force = process.argv.includes('--force');
fs.mkdirSync(OUT, { recursive:true });
const meta = fs.existsSync(META) ? JSON.parse(fs.readFileSync(META, 'utf8')) : {};
const srcFiles = fs.existsSync(SRC) ? fs.readdirSync(SRC) : [];
const own = key => srcFiles.find(f => f.replace(/\.(jpe?g|png|webp|avif)$/i, '') === key.replace(/\//g, '-'));
const unknown = srcFiles.filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f) && !Object.keys(PHOTOS).some(k => own(k) === f));
if (unknown.length) console.warn('Не знаю, куда поставить (нет такого ключа):', unknown.join(', '));

// Нарезка в Chromium: canvas → WebP, плюс 32 px превью для BlurHash
let browser, page;
async function cut(file){
  if (!page) {
    const require = createRequire(import.meta.url);
    let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
    browser = await chromium.launch(); page = await browser.newPage();
  }
  const mime = { jpg:'jpeg', jpeg:'jpeg', png:'png', webp:'webp', avif:'avif' }[path.extname(file).slice(1).toLowerCase()];
  const data = `data:image/${mime};base64,${fs.readFileSync(file).toString('base64')}`;
  return page.evaluate(async ({ data, widths }) => {
    const img = new Image(); img.src = data; await img.decode();
    const out = {};
    for (const w of widths) {
      const cw = Math.min(w, img.naturalWidth), ch = Math.round(cw * img.naturalHeight / img.naturalWidth);
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, cw, ch);
      out[w] = c.toDataURL('image/webp', 0.8).split(',')[1];
    }
    const t = document.createElement('canvas'); t.width = 32; t.height = Math.max(8, Math.round(32 * img.naturalHeight / img.naturalWidth));
    const tx = t.getContext('2d'); tx.drawImage(img, 0, 0, t.width, t.height);
    return { out, w:img.naturalWidth, h:img.naturalHeight, tw:t.width, th:t.height, px:Array.from(tx.getImageData(0, 0, t.width, t.height).data) };
  }, { data, widths:WIDTHS });
}

let done = 0, kb = 0; const failed = [];
for (const [key, p] of Object.entries(PHOTOS)) {
  const mine = own(key), have = WIDTHS.every(w => fs.existsSync(path.join(OUT, fileName(key, w))));
  if (mine) {
    const src = path.join(SRC, mine), stamp = fs.statSync(src).mtimeMs;
    if (!force && have && meta[key] && meta[key].stamp === stamp) continue;
    const r = await cut(src);
    for (const w of WIDTHS) { const buf = Buffer.from(r.out[w], 'base64'); fs.writeFileSync(path.join(OUT, fileName(key, w)), buf); kb += buf.length / 1024; }
    meta[key] = { w:r.w, h:r.h, hash:encode(r.px, r.tw, r.th), stamp, file:mine };
    done++; console.log(`✓ ${key} ← photos-src/${mine} (${r.w}×${r.h})`);
    continue;
  }
  if (!force && have) continue;
  try {
    const bufs = [];
    for (const w of WIDTHS) {
      const res = await fetch(`${p.src}?fm=webp&fit=crop&w=${w}&q=72`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      bufs.push(Buffer.from(await res.arrayBuffer()));
    }
    bufs.forEach((buf, i) => { fs.writeFileSync(path.join(OUT, fileName(key, WIDTHS[i])), buf); kb += buf.length / 1024; });
    delete meta[key]; done++;
  } catch (e) { failed.push(key); console.warn(`! ${key}: не скачалось (${e.cause ? e.cause.code || e.cause.message : e.message}) — на сайте останется CDN`); }
}
if (browser) await browser.close();
fs.writeFileSync(META, JSON.stringify(meta, null, 1) + '\n');
console.log(`Фото: обновлено ${done}, ${Math.round(kb)} КБ → src/img/photos/${failed.length ? `; не скачались: ${failed.length}` : ''}`);
