// ERKAK · фото: <img> с srcset, размытой подложкой из BlurHash и ленивой загрузкой.
// Если в src/img/photos/ лежат локальные файлы (tools/photos.mjs), берём их, иначе — CDN Unsplash.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHOTOS as BASE } from '../content/photos.mjs';
import { blurUri } from './blurhash.mjs';

export const WIDTHS = [480, 800, 1200, 1800];
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src/img/photos');
const LOCAL = new Set(fs.existsSync(DIR) ? fs.readdirSync(DIR) : []);
// Свои кадры (tools/photos.mjs из photos-src/): их размер и BlurHash важнее данных Unsplash
const OWN_META = path.join(DIR, '..', '..', '..', 'content/photos-local.json');
const OWN = fs.existsSync(OWN_META) ? JSON.parse(fs.readFileSync(OWN_META, 'utf8')) : {};
const PHOTOS = Object.fromEntries(Object.entries(BASE).map(([k, p]) => [k, OWN[k] ? { ...p, ...OWN[k] } : p]));
export const fileName = (key, w) => `${key.replace(/\//g, '-')}-${w}.webp`;
const blur = new Map();

export const hasPhoto = key => Boolean(PHOTOS[key]);
export const photoUrl = (key, w) => {
  const p = PHOTOS[key], f = fileName(key, w);
  return LOCAL.has(f) ? `/photos/${f}` : `${p.src}?auto=format&fit=crop&w=${w}&q=72`;
};
export const usesCdn = () => Object.keys(PHOTOS).some(k => !LOCAL.has(fileName(k, WIDTHS[0])));

// Фото здесь — атмосфера: подпись всегда рядом текстом, поэтому alt пустой (декоративное изображение)
export function photo(key, { sizes = '100vw', cls = '', eager = false, max = 1800 } = {}){
  const p = PHOTOS[key];
  if (!p) return '';
  if (!blur.has(key)) blur.set(key, blurUri(p.hash, 32, Math.max(12, Math.round(32 * p.h / p.w))));
  const ws = WIDTHS.filter(w => w <= max);
  return `<img class="ph ${cls}" src="${photoUrl(key, ws[Math.min(1, ws.length - 1)])}" srcset="${ws.map(w => `${photoUrl(key, w)} ${w}w`).join(', ')}" sizes="${sizes}" width="${p.w}" height="${p.h}" alt="" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" style="background-image:url(${blur.get(key)})${p.pos ? `;object-position:${p.pos}` : ''}">`;
}
